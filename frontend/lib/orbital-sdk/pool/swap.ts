import algosdk from "algosdk";
import { AMOUNT_SCALE, DEFAULT_SLIPPAGE_BPS, PRECISION } from "../constants";
import { PoolState, SwapQuote, TradeRecipe } from "../types";
import { buildCrossingSwapGroup, buildSwapGroup } from "../algorand/transactions";
import { consolidateTicks } from "../math/consolidation";
import { executeTradeWithCrossings } from "../math/tick-crossing";
import { abs, sqrt } from "../math/bigint-math";
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
  if (slippageBps < 0 || slippageBps > 10_000) {
    throw new Error("slippageBps must be between 0 and 10000");
  }

  const poolState = await readPoolState(client, poolAppId);
  const quote = getSwapQuote(poolState, tokenInIdx, tokenOutIdx, amountInRaw);

  const tokenInAsaId = poolState.tokenAsaIds[tokenInIdx];
  const tokenOutAsaId = poolState.tokenAsaIds[tokenOutIdx];

  let txns: algosdk.Transaction[];
  let submittedAmountOut: bigint;

  if (quote.ticksCrossed === 0) {
    // For simple swaps, compute claimed_amount_out with the exact same
    // invariant checks the contract uses, including raw→scaled flooring.
    const exactAmountOut = computeExactSimpleSwapAmountOut(
      poolState,
      tokenInIdx,
      tokenOutIdx,
      amountInRaw,
    );
    if (exactAmountOut <= 0n) {
      throw new Error("Swap amount too small for current pool state");
    }
    const minAmountOut = (exactAmountOut * BigInt(10_000 - slippageBps)) / 10_000n;

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
      exactAmountOut,       // raw microunits — claimed_amount_out ABI arg
      minAmountOut,         // raw microunits — min_amount_out ABI arg
      poolState.tokenAsaIds, // Pass full context for n-token verification
      poolState.n,
    );
    submittedAmountOut = exactAmountOut;
  } else {
    const minAmountOut = (quote.amountOut * BigInt(10_000 - slippageBps)) / 10_000n;

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
      poolState.tokenAsaIds, // Pass full context for n-token verification
      recipe,
      poolState.n,
    );
    submittedAmountOut = quote.amountOut;
  }

  const signedTxns = await signer(txns);
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid, amountOut: submittedAmountOut };
}

const FEE_DENOMINATOR = 10_000n;
const INVARIANT_TOLERANCE = 1_000n;

function toScaled(raw: bigint): bigint {
  return raw / AMOUNT_SCALE;
}

function squareRaw(value: bigint): bigint {
  return value * value;
}

function squareScaled(value: bigint): bigint {
  return (value * value) / PRECISION;
}

function verifyInvariantExact(
  sumX: bigint,
  sumXSq: bigint,
  n: number,
  rInt: bigint,
  sBound: bigint,
  kBound: bigint,
  sqrtN: bigint,
  invSqrtN: bigint,
): boolean {
  const nBig = BigInt(n);
  const alphaTotal = (sumX * invSqrtN) / PRECISION;
  if (alphaTotal < kBound) return false;
  const alphaInt = alphaTotal - kBound;
  const rIntSqrtN = (rInt * sqrtN) / PRECISION;

  const variance = (sumX * sumX) / nBig;
  if (sumXSq < variance) return false;
  const wTotalSq = sumXSq - variance;
  const wTotalNorm = sqrt(wTotalSq);
  if (wTotalNorm < sBound) return false;
  const wIntNorm = wTotalNorm - sBound;

  const diffAlpha = abs(alphaInt - rIntSqrtN);
  const lhs = squareScaled(rInt);
  const rhs = squareScaled(diffAlpha) + squareScaled(wIntNorm);
  return abs(lhs - rhs) <= INVARIANT_TOLERANCE;
}

function computeExactSimpleSwapAmountOut(
  poolState: PoolState,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountInRaw: bigint,
): bigint {
  const oldInActual = poolState.actualReservesRaw[tokenInIdx];
  const oldOutActual = poolState.actualReservesRaw[tokenOutIdx];
  if (oldOutActual <= 0n) return 0n;

  const fee = (amountInRaw * poolState.feeBps) / FEE_DENOMINATOR;
  const effectiveIn = amountInRaw - fee;
  if (effectiveIn <= 0n) return 0n;

  const offset = poolState.virtualOffset;
  const oldInMath = toScaled(oldInActual) + offset;
  const oldOutMath = toScaled(oldOutActual) + offset;

  let lo = 0n;
  let hi = oldOutActual;

  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;

    const newInActual = oldInActual + effectiveIn;
    const newOutActual = oldOutActual - mid;
    const newInMath = toScaled(newInActual) + offset;
    const newOutMath = toScaled(newOutActual) + offset;
    const newSum = poolState.sumX + toScaled(effectiveIn) - toScaled(mid);
    const newSumSq =
      poolState.sumXSq +
      squareRaw(newInMath) -
      squareRaw(oldInMath) +
      squareRaw(newOutMath) -
      squareRaw(oldOutMath);

    const ok = verifyInvariantExact(
      newSum,
      newSumSq,
      poolState.n,
      poolState.rInt,
      poolState.sBound,
      poolState.kBound,
      poolState.sqrtN,
      poolState.invSqrtN,
    );

    if (ok) lo = mid;
    else hi = mid - 1n;
  }

  return lo;
}
