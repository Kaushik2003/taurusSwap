import { describe, test, expect } from "vitest";

import {
  buildDemoPoolState,
  getPoolTokenLabel,
  parseScaledInput,
} from "./helpers/orbitalDemoPool";
import { estimateOutput, getSwapQuote } from "../src/index";

function buildTradeSafePoolState() {
  // Single-tick demo pool is already balanced at the equal-price point.
  // No k override needed — the 25 USDC trade (2.5% of reserves) won't cross the tick.
  return buildDemoPoolState();
}

describe("Swap quote", () => {
  test("demo pool quote returns a route and output", () => {
    const pool = buildTradeSafePoolState();
    const amountIn = parseScaledInput("25");

    expect(amountIn).not.toBeNull();

    const quote = getSwapQuote(pool, 0, 1, amountIn!);
    const estimated = estimateOutput(pool, 0, 1, amountIn!);

    expect(quote.amountIn).toBe(amountIn);
    expect(quote.amountOut).toBe(estimated.amountOut);
    expect(quote.amountOut).toBeGreaterThan(0n);
    expect(quote.route.length).toBeGreaterThan(0);
    expect(getPoolTokenLabel(pool, 0)).toBe("USDC");
    expect(getPoolTokenLabel(pool, 1)).toBe("USDT");
  });

  test("swap quote rejects identical input and output tokens", () => {
    const pool = buildTradeSafePoolState();
    const amountIn = parseScaledInput("10");

    expect(amountIn).not.toBeNull();
    expect(() => getSwapQuote(pool, 0, 0, amountIn!)).toThrow();
  });
});
