export { executeSwap, getSwapQuote } from "./pool/swap";
export { readPoolState } from "./pool/state-reader";
export {
  getAllPrices,
  estimateOutput,
  getCapitalEfficiencyForDepegPrice,
} from "./pool/quote";
export {
  addLiquidity,
  removeLiquidity,
  computeDepositPerToken,
  tickParamsFromDepegPrice,
} from "./pool/liquidity";
export type { AddLiquidityParams, AddLiquidityResult, RemoveLiquidityParams, RemoveLiquidityResult } from "./pool/liquidity";
export { buildSwapGroup, buildCrossingSwapGroup } from "./algorand/transactions";
export { createAlgodClient } from "./algorand/client";

export {
  sphereInvariant,
  getPrice,
  equalPricePoint,
  solveSwapSphere,
  computeAggregates,
  updateAggregates,
} from "./math/sphere";
export { torusInvariant, isValidState } from "./math/torus";
export { solveSwapNewton } from "./math/newton";
export { consolidateTicks, normalizedInteriorProjection } from "./math/consolidation";
export {
  capitalEfficiency,
  kFromDepegPrice,
  kMin,
  kMax,
  xMin,
  xMax,
  virtualReserves,
} from "./math/ticks";
export { executeTradeWithCrossings } from "./math/tick-crossing";
export { sqrt, abs, min, max, div, mulScaled, divScaled, clamp } from "./math/bigint-math";

export type {
  PoolState,
  Tick,
  SwapQuote,
  TradeSegment,
  TradeRecipe,
  CapitalEfficiency,
  LPPosition,
  OrbitalConfig,
} from "./types";
export { TickState } from "./types";

export {
  PRECISION,
  PRECISION_SQ,
  TOLERANCE,
  SQRT_TABLE,
  INV_SQRT_TABLE,
  MAX_NEWTON_ITERATIONS,
  MAX_BISECTION_STEPS,
  MAX_BRACKET_SAMPLES,
  MAX_TICK_CROSSINGS,
  DEFAULT_SLIPPAGE_BPS,
  ALGO_MICRO,
  MIN_TXN_FEE,
  OPCODE_BUDGET_PER_TXN,
} from "./constants";
