import algosdk from "algosdk";
import { DEFAULT_SLIPPAGE_BPS, PRECISION } from "../constants";
import { PoolState, SwapQuote, TradeRecipe } from "../types";
import { buildCrossingSwapGroup, buildSwapGroup } from "../algorand/transactions";
import { consolidateTicks } from "../math/consolidation";
import { executeTradeWithCrossings } from "../math/tick-crossing";
import { getPrice } from "../math/sphere";
import { readPoolState } from "./state-reader";

export function getSwapQuote(
  poolState: PoolState,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint,
): SwapQuote {
  if (tokenInIdx === tokenOutIdx) {
    throw new Error("tokenInIdx and tokenOutIdx must be different");
  }

  const { reserves, ticks, n, sqrtN, invSqrtN } = poolState;
  const consolidation = consolidateTicks(ticks, sqrtN);
  const instantaneousPrice = getPrice(reserves, consolidation.rInt, tokenInIdx, tokenOutIdx);

  const { totalOutput, segments } = executeTradeWithCrossings(
    amountIn,
    tokenInIdx,
    tokenOutIdx,
    reserves,
    ticks,
    n,
    sqrtN,
    invSqrtN,
  );

  const effectivePrice = amountIn > 0n ? Number(totalOutput) / Number(amountIn) : 0;
  const instantaneousPriceFloat = Number(instantaneousPrice) / Number(PRECISION);
  const priceImpact =
    instantaneousPriceFloat > 0 ? 1 - effectivePrice / instantaneousPriceFloat : 0;

  return {
    amountIn,
    amountOut: totalOutput,
    priceImpact,
    instantaneousPrice: instantaneousPriceFloat,
    effectivePrice,
    ticksCrossed: segments.filter((segment) => segment.tickCrossedId !== null).length,
    route: segments,
  };
}

export async function executeSwap(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>,
): Promise<{ txId: string; amountOut: bigint }> {
  if (tokenInIdx === tokenOutIdx) {
    throw new Error("tokenInIdx and tokenOutIdx must be different");
  }

  const poolState = await readPoolState(client, poolAppId);
  const quote = getSwapQuote(poolState, tokenInIdx, tokenOutIdx, amountIn);
  const minAmountOut = (quote.amountOut * BigInt(10000 - slippageBps)) / 10000n;

  let txns: algosdk.Transaction[];
  if (quote.ticksCrossed === 0) {
    txns = await buildSwapGroup(
      client,
      poolAppId,
      sender,
      poolState.tokenAsaIds[tokenInIdx],
      poolState.tokenAsaIds[tokenOutIdx],
      tokenInIdx,
      tokenOutIdx,
      amountIn,
      quote.amountOut,
      minAmountOut,
    );
  } else {
    const recipe: TradeRecipe = {
      tokenInIdx,
      tokenOutIdx,
      totalAmountIn: amountIn,
      totalAmountOut: quote.amountOut,
      minAmountOut,
      segments: quote.route,
    };

    txns = await buildCrossingSwapGroup(
      client,
      poolAppId,
      sender,
      poolState.tokenAsaIds[tokenInIdx],
      poolState.tokenAsaIds[tokenOutIdx],
      recipe,
    );
  }

  const signedTxns = await signer(txns);
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid, amountOut: quote.amountOut };
}
