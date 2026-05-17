import { describe, test, expect } from "vitest";

import {
  buildDemoPoolState,
  formatScaledAmount,
} from "./helpers/orbitalDemoPool";
import {
  getAllPrices,
  getCapitalEfficiencyForDepegPrice,
  getSwapQuote,
  AMOUNT_SCALE,
} from "../src/index";

function buildTradeSafePoolState() {
  // Single-tick demo pool is balanced at the equal-price point.
  // k is at the kMin/kMax midpoint — the 25 USDC trade (2.5% of reserves) won't cross.
  return buildDemoPoolState();
}

describe("SDK integration", () => {
  test("sdk exports work together end to end on the demo pool", () => {
    const pool = buildTradeSafePoolState();
    const prices = getAllPrices(pool, 0);

    // tickRadius must be in AMOUNT_SCALE units — use rInt as a reference radius
    const tickRadius = pool.rInt;
    const efficiency = getCapitalEfficiencyForDepegPrice(pool, 0.99, tickRadius);

    // Swap 25 USDC (raw microunits: 25 × 10^6 = 25_000_000n)
    const amountInRaw = 25_000_000n;
    const quote = getSwapQuote(pool, 0, 1, amountInRaw);

    expect(prices.length).toBe(pool.n);
    expect(prices[0]).toBe(1);
    expect(Number.isFinite(prices[1])).toBe(true);
    expect(efficiency.efficiency).toBeGreaterThan(0);
    // amountOut is in raw microunits; convert to AMOUNT_SCALE for formatting
    expect(formatScaledAmount(quote.amountOut / AMOUNT_SCALE).length).toBeGreaterThan(0);
    expect(quote.amountOut).toBeGreaterThan(0n);
  });
});
