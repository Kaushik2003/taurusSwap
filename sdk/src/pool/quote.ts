import { AMOUNT_SCALE, PRECISION } from "../constants";
import { consolidateTicks } from "../math/consolidation";
import { getPrice } from "../math/sphere";
import { capitalEfficiency, kFromDepegPrice } from "../math/ticks";
import { PoolState } from "../types";
import { getSwapQuote } from "./swap";

export function getAllPrices(poolState: PoolState, baseTokenIdx = 0): number[] {
  const consolidation = consolidateTicks(poolState.ticks, poolState.sqrtN);
  const prices: number[] = [];

  for (let index = 0; index < poolState.n; index += 1) {
    if (index === baseTokenIdx) {
      prices.push(1);
      continue;
    }

    const price = getPrice(poolState.reserves, consolidation.rInt, index, baseTokenIdx);
    prices.push(Number(price) / Number(PRECISION));
  }

  return prices;
}

export function estimateOutput(
  poolState: PoolState,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint,
): { amountOut: bigint; priceImpact: number } {
  const quote = getSwapQuote(poolState, tokenInIdx, tokenOutIdx, amountIn);
  return {
    amountOut: quote.amountOut,
    priceImpact: quote.priceImpact,
  };
}

/**
 * Compute capital efficiency for a given depeg price and tick radius.
 *
 * @param tickRadius  Tick radius in AMOUNT_SCALE units
 * @returns  k in AMOUNT_SCALE units; depositPerToken in raw microunits
 */
export function getCapitalEfficiencyForDepegPrice(
  poolState: PoolState,
  depegPrice: number,
  tickRadius: bigint,
): { k: bigint; efficiency: number; depositPerToken: bigint } {
  const k = kFromDepegPrice(
    depegPrice,
    tickRadius,
    poolState.n,
    poolState.sqrtN,
    poolState.invSqrtN,
  );

  const efficiency = capitalEfficiency(
    tickRadius,
    k,
    poolState.n,
    poolState.sqrtN,
    poolState.invSqrtN,
  );

  // q and xmin are in AMOUNT_SCALE units
  const q = tickRadius - (tickRadius * poolState.invSqrtN) / PRECISION;
  const xmin = (q * PRECISION) / BigInt(Math.round(efficiency * Number(PRECISION)));
  const depositPerTokenScaled = q - xmin;

  // Return deposit in raw microunits so the frontend can display directly
  return { k, efficiency, depositPerToken: depositPerTokenScaled * AMOUNT_SCALE };
}
