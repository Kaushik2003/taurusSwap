/**
 * Brutal edge-case tests for the Orbital AMM SDK.
 *
 * Covers everything the existing tests don't:
 *  - Newton sphere-delta residual near-zero after solve
 *  - Fee deduction correctness
 *  - Swap quote monotonicity and price-impact direction
 *  - Symmetric swap loses to fees
 *  - n=5 pool: all token pairs return valid quotes
 *  - consolidateTicks: single / multi / boundary ticks
 *  - kFromDepegPrice / tickParamsFromDepegPrice sanity
 *  - Box encoding round-trips (decodeTickBox, decodePositionBox, keys)
 *  - getAllPrices at equal-price point ≈ 1.0
 *  - Large trades near reserve exhaustion
 *  - Error cases (same token, zero, too small)
 *  - computeDepositPerToken / capitalEfficiency relationships
 */

import { describe, test, expect } from "vitest";

import {
  AMOUNT_SCALE,
  PRECISION,
  SQRT_TABLE,
  INV_SQRT_TABLE,
  getSwapQuote,
  getAllPrices,
  estimateOutput,
  getCapitalEfficiencyForDepegPrice,
  tickParamsFromDepegPrice,
  computeDepositPerToken,
  consolidateTicks,
  kFromDepegPrice,
  kMin,
  kMax,
  xMin,
  xMax,
  capitalEfficiency,
  equalPricePoint,
  sphereInvariant,
  decodeTickBox,
  decodePositionBox,
  encodeBoxName,
  encodeBoxMapKey,
  encodePositionBoxKey,
  encodePositionKeyBody,
  addressToPublicKey,
  TickState,
  abs,
} from "../src/index";
import type { PoolState, Tick } from "../src/index";
import { buildDemoPoolState } from "./helpers/orbitalDemoPool";

// ── Pool builders ──────────────────────────────────────────────────────────────

/** n=2 balanced pool (1 000 tokens each, 6 decimals, feeBps=30) */
function pool2(): PoolState {
  return buildDemoPoolState();
}

/**
 * n=5 balanced pool at equal-price point.
 * reserveScaled = 1_000_000n AMOUNT_SCALE ≈ 1 000 tokens each.
 */
function pool5(): PoolState {
  const n = 5;
  const sqrtN = SQRT_TABLE[n];       // 2_236_067_977n
  const invSqrtN = INV_SQRT_TABLE[n]; // 447_213_596n

  const reserveScaled = 1_000_000n; // AMOUNT_SCALE units (= 10^9 raw = 1000 tokens)

  // rInt such that the equal-price point q ≈ reserveScaled
  // q = rInt * (PRECISION - invSqrtN) / PRECISION  →  rInt = q * PRECISION / (PRECISION - invSqrtN)
  const rInt = (reserveScaled * PRECISION) / (PRECISION - invSqrtN);

  // Recompute q from rInt (may differ by 1 due to bigint floor)
  const q = equalPricePoint(rInt, invSqrtN);

  const reserves = Array(n).fill(q) as bigint[];
  const sumX = reserves.reduce((s, x) => s + x, 0n);
  const sumXSq = reserves.reduce((s, x) => s + x * x, 0n);

  // Valid interior k: midpoint of [kMin, kMax]
  const kMinVal = kMin(rInt, sqrtN);
  const kMaxVal = kMax(rInt, n, sqrtN);
  const tickK = (kMinVal + kMaxVal) / 2n;

  const ticks: Tick[] = [
    {
      id: 0,
      r: rInt,
      k: tickK,
      state: TickState.INTERIOR,
      totalShares: rInt * AMOUNT_SCALE,
    },
  ];

  return {
    appId: 999_999,
    n,
    sqrtN,
    invSqrtN,
    reserves,
    sumX,
    sumXSq,
    virtualOffset: 0n,
    rInt,
    sBound: 0n,
    kBound: 0n,
    totalR: rInt,
    feeBps: 30n,
    numTicks: 1,
    ticks,
    tokenAsaIds: [1, 2, 3, 4, 5],
    tokenDecimals: [6, 6, 6, 6, 6],
    feeGrowth: Array(n).fill(0n) as bigint[],
  };
}

// ── Helper: sphere-delta residual ──────────────────────────────────────────────

/**
 * f(b) = (p0−a)² + (p1+b)² − p0² − p1²  (sphere-delta, same formula as newton.ts)
 *
 * If the Newton solver is correct, |f(amountOutScaled)| should be ≤ the derivative
 * magnitude over 1 AMOUNT_SCALE unit, i.e. |f| ≤ 2*(p1 + b) ≈ 2*rInt.
 */
function sphereDelta(
  pool: PoolState,
  tokenIn: number,
  tokenOut: number,
  effectiveInScaled: bigint, // AMOUNT_SCALE units
  amountOutScaled: bigint,   // AMOUNT_SCALE units
): bigint {
  const rInt = pool.rInt;
  const p0 = rInt - pool.reserves[tokenIn];
  const p1 = rInt - pool.reserves[tokenOut];
  const a = effectiveInScaled;
  const b = amountOutScaled;
  return -(2n * p0 * a) + a * a + 2n * p1 * b + b * b;
}

// ── 1. Newton solver — sphere-delta residual ──────────────────────────────────

describe("Newton solver — sphere-delta residual preservation", () => {
  test("n=2: residual is near-zero for a small swap (25 USDC)", () => {
    const pool = pool2();
    const amountInRaw = 25_000_000n; // 25 USDC
    const quote = getSwapQuote(pool, 0, 1, amountInRaw);

    // effectiveIn = amountIn − fee (fee = 30 bps)
    const fee = (amountInRaw * pool.feeBps) / 10_000n;
    const effectiveInScaled = (amountInRaw - fee) / AMOUNT_SCALE;
    const amountOutScaled = quote.amountOut / AMOUNT_SCALE;

    const residual = sphereDelta(pool, 0, 1, effectiveInScaled, amountOutScaled);

    // The solver converges to hi−lo ≤ 1 AMOUNT_SCALE unit.
    // Max residual error ≈ |∂f/∂b| × 1 = 2*(p1 + b) ≈ 2*rInt
    const tolerance = 4n * pool.rInt;
    expect(abs(residual)).toBeLessThanOrEqual(tolerance);
  });

  test("n=2: residual is near-zero for a medium swap (100 USDC)", () => {
    const pool = pool2();
    const amountInRaw = 100_000_000n;
    const quote = getSwapQuote(pool, 0, 1, amountInRaw);

    const fee = (amountInRaw * pool.feeBps) / 10_000n;
    const effectiveInScaled = (amountInRaw - fee) / AMOUNT_SCALE;
    const amountOutScaled = quote.amountOut / AMOUNT_SCALE;

    const residual = sphereDelta(pool, 0, 1, effectiveInScaled, amountOutScaled);
    const tolerance = 4n * pool.rInt;
    expect(abs(residual)).toBeLessThanOrEqual(tolerance);
  });

  test("n=5: residual is near-zero for a small swap (10 USDC)", () => {
    const pool = pool5();
    const amountInRaw = 10_000_000n; // 10 USDC (10^6 * 10)
    const quote = getSwapQuote(pool, 0, 2, amountInRaw);

    const fee = (amountInRaw * pool.feeBps) / 10_000n;
    const effectiveInScaled = (amountInRaw - fee) / AMOUNT_SCALE;
    const amountOutScaled = quote.amountOut / AMOUNT_SCALE;

    const residual = sphereDelta(pool, 0, 2, effectiveInScaled, amountOutScaled);
    const tolerance = 4n * pool.rInt;
    expect(abs(residual)).toBeLessThanOrEqual(tolerance);
  });

  test("n=2: amountOut is in raw microunits (not AMOUNT_SCALE)", () => {
    const pool = pool2();
    // amountIn = 1 USDC = 1_000_000n raw
    const quote = getSwapQuote(pool, 0, 1, 1_000_000n);
    // amountOut should also be in raw microunits — roughly 1 USDC worth = ~1_000_000n
    // Definitely should NOT be in AMOUNT_SCALE (which would be ~1_000n)
    expect(quote.amountOut).toBeGreaterThan(500_000n);   // > 0.5 USDC (raw)
    expect(quote.amountOut).toBeLessThan(2_000_000n);    // < 2 USDC (raw)
  });
});

// ── 2. Fee deduction ──────────────────────────────────────────────────────────

describe("Fee deduction", () => {
  test("quote.amountIn === amountInRaw (fee not subtracted from reported input)", () => {
    const pool = pool2();
    const amountInRaw = 50_000_000n;
    const quote = getSwapQuote(pool, 0, 1, amountInRaw);
    expect(quote.amountIn).toBe(amountInRaw);
  });

  test("effectivePrice reflects 30 bps fee drag", () => {
    const pool = pool2();
    // Use a tiny trade (0.1% of pool) so price impact is negligible — testing fee only.
    // At equal-price point, instantaneous price ≈ 1.0
    const quote = getSwapQuote(pool, 0, 1, 1_000_000n); // 1 USDC on 1000-USDC pool
    expect(quote.effectivePrice).toBeLessThan(quote.instantaneousPrice);
    // Fee is 30 bps = 0.30%; tiny price impact; effectivePrice should be > 0.994
    expect(quote.effectivePrice).toBeGreaterThan(0.994);
  });

  test("fee difference is ≈ feeBps/10000 of input (fee not double-counted)", () => {
    const pool = pool2();
    // Use a tiny trade (1 USDC on 1000-USDC pool) so price impact is negligible.
    // amountOut should be ≈ amountIn * (1 - 0.003) with negligible price impact.
    const amountInRaw = 1_000_000n;
    const quote = getSwapQuote(pool, 0, 1, amountInRaw);

    const actualRatio = Number(quote.amountOut) / Number(amountInRaw);
    // Should recover ≥ 99.2% (fee=0.30%, small price impact)
    expect(actualRatio).toBeGreaterThan(0.992);
    expect(actualRatio).toBeLessThan(1.0); // always lose something to fees
  });

  test("amount below AMOUNT_SCALE threshold throws", () => {
    const pool = pool2();
    // 999 raw: after 30 bps fee = 999 - 2 = 997 raw, / 1000 = 0 AMOUNT_SCALE → too small
    expect(() => getSwapQuote(pool, 0, 1, 999n)).toThrow();
  });

  test("minimum valid amount (1000 raw = 1 AMOUNT_SCALE after fee) returns quote", () => {
    const pool = pool2();
    // 1000 raw: fee = 0 (30*1000/10000 = 3 raw), effectiveIn = 997 raw, / 1000 = 0 → too small
    // 10_000 raw: fee = 3, effectiveIn = 9997 raw, / 1000 = 9 AMOUNT_SCALE → OK
    const quote = getSwapQuote(pool, 0, 1, 10_000n);
    expect(quote.amountOut).toBeGreaterThan(0n);
  });
});

// ── 3. Monotonicity ───────────────────────────────────────────────────────────

describe("Swap quote monotonicity", () => {
  test("larger amountIn → larger amountOut", () => {
    const pool = pool2();
    const small = getSwapQuote(pool, 0, 1, 10_000_000n);
    const medium = getSwapQuote(pool, 0, 1, 50_000_000n);
    const large = getSwapQuote(pool, 0, 1, 200_000_000n);

    expect(medium.amountOut).toBeGreaterThan(small.amountOut);
    expect(large.amountOut).toBeGreaterThan(medium.amountOut);
  });

  test("larger amountIn → worse effectivePrice (price impact)", () => {
    const pool = pool2();
    const small = getSwapQuote(pool, 0, 1, 10_000_000n);
    const large = getSwapQuote(pool, 0, 1, 200_000_000n);

    expect(large.effectivePrice).toBeLessThan(small.effectivePrice);
  });

  test("larger amountIn → larger priceImpact", () => {
    const pool = pool2();
    const small = getSwapQuote(pool, 0, 1, 10_000_000n);
    const large = getSwapQuote(pool, 0, 1, 500_000_000n);

    expect(large.priceImpact).toBeGreaterThan(small.priceImpact);
  });

  test("priceImpact is always positive", () => {
    const pool = pool2();
    for (const amt of [10_000n, 1_000_000n, 10_000_000n, 100_000_000n]) {
      const q = getSwapQuote(pool, 0, 1, amt);
      expect(q.priceImpact).toBeGreaterThan(0);
    }
  });

  test("n=5: monotone across multiple amounts", () => {
    const pool = pool5();
    const q1 = getSwapQuote(pool, 0, 3, 5_000_000n);
    const q2 = getSwapQuote(pool, 0, 3, 50_000_000n);
    const q3 = getSwapQuote(pool, 0, 3, 500_000_000n);
    expect(q2.amountOut).toBeGreaterThan(q1.amountOut);
    expect(q3.amountOut).toBeGreaterThan(q2.amountOut);
    expect(q3.priceImpact).toBeGreaterThan(q2.priceImpact);
  });
});

// ── 4. Symmetric swap (fees cause round-trip loss) ────────────────────────────

describe("Symmetric swap round-trip", () => {
  test("A→B then B→A returns less than you started with", () => {
    const pool = pool2();
    const startAmount = 100_000_000n; // 100 USDC

    const q1 = getSwapQuote(pool, 0, 1, startAmount);
    // Apply first swap to pool (manually update reserves for second quote)
    const fee1 = (startAmount * pool.feeBps) / 10_000n;
    const eff1 = startAmount - fee1;
    const p = { ...pool, reserves: [...pool.reserves] };
    p.reserves[0] = pool.reserves[0] + eff1 / AMOUNT_SCALE;
    p.reserves[1] = pool.reserves[1] - q1.amountOut / AMOUNT_SCALE;

    const q2 = getSwapQuote(p, 1, 0, q1.amountOut);
    // After two trades, end up with less due to fees + price impact
    expect(q2.amountOut).toBeLessThan(startAmount);

    // Sanity: not catastrophically bad — recover at least 99%
    const recoveryRatio = Number(q2.amountOut) / Number(startAmount);
    expect(recoveryRatio).toBeGreaterThan(0.99);
  });
});

// ── 5. Error cases ────────────────────────────────────────────────────────────

describe("getSwapQuote error cases", () => {
  test("throws on identical tokenIn and tokenOut", () => {
    const pool = pool2();
    expect(() => getSwapQuote(pool, 0, 0, 1_000_000n)).toThrow();
  });

  test("throws on zero amountIn", () => {
    const pool = pool2();
    expect(() => getSwapQuote(pool, 0, 1, 0n)).toThrow();
  });

  test("throws on negative amountIn", () => {
    const pool = pool2();
    expect(() => getSwapQuote(pool, 0, 1, -1n)).toThrow();
  });

  test("throws when tokenOut has no reserves", () => {
    const pool = pool2();
    const empty = { ...pool, reserves: [pool.reserves[0], 0n] };
    expect(() => getSwapQuote(empty, 0, 1, 1_000_000n)).toThrow();
  });
});

// ── 6. n=5 pool — all unique token pairs return valid quotes ──────────────────

describe("n=5 pool — multi-token swap coverage", () => {
  const PAIRS: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 0], [2, 0], [4, 0],
    [1, 3], [2, 4], [3, 1],
  ];

  for (const [tokenIn, tokenOut] of PAIRS) {
    test(`swap ${tokenIn}→${tokenOut} returns amountOut > 0`, () => {
      const pool = pool5();
      const quote = getSwapQuote(pool, tokenIn, tokenOut, 10_000_000n);
      expect(quote.amountOut).toBeGreaterThan(0n);
      expect(quote.amountOut).toBeLessThan(10_000_000n * 2n); // sanity bound
    });
  }

  test("n=5: priceImpact is positive for all pairs", () => {
    const pool = pool5();
    for (const [tokenIn, tokenOut] of PAIRS) {
      const q = getSwapQuote(pool, tokenIn, tokenOut, 10_000_000n);
      expect(q.priceImpact).toBeGreaterThan(0);
    }
  });
});

// ── 7. Large trade near reserve exhaustion ────────────────────────────────────

describe("Large trade edge cases", () => {
  test("can quote 80% of reserves (n=2)", () => {
    const pool = pool2();
    // reserves[0] is in AMOUNT_SCALE units; 80% of raw = 80% * reserves[0] * AMOUNT_SCALE
    const eightyPct = (pool.reserves[0] * AMOUNT_SCALE * 8n) / 10n;
    const quote = getSwapQuote(pool, 0, 1, eightyPct);
    expect(quote.amountOut).toBeGreaterThan(0n);
    expect(quote.amountOut).toBeLessThan(pool.reserves[1] * AMOUNT_SCALE);
    expect(quote.priceImpact).toBeGreaterThan(0.01); // significant impact
  });

  test("throws when trade would exceed available output (n=2)", () => {
    const pool = pool2();
    // More than the pool can output (reserves[1] * AMOUNT_SCALE is the max raw output)
    const way_too_much = pool.reserves[1] * AMOUNT_SCALE * 100n;
    expect(() => getSwapQuote(pool, 0, 1, way_too_much)).toThrow();
  });

  test("ticksCrossed is 0 for small single-tick trade", () => {
    const pool = pool2();
    const quote = getSwapQuote(pool, 0, 1, 1_000_000n);
    expect(quote.ticksCrossed).toBe(0);
  });
});

// ── 8. getAllPrices ───────────────────────────────────────────────────────────

describe("getAllPrices", () => {
  test("n=2 balanced pool: prices ≈ [1, 1]", () => {
    const pool = pool2();
    const prices = getAllPrices(pool, 0);
    expect(prices.length).toBe(2);
    expect(prices[0]).toBe(1);
    expect(prices[1]).toBeCloseTo(1.0, 2); // within 1%
  });

  test("n=5 balanced pool: all prices ≈ 1.0", () => {
    const pool = pool5();
    const prices = getAllPrices(pool, 0);
    expect(prices.length).toBe(5);
    expect(prices[0]).toBe(1);
    for (let i = 1; i < 5; i++) {
      expect(prices[i]).toBeCloseTo(1.0, 2);
    }
  });

  test("estimateOutput matches getSwapQuote", () => {
    const pool = pool2();
    const amountIn = 25_000_000n;
    const quote = getSwapQuote(pool, 0, 1, amountIn);
    const estimate = estimateOutput(pool, 0, 1, amountIn);
    expect(estimate.amountOut).toBe(quote.amountOut);
    expect(estimate.priceImpact).toBe(quote.priceImpact);
  });
});

// ── 9. consolidateTicks ───────────────────────────────────────────────────────

describe("consolidateTicks", () => {
  const sqrtN = SQRT_TABLE[2];
  const rInt = 2_414_214n;
  const PRECISION_LOCAL = 1_000_000_000n;
  const kSafe = (rInt * (sqrtN - PRECISION_LOCAL)) / PRECISION_LOCAL + rInt; // some interior k

  const makeTick = (id: number, r: bigint, k: bigint, state: TickState): Tick => ({
    id, r, k, state, totalShares: r * AMOUNT_SCALE,
  });

  test("single interior tick: rInt = tick.r, sBound = 0", () => {
    const tick = makeTick(0, rInt, kSafe, TickState.INTERIOR);
    const result = consolidateTicks([tick], SQRT_TABLE[2]);
    expect(result.rInt).toBe(rInt);
    expect(result.sBound).toBe(0n);
    expect(result.kBound).toBe(0n);
    expect(result.interiorTicks.length).toBe(1);
    expect(result.boundaryTicks.length).toBe(0);
  });

  test("two interior ticks: rInt = sum of both r", () => {
    const t0 = makeTick(0, rInt, kSafe, TickState.INTERIOR);
    const t1 = makeTick(1, rInt * 2n, kSafe * 2n, TickState.INTERIOR);
    const result = consolidateTicks([t0, t1], SQRT_TABLE[2]);
    expect(result.rInt).toBe(rInt + rInt * 2n);
    expect(result.sBound).toBe(0n);
  });

  test("empty ticks: rInt = 0", () => {
    const result = consolidateTicks([], SQRT_TABLE[2]);
    expect(result.rInt).toBe(0n);
    expect(result.sBound).toBe(0n);
  });

  test("boundary tick: sBound > 0, kBound = tick.k", () => {
    // k for boundary tick must be within (kMin, kMax) to have valid s^2
    const r = rInt;
    const kMinVal = kMin(r, sqrtN);
    const kMaxVal = kMax(r, 2, sqrtN);
    const kBoundaryTick = (kMinVal + kMaxVal) / 2n;

    const t = makeTick(0, r, kBoundaryTick, TickState.BOUNDARY);
    const result = consolidateTicks([t], sqrtN);
    expect(result.sBound).toBeGreaterThan(0n);
    expect(result.kBound).toBe(kBoundaryTick);
    expect(result.rInt).toBe(0n);
    expect(result.boundaryTicks.length).toBe(1);
  });

  test("mixed ticks: rInt from interior, sBound from boundary", () => {
    const r = rInt;
    const kMinVal = kMin(r, sqrtN);
    const kMaxVal = kMax(r, 2, sqrtN);
    const kBdry = (kMinVal + kMaxVal) / 2n;

    const interior = makeTick(0, r, kSafe, TickState.INTERIOR);
    const boundary = makeTick(1, r, kBdry, TickState.BOUNDARY);

    const result = consolidateTicks([interior, boundary], sqrtN);
    expect(result.rInt).toBe(r);
    expect(result.sBound).toBeGreaterThan(0n);
    expect(result.kBound).toBe(kBdry);
  });
});

// ── 10. kFromDepegPrice / tickParamsFromDepegPrice ────────────────────────────

describe("kFromDepegPrice / tickParamsFromDepegPrice", () => {
  test("kFromDepegPrice returns k in [kMin, kMax] for depegPrice=0.99", () => {
    const pool = pool5();
    const r = pool.rInt;
    const k = kFromDepegPrice(0.99, r, pool.n, pool.sqrtN, pool.invSqrtN);
    const kMinVal = kMin(r, pool.sqrtN);
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    expect(k).toBeGreaterThan(kMinVal);
    expect(k).toBeLessThan(kMaxVal);
  });

  test("kFromDepegPrice returns k in [kMin, kMax] for any finite depeg price", () => {
    // The boundary price formula in kFromDepegPrice maps depeg prices to k values.
    // Result must always be within the valid range [kMin, kMax].
    const pool = pool5();
    const r = 500_000_000n;
    const kMinVal = kMin(r, pool.sqrtN);
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    for (const price of [0.90, 0.99, 0.999, 0.9999]) {
      const k = kFromDepegPrice(price, r, pool.n, pool.sqrtN, pool.invSqrtN);
      expect(k).toBeGreaterThanOrEqual(kMinVal);
      expect(k).toBeLessThanOrEqual(kMaxVal);
    }
  });

  test("tickParamsFromDepegPrice returns valid (r, k) for n=2", () => {
    const pool = pool2();
    const deposit = 1_000_000_000n; // 1000 USDC raw (1 USDC = 1_000_000 raw)
    const { r, k } = tickParamsFromDepegPrice(0.99, deposit, pool.n, pool.sqrtN, pool.invSqrtN);
    const kMinVal = kMin(r, pool.sqrtN);
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    expect(r).toBeGreaterThan(0n);
    expect(k).toBeGreaterThan(kMinVal);
    expect(k).toBeLessThan(kMaxVal);
  });

  test("tickParamsFromDepegPrice: xMin < equalPricePoint (deposit > 0)", () => {
    const pool = pool2();
    const deposit = 500_000_000n;
    const { r, k } = tickParamsFromDepegPrice(0.99, deposit, pool.n, pool.sqrtN, pool.invSqrtN);
    const q = equalPricePoint(r, pool.invSqrtN);
    const xMinVal = xMin(r, k, pool.n, pool.sqrtN);
    expect(xMinVal).toBeLessThan(q);
  });

  test("computeDepositPerToken > 0 for valid r and k", () => {
    const pool = pool2();
    const deposit = 500_000_000n;
    const { r, k } = tickParamsFromDepegPrice(0.99, deposit, pool.n, pool.sqrtN, pool.invSqrtN);
    const dep = computeDepositPerToken(r, k, pool.n, pool.sqrtN, pool.invSqrtN);
    expect(dep).toBeGreaterThan(0n);
    // The deposit per token should be approximately what we asked for (within 10%)
    const ratio = Number(dep) / Number(deposit);
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  });
});

// ── 11. capitalEfficiency / getCapitalEfficiencyForDepegPrice ─────────────────

describe("capitalEfficiency", () => {
  test("efficiency > 1 for any depeg price (LP provides more than uniform liquidity)", () => {
    const pool = pool2();
    for (const price of [0.90, 0.95, 0.99, 0.999]) {
      const result = getCapitalEfficiencyForDepegPrice(pool, price, pool.rInt);
      expect(result.efficiency).toBeGreaterThan(1);
    }
  });

  test("capitalEfficiency > 1 for any valid (r, k) pair", () => {
    // capitalEfficiency = q / (q - xMin). Since xMin < q for any interior k, efficiency > 1.
    const pool = pool5();
    const r = 500_000_000n;
    const kMinVal = kMin(r, pool.sqrtN);
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    // Test at several k values across the range (avoid exact kMin/kMax where geometry degenerates)
    for (const fraction of [1n, 2n, 3n, 5n, 8n]) {
      const k = kMinVal + (fraction * (kMaxVal - kMinVal)) / 10n;
      const eff = capitalEfficiency(r, k, pool.n, pool.sqrtN, pool.invSqrtN);
      expect(eff).toBeGreaterThan(1);
    }
  });

  test("capitalEfficiency(r, k) DECREASES as k increases from kMin to kMax", () => {
    // At kMin: xMin = q → efficiency = q/(q-q) = ∞ (ultra-concentrated)
    // At kMax: xMin = 0 → efficiency = q/(q-0) = 1 (no concentration benefit)
    // So: efficiency is MONOTONE DECREASING with k.
    const pool = pool2(); // n=2 pool for sufficient integer resolution
    const r = pool.rInt;
    const kMinVal = kMin(r, pool.sqrtN);
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    // Stay safely away from kMin (where discriminant can underflow) and kMax
    const k1 = kMinVal + (kMaxVal - kMinVal) / 8n;
    const k2 = kMinVal + (kMaxVal - kMinVal) / 2n;
    const k3 = kMinVal + (7n * (kMaxVal - kMinVal)) / 8n;

    const eff1 = capitalEfficiency(r, k1, pool.n, pool.sqrtN, pool.invSqrtN);
    const eff2 = capitalEfficiency(r, k2, pool.n, pool.sqrtN, pool.invSqrtN);
    const eff3 = capitalEfficiency(r, k3, pool.n, pool.sqrtN, pool.invSqrtN);

    // Efficiency decreases as k increases toward kMax
    expect(eff1).toBeGreaterThan(eff2);
    expect(eff2).toBeGreaterThan(eff3);
    expect(eff3).toBeGreaterThan(1); // always > 1 away from kMax
  });
});

// ── 12. Box encoding round-trips ──────────────────────────────────────────────

describe("Box encoding / decoding", () => {
  test("encodeBoxName produces correct UTF-8 bytes", () => {
    const bytes = encodeBoxName("reserves");
    expect(bytes.length).toBe("reserves".length);
    expect(Array.from(bytes)).toEqual([114, 101, 115, 101, 114, 118, 101, 115]);
  });

  test("encodeBoxMapKey produces prefix + 8-byte BE uint64", () => {
    const key = encodeBoxMapKey("tick:", 7);
    expect(key.length).toBe(5 + 8); // "tick:" = 5 chars
    // Last 8 bytes should encode 7 as big-endian uint64
    const view = new DataView(key.buffer, key.byteOffset);
    expect(view.getBigUint64(5)).toBe(7n);
  });

  test("encodePositionBoxKey is 44 bytes ('pos:' + 32 + 8)", () => {
    const pubkey = new Uint8Array(32).fill(0xab);
    const key = encodePositionBoxKey(pubkey, 3);
    expect(key.length).toBe(4 + 32 + 8); // "pos:" = 4
    // First 4 bytes: "pos:"
    expect(key[0]).toBe("p".charCodeAt(0));
    expect(key[1]).toBe("o".charCodeAt(0));
    expect(key[2]).toBe("s".charCodeAt(0));
    expect(key[3]).toBe(":".charCodeAt(0));
    // Last 8 bytes: tickId = 3
    const view = new DataView(key.buffer, key.byteOffset);
    expect(view.getBigUint64(36)).toBe(3n);
  });

  test("encodePositionKeyBody is 40 bytes (32 + 8)", () => {
    const pubkey = new Uint8Array(32).fill(0x01);
    const body = encodePositionKeyBody(pubkey, 42);
    expect(body.length).toBe(40);
    const view = new DataView(body.buffer);
    expect(view.getBigUint64(32)).toBe(42n);
  });

  test("decodeTickBox round-trip (manually crafted bytes)", () => {
    // Craft a 25-byte tick box: r=500n, k=300n, state=INTERIOR, totalShares=1000n
    const buf = new Uint8Array(25);
    const view = new DataView(buf.buffer);
    view.setBigUint64(0, 500n);   // r
    view.setBigUint64(8, 300n);   // k
    buf[16] = 0;                  // state = INTERIOR
    view.setBigUint64(17, 1000n); // totalShares

    const tick = decodeTickBox(buf, 99);
    expect(tick.id).toBe(99);
    expect(tick.r).toBe(500n);
    expect(tick.k).toBe(300n);
    expect(tick.state).toBe(TickState.INTERIOR);
    expect(tick.totalShares).toBe(1000n);
  });

  test("decodeTickBox: state=1 → BOUNDARY", () => {
    const buf = new Uint8Array(25);
    const view = new DataView(buf.buffer);
    view.setBigUint64(0, 100n);
    view.setBigUint64(8, 50n);
    buf[16] = 1; // BOUNDARY
    view.setBigUint64(17, 200n);

    const tick = decodeTickBox(buf, 5);
    expect(tick.state).toBe(TickState.BOUNDARY);
  });

  test("decodePositionBox round-trip for n=5", () => {
    const n = 5;
    // Layout: shares(8) + 5 × checkpoints(8) = 48 bytes
    const buf = new Uint8Array(8 + n * 8);
    const view = new DataView(buf.buffer);
    view.setBigUint64(0, 12345n); // shares
    for (let i = 0; i < n; i++) {
      view.setBigUint64(8 + i * 8, BigInt(i * 100));
    }

    const { shares, feeGrowthCheckpoints } = decodePositionBox(buf, n);
    expect(shares).toBe(12345n);
    expect(feeGrowthCheckpoints.length).toBe(n);
    for (let i = 0; i < n; i++) {
      expect(feeGrowthCheckpoints[i]).toBe(BigInt(i * 100));
    }
  });

  test("addressToPublicKey returns 32 bytes for a valid Algorand address", () => {
    // Use the zero address (valid checksum Algorand address)
    const zeroAddr = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";
    const pk = addressToPublicKey(zeroAddr);
    expect(pk.length).toBe(32);
    expect(pk.every((b) => b === 0)).toBe(true);
  });
});

// ── 13. Sphere invariant baseline check ───────────────────────────────────────

describe("Sphere invariant at key points", () => {
  test("single-depeg point Σ(r-xi)²=r² (residual=0) for n=2", () => {
    const r = 1_000_000n;
    // [0, r] is the single-depeg configuration for n=2
    const residual = sphereInvariant([0n, r], r);
    // (r-0)^2 + (r-r)^2 = r^2 + 0 = r^2  →  residual = r^2 - r^2 = 0
    expect(residual).toBe(0n);
  });

  test("equal-price point is INSIDE the sphere (residual < 0)", () => {
    // At equal price, Σ(r-xi)^2 < r^2 (pool is inside, not on the sphere surface)
    const pool = pool2();
    const residual = sphereInvariant(pool.reserves, pool.rInt);
    expect(residual).toBeLessThan(0n);
  });

  test("n=5 single-depeg point satisfies sphere exactly", () => {
    const r = 1_000_000n;
    const reserves = [0n, r, r, r, r];
    const residual = sphereInvariant(reserves, r);
    expect(residual).toBe(0n);
  });
});

// ── 14. kMin / kMax / xMin / xMax sanity checks ───────────────────────────────

describe("Tick bound functions", () => {
  test("kMin < kMax for n=2 and n=5", () => {
    for (const n of [2, 5]) {
      const r = 1_000_000n;
      const sqrtN = SQRT_TABLE[n];
      expect(kMin(r, sqrtN)).toBeLessThan(kMax(r, n, sqrtN));
    }
  });

  test("xMin < equalPricePoint < xMax for valid k (n=5)", () => {
    const pool = pool5();
    const r = pool.rInt;
    const kMinVal = kMin(r, pool.sqrtN);
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    const kMid = (kMinVal + kMaxVal) / 2n;
    const q = equalPricePoint(r, pool.invSqrtN);
    const xMinVal = xMin(r, kMid, pool.n, pool.sqrtN);
    const xMaxVal = xMax(r, kMid, pool.n, pool.sqrtN);

    expect(xMinVal).toBeLessThan(q);
    expect(xMaxVal).toBeGreaterThanOrEqual(q);
    expect(xMinVal).toBeLessThan(xMaxVal);
  });

  test("xMin is near zero just above kMax (tick covers full depletion range)", () => {
    // At kMax: xMin = 0 analytically (the depletion boundary coincides with the origin).
    // Just below kMax (due to integer floor), xMin might be 0 or a tiny positive value.
    const pool = pool2(); // n=2 for integer resolution
    const r = pool.rInt;
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    // kMax - 1 is safely inside the valid range
    const xMinVal = xMin(r, kMaxVal - 1n, pool.n, pool.sqrtN);
    expect(xMinVal).toBeGreaterThanOrEqual(0n);
    expect(xMinVal).toBeLessThan(r / 100n); // < 1% of r (very small)
  });

  test("xMin approaches equalPricePoint as k approaches kMin (ultra-tight tick, n=5)", () => {
    // At kMin analytically: xMin = q (tick boundary collapses to equal-price point).
    // At 10% above kMin, xMin should still be comfortably close to q (> 50% of q).
    const pool = pool5();
    const r = 500_000_000n;
    const kMinVal = kMin(r, pool.sqrtN);
    const kMaxVal = kMax(r, pool.n, pool.sqrtN);
    const q = equalPricePoint(r, pool.invSqrtN);
    const kNearMin = kMinVal + (kMaxVal - kMinVal) / 10n; // 10% above kMin
    const xMinVal = xMin(r, kNearMin, pool.n, pool.sqrtN);
    expect(xMinVal).toBeGreaterThan(q * 50n / 100n); // > 50% of q
    expect(xMinVal).toBeLessThanOrEqual(q);           // always ≤ q
  });
});
