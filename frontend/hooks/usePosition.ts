import { useQuery } from '@tanstack/react-query';
import { readPosition } from '@/lib/orbital-sdk';
import type { PositionInfo } from '@/lib/orbital-sdk';
import { useAlgodClient, POOL_APP_ID } from './useAlgodClient';
import { usePoolState } from './usePoolState';

/**
 * Fetch one LP position for a given tick.
 * Returns null if the address has no position in that tick.
 */
export function usePosition(address: string | null, tickId: number) {
  const algod = useAlgodClient();
  const { data: pool } = usePoolState();

  return useQuery<PositionInfo | null, Error>({
    queryKey: ['position', POOL_APP_ID, address, tickId],
    queryFn: async () => {
      if (!address || !pool) return null;
      const tick = pool.ticks.find(t => t.id === tickId);
      if (!tick) return null;
      return readPosition(algod, POOL_APP_ID, address, tickId, pool.n, pool.feeGrowth, tick);
    },
    enabled: !!address && !!pool,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Fetch all active LP positions for an address across all active ticks.
 * Only returns positions where shares > 0.
 */
export function useAllPositions(address: string | null, numTicks: number) {
  const algod = useAlgodClient();
  const { data: pool } = usePoolState();

  return useQuery<PositionInfo[], Error>({
    queryKey: ['allPositions', POOL_APP_ID, address, numTicks],
    queryFn: async () => {
      if (!address || !pool) return [];
      const results: PositionInfo[] = [];
      // Iterate over active ticks only — deleted ticks have no box to read.
      for (const tick of pool.ticks) {
        try {
          const pos = await readPosition(
            algod,
            POOL_APP_ID,
            address,
            tick.id,
            pool.n,
            pool.feeGrowth,
            tick,
          );
          if (pos && pos.shares > 0n) results.push(pos);
        } catch {
          // No position box for this tick — skip.
        }
      }
      return results;
    },
    enabled: !!address && !!pool && pool.ticks.length > 0,
    staleTime: 30_000,
    retry: 1,
  });
}
