import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIndexerClient, POOL_APP_ID } from './useAlgodClient';
import { usePoolState } from './usePoolState';

export interface PoolStats {
  tvlUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  swapCount24h: number;
  activeTicks: number;
  feeBps: number;
  isLoading: boolean;
}

const SWAP_SELECTORS = new Set(['ae6496d2', '71d80013']);

function decodeBEUint64(bytes: Uint8Array): number {
  if (bytes.length < 8) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Number(view.getBigUint64(0, false));
}

export function usePoolStats(): PoolStats {
  const indexer = useIndexerClient();
  const { data: pool, isLoading: poolLoading } = usePoolState();

  const tvlUsd = useMemo(() => {
    if (!pool) return 0;
    return pool.actualReservesRaw.reduce((sum, r) => sum + Number(r), 0) / 1e6;
  }, [pool]);

  const { data, isLoading: statsLoading } = useQuery({
    queryKey: ['pool-stats-24h', POOL_APP_ID],
    queryFn: async () => {
      const after = new Date(Date.now() - 86_400_000).toISOString();
      let volume24h = 0;
      let swapCount = 0;

      try {
        const response = await indexer
          .searchForTransactions()
          .applicationID(BigInt(POOL_APP_ID))
          .afterTime(after)
          .limit(500)
          .do();

        const txns: any[] = response.transactions || [];
        for (const tx of txns) {
          const args: Uint8Array[] = tx.applicationTransaction?.applicationArgs || [];
          if (!args[0]) continue;
          const sel = Array.from(args[0] as Uint8Array)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');
          if (!SWAP_SELECTORS.has(sel)) continue;
          swapCount++;
          if (args[3] instanceof Uint8Array) {
            volume24h += decodeBEUint64(args[3]) / 1e6;
          }
        }
      } catch {
        // Indexer unavailable — return zeros gracefully
      }

      return { volume24h, swapCount };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const feeBps = Number(pool?.feeBps ?? 30n);

  return {
    tvlUsd,
    volume24hUsd: data?.volume24h ?? 0,
    fees24hUsd: data ? (data.volume24h * feeBps) / 10_000 : 0,
    swapCount24h: data?.swapCount ?? 0,
    activeTicks: pool?.ticks.length ?? 0,
    feeBps,
    isLoading: poolLoading || statsLoading,
  };
}
