import { describe, test, expect } from "vitest";

import {
  buildDemoPoolState,
  getPoolTokenLabel,
  parseScaledInput,
} from "./helpers/orbitalDemoPool";
import { estimateOutput, getSwapQuote } from "../src/index";

function buildTradeSafePoolState() {
  const pool = buildDemoPoolState();
  pool.ticks[0].k = 10_000n * pool.sqrtN;
  return pool;
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
