// ── Pool operations ───────────────────────────────────────────────────────────
export { executeSwap, getSwapQuote } from "./pool/swap";
export { readPoolState, readPosition } from "./pool/state-reader";
export {
  getAllPrices,
  estimateOutput,
  getCapitalEfficiencyForDepegPrice,
} from "./pool/quote";
export {
  addLiquidity,
  removeLiquidity,
  claimFees,
  computeDepositPerToken,
  tickParamsFromDepegPrice,
} from "./pool/liquidity";
export type {
  AddLiquidityParams,
  AddLiquidityResult,
  RemoveLiquidityParams,
  RemoveLiquidityResult,
  ClaimFeesParams,
  ClaimFeesResult,
} from "./pool/liquidity";
export { computeZap } from "./pool/zap";
export type { ZapPlan, ZapSwap } from "./pool/zap";

// ── Transaction builders ──────────────────────────────────────────────────────
export {
  buildSwapGroup,
  buildCrossingSwapGroup,
  buildAddTickGroup,
  buildRemoveLiquidityGroup,
  buildClaimFeesGroup,
} from "./algorand/transactions";

// ── Algorand client ───────────────────────────────────────────────────────────
export { createAlgodClient } from "./algorand/client";

// ── Box encoding helpers ──────────────────────────────────────────────────────
export {
  encodeBoxName,
  encodeBoxMapKey,
  encodePositionBoxKey,
  encodePositionKeyBody,
  addressToPublicKey,
  decodeTickBox,
  decodePositionBox,
  decodeReservesBox,
} from "./algorand/box-encoding";

// ── Math ──────────────────────────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  PoolState,
  PositionInfo,
  Tick,
  SwapQuote,
  TradeSegment,
  TradeRecipe,
  CapitalEfficiency,
  LPPosition,
  OrbitalConfig,
} from "./types";
export { TickState } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────
export {
  PRECISION,
  PRECISION_SQ,
  AMOUNT_SCALE,
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
