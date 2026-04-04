import { PoolState, TickState, PRECISION } from "../../src/index";

/**
 * Builds a demo pool state for testing purposes.
 * Creates a 2-token pool (USDC/USDT) with reasonable initial values.
 */
export function buildDemoPoolState(): PoolState {
  // sqrt(2) scaled by PRECISION
  const sqrtN = 1_414_213_562n;
  const invSqrtN = 707_106_781n; // 1/sqrt(2) * PRECISION

  // Initial reserves: 1000 USDC and 1000 USDT
  const reserves = [1000n * PRECISION, 1000n * PRECISION];

  // Sum of reserves
  const sumX = reserves[0] + reserves[1];
  const sumXSq = (reserves[0] * reserves[0]) / PRECISION +
    (reserves[1] * reserves[1]) / PRECISION;

  // Initial radius in the sphere: r = sqrt(sum(x_i^2))
  // For balanced pool with 1000 each: r ≈ sqrt(2*1000^2) = 1414.2... * PRECISION
  const rInt = sqrtN * 1000n;

  // Bounds for k values
  const kBound = 10_000n * sqrtN;
  const sBound = 2000n * PRECISION;

  // Create interior ticks
  const ticks = [
    {
      id: 0,
      r: rInt,
      k: 5000n * sqrtN,
      state: TickState.INTERIOR,
      liquidity: 100n * PRECISION,
      lpAddress: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY",
    },
    {
      id: 1,
      r: (rInt * 11n) / 10n, // 1.1 * rInt
      k: 7000n * sqrtN,
      state: TickState.INTERIOR,
      liquidity: 150n * PRECISION,
      lpAddress: "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY",
    },
  ];

  return {
    appId: 123456,
    n: 2,
    sqrtN,
    invSqrtN,
    reserves,
    sumX,
    sumXSq,
    rInt,
    sBound,
    kBound,
    ticks,
    tokenAsaIds: [10_458_941, 312_769_273], // Actual USDC/USDT ASA IDs on Algorand mainnet
    tokenDecimals: [6, 6],
  };
}

/**
 * Formats a scaled amount back to a readable decimal string.
 * @param amount - The amount scaled by PRECISION
 * @returns A human-readable decimal string
 */
export function formatScaledAmount(amount: bigint): string {
  const precisionStr = "1000000000"; // PRECISION with 9 zeros
  const amountStr = amount.toString().padStart(precisionStr.length, "0");

  const integerPart = amountStr.slice(0, -9) || "0";
  const fractionalPart = amountStr.slice(-9).replace(/0+$/, "");

  if (fractionalPart === "") {
    return integerPart;
  }

  return `${integerPart}.${fractionalPart}`;
}

/**
 * Gets the label for a token at the given index.
 * @param pool - The pool state
 * @param index - The token index
 * @returns The token label (e.g., "USDC", "USDT")
 */
export function getPoolTokenLabel(pool: PoolState, index: number): string {
  const labels = ["USDC", "USDT"];
  return labels[index] || `TOKEN_${index}`;
}

/**
 * Parses a decimal string input and scales it to the precision format.
 * @param value - The decimal string to parse (e.g., "25", "100.5")
 * @returns The scaled bigint value, or null if invalid
 */
export function parseScaledInput(value: string): bigint | null {
  try {
    // Remove whitespace
    value = value.trim();

    // Check for valid decimal format
    if (!/^\d+(\.\d+)?$/.test(value)) {
      return null;
    }

    // Split into integer and fractional parts
    const [integerPart, fractionalPart = ""] = value.split(".");

    // Ensure fractional part doesn't exceed PRECISION decimals
    if (fractionalPart.length > 9) {
      return null;
    }

    // Pad fractional part to 9 digits (PRECISION)
    const paddedFractional = fractionalPart.padEnd(9, "0");

    // Combine and convert to BigInt
    const combined = integerPart + paddedFractional;
    return BigInt(combined);
  } catch {
    return null;
  }
}
