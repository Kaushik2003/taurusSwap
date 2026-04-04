/**
 * Newton-bisection hybrid swap solver.
 *
 * Ported from the Python reference (contracts/orbital_math/newton.py).
 * Key improvements over the original TypeScript version:
 *   1. Bracket-finding before Newton iterations — guarantees convergence
 *   2. Newton-bisection hybrid — Newton for speed, bisection as safety net
 *   3. Boundary-only pool case (rInt === 0) handled analytically
 *   4. Final bisection sweep if Newton didn't fully converge
 */

import {
  MAX_BISECTION_STEPS,
  MAX_BRACKET_SAMPLES,
  MAX_NEWTON_ITERATIONS,
  PRECISION,
  TOLERANCE,
} from "../constants";
import { abs, clamp, max, min } from "./bigint-math";
import { updateAggregates } from "./sphere";
import { torusInvariant } from "./torus";

// ── Public entry point ───────────────────────────────────────────────────────

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
  sumXSq: bigint,
): bigint {
  if (amountIn <= 0n) return 0n;

  const oldOut = reserves[tokenOut];
  if (oldOut <= 0n) throw new Error("No output reserves available");

  // f(amountOut) = torus residual after the proposed trade
  function residual(amountOut: bigint): bigint {
    if (amountOut < 0n || amountOut > oldOut) {
      // Out of range — return a large signed value to guide bisection
      return amountOut < 0n ? 1n << 60n : -(1n << 60n);
    }
    const { sumX: sx, sumXSq: sxsq } = updateAggregates(
      sumX,
      sumXSq,
      reserves[tokenIn],
      reserves[tokenIn] + amountIn,
      oldOut,
      oldOut - amountOut,
    );
    return torusInvariant(sx, sxsq, n, rInt, sBound, kBound, sqrtN, invSqrtN);
  }

  // ── Boundary-only case: rInt === 0 ──────────────────────────────────────
  // Analytical solution: new sumX must equal kBound * sqrt(n).
  // amount_out = amount_in + sumX - sumTarget
  if (rInt === 0n) {
    const sumTarget = (kBound * sqrtN) / PRECISION;
    const baseOut = amountIn + sumX - sumTarget;
    for (const candidate of [baseOut - 1n, baseOut, baseOut + 1n]) {
      if (candidate < 0n || candidate > oldOut) continue;
      if (abs(residual(candidate)) <= TOLERANCE) return candidate;
    }
    throw new Error("boundary-only swap: no valid output found near analytical solution");
  }

  // ── Initial price guess ─────────────────────────────────────────────────
  const priceNum = max(1n, rInt - reserves[tokenIn]);
  const priceDen = max(1n, rInt - oldOut);
  const guess = clamp((amountIn * priceNum) / priceDen, 1n, oldOut - 1n);

  // ── Find bracket [lo, hi] where residual changes sign ──────────────────
  const bracket = findBracket(residual, oldOut, guess);
  if (bracket === null) {
    throw new Error("could not bracket a valid swap output — trade may be too large");
  }
  let [lo, hi] = bracket;

  // Already converged at a single point
  if (lo === hi) return lo;

  // ── Newton-bisection hybrid ─────────────────────────────────────────────
  let cur = clamp(guess, lo, hi);
  if (cur === lo || cur === hi) cur = (lo + hi) / 2n;
  let curRes = residual(cur);

  const loRes0 = residual(lo);

  for (let iter = 0; iter < MAX_NEWTON_ITERATIONS + MAX_BISECTION_STEPS; iter++) {
    if (abs(curRes) <= TOLERANCE) return cur;

    // Maintain bracket
    if (sign(curRes) === sign(loRes0)) {
      lo = cur;
    } else {
      hi = cur;
    }

    if (hi - lo <= 1n) break;

    // Try Newton step using a forward difference
    const eps = 1n;
    const fEps = residual(cur + eps);
    const df = fEps - curRes; // derivative approximation (same units as residual / amountOut)

    let next: bigint;
    if (df === 0n) {
      next = (lo + hi) / 2n; // derivative zero → bisect
    } else {
      next = cur - (curRes * eps) / df;
      if (next <= lo || next >= hi) {
        next = (lo + hi) / 2n; // Newton diverged → bisect
      }
    }

    if (next === cur) next = (lo + hi) / 2n;
    cur = next;
    curRes = residual(cur);
  }

  // ── Final bisection sweep ───────────────────────────────────────────────
  while (hi - lo > 1n) {
    const mid = (lo + hi) / 2n;
    const midRes = residual(mid);
    if (abs(midRes) <= TOLERANCE) return mid;
    if (sign(midRes) === sign(residual(lo))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Return whichever endpoint satisfies the invariant
  if (abs(residual(lo)) <= TOLERANCE) return lo;
  if (abs(residual(hi)) <= TOLERANCE) return hi;

  throw new Error(
    `Newton solver did not converge within tolerance after ${MAX_NEWTON_ITERATIONS + MAX_BISECTION_STEPS} iterations`,
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sign(v: bigint): 1 | -1 | 0 {
  if (v > 0n) return 1;
  if (v < 0n) return -1;
  return 0;
}

/**
 * Find a bracket [lo, hi] such that residual(lo) and residual(hi) have
 * opposite signs (or one of them is already within TOLERANCE of 0).
 *
 * Samples MAX_BRACKET_SAMPLES evenly-spaced points plus the initial guess.
 */
function findBracket(
  residual: (v: bigint) => bigint,
  maxOut: bigint,
  guess: bigint,
): [bigint, bigint] | null {
  const samples = new Set<bigint>([0n, maxOut, clamp(guess, 0n, maxOut)]);
  if (maxOut > 0n) {
    const step = max(1n, maxOut / BigInt(MAX_BRACKET_SAMPLES));
    for (let i = 0n; i <= BigInt(MAX_BRACKET_SAMPLES); i++) {
      samples.add(min(maxOut, i * step));
    }
  }

  const sorted = [...samples].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const evaluated = sorted.map((v) => ({ v, r: residual(v) }));

  // Check for an already-converged point
  for (const { v, r } of evaluated) {
    if (abs(r) <= TOLERANCE) return [v, v];
  }

  // Find adjacent pair with opposite signs
  for (let i = 0; i < evaluated.length - 1; i++) {
    if (sign(evaluated[i].r) !== sign(evaluated[i + 1].r)) {
      return [evaluated[i].v, evaluated[i + 1].v];
    }
  }

  return null;
}
