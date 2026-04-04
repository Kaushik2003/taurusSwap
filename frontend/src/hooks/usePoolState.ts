import { useQuery } from '@tanstack/react-query';
import { readPoolState } from '@orbital-amm/sdk';
import type { PoolState } from '@orbital-amm/sdk';
import { useAlgodClient, POOL_APP_ID } from './useAlgodClient';

export function usePoolState() {
  const algod = useAlgodClient();

  return useQuery<PoolState, Error>({
    queryKey: ['poolState', POOL_APP_ID],
    queryFn: () => readPoolState(algod, POOL_APP_ID),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
  });
}
