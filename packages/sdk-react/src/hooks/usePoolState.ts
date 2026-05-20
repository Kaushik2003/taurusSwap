import { useState, useEffect, useCallback } from "react";
import { PoolState } from "@taurus-swap/sdk";
import { useTaurusClient } from "../context";

export interface UsePoolStateResult {
  data: PoolState | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePoolState(refreshIntervalMs = 0): UsePoolStateResult {
  const client = useTaurusClient();
  const [data, setData] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await client.getPoolState();
      setData(state);
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
