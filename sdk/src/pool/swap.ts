import algosdk from "algosdk";
import { AMOUNT_SCALE, DEFAULT_SLIPPAGE_BPS, PRECISION } from "../constants";
import { PoolState, SwapQuote, TradeRecipe } from "../types";
import { buildCrossingSwapGroup, buildSwapGroup } from "../algorand/transactions";
import { consolidateTicks } from "../math/consolidation";
import { executeTradeWithCrossings } from "../math/tick-crossing";
import { getPrice } from "../math/sphere";
import { readPoolState } from "./state-reader";

/**
 * Compute a swap quote without executing any transaction.
 *
 * @param poolState   Current pool state (from readPoolState)
 * @param tokenInIdx  Index of the token being sold
 * @param tokenOutIdx Index of the token being bought
 * @param amountInRaw Amount to sell, in raw microunits
 *
 * @returns SwapQuote with amountIn / amountOut in raw microunits.
 *          route segments remain in AMOUNT_SCALE units (internal representation).
 */
export function getSwapQuote(
  poolState: PoolState,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountInRaw: bigint,
): SwapQuote {
  if (tokenInIdx === tokenOutIdx) {
    throw new Error("tokenInIdx and tokenOutIdx must be different");
  }
  if (amountInRaw <= 0n) {
    throw new Error("amountIn must be positive");
  }

  const { reserves, ticks, n, sqrtN, invSqrtN, feeBps } = poolState;

  // Deduct LP fee before the Newton solver, mirroring the contract:
  //   effective_in = amount_in - fee;  fee = amount_in * fee_bps / 10_000
  // The solver works in AMOUNT_SCALE units (raw / 1_000), matching on-chain math.
  const fee = (amountInRaw * feeBps) / 10_000n;
  const effectiveInRaw = amountInRaw - fee;
  const effectiveInScaled = effectiveInRaw / AMOUNT_SCALE;
  if (effectiveInScaled === 0n) {
    throw new Error("amountIn too small after fee and scaling (must be ≥ 1000 microunits)");
  }

  const consolidation = consolidateTicks(ticks, sqrtN);

  // Instantaneous price in PRECISION units (dimensionless ratio × PRECISION)
  const instantaneousPrice = getPrice(reserves, consolidation.rInt, tokenInIdx, tokenOutIdx);

  const { totalOutput: totalOutputScaled, segments } = executeTradeWithCrossings(
    effectiveInScaled,
    tokenInIdx,
    tokenOutIdx,
    reserves,
    ticks,
    n,
    sqrtN,
    invSqrtN,
  );

  // Convert output back to raw microunits for the public API
  const amountOutRaw = totalOutputScaled * AMOUNT_SCALE;

  // effectivePrice measures what the user actually receives vs what they send (fee included)
  const effectivePrice =
    amountInRaw > 0n ? Number(amountOutRaw) / Number(amountInRaw) : 0;
  const instantaneousPriceFloat = Number(instantaneousPrice) / Number(PRECISION);
  const priceImpact =
    instantaneousPriceFloat > 0 ? 1 - effectivePrice / instantaneousPriceFloat : 0;

  return {
    amountIn: amountInRaw,
    amountOut: amountOutRaw,
    priceImpact,
    instantaneousPrice: instantaneousPriceFloat,
    effectivePrice,
    ticksCrossed: segments.filter((seg) => seg.tickCrossedId !== null).length,
    route: segments, // AMOUNT_SCALE units internally
  };
}

/**
 * Execute a swap atomically: build the transaction group, sign, and submit.
 *
 * @param amountInRaw  Amount to sell in raw microunits (e.g. 1_000_000n for 1 USDC)
 * @param slippageBps  Slippage tolerance in basis points (default 0.5% = 50)
 */
export async function executeSwap(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountInRaw: bigint,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>,
): Promise<{ txId: string; amountOut: bigint }> {
  if (tokenInIdx === tokenOutIdx) {
    throw new Error("tokenInIdx and tokenOutIdx must be different");
  }

  const poolState = await readPoolState(client, poolAppId);
  const quote = getSwapQuote(poolState, tokenInIdx, tokenOutIdx, amountInRaw);

  // amountOut and minAmountOut are in raw microunits
  const minAmountOut =
    (quote.amountOut * BigInt(10000 - slippageBps)) / 10000n;

  const tokenInAsaId = poolState.tokenAsaIds[tokenInIdx];
  const tokenOutAsaId = poolState.tokenAsaIds[tokenOutIdx];

  let txns: algosdk.Transaction[];

  if (quote.ticksCrossed === 0) {
    // Simple swap: one invariant check, no tick state changes
    txns = await buildSwapGroup(
      client,
      poolAppId,
      sender,
      tokenInAsaId,
      tokenOutAsaId,
      tokenInIdx,
      tokenOutIdx,
      amountInRaw,          // raw microunits — ASA transfer amount
      quote.amountOut,      // raw microunits — claimed_amount_out ABI arg
      minAmountOut,         // raw microunits — min_amount_out ABI arg
      poolState.n,
    );
  } else {
    // Multi-segment swap with tick crossings
    const swapFee = (amountInRaw * poolState.feeBps) / 10_000n;
    const recipe: TradeRecipe = {
      tokenInIdx,
      tokenOutIdx,
      totalAmountIn: amountInRaw,          // raw microunits (ASA transfer amount)
      effectiveAmountIn: amountInRaw - swapFee, // raw microunits (what segments must sum to)
      totalAmountOut: quote.amountOut,     // raw microunits
      minAmountOut,                        // raw microunits
      segments: quote.route,               // AMOUNT_SCALE units — encodeTradeRecipe converts
    };

    txns = await buildCrossingSwapGroup(
      client,
      poolAppId,
      sender,
      tokenInAsaId,
      tokenOutAsaId,
      recipe,
      poolState.n,
    );
  }

  const signedTxns = await signer(txns);
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid, amountOut: quote.amountOut };
}
