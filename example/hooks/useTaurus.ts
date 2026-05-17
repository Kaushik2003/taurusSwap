"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import algosdk from "algosdk";
import { TaurusClient } from "@taurusswap/sdk";

// Define token configuration constants
export interface TokenInfo {
  index: number;
  symbol: string;
  name: string;
  asaId: number;
  decimals: number;
  color: string;
}

export const TOKENS: TokenInfo[] = [
  { index: 0, symbol: "USDC", name: "USD Coin", asaId: 758284451, decimals: 6, color: "#2775CA" },
  { index: 1, symbol: "USDT", name: "Tether USD", asaId: 758284464, decimals: 6, color: "#26A17B" },
  { index: 2, symbol: "USDD", name: "Decentralized USD", asaId: 758284465, decimals: 6, color: "#00E2FE" },
  { index: 3, symbol: "DAI", name: "Dai Stablecoin", asaId: 758284466, decimals: 6, color: "#F2994A" },
  { index: 4, symbol: "FRAX", name: "Frax Share", asaId: 758284467, decimals: 6, color: "#A259FF" },
];

export interface ConnectedWallet {
  address: string;
  connectorType: "pera" | "defly";
  balances: { [key: number]: bigint }; // ASA ID -> raw amount
  algoBalance: bigint; // raw microAlgos
}

export interface UserPosition {
  tickId: number;
  shares: bigint;
  depositPerToken: bigint;
  claimableFees: bigint[];
  depegPrice: number;
}

export function useTaurus() {
  const [client, setClient] = useState<TaurusClient | null>(null);
  const [poolState, setPoolState] = useState<any>(null);
  const [prices, setPrices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real Wallet Connectors State
  const [peraWallet, setPeraWallet] = useState<any>(null);
  const [deflyWallet, setDeflyWallet] = useState<any>(null);
  const [activeConnector, setActiveConnector] = useState<"pera" | "defly" | null>(null);

  // Connected Wallet State
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState<boolean>(false);
  const [positions, setPositions] = useState<UserPosition[]>([]);

  // Periodical refresher ref
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Taurus Client
  useEffect(() => {
    try {
      // Default configurations trigger Algorand Testnet with proper Pool App ID
      const taurusClient = new TaurusClient();
      setClient(taurusClient);
    } catch (err: any) {
      console.error("Failed to initialize Taurus Client:", err);
      setError(err?.message || "Failed to initialize TaurusSwap Client");
      setIsLoading(false);
    }
  }, []);

  // 2. Client-side dynamic instantiating of Pera and Defly Wallet Connect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const initConnectors = async () => {
        try {
          const { PeraWalletConnect } = await import("@perawallet/connect");
          const { DeflyWalletConnect } = await import("@blockshake/defly-connect");

          const pera = new PeraWalletConnect({ shouldShowSignTxnToast: false });
          const defly = new DeflyWalletConnect({ shouldShowSignTxnToast: false });

          setPeraWallet(pera);
          setDeflyWallet(defly);
        } catch (err) {
          console.error("Failed to dynamically load wallet client SDKs:", err);
        }
      };
      initConnectors();
    }
  }, []);

  // 3. Fetch live pool state from network
  const refreshPoolState = useCallback(async (taurusClient: TaurusClient) => {
    try {
      const state = await taurusClient.getPoolState();
      setPoolState(state);

      const spotPrices = await taurusClient.getAllPrices(0);
      setPrices(spotPrices);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch pool state:", err);
      setError(err?.message || "Failed to update pool state");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger state refresh on client init and configure interval
  useEffect(() => {
    if (!client) return;

    refreshPoolState(client);

    refreshIntervalRef.current = setInterval(() => {
      refreshPoolState(client);
    }, 15000); // refresh every 15s

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [client, refreshPoolState]);

  // 4. Fetch user wallet balances and positions
  const refreshWalletState = useCallback(async () => {
    if (!client || !wallet) return;
    setIsWalletLoading(true);

    try {
      const { algod } = client;
      
      // Fetch Algos and ASA balances
      const accountInfo = await algod.accountInformation(wallet.address).do();
      const algoBalance = BigInt(accountInfo.amount || 0);

      const balances: { [key: number]: bigint } = {};
      
      // Initialize balances to 0 for tracking
      TOKENS.forEach(t => {
        balances[t.asaId] = 0n;
      });

      // Map assets
      const assets = accountInfo.assets || [];
      assets.forEach((asset: any) => {
        const id = Number(asset["asset-id"]);
        const amount = BigInt(asset["amount"] || 0);
        balances[id] = amount;
      });

      // Update local wallet state
      setWallet(prev => {
        if (!prev) return null;
        return {
          ...prev,
          algoBalance,
          balances,
        };
      });

      // Fetch user positions for all active ticks
      if (poolState && poolState.ticks) {
        const activePositions: UserPosition[] = [];
        
        for (const tick of poolState.ticks) {
          try {
            const positionInfo = await client.getPosition(wallet.address, tick.id);
            if (positionInfo && positionInfo.shares > 0n) {
              // Convert tick geometry variables to depeg bounds
              const depegPrice = 1.0 - (Number(tick.r) / 1000000.0);

              activePositions.push({
                tickId: tick.id,
                shares: positionInfo.shares,
                depositPerToken: positionInfo.positionR, // position balance
                claimableFees: positionInfo.claimableFees || TOKENS.map(() => 0n),
                depegPrice,
              });
            }
          } catch (posErr) {
            console.error(`Error reading position in tick #${tick.id}:`, posErr);
          }
        }
        setPositions(activePositions);
      }
    } catch (err) {
      console.error("Failed to refresh wallet state:", err);
    } finally {
      setIsWalletLoading(false);
    }
  }, [client, wallet?.address, poolState]);

  // Refresh wallet state whenever address changes or pool state changes
  useEffect(() => {
    if (wallet?.address && poolState) {
      refreshWalletState();
    }
  }, [wallet?.address, poolState, refreshWalletState]);

  // 5. Connect Session Restoration
  useEffect(() => {
    if (!peraWallet || !deflyWallet) return;

    const savedConnector = localStorage.getItem("taurus_wallet_connector");
    if (savedConnector === "pera") {
      peraWallet
        .reconnectSession()
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setActiveConnector("pera");
            setWallet({
              address: accounts[0],
              connectorType: "pera",
              balances: {},
              algoBalance: 0n,
            });
            // Setup listener
            peraWallet.listenToSignTxnCancelled(() => {
              setIsWalletLoading(false);
            });
          }
        })
        .catch((err: any) => console.log("Pera reconnect session failed", err));
    } else if (savedConnector === "defly") {
      deflyWallet
        .reconnectSession()
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setActiveConnector("defly");
            setWallet({
              address: accounts[0],
              connectorType: "defly",
              balances: {},
              algoBalance: 0n,
            });
          }
        })
        .catch((err: any) => console.log("Defly reconnect session failed", err));
    }
  }, [peraWallet, deflyWallet]);

  // 6. Connect wallet triggers
  const connectWallet = useCallback(async (type: "pera" | "defly") => {
    if (type === "pera" && peraWallet) {
      setIsWalletLoading(true);
      try {
        const accounts = await peraWallet.connect();
        if (accounts.length > 0) {
          const address = accounts[0];
          setActiveConnector("pera");
          localStorage.setItem("taurus_wallet_connector", "pera");
          setWallet({
            address,
            connectorType: "pera",
            balances: {},
            algoBalance: 0n,
          });
          peraWallet.listenToSignTxnCancelled(() => {
            setIsWalletLoading(false);
          });
        }
      } catch (err) {
        console.error("Pera Wallet Connect failed:", err);
      } finally {
        setIsWalletLoading(false);
      }
    } else if (type === "defly" && deflyWallet) {
      setIsWalletLoading(true);
      try {
        const accounts = await deflyWallet.connect();
        if (accounts.length > 0) {
          const address = accounts[0];
          setActiveConnector("defly");
          localStorage.setItem("taurus_wallet_connector", "defly");
          setWallet({
            address,
            connectorType: "defly",
            balances: {},
            algoBalance: 0n,
          });
        }
      } catch (err) {
        console.error("Defly Wallet Connect failed:", err);
      } finally {
        setIsWalletLoading(false);
      }
    }
  }, [peraWallet, deflyWallet]);

  // 7. Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (activeConnector === "pera" && peraWallet) {
      await peraWallet.disconnect().catch(console.error);
    } else if (activeConnector === "defly" && deflyWallet) {
      await deflyWallet.disconnect().catch(console.error);
    }
    localStorage.removeItem("taurus_wallet_connector");
    setActiveConnector(null);
    setWallet(null);
    setPositions([]);
  }, [activeConnector, peraWallet, deflyWallet]);

  // 8. Unified transaction signing & broadcasting pipeline via Wallet client SDKs
  const signAndSubmitTxns = useCallback(async (txns: algosdk.Transaction[]): Promise<string> => {
    if (!client || !wallet || !activeConnector) {
      throw new Error("Wallet session or Taurus Client is not active");
    }

    const { algod } = client;
    let signedTxns: Uint8Array[];

    // Structure transaction groups array formatted for client connectors
    const formattedTxnGroup = txns.map((txn) => ({
      txn,
      signers: [wallet.address],
    }));

    try {
      if (activeConnector === "pera" && peraWallet) {
        signedTxns = await peraWallet.signTransaction([formattedTxnGroup]);
      } else if (activeConnector === "defly" && deflyWallet) {
        signedTxns = await deflyWallet.signTransaction([formattedTxnGroup]);
      } else {
        throw new Error("No active wallet provider connector connected");
      }

      // Send raw signed transaction chunks
      const { txid } = await algod.sendRawTransaction(signedTxns).do();
      
      // Await node consensus validation
      await algosdk.waitForConfirmation(algod, txid, 4);
      
      // Force refreshing immediate stats
      refreshPoolState(client);
      setTimeout(() => {
        refreshWalletState();
      }, 1200);

      return txid;
    } catch (err: any) {
      console.error("Signing / Broadcasting rejected:", err);
      throw err;
    }
  }, [client, wallet, activeConnector, peraWallet, deflyWallet, refreshPoolState, refreshWalletState]);

  // 9. Swap Operations Executer
  const executeSwap = useCallback(async (
    fromIndex: number,
    toIndex: number,
    amountIn: bigint,
    slippageBps = 50
  ): Promise<string> => {
    if (!client || !wallet) throw new Error("Wallet not connected");

    try {
      const txns = await client.buildSwapTxns({
        sender: wallet.address,
        fromIndex,
        toIndex,
        amountIn,
        slippageBps,
      });

      return await signAndSubmitTxns(txns);
    } catch (err: any) {
      console.error("Swap execution failed:", err);
      throw err;
    }
  }, [client, wallet, signAndSubmitTxns]);

  // 10. Liquidity Add Executer
  const executeAddLiquidity = useCallback(async (
    depegPrice: number,
    depositPerTokenRaw: bigint
  ): Promise<{ txid: string; tickId: number; depositPerToken: bigint }> => {
    if (!client || !wallet) throw new Error("Wallet not connected");

    try {
      // 1. Calculate r and k based on boundary depeg price
      const { r, k } = await client.tickParamsFromDepegPrice(
        depegPrice,
        depositPerTokenRaw
      );

      // 2. Build the add liquidity transaction group
      const { txns, depositPerTokenRaw: calculatedDeposit, tickId } = await client.buildAddLiquidityTxns({
        sender: wallet.address,
        r,
        k,
      });

      // 3. Sign and broadcast transactions
      const txid = await signAndSubmitTxns(txns);

      return {
        txid,
        tickId,
        depositPerToken: calculatedDeposit,
      };
    } catch (err: any) {
      console.error("Add liquidity failed:", err);
      throw err;
    }
  }, [client, wallet, signAndSubmitTxns]);

  // 11. Liquidity Remove Executer
  const executeRemoveLiquidity = useCallback(async (
    tickId: number,
    shares: bigint
  ): Promise<string> => {
    if (!client || !wallet) throw new Error("Wallet not connected");

    try {
      const txns = await client.buildRemoveLiquidityTxns({
        sender: wallet.address,
        tickId,
        shares,
      });

      return await signAndSubmitTxns(txns);
    } catch (err: any) {
      console.error("Remove liquidity failed:", err);
      throw err;
    }
  }, [client, wallet, signAndSubmitTxns]);

  // 12. Claim Accrued Fees Executer
  const executeClaimFees = useCallback(async (
    tickId: number
  ): Promise<string> => {
    if (!client || !wallet) throw new Error("Wallet not connected");

    try {
      const txns = await client.buildClaimFeesTxns({
        sender: wallet.address,
        tickId,
      });

      return await signAndSubmitTxns(txns);
    } catch (err: any) {
      console.error("Claim fees failed:", err);
      throw err;
    }
  }, [client, wallet, signAndSubmitTxns]);

  return {
    client,
    poolState,
    prices,
    isLoading,
    error,
    
    // Sandbox wallet API
    wallet,
    isWalletLoading,
    positions,
    connectWallet,
    disconnectWallet,
    refreshWalletState,
    
    // Operational execution API
    executeSwap,
    executeAddLiquidity,
    executeRemoveLiquidity,
    executeClaimFees,
  };
}
