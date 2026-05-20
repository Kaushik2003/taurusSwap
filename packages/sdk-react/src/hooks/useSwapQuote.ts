import { useState, useEffect } from "react";
import { SwapQuote } from "@taurusswap/sdk";
import { useTaurusClient } from "../context";

export interface UseSwapQuoteResult {
  quote: SwapQuote | null;
  loading: boolean;
  error: Error | null;
}

export function useSwapQuote(
  fromIndex: number | null,
  toIndex: number | null,
  amountIn: bigint | null,
): UseSwapQuoteResult {
  const client = useTaurusClient();
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (fromIndex === null || toIndex === null || !amountIn || amountIn <= 0n) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    client.quote({ fromIndex, toIndex, amountIn }).then((q) => {
      if (!cancelled) setQuote(q);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [client, fromIndex, toIndex, amountIn]);

  return { quote, loading, error };
}
