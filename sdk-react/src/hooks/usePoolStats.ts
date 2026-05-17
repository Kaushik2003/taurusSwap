import { useState, useEffect, useCallback } from "react";
import { PoolStats } from "@taurusswap/sdk";
import { useTaurusClient } from "../context";

export interface UsePoolStatsResult {
  data: PoolStats | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePoolStats(refreshIntervalMs = 0): UsePoolStatsResult {
  const client = useTaurusClient();
  const [data, setData] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await client.getPoolStats();
      setData(stats);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetch();
    if (refreshIntervalMs > 0) {
      const id = setInterval(fetch, refreshIntervalMs);
      return () => clearInterval(id);
    }
  }, [fetch, refreshIntervalMs]);

  return { data, loading, error, refresh: fetch };
}
