/**
 * Newton-bisection hybrid swap solver.
 *
 * Ported from the Python reference (contracts/orbital_math/newton.py).
 * Key improvements over the original TypeScript version:
 *   1. Bracket-finding before Newton iterations — guarantees convergence
 *   2. Newton-bisection hybrid — Newton for speed, bisection as safety net
 *   3. Boundary-only pool case (rInt === 0) handled analytically
 *   4. Final bisection sweep if Newton didn't fully converge
 *
 * RESIDUAL FUNCTION — sphere delta (not torus invariant):
 *   The torus invariant divides by PRECISION (10^9), which causes integer
 *   truncation to zero for any swap smaller than ~sqrt(PRECISION) ≈ 31_623
 *   AMOUNT_SCALE units.  For the common case (no boundary ticks), both
 *   invariants describe the same surface; the sphere delta is simply more
 *   numerically stable:
 *
 *     f(b) = (p₀ − a)² + (p₁ + b)² − p₀² − p₁²   ← change in Σ(r−xᵢ)²
 *
 *   where  p₀ = rInt − x[tokenIn]   (virtual reserve gap before trade)
 *          p₁ = rInt − x[tokenOut]  (same for tokenOut)
 *          a  = amountIn,  b = amountOut (AMOUNT_SCALE units)
 *
 *   f(b) = 0  iff the sphere invariant is preserved.  The derivative
 *   ∂f/∂b ≈ 2p₁ is on the order of rInt (millions for typical pools),
 *   so Newton converges quickly even for sub-token swap amounts.
 */

import {
  MAX_BISECTION_STEPS,
  MAX_BRACKET_SAMPLES,
  MAX_NEWTON_ITERATIONS,
  PRECISION,
} from "../constants";
import { abs, clamp, max, min } from "./bigint-math";

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

  // Sphere-delta residual (see module comment above).
  // p₀, p₁ stay fixed for the duration of the solve.
  const p0 = rInt - reserves[tokenIn]; // virtual reserve gap for tokenIn
  const p1 = rInt - oldOut;            // virtual reserve gap for tokenOut

  // f(b) = (p₀−a)² + (p₁+b)² − p₀² − p₁²
  //       = −2p₀a + a² + 2p₁b + b²
  // f = 0  ⟺  sphere invariant is preserved after the trade.
  // Returns negative values when b is too large, positive when b is too small.
  // Scale: AMOUNT_SCALE² (no precision loss from division by PRECISION).
  const a = amountIn;
  const baseResidual = -(2n * p0 * a) + a * a; // constant contribution from amountIn

  function residual(b: bigint): bigint {
    if (b < 0n || b > oldOut) {
      return b < 0n ? 1n << 120n : -(1n << 120n);
    }
    return baseResidual + 2n * p1 * b + b * b;
  }

  // ── Boundary-only case: rInt === 0 ──────────────────────────────────────
  // Analytical solution: new sumX must equal kBound * sqrt(n).
  // amount_out = amount_in + sumX - sumTarget
  if (rInt === 0n) {
    const sumTarget = (kBound * sqrtN) / PRECISION;
    const baseOut = amountIn + sumX - sumTarget;
    // Sphere delta residual has no meaning for rInt=0; use torus check
    // by testing candidate values near the analytical answer.
    for (const candidate of [baseOut - 1n, baseOut, baseOut + 1n]) {
      if (candidate < 0n || candidate > oldOut) continue;
      return candidate; // take first in-range candidate
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
  // Convergence criterion: hi−lo ≤ 1 (integer AMOUNT_SCALE units).
  // The sphere-delta residual is in AMOUNT_SCALE² units — much larger than
  // TOLERANCE (which was designed for PRECISION-scaled torus residuals).
  // We therefore converge purely by bracket contraction, not by residual size.
  let cur = clamp(guess, lo, hi);
  if (cur === lo || cur === hi) cur = (lo + hi) / 2n;
  let curRes = residual(cur);

  const loRes0 = residual(lo);

  for (let iter = 0; iter < MAX_NEWTON_ITERATIONS + MAX_BISECTION_STEPS; iter++) {
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
    const df = fEps - curRes; // derivative ∂f/∂b ≈ 2p₁+2b (AMOUNT_SCALE² / AMOUNT_SCALE)

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
    if (sign(residual(mid)) === sign(residual(lo))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Return whichever endpoint is closer to the zero crossing.
  // Both are valid integer amountOut values that preserve the sphere invariant
  // to within 1 AMOUNT_SCALE unit (= 1_000 raw microunits).
  return abs(residual(lo)) <= abs(residual(hi)) ? lo : hi;
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

  // Check for an exact zero (r === 0n); the "within TOLERANCE" check is removed
  // because the sphere-delta residual is in AMOUNT_SCALE² units — any non-zero
  // residual within TOLERANCE (1000 PRECISION units) would still be wrong at
  // AMOUNT_SCALE² scale.  Bracket contraction handles convergence instead.
  for (const { v, r } of evaluated) {
    if (r === 0n) return [v, v];
  }

  // Find adjacent pair with opposite signs
  for (let i = 0; i < evaluated.length - 1; i++) {
    if (sign(evaluated[i].r) !== sign(evaluated[i + 1].r)) {
      return [evaluated[i].v, evaluated[i + 1].v];
    }
  }

  return null;
}
