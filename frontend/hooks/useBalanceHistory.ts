"use client";

import { useMemo } from "react";
import type { AMMTransaction } from "./useTransactions";
import type { WalletTokenAsset } from "./useWalletAssets";
import { POOL_TOKEN_SYMBOLS } from "@/lib/tokenDisplay";

export interface BalancePoint {
  time: string; // e.g. "Apr 10"
  [token: string]: number | string; // token symbol → balance
}

/**
 * Given current wallet assets and a list of personal transactions,
 * reconstruct an approximate per-token balance history.
 *
 * Strategy:
 *  - Start from current balances.
 *  - Walk transactions newest→oldest, reversing each swap's effect.
 *  - For each swap, token0 was sold (so pre-swap it was higher) and token1 was bought
 *    (so pre-swap it was lower). We use SWAP_DELTA = 100 units as approximation.
 *  - Emit one data point per unique date seen.
 *  - Prepend a "start" point 7 days before the first txn.
 */
export function useBalanceHistory(
  assets: WalletTokenAsset[],
  transactions: AMMTransaction[]
): BalancePoint[] {
  return useMemo(() => {
    if (assets.length === 0) return [];

    const allSymbols = ["ALGO", ...POOL_TOKEN_SYMBOLS];

    // Current balances as a mutable map
    const current: Record<string, number> = {};
    for (const sym of allSymbols) {
      current[sym] = 0;
    }
    for (const asset of assets) {
      current[asset.symbol] = asset.balance;
    }

    // Only process swaps, sorted oldest first
    const swaps = transactions
      .filter((tx) => tx.type === "swap")
      .sort((a, b) => a.timestamp - b.timestamp);

    if (swaps.length === 0) {
      // No history — just return today's single point
      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const point: BalancePoint = { time: today };
      for (const sym of allSymbols) point[sym] = current[sym];
      return [point];
    }

    // Walk backwards through swaps to recover prior balances
    const SWAP_DELTA = 100; // approximate units per swap
    const snapshots: { ts: number; balances: Record<string, number> }[] = [];

    // Start from current (latest) state
    const running = { ...current };

    // Emit current state as the last point
    snapshots.push({ ts: Date.now(), balances: { ...running } });

    // Walk swaps newest→oldest, reversing each swap
    const reversedSwaps = [...swaps].reverse();
    for (const tx of reversedSwaps) {
      const inSym = tx.token0;
      const outSym = tx.token1 ?? tx.token0;

      // Reverse the swap: user sold `inSym`, got `outSym`
      // So before the swap: inSym was higher, outSym was lower
      running[inSym] = (running[inSym] ?? 0) + SWAP_DELTA;
      running[outSym] = Math.max(0, (running[outSym] ?? 0) - SWAP_DELTA);

      snapshots.push({ ts: tx.timestamp, balances: { ...running } });
    }

    // Add a "start" point 7 days before oldest txn
    const oldest = swaps[0].timestamp;
    const startTs = oldest - 7 * 86400_000;
    snapshots.push({ ts: startTs, balances: { ...running } });

    // Sort chronologically
    snapshots.sort((a, b) => a.ts - b.ts);

    // Convert to chart points, deduplicating by date label
    const seen = new Set<string>();
    const points: BalancePoint[] = [];
    for (const snap of snapshots) {
      const label = new Date(snap.ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (seen.has(label)) continue;
      seen.add(label);
      const point: BalancePoint = { time: label };
      for (const sym of allSymbols) point[sym] = snap.balances[sym] ?? 0;
      points.push(point);
    }

    return points;
  }, [assets, transactions]);
}
