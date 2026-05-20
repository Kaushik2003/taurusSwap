"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import algosdk from "algosdk";
import { TaurusClient } from "@taurus-swap/sdk";

export interface TokenInfo {
  index: number;
  symbol: string;
  name: string;
  asaId: number;
  decimals: number;
  color: string;
}

export const TOKENS: TokenInfo[] = [
  { index: 0, symbol: "USDC",  name: "USD Coin",          asaId: 758284451, decimals: 6, color: "#2775CA" },
  { index: 1, symbol: "USDT",  name: "Tether USD",        asaId: 758284464, decimals: 6, color: "#26A17B" },
  { index: 2, symbol: "USDD",  name: "Decentralized USD", asaId: 758284465, decimals: 6, color: "#00E2FE" },
  { index: 3, symbol: "DAI",   name: "Dai Stablecoin",    asaId: 758284466, decimals: 6, color: "#F2994A" },
  { index: 4, symbol: "FRAX",  name: "Frax Share",        asaId: 758284467, decimals: 6, color: "#A259FF" },
];

export interface ConnectedWallet {
  address: string;
  connectorType: "pera" | "defly";
  balances: { [key: number]: bigint };
  algoBalance: bigint;
}

export interface UserPosition {
  tickId: number;
  shares: bigint;
  depositPerToken: bigint;
  claimableFees: bigint[];
  depegPrice: number;
}

export interface SdkLogEntry {
  id: string;
  method: string;
  code: string;
  status: "pending" | "success" | "error";
  startedAt: number;
  duration?: number;
  error?: string;
}

export function useTaurus() {
  const [client, setClient]       = useState<TaurusClient | null>(null);
  const [poolState, setPoolState] = useState<any>(null);
  const [prices, setPrices]       = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [sdkLog, setSdkLog]       = useState<SdkLogEntry[]>([]);

  const [peraWallet,      setPeraWallet]      = useState<any>(null);
  const [deflyWallet,     setDeflyWallet]     = useState<any>(null);
  const [activeConnector, setActiveConnector] = useState<"pera" | "defly" | null>(null);

  const [wallet,          setWallet]          = useState<ConnectedWallet | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [positions,       setPositions]       = useState<UserPosition[]>([]);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingWalletRef = useRef(false);

  // Wraps any async SDK call: adds a pending entry, resolves to success/error
  const trackCall = useCallback(async <T>(
    method: string,
    code: string,
    fn: () => Promise<T>,
  ): Promise<T> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const startedAt = Date.now();
    setSdkLog(prev => [{ id, method, code, status: "pending", startedAt }, ...prev.slice(0, 49)]);
    try {
      const result = await fn();
      const duration = Date.now() - startedAt;
      setSdkLog(prev => prev.map(e => e.id === id ? { ...e, status: "success", duration } : e));
      return result;
    } catch (err: any) {
      const duration = Date.now() - startedAt;
      setSdkLog(prev => prev.map(e => e.id === id ? { ...e, status: "error", duration, error: err?.message } : e));
      throw err;
    }
  }, []);

  // 1. Initialize TaurusClient with testnet defaults
  useEffect(() => {
    try {
      setClient(new TaurusClient());
    } catch (err: any) {
      setError(err?.message || "Failed to initialize TaurusSwap Client");
      setIsLoading(false);
    }
  }, []);

  // 2. Dynamic wallet connector init (avoids SSR issues)
  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const { PeraWalletConnect }  = await import("@perawallet/connect");
        const { DeflyWalletConnect } = await import("@blockshake/defly-connect");
        setPeraWallet(new PeraWalletConnect({ shouldShowSignTxnToast: false }));
        setDeflyWallet(new DeflyWalletConnect({ shouldShowSignTxnToast: false }));
      } catch (err) {
        console.error("Failed to load wallet SDKs:", err);
      }
    })();
  }, []);

  // 3. Pool state — tracked so every refresh shows in the activity log
  const refreshPoolState = useCallback(async (taurusClient: TaurusClient) => {
    try {
      const state = await trackCall(
        "client.getPoolState",
        "// Fetches full pool state (10s TTL cache)\nconst pool = await client.getPoolState();\n// { n, ticks[], reserves[], feeBps, totalR, sqrtN, ... }",
        () => taurusClient.getPoolState(),
      );
      setPoolState(state);
      const spotPrices = await taurusClient.getAllPrices(0); // uses cache
      setPrices(spotPrices);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to update pool state");
    } finally {
      setIsLoading(false);
    }
  }, [trackCall]);

  useEffect(() => {
    if (!client) return;
    refreshPoolState(client);
    refreshIntervalRef.current = setInterval(() => refreshPoolState(client), 15_000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [client, refreshPoolState]);

  // 4. Wallet balances + LP positions
  const refreshWalletState = useCallback(async () => {
    if (!client || !wallet) return;
    if (isRefreshingWalletRef.current) return;
    isRefreshingWalletRef.current = true;
    setIsWalletLoading(true);
    try {
      const accountInfo = await client.algod.accountInformation(wallet.address).do();
      // algosdk v3 returns BigInt amounts and camelCase keys (assetId, not asset-id)
      const algoBalance = BigInt(accountInfo.amount ?? 0n);
      const balances: { [key: number]: bigint } = {};
      TOKENS.forEach(t => { balances[t.asaId] = 0n; });
      (accountInfo.assets || []).forEach((asset: any) => {
        const id = Number(asset.assetId ?? asset["asset-id"]);
        const amt = BigInt(asset.amount ?? 0);
        balances[id] = amt;
      });
      setWallet(prev => prev ? { ...prev, algoBalance, balances } : null);

      if (poolState?.ticks) {
        const promises = poolState.ticks.map(async (tick: any) => {
          try {
            const info = await client.getPosition(wallet.address, tick.id);
            if (info && info.shares > 0n) {
              return {
                tickId:          tick.id,
                shares:          info.shares,
                depositPerToken: info.positionR,
                claimableFees:   info.claimableFees || TOKENS.map(() => 0n),
                depegPrice:      1.0 - Number(tick.r) / 1_000_000,
              };
            }
          } catch {
            /* tick exists in state but position box may not */
          }
          return null;
        });

        const results = await Promise.all(promises);
        const activePositions = results.filter((p): p is UserPosition => p !== null);
        setPositions(activePositions);
      }
    } catch (err) {
      console.error("Failed to refresh wallet state:", err);
    } finally {
      setIsWalletLoading(false);
      isRefreshingWalletRef.current = false;
    }
  }, [client, wallet?.address, poolState]);

  useEffect(() => {
    if (wallet?.address && poolState) refreshWalletState();
  }, [wallet?.address, poolState, refreshWalletState]);

  // 5. Session restoration on mount
  useEffect(() => {
    if (!peraWallet || !deflyWallet) return;
    const saved = localStorage.getItem("taurus_wallet_connector");
    if (saved === "pera") {
      peraWallet.reconnectSession()
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setActiveConnector("pera");
            setWallet({ address: accounts[0], connectorType: "pera", balances: {}, algoBalance: 0n });
          }
        }).catch(console.error);
    } else if (saved === "defly") {
      deflyWallet.reconnectSession()
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setActiveConnector("defly");
            setWallet({ address: accounts[0], connectorType: "defly", balances: {}, algoBalance: 0n });
          }
        }).catch(console.error);
    }
  }, [peraWallet, deflyWallet]);

  // 6. Connect
  const connectWallet = useCallback(async (type: "pera" | "defly") => {
    const connector = type === "pera" ? peraWallet : deflyWallet;
    if (!connector) return;
    setIsWalletLoading(true);
    try {
      // Clear any stale WalletConnect session before opening a fresh one
      await connector.disconnect().catch(() => {});
      const accounts = await connector.connect();
      if (accounts.length > 0) {
        setActiveConnector(type);
        localStorage.setItem("taurus_wallet_connector", type);
        setWallet({ address: accounts[0], connectorType: type, balances: {}, algoBalance: 0n });
      }
    } catch (err) {
      console.error("Wallet connect failed:", err);
    } finally {
      setIsWalletLoading(false);
    }
  }, [peraWallet, deflyWallet]);

  // 7. Disconnect
  const disconnectWallet = useCallback(async () => {
    const connector = activeConnector === "pera" ? peraWallet : deflyWallet;
    if (connector) await connector.disconnect().catch(console.error);
    localStorage.removeItem("taurus_wallet_connector");
    setActiveConnector(null);
    setWallet(null);
    setPositions([]);
  }, [activeConnector, peraWallet, deflyWallet]);

  // 8. Sign + submit helper
  const signAndSubmitTxns = useCallback(async (txns: algosdk.Transaction[]): Promise<string> => {
    if (!client || !wallet || !activeConnector) throw new Error("Wallet not connected");
    const group = txns.map(txn => ({ txn, signers: [wallet.address] }));
    let signed: Uint8Array[];
    if (activeConnector === "pera" && peraWallet) {
      signed = await peraWallet.signTransaction([group]);
    } else if (activeConnector === "defly" && deflyWallet) {
      signed = await deflyWallet.signTransaction([group]);
    } else {
      throw new Error("No active wallet connector");
    }
    const { txid } = await client.algod.sendRawTransaction(signed).do();
    await algosdk.waitForConfirmation(client.algod, txid, 4);
    refreshPoolState(client);
    setTimeout(refreshWalletState, 1200);
    return txid;
  }, [client, wallet, activeConnector, peraWallet, deflyWallet, refreshPoolState, refreshWalletState]);

  // 9. Swap — calls client.buildSwapTxns (tracked)
  const executeSwap = useCallback(async (
    fromIndex: number,
    toIndex: number,
    amountIn: bigint,
    slippageBps = 50,
  ): Promise<string> => {
    if (!client || !wallet) throw new Error("Wallet not connected");
    const addr = wallet.address.slice(0, 8);
    const code = `const txns = await client.buildSwapTxns({\n  sender: "${addr}…",\n  fromIndex: ${fromIndex},  // ${TOKENS[fromIndex]?.symbol ?? "?"}\n  toIndex:   ${toIndex},    // ${TOKENS[toIndex]?.symbol ?? "?"}\n  amountIn:  ${amountIn}n,\n  slippageBps: ${slippageBps}, // ${slippageBps / 100}%\n});\n// Returns unsigned algosdk.Transaction[] — sign with wallet`;
    const txns = await trackCall("client.buildSwapTxns", code,
      () => client.buildSwapTxns({ sender: wallet.address, fromIndex, toIndex, amountIn, slippageBps }),
    );
    return signAndSubmitTxns(txns);
  }, [client, wallet, trackCall, signAndSubmitTxns]);

  // 10. Add liquidity — tickParamsFromDepegPrice + buildAddLiquidityTxns (both tracked)
  const executeAddLiquidity = useCallback(async (
    depegPrice: number,
    depositPerTokenRaw: bigint,
  ): Promise<{ txid: string; tickId: number; depositPerToken: bigint }> => {
    if (!client || !wallet) throw new Error("Wallet not connected");

    const paramsCode = `// Step 1: convert depeg price → tick geometry params\nconst { r, k } = await client.tickParamsFromDepegPrice(\n  ${depegPrice},         // $${depegPrice.toFixed(3)} boundary\n  ${depositPerTokenRaw}n, // target deposit per token\n);`;
    const { r, k } = await trackCall("client.tickParamsFromDepegPrice", paramsCode,
      () => client.tickParamsFromDepegPrice(depegPrice, depositPerTokenRaw),
    );

    const addCode = `// Step 2: build add-liquidity transaction group\nconst { txns, tickId, depositPerTokenRaw } =\n  await client.buildAddLiquidityTxns({\n    sender: "${wallet.address.slice(0, 8)}…",\n    r: ${r}n, // tick radius\n    k: ${k}n, // plane constant\n  });\n// tickId: newly assigned tick index`;
    const { txns, depositPerTokenRaw: calculatedDeposit, tickId } = await trackCall(
      "client.buildAddLiquidityTxns", addCode,
      () => client.buildAddLiquidityTxns({ sender: wallet.address, r, k }),
    );

    const txid = await signAndSubmitTxns(txns);
    return { txid, tickId, depositPerToken: calculatedDeposit };
  }, [client, wallet, trackCall, signAndSubmitTxns]);

  // 11. Remove liquidity (tracked)
  const executeRemoveLiquidity = useCallback(async (tickId: number, shares: bigint): Promise<string> => {
    if (!client || !wallet) throw new Error("Wallet not connected");
    const code = `const txns = await client.buildRemoveLiquidityTxns({\n  sender: "${wallet.address.slice(0, 8)}…",\n  tickId: ${tickId},\n  shares: ${shares}n, // LP shares to redeem\n});\n// Receive tokens proportional to share of tick reserves`;
    const txns = await trackCall("client.buildRemoveLiquidityTxns", code,
      () => client.buildRemoveLiquidityTxns({ sender: wallet.address, tickId, shares }),
    );
    return signAndSubmitTxns(txns);
  }, [client, wallet, trackCall, signAndSubmitTxns]);

  // 12. Claim fees (tracked)
  const executeClaimFees = useCallback(async (tickId: number): Promise<string> => {
    if (!client || !wallet) throw new Error("Wallet not connected");
    const code = `const txns = await client.buildClaimFeesTxns({\n  sender: "${wallet.address.slice(0, 8)}…",\n  tickId: ${tickId},\n});\n// Sweeps accrued feeGrowth → wallet`;
    const txns = await trackCall("client.buildClaimFeesTxns", code,
      () => client.buildClaimFeesTxns({ sender: wallet.address, tickId }),
    );
    return signAndSubmitTxns(txns);
  }, [client, wallet, trackCall, signAndSubmitTxns]);

  return {
    client,
    poolState,
    prices,
    isLoading,
    error,
    sdkLog,
    trackCall,
    wallet,
    isWalletLoading,
    positions,
    connectWallet,
    disconnectWallet,
    refreshWalletState,
    executeSwap,
    executeAddLiquidity,
    executeRemoveLiquidity,
    executeClaimFees,
  };
}
