import { PoolState } from "../types";
import { getSwapQuote } from "./swap";

export interface ZapSwap {
  fromIdx: number;
  toIdx: number;
  /** Raw microunits sent */
  amountIn: bigint;
  /** Raw microunits received (from off-chain quote) */
  amountOut: bigint;
  priceImpact: number;
}

export interface ZapPlan {
  swaps: ZapSwap[];
  /**
   * Minimum amount received across all tokens after swaps, in raw microunits.
   * Use this as the `totalDepositPerTokenRaw` argument to tickParamsFromDepegPrice.
   */
  depositPerToken: bigint;
  /** Average price impact across all swaps (0.01 = 1%) */
  avgPriceImpact: number;
}

/**
 * Compute the swaps needed to convert `totalAmountRaw` of a single source token
 * into equal amounts of all n pool tokens, ready for addLiquidity.
 *
 * Pure function — no network calls. Uses current pool state to quote each swap.
 *
 * Strategy:
 *   Split totalAmountRaw into n equal portions.
 *   Keep one portion as-is (source token).
 *   Swap each remaining portion to the corresponding other token.
 *   depositPerToken = min(kept portion, ...swap outputs) — always ≤ portionPerToken.
 *
 * @param pool            Current pool state (from readPoolState or usePoolState)
 * @param sourceTokenIdx  Index of the token the user is providing
 * @param totalAmountRaw  Total amount of source token in raw microunits
 */
export function computeZap(
  pool: PoolState,
  sourceTokenIdx: number,
  totalAmountRaw: bigint,
): ZapPlan {
  const n = pool.n;
  const portionPerToken = totalAmountRaw / BigInt(n);

  if (portionPerToken === 0n) {
    throw new Error("Amount too small to split across tokens (need at least 1000 microunits per token)");
  }

  const swaps: ZapSwap[] = [];
  let minReceived = portionPerToken; // what we keep of source token
  let totalPriceImpact = 0;

  for (let i = 0; i < n; i++) {
    if (i === sourceTokenIdx) continue;

    let quote;
    try {
      quote = getSwapQuote(pool, sourceTokenIdx, i, portionPerToken);
    } catch (e) {
      throw new Error(
        `Cannot quote swap ${sourceTokenIdx} → ${i}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    swaps.push({
      fromIdx: sourceTokenIdx,
      toIdx: i,
      amountIn: portionPerToken,
      amountOut: quote.amountOut,
      priceImpact: quote.priceImpact,
    });

    if (quote.amountOut < minReceived) {
      minReceived = quote.amountOut;
    }
    totalPriceImpact += quote.priceImpact;
  }

  return {
    swaps,
    depositPerToken: minReceived,
    avgPriceImpact: swaps.length > 0 ? totalPriceImpact / swaps.length : 0,
  };
}
