"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@txnlab/use-wallet-react";
import { useAlgodClient } from "./useAlgodClient";

/**
 * Returns the user's raw ASA balances (in microunits) for each pool token,
 * indexed by position in the pool (same order as pool.tokenAsaIds).
 *
 * Returns an array of 0n for each token when:
 *   - wallet not connected
 *   - user hasn't opted in to the ASA
 *   - network error
 */
export function useTokenBalances(tokenAsaIds: number[]): bigint[] {
  const algod = useAlgodClient();
  const { activeAddress } = useWallet();

  const { data } = useQuery<bigint[]>({
    queryKey: ["tokenBalances", activeAddress, tokenAsaIds.join(",")],
    queryFn: async () => {
      if (!activeAddress) return tokenAsaIds.map(() => 0n);

      try {
        const accountInfo = await algod.accountInformation(activeAddress).do();
        const assets = (accountInfo.assets || []) as unknown as Array<Record<string, unknown>>;
        
        const balances = tokenAsaIds.map((asaId) => {
          const asset = assets.find((a: any) =>
            Number(a["asset-id"] ?? a["assetId"] ?? a.assetId) === Number(asaId)
          );
          if (asset) return BigInt((asset as any).amount ?? 0);
          return 0n;
        });

        return balances;
      } catch (err) {
        console.error("Failed to fetch account balances:", err);
        return tokenAsaIds.map(() => 0n);
      }
    },
    enabled: !!activeAddress && tokenAsaIds.length > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return data ?? tokenAsaIds.map(() => 0n);
}
