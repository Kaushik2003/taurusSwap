import { PoolState } from "../types";
import { ZapAmountTooSmallError } from "../errors";
import { getSwapQuote } from "./swap";

export interface ZapSwap {
  fromIdx: number;
  toIdx: number;
  /** Raw microunits sent */
  amountIn: bigint;
  /** Raw microunits received (off-chain quote) */
  amountOut: bigint;
  priceImpact: number;
}

export interface ZapPlan {
  swaps: ZapSwap[];
  /**
   * Minimum amount received across all tokens after swaps, in raw microunits.
   * Pass this as depositPerTokenRaw to tickParamsFromDepegPrice / buildAddLiquidityTxns.
   */
  depositPerToken: bigint;
  /** Average price impact across all swaps (0.01 = 1%) */
  avgPriceImpact: number;
}

/**
 * Compute the swaps needed to convert `totalAmountRaw` of one token
 * into equal amounts of all n pool tokens, ready for addLiquidity.
 *
 * Pure function — no network calls. Pass a fresh pool state from getPoolState().
 *
 * Strategy: split totalAmountRaw into n equal portions, keep one for the source
 * token, and swap each other portion into the corresponding token.
 *
 * @param pool            Current pool state
 * @param sourceTokenIdx  Index of the token the user is depositing
 * @param totalAmountRaw  Total amount in raw microunits
 */
export function computeZap(
  pool: PoolState,
  sourceTokenIdx: number,
  totalAmountRaw: bigint,
): ZapPlan {
  const n = pool.n;
  const portionPerToken = totalAmountRaw / BigInt(n);

  if (portionPerToken === 0n) throw new ZapAmountTooSmallError();

  const swaps: ZapSwap[] = [];
  let minReceived = portionPerToken;
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

    if (quote.amountOut < minReceived) minReceived = quote.amountOut;
    totalPriceImpact += quote.priceImpact;
  }

  return {
    swaps,
    depositPerToken: minReceived,
    avgPriceImpact: swaps.length > 0 ? totalPriceImpact / swaps.length : 0,
  };
}
