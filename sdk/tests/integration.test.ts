import { describe, test, expect } from "vitest";

import {
  buildDemoPoolState,
  formatScaledAmount,
} from "./helpers/orbitalDemoPool";
import {
  getAllPrices,
  getCapitalEfficiencyForDepegPrice,
  getSwapQuote,
  PRECISION,
} from "../src/index";

function buildTradeSafePoolState() {
  const pool = buildDemoPoolState();
  pool.ticks[0].k = 10_000n * pool.sqrtN;
  return pool;
}

describe("SDK integration", () => {
  test("sdk exports work together end to end on the demo pool", () => {
    const pool = buildTradeSafePoolState();
    const prices = getAllPrices(pool, 0);
    const efficiency = getCapitalEfficiencyForDepegPrice(pool, 0.99, 500n * PRECISION);
    const quote = getSwapQuote(pool, 0, 1, 25n * PRECISION);

    expect(prices.length).toBe(pool.n);
    expect(prices[0]).toBe(1);
    expect(Number.isFinite(prices[1])).toBe(true);
    expect(efficiency.efficiency).toBeGreaterThan(0);
    expect(formatScaledAmount(quote.amountOut).length).toBeGreaterThan(0);
  });
});
