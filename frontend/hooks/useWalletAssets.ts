"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@txnlab/use-wallet-react";
import { useAlgodClient } from "./useAlgodClient";
import {
  POOL_TOKEN_SYMBOLS,
  POOL_TOKEN_COLORS,
  POOL_TOKEN_ICONS,
  POOL_TOKEN_DECIMALS,
} from "@/lib/tokenDisplay";

// ASA IDs in the same index order as POOL_TOKEN_SYMBOLS
export const POOL_TOKEN_ASA_IDS = [
  758284451, // USDC
  758284464, // USDT
  758284465, // USDD
  758284466, // BUSD
  758284467, // TUSD
];

export interface WalletTokenAsset {
  symbol: string;
  name: string;
  color: string;
  icon: string;
  /** Raw microunits (6 decimals for ASAs, 6 decimals for ALGO microALGO) */
  rawBalance: bigint;
  /** Human-readable balance */
  balance: number;
  /** USD value (stablecoins = balance * 1.0; ALGO = balance * algoPrice) */
  value: number;
  asaId?: number; // undefined means ALGO
  decimals: number;
}

const ALGO_DECIMALS = 6;

export function useWalletAssets(algoPrice = 0.18) {
  const algod = useAlgodClient();
  const { activeAddress } = useWallet();

  return useQuery<WalletTokenAsset[]>({
    queryKey: ["walletAssets", activeAddress, algoPrice],
    queryFn: async () => {
      if (!activeAddress) return [];

      const accountInfo = await algod.accountInformation(activeAddress).do();
      const microAlgo: bigint = BigInt(accountInfo.amount ?? 0);
      const assets: Array<unknown> =
        (accountInfo.assets as Array<unknown>) || [];

      const algoBalance = Number(microAlgo) / 10 ** ALGO_DECIMALS;

      const result: WalletTokenAsset[] = [
        {
          symbol: "ALGO",
          name: "Algorand",
          color: "#6B7FD7",
          icon: "/algo.png",
          rawBalance: microAlgo,
          balance: algoBalance,
          value: algoBalance * algoPrice,
          asaId: undefined,
          decimals: ALGO_DECIMALS,
        },
      ];

      for (let i = 0; i < POOL_TOKEN_ASA_IDS.length; i++) {
        const asaId = POOL_TOKEN_ASA_IDS[i];
        const asset = assets.find(
          (a) =>
            Number(
              (a as any)["asset-id"] ?? (a as any)["assetId"] ?? (a as any).assetId
            ) === asaId
        );
        const rawBalance = asset ? BigInt((asset as any).amount ?? 0) : 0n;
        const balance = Number(rawBalance) / 10 ** POOL_TOKEN_DECIMALS;

        result.push({
          symbol: POOL_TOKEN_SYMBOLS[i],
          name: POOL_TOKEN_SYMBOLS[i],
          color: POOL_TOKEN_COLORS[i],
          icon: POOL_TOKEN_ICONS[i],
          rawBalance,
          balance,
          value: balance * 1.0, // stablecoins ≈ $1
          asaId,
          decimals: POOL_TOKEN_DECIMALS,
        });
      }

      // Only return tokens the user actually holds (balance > 0)
      return result.filter((a) => a.balance > 0);
    },
    enabled: !!activeAddress,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
