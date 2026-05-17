import algosdk from "algosdk";

export interface AMMTransaction {
  id: string;
  type: "swap" | "add" | "remove" | "claim";
  timestamp: number;
  wallet: string;
  tokenInIdx?: number;
  tokenOutIdx?: number;
  /** Raw microunits */
  amountIn?: bigint;
  /** Raw microunits (minAmountOut — best available from on-chain args) */
  amountOut?: bigint;
}

export interface PoolStats {
  tvlUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  swapCount24h: number;
  activeTicks: number;
  feeBps: number;
}

const METHOD_SELECTORS = {
  swap: "ae6496d2",
  swapWithCrossings: "71d80013",
  addTick: "caaaaa6b",
  removeLiquidity: "03fc3b2a",
  claimFees: "280c1c93",
} as const;

const SWAP_SELECTORS: Set<string> = new Set([
  METHOD_SELECTORS.swap,
  METHOD_SELECTORS.swapWithCrossings,
]);

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function decodeBEUint64(bytes: Uint8Array): bigint {
  if (bytes.length < 8) return 0n;
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(0, false);
}

/**
 * Fetch 24-hour pool stats from the Algorand Indexer.
 * tvlUsd, feeBps, activeTicks should come from a fresh readPoolState() call.
 */
export async function fetchPoolStats(
  indexer: algosdk.Indexer,
  poolAppId: number,
  tvlUsd: number,
  feeBps: number,
  activeTicks: number,
): Promise<PoolStats> {
  const after = new Date(Date.now() - 86_400_000).toISOString();
  let volume24h = 0;
  let swapCount = 0;

  try {
    const response = await indexer
      .searchForTransactions()
      .applicationID(BigInt(poolAppId))
      .afterTime(after)
      .limit(500)
      .do();

    for (const tx of response.transactions ?? []) {
      const args: Uint8Array[] = tx.applicationTransaction?.applicationArgs ?? [];
      if (!args[0]) continue;
      const sel = toHex(args[0]);
      if (!SWAP_SELECTORS.has(sel)) continue;
      swapCount++;
      if (args[3]?.length >= 8) {
        volume24h += Number(decodeBEUint64(args[3])) / 1e6;
      }
    }
  } catch {
    // Indexer unavailable — return zeros gracefully
  }

  return {
    tvlUsd,
    volume24hUsd: volume24h,
    fees24hUsd: (volume24h * feeBps) / 10_000,
    swapCount24h: swapCount,
    activeTicks,
    feeBps,
  };
}

/**
 * Fetch recent AMM transactions from the Algorand Indexer.
 */
export async function fetchTransactions(
  indexer: algosdk.Indexer,
  poolAppId: number,
  options: { address?: string; limit?: number } = {},
): Promise<AMMTransaction[]> {
  let query = indexer
    .searchForTransactions()
    .applicationID(BigInt(poolAppId))
    .limit(options.limit ?? 20);

  if (options.address) {
    query = query.address(options.address).addressRole("sender");
  }

  const response = await query.do();

  return (response.transactions ?? [])
    .filter((tx: any) => tx.applicationTransaction != null)
    .map((tx: any): AMMTransaction => {
      const args: Uint8Array[] = tx.applicationTransaction?.applicationArgs ?? [];
      const sel = args[0] ? toHex(args[0]) : "";
      const isSwapCross = sel === METHOD_SELECTORS.swapWithCrossings;

      let type: AMMTransaction["type"] = "swap";
      if (SWAP_SELECTORS.has(sel)) type = "swap";
      else if (sel === METHOD_SELECTORS.addTick) type = "add";
      else if (sel === METHOD_SELECTORS.removeLiquidity) type = "remove";
      else if (sel === METHOD_SELECTORS.claimFees) type = "claim";

      let tokenInIdx: number | undefined;
      let tokenOutIdx: number | undefined;
      let amountIn: bigint | undefined;
      let amountOut: bigint | undefined;

      if (type === "swap" && args.length >= 4) {
        if (args[1]?.length >= 8) tokenInIdx = Number(decodeBEUint64(args[1]));
        if (args[2]?.length >= 8) tokenOutIdx = Number(decodeBEUint64(args[2]));
        if (args[3]?.length >= 8) amountIn = decodeBEUint64(args[3]);
        const outArg = isSwapCross ? args[5] : args[4];
        if (outArg?.length >= 8) amountOut = decodeBEUint64(outArg);
      }

      return {
        id: tx.id,
        type,
        timestamp: (tx.roundTime ?? 0) * 1000,
        wallet: tx.sender ?? "",
        tokenInIdx,
        tokenOutIdx,
        amountIn,
        amountOut,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}
