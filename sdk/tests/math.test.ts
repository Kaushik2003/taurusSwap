import { describe, test, expect } from "vitest";

import {
  abs,
  capitalEfficiency,
  clamp,
  equalPricePoint,
  kMax,
  kMin,
  max,
  min,
  PRECISION,
  SQRT_TABLE,
  sqrt,
  sphereInvariant,
  solveSwapSphere,
  xMax,
  xMin,
} from "../src/index";

describe("BigInt math helpers", () => {
  test("BigInt sqrt", () => {
    expect(sqrt(0n)).toBe(0n);
    expect(sqrt(1n)).toBe(1n);
    expect(sqrt(4n)).toBe(2n);
    expect(sqrt(9n)).toBe(3n);
    expect(sqrt(2n)).toBe(1n);
  });

  test("BigInt sqrt handles large numbers", () => {
    const n = 1_000_000_000_000_000_000n;
    expect(sqrt(n)).toBe(1_000_000_000n);
  });
});

describe("Sphere AMM", () => {
  test("equal price point satisfies invariant", () => {
    const n = 5;
    const r = 1000n * PRECISION;
    const invSqrtN = 447_213_595n;
    const q = equalPricePoint(r, invSqrtN);
    const reserves = Array(n).fill(q);
    const residual = sphereInvariant(reserves, r);

    expect(residual).toBe(-2_235_879_875_000_000n);
  });

  test("single depeg point satisfies invariant", () => {
    const n = 5;
    const r = 1000n * PRECISION;
    const reserves = [0n, r, r, r, r];
    const residual = sphereInvariant(reserves, r);

    expect(residual).toBe(0n);
  });

  test("swap produces valid output", () => {
    const n = 5;
    const r = 1000n * PRECISION;
    const reserves = [0n, r, r, r, r];
    const amountIn = 10n * PRECISION;

    const amountOut = solveSwapSphere(amountIn, 0, 1, reserves, r);
    expect(amountOut).toBeGreaterThan(0n);
    expect(amountOut).toBeLessThan(reserves[1]);

    const newReserves = [...reserves];
    newReserves[0] += amountIn;
    newReserves[1] -= amountOut;
    const residual = sphereInvariant(newReserves, r);

    expect(residual).toBeLessThan(PRECISION * 1000n);
    expect(residual).toBeGreaterThan(-PRECISION * 1000n);
  });
});

describe("Tick bounds", () => {
  test("safe interior k produces x_min and x_max", () => {
    const n = 5;
    const r = 1000n * PRECISION;
    const sqrtN = SQRT_TABLE[n];
    const invSqrtN = 447_213_595n;

    const kMinVal = kMin(r, sqrtN);
    const kMaxVal = kMax(r, n, sqrtN);
    const kSafe = 2n * r;
    const xMinVal = xMin(r, kSafe, n, sqrtN);
    const xMaxVal = xMax(r, kSafe, n, sqrtN);
    const q = equalPricePoint(r, invSqrtN);

    expect(kMinVal).toBeLessThan(kMaxVal);
    expect(xMinVal).toBeLessThan(q);
    expect(xMaxVal).toBeGreaterThanOrEqual(xMinVal);
    expect(xMaxVal).toBeLessThanOrEqual(r);
  });

  test("capital efficiency increases with tighter ticks", () => {
    const n = 5;
    const r = 1000n * PRECISION;
    const sqrtN = SQRT_TABLE[n];
    const invSqrtN = 447_213_595n;

    const kWide = 2n * r;
    const kTight = 3n * r;
    const effWide = capitalEfficiency(r, kWide, n, sqrtN, invSqrtN);
    const effTight = capitalEfficiency(r, kTight, n, sqrtN, invSqrtN);

    expect(effTight).toBeGreaterThan(effWide);
    expect(abs(0n)).toBe(0n);
    expect(min(3n, 7n)).toBe(3n);
    expect(max(3n, 7n)).toBe(7n);
    expect(clamp(10n, 1n, 8n)).toBe(8n);
  });
});
