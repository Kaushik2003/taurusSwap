export enum TickState {
  INTERIOR = 0,
  BOUNDARY = 1,
}

export interface Tick {
  id: number;
  r: bigint;
  k: bigint;
  state: TickState;
  liquidity: bigint;
  lpAddress: string;
}

export interface PoolState {
  appId: number;
  n: number;
  sqrtN: bigint;
  invSqrtN: bigint;

  // MATH reserves = actual_reserve + virtualOffset.
  // All invariant math operates in this coordinate space.
  reserves: bigint[];
  sumX: bigint;
  sumXSq: bigint;        // Σxᵢ² in PRECISION² units (raw squares, matching contract)
  virtualOffset: bigint; // Added to each box reserve to convert actual → math

  rInt: bigint;
  sBound: bigint;
  kBound: bigint;
  ticks: Tick[];
  tokenAsaIds: number[];
  tokenDecimals: number[];
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  instantaneousPrice: number;
  effectivePrice: number;
  ticksCrossed: number;
  route: TradeSegment[];
}

export interface TradeSegment {
  amountIn: bigint;
  amountOut: bigint;
  tickCrossedId: number | null;
  newTickState: TickState | null;
}

export interface TradeRecipe {
  tokenInIdx: number;
  tokenOutIdx: number;
  totalAmountIn: bigint;
  totalAmountOut: bigint;
  minAmountOut: bigint;
  segments: TradeSegment[];
}

export interface CapitalEfficiency {
  depegPrice: number;
  efficiencyMultiplier: number;
  virtualReservesPerToken: bigint;
  actualDepositPerToken: bigint;
}

export interface LPPosition {
  tickId: number;
  shares: bigint;
  currentValue: bigint[];
  depositValue: bigint[];
  earnedFees: bigint[];
}

export interface OrbitalConfig {
  algodUrl: string;
  algodToken: string;
  algodPort?: number;
  poolAppId: number;
}
