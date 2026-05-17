import { PRECISION, TOLERANCE } from "../constants";
import { abs, sqrt } from "./bigint-math";

/**
 * Compute the torus invariant residual.
 *
 * Returns a value in PRECISION units — matching the Python reference's
 * normalized_square convention and the contract's square_scaled / _TOLERANCE.
 * |residual| <= TOLERANCE means the state satisfies the invariant.
 *
 * @param sumX    Σxᵢ  (PRECISION-scaled math reserves)
 * @param sumXSq  Σxᵢ² (PRECISION²-scaled raw squares — NOT divided by PRECISION)
 */
export function torusInvariant(
  sumX: bigint,
  sumXSq: bigint,
  n: number,
  rInt: bigint,
  sBound: bigint,
  kBound: bigint,
  sqrtN: bigint,
  invSqrtN: bigint,
): bigint {
  const N = BigInt(n);

  // Boundary-only case (all ticks at their boundary, rInt = 0).
  // Invariant degenerates to two independent constraints:
  //   1. sumX ≈ kBound * sqrt(n)   (plane constraint)
  //   2. ‖w‖ ≈ sBound              (boundary sphere constraint)
  if (rInt === 0n) {
    const sumTarget = (kBound * sqrtN) / PRECISION;
    const wTotalSq = sumXSq - (sumX * sumX) / N;
    const wSq = wTotalSq >= 0n ? wTotalSq : 0n;
    // normError = (‖w‖² - sBound²) / PRECISION  (PRECISION units)
    const normError = (wSq - sBound * sBound) / PRECISION;
    const planeError = sumX - sumTarget;
    // If the plane is satisfied within 1 unit, only report the norm error.
    return abs(planeError) <= 1n ? normError : normError + planeError;
  }

  // ── Alpha decomposition ──────────────────────────────────────────────────
  // alphaTotal = Σxᵢ / sqrt(n)  (PRECISION units)
  const alphaTotal = (sumX * invSqrtN) / PRECISION;
  // alphaInt = alphaTotal minus the boundary contribution
  const alphaInt = alphaTotal - kBound;
  // rInt * sqrt(n)  (PRECISION units)
  const rIntSqrtN = (rInt * sqrtN) / PRECISION;
  // diff along the interior sphere's polar axis
  const diffAlpha = alphaInt - rIntSqrtN;

  // ── w-norm decomposition ─────────────────────────────────────────────────
  // ‖w‖² = Σxᵢ² - (Σxᵢ)²/n   (PRECISION² units)
  const wTotalSq = sumXSq - (sumX * sumX) / N;
  const wTotalNorm = wTotalSq >= 0n ? sqrt(wTotalSq) : 0n; // PRECISION units
  // Strip the boundary sphere contribution
  const wIntNorm = wTotalNorm - sBound;

  // ── Torus check: rInt² = diffAlpha² + wIntNorm²  (all normalized to PRECISION units) ──
  // normalizedSquare(v) = v² / PRECISION  (PRECISION units) — matches Python + contract
  const lhs = (rInt * rInt) / PRECISION;
  const rhs = (diffAlpha * diffAlpha) / PRECISION + (wIntNorm * wIntNorm) / PRECISION;

  return lhs - rhs;
}

/**
 * Returns true if the pool state satisfies the torus invariant within TOLERANCE.
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
  tolerance: bigint = TOLERANCE,
): boolean {
  return abs(torusInvariant(sumX, sumXSq, n, rInt, sBound, kBound, sqrtN, invSqrtN)) <= tolerance;
}
