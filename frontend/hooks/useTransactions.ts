import { useQuery } from '@tanstack/react-query';
import { useIndexerClient, POOL_APP_ID } from './useAlgodClient';
import { POOL_TOKEN_SYMBOLS } from '@/lib/tokenDisplay';

export interface AMMTransaction {
  id: string;
  type: 'swap' | 'add' | 'remove' | 'claim';
  timestamp: number;
  wallet: string;
  token0: string;
  token1?: string;
  amount0?: string;
  amount1?: string;
  value?: number; // Estimated USD value
  status: 'confirmed' | 'pending';
}

// ARC-4 method selectors for this contract (SHA-512/256 of full method signature).
// Computed from abi.ts via ABIMethod.getSelector().toString('hex').
const METHOD_SELECTORS = {
  swap:              'ae6496d2', // swap(uint64,uint64,uint64,uint64,uint64)void
  swapWithCrossings: '71d80013', // swap_with_crossings(uint64,uint64,uint64,byte[],uint64)void
  addTick:           'caaaaa6b', // add_tick(uint64,uint64)void
  removeLiquidity:   '03fc3b2a', // remove_liquidity(uint64,uint64)void
  claimFees:         '280c1c93', // claim_fees(uint64)void
  budget:            'eb150f12', // budget()void
};

export function useTransactions(address?: string | null, limit = 20) {
  const indexer = useIndexerClient();

  return useQuery<AMMTransaction[], Error>({
    queryKey: ['amm-transactions', POOL_APP_ID, address, limit],
    queryFn: async () => {
      // algosdk v3: method is applicationID (capital D), not applicationId
      let query = indexer.searchForTransactions().applicationID(BigInt(POOL_APP_ID)).limit(limit);

      if (address) {
        query = query.address(address).addressRole('sender');
      }

      const response = await query.do();
      // algosdk v3 returns camelCase keys; response.transactions is the array
      const txns: any[] = response.transactions || [];

      return txns
        .filter((tx: any) => tx.applicationTransaction != null)
        .map((tx: any) => {
          const appCall = tx.applicationTransaction;
          const args: Uint8Array[] = appCall?.applicationArgs || [];

          let arg0Hex = '';
          if (args[0] instanceof Uint8Array) {
            arg0Hex = Array.from(args[0]).map(b => b.toString(16).padStart(2, '0')).join('');
          }

          let type: AMMTransaction['type'] = 'swap';
          if (arg0Hex === METHOD_SELECTORS.swap || arg0Hex === METHOD_SELECTORS.swapWithCrossings) {
            type = 'swap';
          } else if (arg0Hex === METHOD_SELECTORS.addTick) {
            type = 'add';
          } else if (arg0Hex === METHOD_SELECTORS.removeLiquidity) {
            type = 'remove';
          } else if (arg0Hex === METHOD_SELECTORS.claimFees) {
            type = 'claim';
          }

          return {
            id: tx.id,
            type,
            timestamp: (tx.roundTime || 0) * 1000,
            wallet: tx.sender || '',
            token0: POOL_TOKEN_SYMBOLS[0],
            token1: type === 'swap' ? POOL_TOKEN_SYMBOLS[1] : undefined,
            value: type === 'swap' ? 100 : 500,
            status: 'confirmed' as const,
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
