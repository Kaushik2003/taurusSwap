import { PRECISION } from "../constants";
import { divScaled, mulScaled, sqrt } from "./bigint-math";

export function sphereInvariant(reserves: bigint[], r: bigint): bigint {
  let sumSq = 0n;
  for (const x of reserves) {
    const diff = r - x;
    sumSq += diff * diff;
  }
  return sumSq - r * r;
}

export function getPrice(
  reserves: bigint[],
  r: bigint,
  tokenIn: number,
  tokenOut: number,
): bigint {
  const numerator = r - reserves[tokenIn];
  const denominator = r - reserves[tokenOut];

  if (denominator === 0n) {
    throw new Error("Token out reserves at maximum — price is infinite");
  }

  return divScaled(numerator, denominator, PRECISION);
}

export function equalPricePoint(r: bigint, invSqrtN: bigint): bigint {
  return r - mulScaled(r, invSqrtN, PRECISION);
}

/**
 * Compute sumX and sumXSq from a reserve vector.
 *
 * sumXSq = Σxᵢ² in raw PRECISION² units — matching the contract's square_raw
 * accumulation and the Python reference's sum_x_sq convention.  This is the
 * only representation that lets the SDK and contract share the same torus
 * invariant formula without extra scaling factors.
 */
export function computeAggregates(reserves: bigint[]): {
  sumX: bigint;
  sumXSq: bigint;
} {
  let sumX = 0n;
  let sumXSq = 0n;

  for (const x of reserves) {
    sumX += x;
    sumXSq += x * x;   // raw square, PRECISION² units — same as contract's square_raw
  }

  return { sumX, sumXSq };
}

/**
 * Incrementally update sumX / sumXSq after a two-token trade.
 * O(1): only the two affected tokens are re-squared.
 */
export function updateAggregates(
  oldSumX: bigint,
  oldSumXSq: bigint,
  oldXi: bigint,
  newXi: bigint,
  oldXj: bigint,
  newXj: bigint,
): { sumX: bigint; sumXSq: bigint } {
  const sumX = oldSumX + (newXi - oldXi) + (newXj - oldXj);
  const sumXSq =
    oldSumXSq + newXi * newXi - oldXi * oldXi + newXj * newXj - oldXj * oldXj;

  return { sumX, sumXSq };
}

export function solveSwapSphere(
  amountIn: bigint,
  tokenIn: number,
  tokenOut: number,
  reserves: bigint[],
  r: bigint,
): bigint {
  const newReserves = [...reserves];
  newReserves[tokenIn] += amountIn;

  let sumOthers = 0n;
  for (let index = 0; index < newReserves.length; index += 1) {
    if (index === tokenOut) continue;
    const diff = r - newReserves[index];
    sumOthers += diff * diff;
  }

  const rSq = r * r;
  const xjDiffSq = rSq - sumOthers;

  if (xjDiffSq < 0n) {
    throw new Error("Trade too large — would violate sphere invariant");
  }

  const xjDiff = sqrt(xjDiffSq);
  const newXj = r - xjDiff;
  const amountOut = reserves[tokenOut] - newXj;

  if (amountOut < 0n) {
    throw new Error("Negative output — trade too large");
  }

  return amountOut;
}
