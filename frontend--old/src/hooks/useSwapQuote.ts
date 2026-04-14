import { useQuery } from '@tanstack/react-query';
import { getSwapQuote } from '@orbital-amm/sdk';
import type { PoolState, SwapQuote } from '@orbital-amm/sdk';

export function useSwapQuote(
  pool: PoolState | undefined,
  tokenIn: number,
  tokenOut: number,
  amountInRaw: bigint,
) {
  return useQuery<SwapQuote, Error>({
    queryKey: ['swapQuote', pool?.appId, tokenIn, tokenOut, amountInRaw.toString()],
    queryFn: () => {
      if (!pool) throw new Error('Pool not loaded');
      return Promise.resolve(getSwapQuote(pool, tokenIn, tokenOut, amountInRaw));
    },
    enabled: !!pool && amountInRaw > 0n && tokenIn !== tokenOut,
    staleTime: 5_000,
    retry: false,
  });
}
