'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { FAUCET_TOKENS } from '@/lib/tokens';

const ALGOD_SERVER =
  process.env.NEXT_PUBLIC_ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = Number(process.env.NEXT_PUBLIC_ALGOD_PORT ?? 443);
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN ?? '';

function getAlgod() {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

/** Returns a map of assetId → opted-in (true/false). */
export function useOptInStatus() {
  const { activeAddress } = useWallet();

  return useQuery({
    queryKey: ['optInStatus', activeAddress],
    enabled: !!activeAddress,
    staleTime: 10_000,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!activeAddress) return {} as Record<number, boolean>;
      const algod = getAlgod();
      const result: Record<number, boolean> = {};

      await Promise.all(
        FAUCET_TOKENS.map(async (token) => {
          try {
            await algod.accountAssetInformation(activeAddress, token.assetId).do();
            result[token.assetId] = true;
          } catch {
            result[token.assetId] = false;
          }
        }),
      );

      return result;
    },
  });
}

/** Returns a helper to manually refetch opt-in status after a txn. */
export function useRefreshOptIn() {
  const qc = useQueryClient();
  const { activeAddress } = useWallet();
  return () => qc.invalidateQueries({ queryKey: ['optInStatus', activeAddress] });
}
