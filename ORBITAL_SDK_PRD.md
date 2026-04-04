# Orbital AMM TypeScript SDK — Complete Specification

## What This Document Is

This is a file-by-file, function-by-function specification for the off-chain TypeScript SDK that powers the Orbital AMM on Algorand. Every file is listed with its complete code. An agent or human can read this top-to-bottom and build the entire SDK.

The SDK has three jobs:
1. **Math engine** — compute swaps, capital efficiency, tick crossings using BigInt arithmetic
2. **Algorand client** — read pool state from chain, build transaction groups, submit them
3. **Public API** — expose simple functions the frontend calls: `swap()`, `addLiquidity()`, `quote()`

---

## Project Setup

### Directory structure

```
orbital-sdk/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public API re-exports
│   ├── constants.ts                # Precision, scaling factors, precomputed values
│   ├── types.ts                    # All type definitions
│   ├── math/
│   │   ├── bigint-math.ts          # BigInt sqrt, abs, min, max helpers
│   │   ├── sphere.ts               # Sphere AMM invariant and pricing
│   │   ├── ticks.ts                # Tick bounds, virtual reserves, capital efficiency
│   │   ├── consolidation.ts        # Tick consolidation logic
│   │   ├── torus.ts                # Torus invariant computation
│   │   ├── newton.ts               # Newton solver for swaps
│   │   └── tick-crossing.ts        # Tick crossing detection and trade segmentation
│   ├── pool/
│   │   ├── state-reader.ts         # Read on-chain pool state
│   │   ├── swap.ts                 # High-level swap orchestration
│   │   ├── liquidity.ts            # Add/remove liquidity
│   │   └── quote.ts               # Price quotes without executing
│   ├── algorand/
│   │   ├── client.ts               # Algod client wrapper
│   │   ├── transactions.ts         # Atomic group builders
│   │   ├── budget.ts               # Budget pooling helpers
│   │   ├── box-encoding.ts         # Box read/write encoding
│   │   └── abi.ts                  # ABI method selectors and encoding
│   └── utils/
│       └── encoding.ts             # Uint8Array <-> BigInt converters
└── tests/
    ├── math.test.ts
    ├── swap.test.ts
    └── integration.test.ts
```

### package.json

```json
{
  "name": "@orbital-amm/sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for the Orbital AMM on Algorand",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "algosdk": "^3.0.0",
    "@algorandfoundation/algokit-utils": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@types/node": "^20.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Why ES2020**: BigInt literals (`123n`) require ES2020 target. This is non-negotiable — all AMM math uses BigInt.

---

## File 1: `src/constants.ts`

Every number in the system is a BigInt scaled by PRECISION. This file defines those scaling constants and precomputed values for common pool sizes.

```typescript
// src/constants.ts

// ============================================================
// PRECISION
// ============================================================
// All reserves, radii, and k values are stored as integers
// scaled by this factor. 10^9 gives 9 decimal places of
// precision and fits comfortably in uint64 for typical pool sizes.
//
// Example: a reserve of 553.589838 tokens is stored as
// 553_589_838n (553589838n).
// ============================================================
export const PRECISION = 1_000_000_000n; // 10^9

// For intermediate calculations that need more precision
// (e.g., multiplying two PRECISION-scaled numbers)
export const PRECISION_SQ = PRECISION * PRECISION; // 10^18

// Tolerance for invariant verification.
// After computing LHS - RHS of the torus invariant, if
// |LHS - RHS| < TOLERANCE, we consider the state valid.
// This accounts for rounding in integer arithmetic.
// Value: 1000 in PRECISION^2 units ≈ 10^-15 in real units.
export const TOLERANCE = 1000n;

// ============================================================
// PRECOMPUTED SQRT(N) VALUES
// ============================================================
// sqrt(n) scaled by PRECISION. These are floor values.
// The on-chain contract also stores these and verifies them.
//
// How to compute: floor(sqrt(n) * 10^9)
// You can verify in Python: int(math.sqrt(5) * 10**9)
// ============================================================
export const SQRT_TABLE: Record<number, bigint> = {
  2: 1_414_213_562n,
  3: 1_732_050_808n,
  4: 2_000_000_000n,
  5: 2_236_067_977n,
  6: 2_449_489_743n,
  7: 2_645_751_311n,
  8: 2_828_427_125n,
  9: 3_000_000_000n,
  10: 3_162_277_660n,
  15: 3_872_983_346n,
  20: 4_472_135_955n,
  50: 7_071_067_812n,
  100: 10_000_000_000n,
};

// 1/sqrt(n) scaled by PRECISION
export const INV_SQRT_TABLE: Record<number, bigint> = {
  2: 707_106_781n,
  3: 577_350_269n,
  4: 500_000_000n,
  5: 447_213_595n,
  6: 408_248_290n,
  7: 377_964_473n,
  8: 353_553_391n,
  9: 333_333_333n,
  10: 316_227_766n,
  15: 258_198_890n,
  20: 223_606_798n,
  50: 141_421_356n,
  100: 100_000_000n,
};

// Maximum Newton iterations for swap solver
export const MAX_NEWTON_ITERATIONS = 50;

// Maximum tick crossings per trade before we abort
// (safety valve — in practice, rarely exceeds 3-4)
export const MAX_TICK_CROSSINGS = 20;

// Default slippage tolerance in basis points (0.5%)
export const DEFAULT_SLIPPAGE_BPS = 50;

// Algorand-specific constants
export const ALGO_MICRO = 1_000_000n; // 1 ALGO = 1,000,000 microAlgo
export const MIN_TXN_FEE = 1000n; // minimum transaction fee in microAlgo
export const OPCODE_BUDGET_PER_TXN = 700; // budget per app call
```

---

## File 2: `src/types.ts`

Every data structure used throughout the SDK. These types are shared between math, pool, and algorand layers.

```typescript
// src/types.ts

// ============================================================
// TICK STATE
// ============================================================
export enum TickState {
  INTERIOR = 0,   // Reserves NOT on the tick boundary
  BOUNDARY = 1,   // Reserves pinned to the tick boundary
}

// ============================================================
// TICK — represents one liquidity position
// ============================================================
export interface Tick {
  id: number;              // Unique tick ID within the pool
  r: bigint;               // Radius (scaled by PRECISION)
  k: bigint;               // Plane constant (scaled by PRECISION)
  state: TickState;        // Current state
  liquidity: bigint;       // LP shares in this tick
  lpAddress: string;       // Owner's Algorand address
}

// ============================================================
// POOL STATE — everything we need to know about the pool
// ============================================================
export interface PoolState {
  appId: number;            // Algorand application ID
  n: number;                // Number of tokens
  sqrtN: bigint;            // sqrt(n) scaled by PRECISION
  invSqrtN: bigint;         // 1/sqrt(n) scaled by PRECISION

  // Reserves
  reserves: bigint[];       // [x_1, x_2, ..., x_n] scaled by PRECISION
  sumX: bigint;             // Sum of reserves
  sumXSq: bigint;           // Sum of squared reserves (scaled by PRECISION^2)

  // Consolidation parameters
  rInt: bigint;             // Consolidated interior radius
  sBound: bigint;           // Consolidated boundary radius
  kBound: bigint;           // Consolidated boundary k

  // Tick data
  ticks: Tick[];            // All ticks in the pool

  // Token info
  tokenAsaIds: number[];    // ASA IDs for each token [0..n-1]
  tokenDecimals: number[];  // Decimals per token (usually 6 for stables)
}

// ============================================================
// SWAP QUOTE — result of a price quote (no execution)
// ============================================================
export interface SwapQuote {
  amountIn: bigint;         // Input amount (scaled)
  amountOut: bigint;        // Expected output (scaled)
  priceImpact: number;      // Price impact as a decimal (0.01 = 1%)
  instantaneousPrice: number; // Current price before trade
  effectivePrice: number;   // Average price of this trade
  ticksCrossed: number;     // Number of tick boundaries crossed
  route: TradeSegment[];    // The trade recipe
}

// ============================================================
// TRADE SEGMENT — one piece of a multi-segment trade
// ============================================================
export interface TradeSegment {
  amountIn: bigint;                    // Input for this segment
  amountOut: bigint;                   // Output for this segment
  tickCrossedId: number | null;        // Tick that changed state (null if none)
  newTickState: TickState | null;      // New state of the crossed tick
}

// ============================================================
// TRADE RECIPE — full trade specification for on-chain submission
// ============================================================
export interface TradeRecipe {
  tokenInIdx: number;
  tokenOutIdx: number;
  totalAmountIn: bigint;
  totalAmountOut: bigint;
  minAmountOut: bigint;
  segments: TradeSegment[];
}

// ============================================================
// CAPITAL EFFICIENCY INFO
// ============================================================
export interface CapitalEfficiency {
  depegPrice: number;       // The depeg price this tick covers (e.g., 0.99)
  efficiencyMultiplier: number; // e.g., 150 means 150x more efficient
  virtualReservesPerToken: bigint;
  actualDepositPerToken: bigint;
}

// ============================================================
// LP POSITION
// ============================================================
export interface LPPosition {
  tickId: number;
  shares: bigint;
  currentValue: bigint[];   // Current value per token
  depositValue: bigint[];   // Original deposit per token
  earnedFees: bigint[];     // Fees earned per token
}

// ============================================================
// SDK CONFIGURATION
// ============================================================
export interface OrbitalConfig {
  algodUrl: string;         // e.g., "http://localhost:4001"
  algodToken: string;       // API token
  algodPort?: number;
  poolAppId: number;        // Deployed pool contract app ID
}
```

---

## File 3: `src/math/bigint-math.ts`

BigInt has no built-in `sqrt`, `abs`, `min`, `max`. We implement them here. These are used everywhere.

```typescript
// src/math/bigint-math.ts

/**
 * Integer square root using Newton's method.
 * Returns floor(sqrt(n)).
 *
 * This is critical for the Orbital math — the sphere invariant,
 * tick bounds, and torus all require sqrt.
 *
 * Algorithm: Newton's method for x^2 = n
 *   x_{k+1} = (x_k + n / x_k) / 2
 * Converges in O(log(log(n))) iterations.
 */
export function sqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("sqrt of negative number");
  if (n === 0n) return 0n;
  if (n === 1n) return 1n;

  // Initial guess: start with n/2 or a bit-length estimate
  let x = n;
  let y = (x + 1n) / 2n;

  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }

  return x;
}

/**
 * Absolute value for BigInt.
 */
export function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

/**
 * Minimum of two BigInts.
 */
export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Maximum of two BigInts.
 */
export function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Safe division that rounds toward zero (BigInt default).
 * Throws on division by zero.
 */
export function div(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new Error("Division by zero");
  return a / b;
}

/**
 * Multiply two PRECISION-scaled values and return a PRECISION-scaled result.
 * mulScaled(a, b) = (a * b) / PRECISION
 *
 * This is the most common operation: when both a and b are in PRECISION units,
 * their product is in PRECISION^2 units, so we divide by PRECISION to get back.
 */
export function mulScaled(a: bigint, b: bigint, precision: bigint): bigint {
  return (a * b) / precision;
}

/**
 * Divide two PRECISION-scaled values and return a PRECISION-scaled result.
 * divScaled(a, b) = (a * PRECISION) / b
 *
 * When both a and b are in PRECISION units, a/b gives a dimensionless ratio.
 * We multiply a by PRECISION first to keep the result in PRECISION units.
 */
export function divScaled(a: bigint, b: bigint, precision: bigint): bigint {
  if (b === 0n) throw new Error("Division by zero");
  return (a * precision) / b;
}

/**
 * Clamp a value to [lo, hi].
 */
export function clamp(val: bigint, lo: bigint, hi: bigint): bigint {
  if (val < lo) return lo;
  if (val > hi) return hi;
  return val;
}
```

---

## File 4: `src/math/sphere.ts`

The sphere AMM — the foundation of Orbital. Every other math module builds on this.

```typescript
// src/math/sphere.ts

import { PRECISION } from "../constants";
import { sqrt, mulScaled, divScaled } from "./bigint-math";

/**
 * Compute the sphere invariant residual.
 * Returns sum((r - x_i)^2) - r^2, which should be 0 for valid state.
 *
 * All values are in PRECISION units. The result is in PRECISION^2 units.
 *
 * @param reserves - array of n reserve values, each scaled by PRECISION
 * @param r - sphere radius, scaled by PRECISION
 * @returns residual (should be ≈ 0 for valid state)
 */
export function sphereInvariant(reserves: bigint[], r: bigint): bigint {
  let sumSq = 0n;
  for (const x of reserves) {
    const diff = r - x; // both in PRECISION units
    sumSq += diff * diff; // in PRECISION^2 units
  }
  return sumSq - r * r; // in PRECISION^2 units
}

/**
 * Compute the instantaneous price of tokenOut in terms of tokenIn.
 *
 * price = (r - reserves[tokenIn]) / (r - reserves[tokenOut])
 *
 * Returns a PRECISION-scaled value. If price = PRECISION, it means 1:1.
 *
 * @param reserves - reserve vector
 * @param r - sphere radius
 * @param tokenIn - index of token being sold
 * @param tokenOut - index of token being bought
 * @returns price scaled by PRECISION
 */
export function getPrice(
  reserves: bigint[],
  r: bigint,
  tokenIn: number,
  tokenOut: number
): bigint {
  const numerator = r - reserves[tokenIn];
  const denominator = r - reserves[tokenOut];

  if (denominator === 0n) {
    throw new Error("Token out reserves at maximum — price is infinite");
  }

  return divScaled(numerator, denominator, PRECISION);
}

/**
 * Compute the equal price point: the reserve value where all tokens
 * have equal reserves and therefore equal prices.
 *
 * q = r * (1 - 1/sqrt(n))
 *
 * @param r - sphere radius (PRECISION-scaled)
 * @param invSqrtN - 1/sqrt(n) (PRECISION-scaled)
 * @returns q value (PRECISION-scaled), same for each token
 */
export function equalPricePoint(r: bigint, invSqrtN: bigint): bigint {
  // q = r - r/sqrt(n) = r - r * invSqrtN / PRECISION
  return r - mulScaled(r, invSqrtN, PRECISION);
}

/**
 * Compute aggregate values from a reserve vector.
 * These are the only two values needed to evaluate the torus invariant.
 *
 * @param reserves - reserve vector
 * @returns { sumX, sumXSq } where sumX = Σx_i and sumXSq = Σx_i^2
 */
export function computeAggregates(reserves: bigint[]): {
  sumX: bigint;
  sumXSq: bigint;
} {
  let sumX = 0n;
  let sumXSq = 0n;
  for (const x of reserves) {
    sumX += x;
    sumXSq += (x * x) / PRECISION; // Keep in PRECISION units
  }
  return { sumX, sumXSq };
}

/**
 * Update aggregates after a trade.
 * Only the two affected tokens change — this is O(1).
 *
 * @param oldSumX - previous sum
 * @param oldSumXSq - previous sum of squares
 * @param oldXi - old reserves of token in
 * @param newXi - new reserves of token in (oldXi + amountIn)
 * @param oldXj - old reserves of token out
 * @param newXj - new reserves of token out (oldXj - amountOut)
 * @returns updated { sumX, sumXSq }
 */
export function updateAggregates(
  oldSumX: bigint,
  oldSumXSq: bigint,
  oldXi: bigint,
  newXi: bigint,
  oldXj: bigint,
  newXj: bigint
): { sumX: bigint; sumXSq: bigint } {
  const sumX = oldSumX + (newXi - oldXi) + (newXj - oldXj);

  // sumXSq change: add new^2, subtract old^2 for both tokens
  const sumXSq =
    oldSumXSq +
    (newXi * newXi) / PRECISION -
    (oldXi * oldXi) / PRECISION +
    (newXj * newXj) / PRECISION -
    (oldXj * oldXj) / PRECISION;

  return { sumX, sumXSq };
}

/**
 * Solve for the output amount on a pure sphere (single tick, no boundary).
 *
 * After adding `amountIn` to token i's reserves, find the amount to
 * remove from token j such that the sphere invariant still holds.
 *
 * This is a DIRECT solution (no Newton needed):
 *   new_x_j = r - sqrt(r^2 - sum((r - x_m)^2 for m != j))
 *
 * @returns amount of token j the user receives
 */
export function solveSwapSphere(
  amountIn: bigint,
  tokenIn: number,
  tokenOut: number,
  reserves: bigint[],
  r: bigint
): bigint {
  // Build new reserves with the input added
  const newReserves = [...reserves];
  newReserves[tokenIn] += amountIn;

  // Compute sum of (r - x_m)^2 for all m != tokenOut
  let sumOthers = 0n;
  for (let m = 0; m < newReserves.length; m++) {
    if (m === tokenOut) continue;
    const diff = r - newReserves[m];
    sumOthers += diff * diff; // PRECISION^2 units
  }

  // (r - x_j_new)^2 = r^2 - sumOthers
  const rSq = r * r; // PRECISION^2 units
  const xjDiffSq = rSq - sumOthers;

  if (xjDiffSq < 0n) {
    throw new Error("Trade too large — would violate sphere invariant");
  }

  // r - x_j_new = sqrt(xjDiffSq)
  // x_j_new = r - sqrt(xjDiffSq)
  const xjDiff = sqrt(xjDiffSq); // in PRECISION units
  const newXj = r - xjDiff;

  // Amount out = old x_j - new x_j
  const amountOut = reserves[tokenOut] - newXj;

  if (amountOut < 0n) {
    throw new Error("Negative output — trade too large");
  }

  return amountOut;
}
```

---

## File 5: `src/math/ticks.ts`

Tick parameter calculations: bounds, virtual reserves, capital efficiency.

```typescript
// src/math/ticks.ts

import { PRECISION } from "../constants";
import { sqrt, mulScaled, divScaled } from "./bigint-math";
import { equalPricePoint } from "./sphere";

/**
 * Minimum tick boundary constant.
 * k_min = r * (sqrt(n) - 1)
 * A tick with k = k_min has zero width.
 */
export function kMin(r: bigint, sqrtN: bigint): bigint {
  // k_min = r * sqrt(n) / PRECISION - r = r * (sqrt(n) - PRECISION) / PRECISION
  return mulScaled(r, sqrtN - PRECISION, PRECISION);
}

/**
 * Maximum tick boundary constant.
 * k_max = r * (n-1) / sqrt(n)
 */
export function kMax(r: bigint, n: number, sqrtN: bigint): bigint {
  const nMinus1 = BigInt(n - 1);
  return divScaled(r * nMinus1, sqrtN, PRECISION);
}

/**
 * Minimum reserve per token in a tick with plane constant k.
 *
 * Derivation (from the manual):
 *   c = n*r - k*sqrt(n)
 *   x_min = r - (c + sqrt((n-1) * (n*r^2 - c^2))) / n
 *
 * @returns x_min scaled by PRECISION
 */
export function xMin(r: bigint, k: bigint, n: number, sqrtN: bigint): bigint {
  const N = BigInt(n);

  // c = n*r - k*sqrt(n) / PRECISION
  // Note: k and sqrtN are both in PRECISION units
  // k * sqrtN is in PRECISION^2, divide by PRECISION to get PRECISION units
  const c = N * r - mulScaled(k, sqrtN, PRECISION);

  // discriminant = (n-1) * (n * r^2 - c^2)
  // r^2 and c^2 are in PRECISION^2, but we need to be careful with units
  const nR2 = N * r * r; // in PRECISION^2 units (no extra scaling)
  const c2 = c * c;       // in PRECISION^2 units
  const disc = (N - 1n) * (nR2 - c2);

  if (disc < 0n) {
    throw new Error(`Invalid tick parameters: discriminant negative (r=${r}, k=${k}, n=${n})`);
  }

  const sqrtDisc = sqrt(disc); // in PRECISION units

  // x_min = r - (c + sqrtDisc) / n
  const xmin = r - (c + sqrtDisc) / N;

  return xmin;
}

/**
 * Maximum reserve per token in a tick.
 * Uses the same formula but with the minus sign on the sqrt.
 */
export function xMax(r: bigint, k: bigint, n: number, sqrtN: bigint): bigint {
  const N = BigInt(n);
  const c = N * r - mulScaled(k, sqrtN, PRECISION);
  const nR2 = N * r * r;
  const c2 = c * c;
  const disc = (N - 1n) * (nR2 - c2);

  if (disc < 0n) {
    throw new Error("Invalid tick parameters: discriminant negative");
  }

  const sqrtDisc = sqrt(disc);

  // x_max = r - (c - sqrtDisc) / n
  const xmax = r - (c - sqrtDisc) / N;

  // Clamp to r (reserve can't exceed radius)
  return xmax > r ? r : xmax;
}

/**
 * Virtual reserves per token — the minimum that can never be withdrawn.
 * This is what makes concentrated liquidity possible.
 */
export function virtualReserves(
  r: bigint,
  k: bigint,
  n: number,
  sqrtN: bigint
): bigint {
  return xMin(r, k, n, sqrtN);
}

/**
 * Capital efficiency multiplier for a tick.
 *
 * efficiency = q / (q - x_min)
 *
 * where q = r * (1 - 1/sqrt(n)) is the per-token reserves at equal price.
 *
 * Returns as a float for display purposes.
 */
export function capitalEfficiency(
  r: bigint,
  k: bigint,
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint
): number {
  const q = equalPricePoint(r, invSqrtN);
  const xmin = xMin(r, k, n, sqrtN);
  const denominator = q - xmin;

  if (denominator <= 0n) return Infinity;

  // Convert to float for display
  return Number(q) / Number(denominator);
}

/**
 * Compute k from a target depeg price using binary search.
 *
 * The depeg price is the price at which the tick boundary kicks in,
 * assuming a single-token depeg event.
 *
 * @param depegPrice - target depeg price (e.g., 0.99 means tick covers down to $0.99)
 * @param r - tick radius
 * @param n - number of tokens
 * @param sqrtN - sqrt(n) scaled
 * @returns k scaled by PRECISION
 */
export function kFromDepegPrice(
  depegPrice: number,
  r: bigint,
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint
): bigint {
  const kLo = kMin(r, sqrtN);
  const kHi = kMax(r, n, sqrtN);

  // Binary search: 64 iterations gives precision to 1 part in 2^64
  let lo = kLo;
  let hi = kHi;

  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2n;

    // Compute the depeg price at this k
    const xMaxVal = xMax(r, mid, n, sqrtN);
    const N = BigInt(n);

    // x_other when one token is at x_max
    // x_other = (k * sqrt(n) - x_max) / (n-1)
    const kSqrtN = mulScaled(mid, sqrtN, PRECISION);
    const xOther = (kSqrtN - xMaxVal) / (N - 1n);

    // price = (r - x_other) / (r - x_max)
    const numerator = r - xOther;
    const denominator = r - xMaxVal;

    if (denominator <= 0n) {
      lo = mid;
      continue;
    }

    const price = Number(numerator) / Number(denominator);

    if (price > depegPrice) {
      lo = mid; // need wider tick (larger k)
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2n;
}
```

---

## File 6: `src/math/consolidation.ts`

Combining multiple ticks into consolidated parameters.

```typescript
// src/math/consolidation.ts

import { PRECISION } from "../constants";
import { sqrt, mulScaled } from "./bigint-math";
import { Tick, TickState } from "../types";

/**
 * Result of tick consolidation.
 *
 * This is what the torus invariant needs.
 */
export interface ConsolidationResult {
  rInt: bigint;        // Sum of interior tick radii
  sBound: bigint;      // Sum of boundary tick orthogonal radii
  kBound: bigint;      // Sum of boundary tick k values
  interiorTicks: Tick[];
  boundaryTicks: Tick[];
}

/**
 * Consolidate all ticks into two effective ticks:
 * one interior sphere, one boundary sphere.
 *
 * Interior ticks: simply sum their radii (r_int = Σ r_i)
 *
 * Boundary ticks: each has an effective radius in the orthogonal subspace:
 *   s_i = sqrt(r_i^2 - (k_i - r_i * sqrt(n))^2)
 * Sum these: s_bound = Σ s_i
 * And sum their k values: k_bound = Σ k_i
 */
export function consolidateTicks(
  ticks: Tick[],
  sqrtN: bigint
): ConsolidationResult {
  let rInt = 0n;
  let sBound = 0n;
  let kBound = 0n;
  const interiorTicks: Tick[] = [];
  const boundaryTicks: Tick[] = [];

  for (const tick of ticks) {
    if (tick.state === TickState.INTERIOR) {
      rInt += tick.r;
      interiorTicks.push(tick);
    } else {
      // s_i = sqrt(r_i^2 - (k_i - r_i * sqrt(n) / PRECISION)^2)
      const rSqrtN = mulScaled(tick.r, sqrtN, PRECISION);
      const diff = tick.k - rSqrtN; // k_i - r_i * sqrt(n)
      const rSq = tick.r * tick.r;
      const diffSq = diff * diff;
      const sSq = rSq - diffSq;

      if (sSq < 0n) {
        throw new Error(`Tick ${tick.id} has invalid parameters: s^2 < 0`);
      }

      sBound += sqrt(sSq);
      kBound += tick.k;
      boundaryTicks.push(tick);
    }
  }

  return { rInt, sBound, kBound, interiorTicks, boundaryTicks };
}

/**
 * Compute the normalized projection for comparing ticks.
 *
 * alpha_int_norm = alpha_int / r_int
 *
 * where alpha_int = sum_x / sqrt(n) - k_bound
 *
 * A tick with k_norm = k/r crosses when alpha_int_norm equals k_norm.
 */
export function normalizedInteriorProjection(
  sumX: bigint,
  invSqrtN: bigint,
  kBound: bigint,
  rInt: bigint
): bigint {
  if (rInt === 0n) return 0n;

  // alpha_total = sumX / sqrt(n) = sumX * invSqrtN / PRECISION
  const alphaTotal = mulScaled(sumX, invSqrtN, PRECISION);

  // alpha_int = alpha_total - k_bound
  const alphaInt = alphaTotal - kBound;

  // alpha_int_norm = alpha_int / r_int
  return (alphaInt * PRECISION) / rInt;
}
```

---

## File 7: `src/math/torus.ts`

The global trade invariant — the torus equation.

```typescript
// src/math/torus.ts

import { PRECISION } from "../constants";
import { sqrt, abs } from "./bigint-math";

/**
 * Evaluate the torus invariant.
 *
 * The invariant is:
 *   r_int^2 = (alpha_int - r_int * sqrt(n))^2 + (||w_total|| - s_bound)^2
 *
 * Returns LHS - RHS. Should be ≈ 0 for valid state.
 *
 * All inputs are in PRECISION units.
 * The return value is in PRECISION^2 units.
 */
export function torusInvariant(
  sumX: bigint,
  sumXSq: bigint,
  n: number,
  rInt: bigint,
  sBound: bigint,
  kBound: bigint,
  sqrtN: bigint,
  invSqrtN: bigint
): bigint {
  const N = BigInt(n);

  // ── alpha_int ──
  // alpha_total = sumX / sqrt(n) = sumX * invSqrtN / PRECISION
  const alphaTotal = (sumX * invSqrtN) / PRECISION;
  const alphaInt = alphaTotal - kBound;

  // ── term 1: (alpha_int - r_int * sqrt(n))^2 ──
  // r_int * sqrt(n) / PRECISION
  const rIntSqrtN = (rInt * sqrtN) / PRECISION;
  const diff1 = alphaInt - rIntSqrtN;
  const term1 = diff1 * diff1; // PRECISION^2 units

  // ── ||w_total|| ──
  // ||w||^2 = sum_x_sq - sum_x^2 / n
  // sumXSq is in PRECISION units (already divided by PRECISION once during compute)
  // sumX^2 / n is also computed carefully
  //
  // Actually, let's be more careful about units:
  // If reserves are in PRECISION units, then:
  //   sumXSq (as stored) = Σ(x_i^2 / PRECISION) → in PRECISION units
  //   sumX^2 = (Σx_i)^2 → in PRECISION^2 units
  //   sumX^2 / n → in PRECISION^2 units
  //   To match, we need sumXSq * PRECISION vs sumX^2 / n
  //
  // Let's define wTotalSq in PRECISION^2 units:
  const wTotalSq = sumXSq * PRECISION - (sumX * sumX) / N;

  // ||w_total|| in PRECISION units
  const wTotalNorm = wTotalSq >= 0n ? sqrt(wTotalSq) : 0n;

  // ── term 2: (||w_total|| - s_bound)^2 ──
  const diff2 = wTotalNorm - sBound;
  const term2 = diff2 * diff2; // PRECISION^2 units

  // ── invariant: r_int^2 = term1 + term2 ──
  const lhs = rInt * rInt; // PRECISION^2 units
  const rhs = term1 + term2;

  return lhs - rhs;
}

/**
 * Check if a state is valid (invariant holds within tolerance).
 */
export function isValidState(
  sumX: bigint,
  sumXSq: bigint,
  n: number,
  rInt: bigint,
  sBound: bigint,
  kBound: bigint,
  sqrtN: bigint,
  invSqrtN: bigint,
  tolerance: bigint
): boolean {
  const residual = torusInvariant(
    sumX, sumXSq, n, rInt, sBound, kBound, sqrtN, invSqrtN
  );
  return abs(residual) <= tolerance;
}
```

---

## File 8: `src/math/newton.ts`

The Newton solver for computing swap outputs against the torus invariant.

```typescript
// src/math/newton.ts

import { PRECISION, MAX_NEWTON_ITERATIONS, TOLERANCE } from "../constants";
import { abs, clamp } from "./bigint-math";
import { torusInvariant } from "./torus";
import { getPrice } from "./sphere";
import { updateAggregates } from "./sphere";

/**
 * Solve for the output amount of a swap using Newton's method
 * on the torus invariant.
 *
 * Given: user deposits `amountIn` of token `tokenIn`
 * Find: maximum `delta` of token `tokenOut` such that the
 *       torus invariant still holds.
 *
 * The equation is quartic in delta. Newton's method converges
 * quickly from a good initial guess (the instantaneous price).
 *
 * @returns amount of tokenOut the user receives
 */
export function solveSwapNewton(
  amountIn: bigint,
  tokenIn: number,
  tokenOut: number,
  reserves: bigint[],
  n: number,
  rInt: bigint,
  sBound: bigint,
  kBound: bigint,
  sqrtN: bigint,
  invSqrtN: bigint,
  sumX: bigint,
  sumXSq: bigint
): bigint {
  // ── Initial guess from instantaneous price ──
  // This is close to the final answer for small trades
  const price = getPrice(reserves, rInt, tokenIn, tokenOut);
  let delta = (amountIn * price) / PRECISION;

  // Clamp: can't take more than what's in the pool
  const maxDelta = reserves[tokenOut] - 1n; // leave at least 1
  if (delta > maxDelta) delta = maxDelta;
  if (delta <= 0n) delta = 1n; // at least try something

  // ── Newton iteration ──
  for (let iter = 0; iter < MAX_NEWTON_ITERATIONS; iter++) {
    // Compute the invariant residual at current delta
    const { sumX: newSumX, sumXSq: newSumXSq } = updateAggregates(
      sumX, sumXSq,
      reserves[tokenIn], reserves[tokenIn] + amountIn,
      reserves[tokenOut], reserves[tokenOut] - delta
    );

    const f = torusInvariant(
      newSumX, newSumXSq, n,
      rInt, sBound, kBound,
      sqrtN, invSqrtN
    );

    // Check convergence
    if (abs(f) <= TOLERANCE) break;

    // ── Numerical derivative: df/d(delta) ──
    // We perturb delta by a small epsilon and measure the change in f.
    // Since increasing delta DECREASES x_j (reserves[tokenOut] - delta),
    // we need: f(delta + eps) - f(delta) / eps
    const eps = PRECISION / 1_000_000n; // small perturbation
    if (eps === 0n) break; // precision too low

    const { sumX: epsSumX, sumXSq: epsSumXSq } = updateAggregates(
      sumX, sumXSq,
      reserves[tokenIn], reserves[tokenIn] + amountIn,
      reserves[tokenOut], reserves[tokenOut] - delta - eps
    );

    const fEps = torusInvariant(
      epsSumX, epsSumXSq, n,
      rInt, sBound, kBound,
      sqrtN, invSqrtN
    );

    const df = fEps - f; // Change in f when delta increases by eps
    if (df === 0n) break; // flat — can't improve

    // Newton step: delta_new = delta - f * eps / df
    const step = (f * eps) / df;
    delta = delta - step;

    // Clamp to valid range
    delta = clamp(delta, 1n, maxDelta);
  }

  // Final sanity check
  if (delta <= 0n) {
    throw new Error("Newton solver produced non-positive output");
  }

  return delta;
}
```

---

## File 9: `src/math/tick-crossing.ts`

Detecting and handling tick boundary crossings during large trades.

```typescript
// src/math/tick-crossing.ts

import { PRECISION, MAX_TICK_CROSSINGS } from "../constants";
import { abs } from "./bigint-math";
import { Tick, TickState, TradeSegment } from "../types";
import {
  consolidateTicks,
  normalizedInteriorProjection,
} from "./consolidation";
import { solveSwapNewton } from "./newton";
import { computeAggregates, updateAggregates } from "./sphere";

/**
 * Execute a trade that may cross tick boundaries.
 *
 * Algorithm:
 * 1. Consolidate ticks → (rInt, sBound, kBound)
 * 2. Try the full trade assuming no crossings
 * 3. Check if any tick boundary was crossed
 * 4. If yes: binary search for the exact crossing point,
 *    execute partial trade, flip tick, repeat
 *
 * @returns total output amount and the trade recipe (list of segments)
 */
export function executeTradeWithCrossings(
  amountIn: bigint,
  tokenIn: number,
  tokenOut: number,
  reserves: bigint[],
  ticks: Tick[],
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint
): { totalOutput: bigint; segments: TradeSegment[] } {
  let remainingInput = amountIn;
  let totalOutput = 0n;
  const segments: TradeSegment[] = [];
  let currentReserves = [...reserves];
  let currentTicks = ticks.map((t) => ({ ...t })); // deep copy

  for (let crossing = 0; crossing < MAX_TICK_CROSSINGS; crossing++) {
    if (remainingInput <= 0n) break;

    // Consolidate current tick states
    const consol = consolidateTicks(currentTicks, sqrtN);
    const { sumX, sumXSq } = computeAggregates(currentReserves);

    // If no interior ticks, we can only trade in the orthogonal subspace
    // (boundary-only case). For simplicity, handle this as a sphere trade.
    if (consol.rInt === 0n && consol.sBound === 0n) {
      throw new Error("No liquidity — all ticks exhausted");
    }

    // Try the full remaining trade
    let delta: bigint;
    try {
      delta = solveSwapNewton(
        remainingInput,
        tokenIn,
        tokenOut,
        currentReserves,
        n,
        consol.rInt,
        consol.sBound,
        consol.kBound,
        sqrtN,
        invSqrtN,
        sumX,
        sumXSq
      );
    } catch {
      // Newton failed — probably means trade is too large for current liquidity
      throw new Error("Trade too large for available liquidity");
    }

    // Compute the new state after the full trade
    const newReserves = [...currentReserves];
    newReserves[tokenIn] += remainingInput;
    newReserves[tokenOut] -= delta;

    const { sumX: newSumX } = computeAggregates(newReserves);

    // Check: did any tick cross its boundary?
    const newAlphaIntNorm = normalizedInteriorProjection(
      newSumX,
      invSqrtN,
      consol.kBound,
      consol.rInt
    );

    const crossingTick = findCrossingTick(
      newAlphaIntNorm,
      currentTicks,
      consol.interiorTicks,
      consol.boundaryTicks
    );

    if (crossingTick === null) {
      // No crossing! Trade is complete.
      segments.push({
        amountIn: remainingInput,
        amountOut: delta,
        tickCrossedId: null,
        newTickState: null,
      });
      totalOutput += delta;

      // Update reserves
      currentReserves[tokenIn] += remainingInput;
      currentReserves[tokenOut] -= delta;
      remainingInput = 0n;
    } else {
      // Crossing detected. Find the partial trade up to the crossing.
      const { partialIn, partialOut } = findCrossingPoint(
        remainingInput,
        tokenIn,
        tokenOut,
        currentReserves,
        n,
        consol,
        crossingTick,
        sqrtN,
        invSqrtN
      );

      segments.push({
        amountIn: partialIn,
        amountOut: partialOut,
        tickCrossedId: crossingTick.id,
        newTickState:
          crossingTick.state === TickState.INTERIOR
            ? TickState.BOUNDARY
            : TickState.INTERIOR,
      });

      totalOutput += partialOut;
      currentReserves[tokenIn] += partialIn;
      currentReserves[tokenOut] -= partialOut;
      remainingInput -= partialIn;

      // Flip the tick state
      const tickIdx = currentTicks.findIndex((t) => t.id === crossingTick.id);
      currentTicks[tickIdx] = {
        ...currentTicks[tickIdx],
        state:
          currentTicks[tickIdx].state === TickState.INTERIOR
            ? TickState.BOUNDARY
            : TickState.INTERIOR,
      };
    }
  }

  return { totalOutput, segments };
}

/**
 * Find which tick (if any) would cross its boundary given the
 * new normalized interior projection.
 */
function findCrossingTick(
  newAlphaIntNorm: bigint,
  _allTicks: Tick[],
  interiorTicks: Tick[],
  boundaryTicks: Tick[]
): Tick | null {
  // An interior tick crosses to boundary when alpha_int_norm >= k_norm
  // The closest to crossing is the one with the smallest k_norm
  let closestInterior: Tick | null = null;
  let closestKNorm = 0n;

  for (const tick of interiorTicks) {
    const kNorm = (tick.k * PRECISION) / tick.r;
    if (newAlphaIntNorm >= kNorm) {
      if (closestInterior === null || kNorm < closestKNorm) {
        closestInterior = tick;
        closestKNorm = kNorm;
      }
    }
  }

  // A boundary tick crosses to interior when alpha_int_norm <= k_norm
  let closestBoundary: Tick | null = null;
  let closestBKNorm = 0n;

  for (const tick of boundaryTicks) {
    const kNorm = (tick.k * PRECISION) / tick.r;
    if (newAlphaIntNorm <= kNorm) {
      if (closestBoundary === null || kNorm > closestBKNorm) {
        closestBoundary = tick;
        closestBKNorm = kNorm;
      }
    }
  }

  // Return the tick that crosses first (closest to current state)
  if (closestInterior !== null) return closestInterior;
  if (closestBoundary !== null) return closestBoundary;
  return null;
}

/**
 * Binary search for the exact input amount that reaches a tick crossing.
 */
function findCrossingPoint(
  maxInput: bigint,
  tokenIn: number,
  tokenOut: number,
  reserves: bigint[],
  n: number,
  consol: ReturnType<typeof consolidateTicks>,
  crossingTick: Tick,
  sqrtN: bigint,
  invSqrtN: bigint
): { partialIn: bigint; partialOut: bigint } {
  const targetKNorm = (crossingTick.k * PRECISION) / crossingTick.r;

  let lo = 0n;
  let hi = maxInput;

  const { sumX, sumXSq } = computeAggregates(reserves);

  // Binary search: 64 iterations for ~10^-19 precision
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2n;
    if (mid === lo) break;

    // Solve the trade with this much input
    let delta: bigint;
    try {
      delta = solveSwapNewton(
        mid, tokenIn, tokenOut, reserves, n,
        consol.rInt, consol.sBound, consol.kBound,
        sqrtN, invSqrtN, sumX, sumXSq
      );
    } catch {
      hi = mid;
      continue;
    }

    // Compute new alpha_int_norm
    const newReserves = [...reserves];
    newReserves[tokenIn] += mid;
    newReserves[tokenOut] -= delta;
    const { sumX: newSumX } = computeAggregates(newReserves);
    const alphaIntNorm = normalizedInteriorProjection(
      newSumX, invSqrtN, consol.kBound, consol.rInt
    );

    // Check if we've crossed
    if (crossingTick.state === TickState.INTERIOR) {
      // Interior tick crosses when alpha_int_norm >= k_norm
      if (alphaIntNorm >= targetKNorm) {
        hi = mid;
      } else {
        lo = mid;
      }
    } else {
      // Boundary tick crosses when alpha_int_norm <= k_norm
      if (alphaIntNorm <= targetKNorm) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
  }

  // Compute the output at the crossing point
  const partialIn = hi; // use the upper bound (inclusive of crossing)
  const partialOut = solveSwapNewton(
    partialIn, tokenIn, tokenOut, reserves, n,
    consol.rInt, consol.sBound, consol.kBound,
    sqrtN, invSqrtN, sumX, sumXSq
  );

  return { partialIn, partialOut };
}
```

---

## File 10: `src/pool/state-reader.ts`

Reading the on-chain pool state from Algorand.

```typescript
// src/pool/state-reader.ts

import algosdk from "algosdk";
import { PRECISION } from "../constants";
import { PoolState, Tick, TickState } from "../types";

/**
 * Read the full pool state from the Algorand blockchain.
 *
 * Reads:
 * - Global state (n, sumX, sumXSq, rInt, sBound, kBound, sqrtN, invSqrtN)
 * - Reserves box (full reserve vector)
 * - Tick boxes (all ticks)
 * - Token ASA IDs
 */
export async function readPoolState(
  client: algosdk.Algodv2,
  appId: number
): Promise<PoolState> {
  // ── Read global state ──
  const appInfo = await client
    .getApplicationByID(appId)
    .do();

  const globalState = parseGlobalState(appInfo.params["global-state"]);

  const n = Number(globalState["n"]);
  const sumX = globalState["sum_x"];
  const sumXSq = globalState["sum_x_sq"];
  const rInt = globalState["r_int"];
  const sBound = globalState["s_bound"];
  const kBound = globalState["k_bound"];
  const sqrtN = globalState["sqrt_n"];
  const invSqrtN = globalState["inv_sqrt_n"];
  const numTicks = Number(globalState["num_ticks"]);

  // ── Read reserves box ──
  const reservesBox = await client
    .getApplicationBoxByName(appId, new Uint8Array(Buffer.from("reserves")))
    .do();

  const reserves = decodeReservesBox(reservesBox.value, n);

  // ── Read tick boxes ──
  const ticks: Tick[] = [];
  for (let i = 0; i < numTicks; i++) {
    const boxName = new Uint8Array(Buffer.from(`tick:${i}`));
    try {
      const tickBox = await client
        .getApplicationBoxByName(appId, boxName)
        .do();
      ticks.push(decodeTickBox(tickBox.value, i));
    } catch {
      // Tick might have been removed
      continue;
    }
  }

  // ── Read token ASA IDs ──
  const tokenAsaIds: number[] = [];
  const tokenDecimals: number[] = [];
  for (let i = 0; i < n; i++) {
    const boxName = new Uint8Array(Buffer.from(`token:${i}`));
    const tokenBox = await client
      .getApplicationBoxByName(appId, boxName)
      .do();
    const asaId = Number(decodeBigUint(tokenBox.value));
    tokenAsaIds.push(asaId);

    // Get decimals from the ASA info
    const asaInfo = await client.getAssetByID(asaId).do();
    tokenDecimals.push(asaInfo.params.decimals);
  }

  return {
    appId,
    n,
    sqrtN,
    invSqrtN,
    reserves,
    sumX,
    sumXSq,
    rInt,
    sBound,
    kBound,
    ticks,
    tokenAsaIds,
    tokenDecimals,
  };
}

// ── Helper: parse global state from Algorand's key-value format ──
function parseGlobalState(
  state: Array<{ key: string; value: { type: number; uint: number } }>
): Record<string, bigint> {
  const result: Record<string, bigint> = {};
  for (const kv of state) {
    const key = Buffer.from(kv.key, "base64").toString();
    result[key] = BigInt(kv.value.uint);
  }
  return result;
}

// ── Helper: decode reserves from box bytes ──
function decodeReservesBox(data: Uint8Array, n: number): bigint[] {
  const reserves: bigint[] = [];
  for (let i = 0; i < n; i++) {
    const offset = i * 8;
    reserves.push(decodeBigUint(data.slice(offset, offset + 8)));
  }
  return reserves;
}

// ── Helper: decode a tick from box bytes ──
function decodeTickBox(data: Uint8Array, id: number): Tick {
  // Layout: r(8) | k(8) | state(1) | liquidity(8) | lpAddress(32)
  return {
    id,
    r: decodeBigUint(data.slice(0, 8)),
    k: decodeBigUint(data.slice(8, 16)),
    state: data[16] === 0 ? TickState.INTERIOR : TickState.BOUNDARY,
    liquidity: decodeBigUint(data.slice(17, 25)),
    lpAddress: algosdk.encodeAddress(data.slice(25, 57)),
  };
}

// ── Helper: big-endian bytes to BigInt ──
function decodeBigUint(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const b of bytes) {
    result = (result << 8n) | BigInt(b);
  }
  return result;
}
```

---

## File 11: `src/algorand/transactions.ts`

Building the atomic transaction groups for swaps.

```typescript
// src/algorand/transactions.ts

import algosdk from "algosdk";
import { PRECISION } from "../constants";
import { TradeRecipe } from "../types";
import { computeRequiredBudget } from "./budget";

/**
 * Build an atomic group for a simple swap (no tick crossings).
 *
 * Group structure:
 *   [0] ASA Transfer: user sends tokenIn to pool
 *   [1..N] NoOp app calls: budget pooling
 *   [N+1] App call: "swap" method with args
 *
 * Returns unsigned transactions. Caller must sign all.
 */
export async function buildSwapGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInAsaId: number,
  tokenOutAsaId: number,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint,
  computedAmountOut: bigint,
  minAmountOut: bigint
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddr = algosdk.getApplicationAddress(poolAppId);

  const txns: algosdk.Transaction[] = [];

  // ── 1. ASA transfer: user → pool ──
  txns.push(
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: poolAddr,
      amount: Number(amountIn),
      assetIndex: tokenInAsaId,
      suggestedParams: sp,
    })
  );

  // ── 2. Budget-pooling NoOp calls ──
  // Each adds 700 opcode budget. We need enough for the
  // swap verification (~200 opcodes for n=5).
  const numBudgetTxns = computeRequiredBudget(0); // 0 crossings

  for (let i = 0; i < numBudgetTxns; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [new Uint8Array(Buffer.from("budget"))],
        suggestedParams: sp,
      })
    );
  }

  // ── 3. The real swap call ──
  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [
        new Uint8Array(Buffer.from("swap")),
        algosdk.encodeUint64(tokenInIdx),
        algosdk.encodeUint64(tokenOutIdx),
        algosdk.encodeUint64(Number(amountIn)),
        algosdk.encodeUint64(Number(computedAmountOut)),
        algosdk.encodeUint64(Number(minAmountOut)),
      ],
      foreignAssets: [tokenOutAsaId],
      boxes: [
        { appIndex: poolAppId, name: new Uint8Array(Buffer.from("reserves")) },
      ],
      suggestedParams: sp,
    })
  );

  // Assign group ID
  algosdk.assignGroupID(txns);

  return txns;
}

/**
 * Build an atomic group for a swap with tick crossings.
 *
 * The trade recipe (computed off-chain) is ABI-encoded and passed
 * as an argument. The on-chain contract verifies each segment.
 */
export async function buildCrossingSwapGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInAsaId: number,
  tokenOutAsaId: number,
  recipe: TradeRecipe
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddr = algosdk.getApplicationAddress(poolAppId);

  const txns: algosdk.Transaction[] = [];

  // ASA transfer
  txns.push(
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: poolAddr,
      amount: Number(recipe.totalAmountIn),
      assetIndex: tokenInAsaId,
      suggestedParams: sp,
    })
  );

  // Budget pooling (more needed for multi-segment trades)
  const numBudgetTxns = computeRequiredBudget(recipe.segments.length);
  for (let i = 0; i < numBudgetTxns; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [new Uint8Array(Buffer.from("budget"))],
        suggestedParams: sp,
      })
    );
  }

  // Encode the trade recipe as bytes
  const recipeBytes = encodeTradeRecipe(recipe);

  // Swap call with recipe
  const boxRefs = [
    { appIndex: poolAppId, name: new Uint8Array(Buffer.from("reserves")) },
  ];
  // Add box refs for each tick that might be crossed
  for (const seg of recipe.segments) {
    if (seg.tickCrossedId !== null) {
      boxRefs.push({
        appIndex: poolAppId,
        name: new Uint8Array(Buffer.from(`tick:${seg.tickCrossedId}`)),
      });
    }
  }

  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [
        new Uint8Array(Buffer.from("swap_with_crossings")),
        algosdk.encodeUint64(recipe.tokenInIdx),
        algosdk.encodeUint64(recipe.tokenOutIdx),
        algosdk.encodeUint64(Number(recipe.totalAmountIn)),
        recipeBytes,
        algosdk.encodeUint64(Number(recipe.minAmountOut)),
      ],
      foreignAssets: [tokenInAsaId],
      boxes: boxRefs,
      suggestedParams: sp,
    })
  );

  algosdk.assignGroupID(txns);
  return txns;
}

/**
 * ABI-encode a trade recipe into bytes for on-chain consumption.
 *
 * Format per segment (25 bytes each):
 *   amountIn (8 bytes, big-endian uint64)
 *   amountOut (8 bytes, big-endian uint64)
 *   tickCrossedId (4 bytes, big-endian uint32, 0xFFFFFFFF if null)
 *   newTickState (1 byte, 0=INTERIOR, 1=BOUNDARY, 0xFF if null)
 */
function encodeTradeRecipe(recipe: TradeRecipe): Uint8Array {
  const SEGMENT_SIZE = 21; // 8 + 8 + 4 + 1
  const buf = new Uint8Array(recipe.segments.length * SEGMENT_SIZE);
  const view = new DataView(buf.buffer);

  for (let i = 0; i < recipe.segments.length; i++) {
    const seg = recipe.segments[i];
    const offset = i * SEGMENT_SIZE;

    // amountIn (8 bytes)
    view.setBigUint64(offset, seg.amountIn);
    // amountOut (8 bytes)
    view.setBigUint64(offset + 8, seg.amountOut);
    // tickCrossedId (4 bytes)
    view.setUint32(
      offset + 16,
      seg.tickCrossedId !== null ? seg.tickCrossedId : 0xffffffff
    );
    // newTickState (1 byte)
    buf[offset + 20] =
      seg.newTickState !== null ? seg.newTickState : 0xff;
  }

  return buf;
}
```

---

## File 12: `src/algorand/budget.ts`

Computing how many dummy transactions are needed for opcode budget.

```typescript
// src/algorand/budget.ts

import { OPCODE_BUDGET_PER_TXN } from "../constants";

/**
 * Compute the number of budget-pooling transactions needed.
 *
 * Base cost: ~200 opcodes for a simple swap verification
 * Per crossing: ~300 additional opcodes (re-consolidation + re-verification)
 * Safety margin: 1.5x
 *
 * Each NoOp transaction contributes 700 to the pooled budget.
 * The real swap transaction itself also contributes 700.
 */
export function computeRequiredBudget(numCrossings: number): number {
  const baseCost = 300; // verification + storage reads/writes
  const crossingCost = 400; // per tick crossing
  const totalCost = baseCost + crossingCost * numCrossings;
  const safetyMultiplier = 1.5;
  const requiredBudget = Math.ceil(totalCost * safetyMultiplier);

  // The swap txn itself gives 700. How many more do we need?
  const additionalNeeded = Math.max(
    0,
    Math.ceil((requiredBudget - OPCODE_BUDGET_PER_TXN) / OPCODE_BUDGET_PER_TXN)
  );

  // Cap at 14 (max group size is 16, minus the ASA transfer and the swap call)
  return Math.min(additionalNeeded, 14);
}
```

---

## File 13: `src/pool/swap.ts`

The high-level swap function that the frontend calls.

```typescript
// src/pool/swap.ts

import algosdk from "algosdk";
import { PRECISION, DEFAULT_SLIPPAGE_BPS } from "../constants";
import { PoolState, SwapQuote, TradeRecipe } from "../types";
import { readPoolState } from "./state-reader";
import { solveSwapNewton } from "../math/newton";
import { executeTradeWithCrossings } from "../math/tick-crossing";
import { consolidateTicks } from "../math/consolidation";
import { computeAggregates, getPrice } from "../math/sphere";
import { buildSwapGroup, buildCrossingSwapGroup } from "../algorand/transactions";

/**
 * Get a swap quote WITHOUT executing.
 * Call this on every keystroke (debounced) to show the user
 * the expected output, price impact, etc.
 */
export function getSwapQuote(
  poolState: PoolState,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint
): SwapQuote {
  const { reserves, ticks, n, sqrtN, invSqrtN } = poolState;

  // Get the instantaneous price before the trade
  const consol = consolidateTicks(ticks, sqrtN);
  const instantPrice = getPrice(reserves, consol.rInt, tokenInIdx, tokenOutIdx);

  // Compute the trade with potential crossings
  const { totalOutput, segments } = executeTradeWithCrossings(
    amountIn,
    tokenInIdx,
    tokenOutIdx,
    reserves,
    ticks,
    n,
    sqrtN,
    invSqrtN
  );

  // Effective price = amountOut / amountIn
  const effectivePrice =
    amountIn > 0n ? Number(totalOutput) / Number(amountIn) : 0;

  // Price impact = 1 - (effectivePrice / instantaneousPrice)
  const instantPriceFloat = Number(instantPrice) / Number(PRECISION);
  const priceImpact =
    instantPriceFloat > 0
      ? 1 - effectivePrice / instantPriceFloat
      : 0;

  return {
    amountIn,
    amountOut: totalOutput,
    priceImpact,
    instantaneousPrice: instantPriceFloat,
    effectivePrice,
    ticksCrossed: segments.filter((s) => s.tickCrossedId !== null).length,
    route: segments,
  };
}

/**
 * Execute a swap end-to-end.
 *
 * 1. Read pool state
 * 2. Compute optimal trade
 * 3. Build transaction group
 * 4. Sign and submit
 *
 * @param signer - function that signs transactions (e.g., from Pera Wallet)
 */
export async function executeSwap(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>
): Promise<{ txId: string; amountOut: bigint }> {
  // 1. Read current state
  const poolState = await readPoolState(client, poolAppId);

  // 2. Compute the quote
  const quote = getSwapQuote(poolState, tokenInIdx, tokenOutIdx, amountIn);

  // 3. Apply slippage tolerance
  const minAmountOut =
    (quote.amountOut * BigInt(10000 - slippageBps)) / 10000n;

  // 4. Build the transaction group
  let txns: algosdk.Transaction[];

  if (quote.ticksCrossed === 0) {
    // Simple swap — no crossings
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
      minAmountOut
    );
  } else {
    // Multi-segment swap with crossings
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
      recipe
    );
  }

  // 5. Sign
  const signedTxns = await signer(txns);

  // 6. Submit
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid, amountOut: quote.amountOut };
}
```

---

## File 14: `src/pool/quote.ts`

Quick quoting functions for the frontend.

```typescript
// src/pool/quote.ts

import { PRECISION } from "../constants";
import { PoolState } from "../types";
import { consolidateTicks } from "../math/consolidation";
import { getPrice } from "../math/sphere";
import { capitalEfficiency, kFromDepegPrice } from "../math/ticks";
import { getSwapQuote } from "./swap";

/**
 * Get all token prices relative to a base token.
 *
 * Returns an array where prices[i] is the price of token i
 * in terms of the base token.
 */
export function getAllPrices(
  poolState: PoolState,
  baseTokenIdx: number = 0
): number[] {
  const consol = consolidateTicks(poolState.ticks, poolState.sqrtN);
  const prices: number[] = [];

  for (let i = 0; i < poolState.n; i++) {
    if (i === baseTokenIdx) {
      prices.push(1.0);
    } else {
      const price = getPrice(
        poolState.reserves,
        consol.rInt,
        i,
        baseTokenIdx
      );
      prices.push(Number(price) / Number(PRECISION));
    }
  }

  return prices;
}

/**
 * Estimate output amount for a given input.
 * Used by the frontend on every keystroke (debounced).
 */
export function estimateOutput(
  poolState: PoolState,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint
): { amountOut: bigint; priceImpact: number } {
  const quote = getSwapQuote(poolState, tokenInIdx, tokenOutIdx, amountIn);
  return {
    amountOut: quote.amountOut,
    priceImpact: quote.priceImpact,
  };
}

/**
 * Get capital efficiency info for creating a new tick.
 * Used by the LP dashboard to show efficiency at different depeg thresholds.
 */
export function getCapitalEfficiencyForDepegPrice(
  poolState: PoolState,
  depegPrice: number,
  tickRadius: bigint
): {
  k: bigint;
  efficiency: number;
  depositPerToken: bigint;
} {
  const k = kFromDepegPrice(
    depegPrice,
    tickRadius,
    poolState.n,
    poolState.sqrtN,
    poolState.invSqrtN
  );

  const efficiency = capitalEfficiency(
    tickRadius,
    k,
    poolState.n,
    poolState.sqrtN,
    poolState.invSqrtN
  );

  const q = tickRadius - (tickRadius * poolState.invSqrtN) / PRECISION;
  const xmin = (q * PRECISION) / BigInt(Math.round(efficiency * Number(PRECISION)));
  const depositPerToken = q - xmin;

  return { k, efficiency, depositPerToken };
}
```

---

## File 15: `src/index.ts`

The public API — what consumers of the SDK import.

```typescript
// src/index.ts

// ── Public API ──
export { executeSwap, getSwapQuote } from "./pool/swap";
export { readPoolState } from "./pool/state-reader";
export { getAllPrices, estimateOutput, getCapitalEfficiencyForDepegPrice } from "./pool/quote";
export { buildSwapGroup, buildCrossingSwapGroup } from "./algorand/transactions";

// ── Math (exposed for advanced users / testing) ──
export { sphereInvariant, getPrice, equalPricePoint, solveSwapSphere } from "./math/sphere";
export { torusInvariant, isValidState } from "./math/torus";
export { solveSwapNewton } from "./math/newton";
export { consolidateTicks } from "./math/consolidation";
export { capitalEfficiency, kFromDepegPrice, kMin, kMax, xMin, xMax } from "./math/ticks";
export { executeTradeWithCrossings } from "./math/tick-crossing";
export { sqrt, abs, min, max } from "./math/bigint-math";

// ── Types ──
export type {
  PoolState, Tick, SwapQuote, TradeSegment, TradeRecipe,
  CapitalEfficiency, LPPosition, OrbitalConfig,
} from "./types";
export { TickState } from "./types";

// ── Constants ──
export { PRECISION, SQRT_TABLE, INV_SQRT_TABLE } from "./constants";
```

---

## How the Frontend Uses the SDK

Here is exactly how a React frontend integrates:

```typescript
// In your React app:

import {
  readPoolState,
  estimateOutput,
  executeSwap,
  getCapitalEfficiencyForDepegPrice,
  getAllPrices,
  PRECISION,
} from "@orbital-amm/sdk";
import algosdk from "algosdk";

// ── Setup ──
const client = new algosdk.Algodv2("", "http://localhost:4001", "");
const POOL_APP_ID = 12345; // your deployed app ID

// ── On page load: fetch pool state ──
const poolState = await readPoolState(client, POOL_APP_ID);
console.log("Pool has", poolState.n, "tokens");
console.log("Reserves:", poolState.reserves.map(r => Number(r) / 1e9));

// ── On every keystroke in the swap input (debounced 200ms) ──
const userInputAmount = 100; // user typed "100"
const amountInScaled = BigInt(userInputAmount) * PRECISION; // scale to internal units

const { amountOut, priceImpact } = estimateOutput(
  poolState,
  0,  // tokenIn index (e.g., USDC)
  1,  // tokenOut index (e.g., USDT)
  amountInScaled
);

// Display to user:
const outputDisplay = Number(amountOut) / Number(PRECISION);
console.log(`You receive: ${outputDisplay.toFixed(6)} USDT`);
console.log(`Price impact: ${(priceImpact * 100).toFixed(4)}%`);

// ── When user clicks "Swap" ──
const result = await executeSwap(
  client,
  POOL_APP_ID,
  "USER_ALGORAND_ADDRESS",
  0,  // tokenInIdx
  1,  // tokenOutIdx
  amountInScaled,
  50, // 0.5% slippage tolerance in basis points
  async (txns) => {
    // This is where Pera Wallet signs the transactions
    return await peraWallet.signTransactions(txns);
  }
);
console.log("Swap confirmed! TxID:", result.txId);
console.log("Received:", Number(result.amountOut) / 1e9, "USDT");

// ── For the LP dashboard: capital efficiency preview ──
const effInfo = getCapitalEfficiencyForDepegPrice(
  poolState,
  0.99,                // depeg price threshold
  500n * PRECISION     // tick radius
);
console.log(`Efficiency: ${effInfo.efficiency.toFixed(1)}x`);
console.log(`Deposit needed per token: ${Number(effInfo.depositPerToken) / 1e9}`);
```

---

## Testing Strategy

### Unit Tests (`tests/math.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import { sqrt } from "../src/math/bigint-math";
import { sphereInvariant, equalPricePoint, solveSwapSphere } from "../src/math/sphere";
import { kMin, kMax, xMin, capitalEfficiency } from "../src/math/ticks";
import { consolidateTicks } from "../src/math/consolidation";
import { torusInvariant } from "../src/math/torus";
import { PRECISION, SQRT_TABLE, INV_SQRT_TABLE } from "../src/constants";
import { TickState } from "../src/types";

describe("BigInt sqrt", () => {
  it("handles basic cases", () => {
    expect(sqrt(0n)).toBe(0n);
    expect(sqrt(1n)).toBe(1n);
    expect(sqrt(4n)).toBe(2n);
    expect(sqrt(9n)).toBe(3n);
    expect(sqrt(2n)).toBe(1n); // floor
  });

  it("handles large numbers", () => {
    const n = 1_000_000_000_000_000_000n; // 10^18
    expect(sqrt(n)).toBe(1_000_000_000n); // 10^9
  });
});

describe("Sphere AMM", () => {
  const n = 5;
  const r = 1000n * PRECISION;
  const sqrtN = SQRT_TABLE[n];
  const invSqrtN = INV_SQRT_TABLE[n];

  it("equal price point satisfies invariant", () => {
    const q = equalPricePoint(r, invSqrtN);
    const reserves = Array(n).fill(q);
    const residual = sphereInvariant(reserves, r);
    // Allow small tolerance due to integer rounding
    expect(residual < PRECISION && residual > -PRECISION).toBe(true);
  });

  it("single depeg point satisfies invariant", () => {
    // x = (0, r, r, r, r)
    const reserves = [0n, r, r, r, r];
    const residual = sphereInvariant(reserves, r);
    expect(residual).toBe(0n);
  });

  it("swap produces valid output", () => {
    const q = equalPricePoint(r, invSqrtN);
    const reserves = Array(n).fill(q);
    const amountIn = 10n * PRECISION; // swap 10 tokens

    const amountOut = solveSwapSphere(amountIn, 0, 1, reserves, r);
    expect(amountOut).toBeGreaterThan(0n);
    expect(amountOut).toBeLessThan(amountIn); // price impact

    // Verify new state satisfies invariant
    const newReserves = [...reserves];
    newReserves[0] += amountIn;
    newReserves[1] -= amountOut;
    const residual = sphereInvariant(newReserves, r);
    expect(residual < PRECISION && residual > -PRECISION).toBe(true);
  });
});

describe("Tick bounds", () => {
  const n = 5;
  const r = 1000n * PRECISION;
  const sqrtN = SQRT_TABLE[n];
  const invSqrtN = INV_SQRT_TABLE[n];

  it("k_min produces x_min equal to equal price point", () => {
    const kMinVal = kMin(r, sqrtN);
    const xMinVal = xMin(r, kMinVal, n, sqrtN);
    const q = equalPricePoint(r, invSqrtN);
    // Should be approximately equal
    const diff = xMinVal > q ? xMinVal - q : q - xMinVal;
    expect(diff < PRECISION).toBe(true);
  });

  it("capital efficiency increases with tighter ticks", () => {
    const kWide = kMax(r, n, sqrtN);
    const kTight = (kMin(r, sqrtN) + kMax(r, n, sqrtN)) / 2n;

    const effWide = capitalEfficiency(r, kWide, n, sqrtN, invSqrtN);
    const effTight = capitalEfficiency(r, kTight, n, sqrtN, invSqrtN);
    expect(effTight).toBeGreaterThan(effWide);
  });
});
```

Run tests: `npm test`

---

## Summary

The SDK has 15 files totaling roughly 1,200 lines of TypeScript. The dependency chain is:

```
constants.ts + types.ts
        ↓
  bigint-math.ts
        ↓
    sphere.ts → ticks.ts → consolidation.ts → torus.ts → newton.ts → tick-crossing.ts
                                                                            ↓
                                         state-reader.ts → swap.ts + quote.ts
                                                              ↓
                                                       transactions.ts + budget.ts
                                                              ↓
                                                          index.ts (re-exports)
```

Build bottom-up: start with `bigint-math.ts`, test it, then `sphere.ts`, test it, and so on up the chain. Each file only depends on the ones below it.
