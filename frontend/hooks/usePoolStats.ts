import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIndexerClient, POOL_APP_ID } from './useAlgodClient';
import { usePoolState } from './usePoolState';
import { AMOUNT_SCALE, PRECISION } from '@/lib/orbital-sdk/constants';

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
const LS_KEY = `fee_growth_snapshot_${POOL_APP_ID}`;
const WINDOW_MS = 86_400_000; // 24 hours

interface FeeGrowthSnapshot {
  ts: number;
  feeGrowth: string[]; // serialised bigints
  totalR: string;
}

function saveFeeGrowthSnapshot(feeGrowth: bigint[], totalR: bigint) {
  if (typeof window === 'undefined') return;
  const snap: FeeGrowthSnapshot = {
    ts: Date.now(),
    feeGrowth: feeGrowth.map(String),
    totalR: String(totalR),
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(snap)); } catch { /* quota */ }
}

function loadFeeGrowthSnapshot(): FeeGrowthSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Compute 24H fees in USD from the feeGrowth accumulator delta.
 *
 * Formula (per token i):
 *   fees_raw_i = totalR_AMOUNT_SCALE * Δ(feeGrowth[i]) / PRECISION
 *   fees_raw_i is in AMOUNT_SCALE units → × AMOUNT_SCALE → raw microunits → ÷ 1e6 = USD
 *   All tokens are stablecoins ≈ $1.
 */
function computeFees24h(
  currentFeeGrowth: bigint[],
  currentTotalR: bigint,
  snap: FeeGrowthSnapshot,
): number {
  const snapFeeGrowth = snap.feeGrowth.map(BigInt);
  let totalUsd = 0;
  for (let i = 0; i < currentFeeGrowth.length; i++) {
    const prev = snapFeeGrowth[i] ?? 0n;
    const curr = currentFeeGrowth[i] ?? 0n;
    if (curr <= prev) continue;
    const delta = curr - prev;
    // fees in AMOUNT_SCALE units, then convert to raw microunits
    const feesAmountScale = (currentTotalR * delta) / PRECISION;
    const feesRaw = feesAmountScale * AMOUNT_SCALE;
    totalUsd += Number(feesRaw) / 1e6;
  }
  return totalUsd;
}

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

  // ── feeGrowth-based 24H fees ──────────────────────────────────────────────
  const fees24hUsd = useMemo(() => {
    if (!pool) return 0;

    const snap = loadFeeGrowthSnapshot();
    if (!snap) {
      // First load — save baseline; no delta yet
      saveFeeGrowthSnapshot(pool.feeGrowth, pool.totalR);
      return 0;
    }

    const age = Date.now() - snap.ts;
    if (age > WINDOW_MS) {
      // Snapshot is older than 24h — rebase it and report 0 until next snapshot ages
      saveFeeGrowthSnapshot(pool.feeGrowth, pool.totalR);
      return 0;
    }

    // Snapshot is within 24h window — compute delta
    const fees = computeFees24h(pool.feeGrowth, pool.totalR, snap);

    // Refresh snapshot every 60s so repeated page loads keep accumulating correctly
    const snapAge = Date.now() - snap.ts;
    if (snapAge > 60_000) {
      // Do NOT overwrite — keep the oldest snapshot within the window as the baseline
    }

    return fees;
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
    fees24hUsd,
    swapCount24h: data?.swapCount ?? 0,
    activeTicks: pool?.ticks.length ?? 0,
    feeBps,
    isLoading: poolLoading || statsLoading,
  };
}
