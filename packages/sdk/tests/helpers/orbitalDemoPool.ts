import { PoolState, TickState, AMOUNT_SCALE } from "../../src/index";

/**
 * Builds a demo pool state for testing purposes.
 *
 * Pool: 2 tokens (USDC / USDT), each with 6 decimals.
 * Seeded at 1 000 tokens each = 1_000_000_000 microunits each.
 *
 * All math-space values (reserves, r, k, sumX, etc.) are in AMOUNT_SCALE units
 * (raw_microunits / 1_000).  sqrtN / invSqrtN are PRECISION-scaled (× 10^9).
 */
export function buildDemoPoolState(): PoolState {
  // PRECISION-scaled sqrt(2) values
  const sqrtN = 1_414_213_562n;   // floor(sqrt(2) * 10^9)
  const invSqrtN = 707_106_781n;  // floor(1/sqrt(2) * 10^9)
  const PRECISION = 1_000_000_000n;

  // 1 000 tokens × 10^6 microunits/token = 10^9 microunits
  // AMOUNT_SCALE unit = 10^9 / 1_000 = 10^6
  const reserveScaled = 1_000_000n; // AMOUNT_SCALE units

  // virtual_offset = 0 for a fresh pool with no partial withdrawals
  const virtualOffset = 0n;
  const reserves = [reserveScaled, reserveScaled];

  const sumX = reserves[0] + reserves[1];
  // sumXSq = Σxᵢ² (raw squares of AMOUNT_SCALE values)
  const sumXSq = reserves[0] * reserves[0] + reserves[1] * reserves[1];

  // rInt: consolidated interior radius.
  // For a single balanced interior tick at the equal-price point:
  //   q = r - r/sqrt(n) = reserveScaled → r = reserveScaled / (1 - 1/sqrt(2))
  //   q = r * (1 - invSqrtN/PRECISION)
  //   r ≈ reserveScaled * PRECISION / (PRECISION - invSqrtN)
  const rInt =
    (reserveScaled * PRECISION) / (PRECISION - invSqrtN);

  // k for interior tick: kMin ≤ k ≤ kMax.  Use the midpoint for demo.
  const kMin = (rInt * (sqrtN - PRECISION)) / PRECISION;
  const kMax = (rInt * (2n - 1n) * PRECISION) / sqrtN;
  const tickK = (kMin + kMax) / 2n;

  // Single interior tick so that consolidateTicks() yields rInt == rInt_demo,
  // matching the reserves that are placed at the equal-price point.
  // (Two ticks would give consolidated rInt = sum of both radii, which exceeds
  // what the reserves represent and breaks the Newton solver bracket.)
  const ticks = [
    {
      id: 0,
      r: rInt,
      k: tickK,
      state: TickState.INTERIOR,
      totalShares: rInt * AMOUNT_SCALE, // demo: 1 share per AMOUNT_SCALE unit of r
    },
  ];

  const totalR = rInt;

  return {
    appId: 123456,
    n: 2,
    sqrtN,
    invSqrtN,
    reserves,
    sumX,
    sumXSq,
    virtualOffset,
    rInt,
    sBound: 0n,
    kBound: 0n,
    totalR,
    feeBps: 30n,
    numTicks: 1,
    ticks,
    tokenAsaIds: [10_458_941, 312_769_273],
    tokenDecimals: [6, 6],
    feeGrowth: [0n, 0n],
  };
}

/**
 * Formats a raw microunit amount to a human-readable token string.
 * @param rawAmount  amount in raw microunits
 * @param decimals   token decimals (default 6)
 */
export function formatRawAmount(rawAmount: bigint, decimals = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = rawAmount / divisor;
  const frac = rawAmount % divisor;
  return `${whole}.${frac.toString().padStart(decimals, "0")}`;
}

/**
 * Formats an AMOUNT_SCALE amount to a human-readable token string.
 * @param scaledAmount  amount in AMOUNT_SCALE units (raw / 1_000)
 * @param decimals      token decimals (default 6)
 */
export function formatScaledAmount(scaledAmount: bigint, decimals = 6): string {
  return formatRawAmount(scaledAmount * AMOUNT_SCALE, decimals);
}

export function getPoolTokenLabel(_pool: PoolState, index: number): string {
  const labels = ["USDC", "USDT"];
  return labels[index] || `TOKEN_${index}`;
}

/**
 * Parse a human-readable decimal string to raw microunits.
 * @param value     e.g. "100.5"
 * @param decimals  token decimals (default 6)
 */
export function parseRawAmount(value: string, decimals = 6): bigint | null {
  try {
    value = value.trim();
    if (!/^\d+(\.\d+)?$/.test(value)) return null;
    const [integerPart, fractionalPart = ""] = value.split(".");
    if (fractionalPart.length > decimals) return null;
    const paddedFractional = fractionalPart.padEnd(decimals, "0");
    return BigInt(integerPart + paddedFractional);
  } catch {
    return null;
  }
}

/**
 * Alias for parseRawAmount — parses token string to raw microunits (6 decimals).
 * Replaces the old PRECISION-scaled version: "25" → 25_000_000n (25 USDC).
 */
export function parseScaledInput(value: string): bigint | null {
  return parseRawAmount(value, 6);
}
