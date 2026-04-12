export enum TickState {
  INTERIOR = 0,
  BOUNDARY = 1,
}

// ── Tick ─────────────────────────────────────────────────────────────────────
// Represents one concentrated-liquidity position in the pool.
//
// v2/v3 BREAKING CHANGES vs v1:
//   - lpAddress removed (ownership lives in pos: boxes, not the tick itself)
//   - liquidity renamed to totalShares (sum of shares across all LPs in this tick)
//
// All r and k values are in AMOUNT_SCALE units (raw_microunits / 1_000).
// sqrtN and invSqrtN are in PRECISION units (× 10^9).
export interface Tick {
  id: number;
  r: bigint;          // AMOUNT_SCALE units
  k: bigint;          // AMOUNT_SCALE units
  state: TickState;
  totalShares: bigint; // sum of shares across all LPs in this tick
}

// ── Pool State ────────────────────────────────────────────────────────────────
// Full snapshot of on-chain pool state needed for math and transaction building.
//
// Unit notes:
//   reserves, sumX, sumXSq, virtualOffset, rInt, sBound, kBound, totalR
//     → AMOUNT_SCALE units (raw_microunits / 1_000)
//   sqrtN, invSqrtN
//     → PRECISION units (× 10^9)
//   feeGrowth
//     → PRECISION-scaled per-unit-r accumulator (monotone, never decreases)
//   feeBps
//     → basis points (e.g. 30 = 0.30%)
export interface PoolState {
  appId: number;
  n: number;
  sqrtN: bigint;          // PRECISION-scaled
  invSqrtN: bigint;       // PRECISION-scaled

  actualReservesRaw: bigint[]; // raw microunits from reserves box (no virtual offset)
  reserves: bigint[];     // AMOUNT_SCALE math reserves (actual/1000 + virtualOffset)
  sumX: bigint;           // AMOUNT_SCALE units
  sumXSq: bigint;         // raw squares of AMOUNT_SCALE values (AMOUNT_SCALE² units)
  virtualOffset: bigint;  // AMOUNT_SCALE units

  rInt: bigint;           // AMOUNT_SCALE units — consolidated interior radius
  sBound: bigint;         // AMOUNT_SCALE units — consolidated boundary sphere radius
  kBound: bigint;         // AMOUNT_SCALE units — consolidated boundary plane constant
  totalR: bigint;         // AMOUNT_SCALE units — sum of r across ALL ticks
  feeBps: bigint;         // basis points (e.g. 30 = 0.30%)
  numTicks: number;       // monotonically increasing tick counter (next tick ID)

  ticks: Tick[];
  tokenAsaIds: number[];
  tokenDecimals: number[];

  feeGrowth: bigint[];    // n-element PRECISION-scaled fee accumulators (one per token)
}

// ── Position Info ─────────────────────────────────────────────────────────────
// One LP's position for a specific tick, read from the pos: box.
export interface PositionInfo {
  tickId: number;
  shares: bigint;
  positionR: bigint;       // tick.r * shares / tick.totalShares (AMOUNT_SCALE units)
  claimableFees: bigint[]; // per-token claimable fees in raw microunits
}

// ── Swap Quote ────────────────────────────────────────────────────────────────
// All amountIn / amountOut values are in raw microunits.
export interface SwapQuote {
  amountIn: bigint;           // raw microunits
  amountOut: bigint;          // raw microunits
  priceImpact: number;        // 0.01 = 1%
  instantaneousPrice: number; // price before trade
  effectivePrice: number;     // average execution price
  ticksCrossed: number;
  route: TradeSegment[];      // segments in AMOUNT_SCALE units (internal)
}

// ── Trade Segment ─────────────────────────────────────────────────────────────
// Internal representation — amounts in AMOUNT_SCALE units.
// Encoded into the trade_recipe bytes for on-chain submission after × AMOUNT_SCALE.
export interface TradeSegment {
  amountIn: bigint;             // AMOUNT_SCALE units
  amountOut: bigint;            // AMOUNT_SCALE units
  tickCrossedId: number | null;
  newTickState: TickState | null;
}

// ── Trade Recipe ──────────────────────────────────────────────────────────────
// Built from a SwapQuote for submission to swap_with_crossings.
// Amounts are in raw microunits (converted from AMOUNT_SCALE before encoding).
export interface TradeRecipe {
  tokenInIdx: number;
  tokenOutIdx: number;
  totalAmountIn: bigint;      // raw microunits (what the ASA transfer sends; includes fee)
  effectiveAmountIn: bigint;  // raw microunits (totalAmountIn - fee; what segments must sum to)
  totalAmountOut: bigint;     // raw microunits
  minAmountOut: bigint;       // raw microunits
  segments: TradeSegment[];   // AMOUNT_SCALE units internally
}

// ── Capital Efficiency ────────────────────────────────────────────────────────
export interface CapitalEfficiency {
  depegPrice: number;
  efficiencyMultiplier: number;
  virtualReservesPerToken: bigint;
  actualDepositPerToken: bigint;
}

// ── LP Position (legacy / high-level) ────────────────────────────────────────
export interface LPPosition {
  tickId: number;
  shares: bigint;
  currentValue: bigint[];
  depositValue: bigint[];
  earnedFees: bigint[];
}

// ── SDK Configuration ─────────────────────────────────────────────────────────
export interface OrbitalConfig {
  algodUrl: string;
  algodToken: string;
  algodPort?: number;
  poolAppId: number;
}
