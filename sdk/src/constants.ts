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
export const PRECISION = 1_000_000_000n;

// For intermediate calculations that need more precision
// (e.g., multiplying two PRECISION-scaled numbers)
export const PRECISION_SQ = PRECISION * PRECISION;

// Tolerance for invariant verification.
// The torus invariant returns a residual in PRECISION units.
// |residual| <= TOLERANCE means the state is valid.
// 1000 PRECISION units ≈ 10^-6 in real units — matches the contract's _TOLERANCE = 1_000.
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

// Maximum bisection steps in the Newton-bisection hybrid solver (from Python reference)
export const MAX_BISECTION_STEPS = 80;

// Sample points probed when finding an initial bracket for the Newton solver
export const MAX_BRACKET_SAMPLES = 64;

// Maximum tick crossings per trade before we abort
// (safety valve — in practice, rarely exceeds 3-4)
export const MAX_TICK_CROSSINGS = 20;

// Default slippage tolerance in basis points (0.5%)
export const DEFAULT_SLIPPAGE_BPS = 50;

// Algorand-specific constants
export const ALGO_MICRO = 1_000_000n;
export const MIN_TXN_FEE = 1000n;
export const OPCODE_BUDGET_PER_TXN = 700;
