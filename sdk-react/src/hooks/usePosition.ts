import { useState, useEffect, useCallback } from "react";
import { PositionInfo } from "@taurusswap/sdk";
import { useTaurusClient } from "../context";

export interface UsePositionResult {
  data: PositionInfo | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePosition(address: string | null, tickId: number | null): UsePositionResult {
  const client = useTaurusClient();
  const [data, setData] = useState<PositionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!address || tickId === null) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const position = await client.getPosition(address, tickId);
      setData(position);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [client, address, tickId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
