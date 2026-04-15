"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Send,
  ArrowDownToLine,
  CreditCard,
  MoreHorizontal,
  TrendingUp,
  Activity,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, timeAgo } from "@/lib/format";
import { getTokenIcon, getTokenSymbol, rawToDisplay } from "@/lib/tokenDisplay";
import { useWallet } from "@txnlab/use-wallet-react";
import { usePoolState } from "@/hooks/usePoolState";
import { useAllPositions } from "@/hooks/usePosition";
import { useTransactions } from "@/hooks/useTransactions";
import { useWalletAssets } from "@/hooks/useWalletAssets";
import { useBalanceHistory } from "@/hooks/useBalanceHistory";
import BalanceHistoryChart from "@/components/portfolio/BalanceHistoryChart";
import SendModal from "@/components/portfolio/SendModal";
import ReceiveModal from "@/components/portfolio/ReceiveModal";
import Card from "./components/CreditCard";

type Tab = "overview" | "tokens" | "activity" | "lp";
type ActivityView = "personal" | "global";

export default function Portfolio() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { activeAddress } = useWallet();
  const isWalletConnected = !!activeAddress;
  const { toggleWalletModal } = useAppStore();
  const walletAddress = activeAddress
    ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`
    : "";

  const [tab, setTab] = useState<Tab>("overview");
  const [activityView, setActivityView] = useState<ActivityView>("personal");
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data: pool } = usePoolState();
  const { data: positions = [], isLoading: positionsLoading } = useAllPositions(
    activeAddress ?? null,
    pool?.numTicks ?? 0
  );

  const { data: personalTxns = [], isLoading: personalTxLoading } =
    useTransactions(activeAddress, 50);
  const { data: globalTxns = [], isLoading: globalTxLoading } =
    useTransactions(null, 50);

  const { data: walletAssets = [], isLoading: assetsLoading } =
    useWalletAssets();

  const transactions =
    activityView === "personal" ? personalTxns : globalTxns;
  const txLoading =
    activityView === "personal" ? personalTxLoading : globalTxLoading;
  const activePositions = positions.filter((p) => p.shares > 0n);

  // Real swap stats from personal transactions
  const now = Date.now();
  const weekAgo = now - 7 * 86400_000;
  const swapsThisWeek = personalTxns.filter(
    (tx) => tx.type === "swap" && tx.timestamp >= weekAgo
  );
  const swapCount = swapsThisWeek.length;
  const swapVolume = swapsThisWeek.reduce((s, tx) => s + (tx.value ?? 0), 0);

  // Total portfolio value from real balances
  const totalValue = walletAssets.reduce((s, a) => s + a.value, 0);

  // Balance history for chart
  const balanceHistory = useBalanceHistory(walletAssets, personalTxns);
  const activeSymbols = walletAssets.map((a) => a.symbol);

  if (!mounted || !isWalletConnected) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-8">
<<<<<<< HEAD
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tighter mb-1">Portfolio</h1>
              <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em]">Track & Manage Your Assets</p>
            </div>
=======
        <div
          className="relative rounded-3xl overflow-hidden mb-8"
          style={{
            background:
              "linear-gradient(135deg, hsl(70 55% 20% / 0.5), hsl(80 45% 15% / 0.5), hsl(240 10% 8%))",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, hsl(70 55% 37% / 0.3), transparent 50%), radial-gradient(circle at 80% 30%, hsl(80 45% 30% / 0.2), transparent 40%)",
            }}
          />
          <div className="relative p-10 sm:p-16 text-center">
            <Wallet className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Your crypto portfolio
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your wallet to track your tokens and DeFi positions.
            </p>
            <Button
              variant="neo"
              onClick={() => toggleWalletModal(true)}
              className="px-10 h-14 text-sm font-black uppercase tracking-widest"
            >
              Connect Wallet
            </Button>
>>>>>>> 350d23e758dc5910bedbfa03dca2a752a05c3261
          </div>
        </div>

        {/* Wallet Disconnected */}
        <div className="glass-panel p-16 text-center border-dashed border-2">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-2">Wallet Disconnected</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto font-medium">
            Connect your Algorand wallet to track your tokens, NFTs, and DeFi positions in one place.
          </p>
          <Button onClick={() => toggleWalletModal(true)} className="rounded-xl px-10 h-12 font-black uppercase tracking-widest text-xs">
            Connect Algorand Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-20">
      {/* Portfolio Header & Navigation */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 mb-4 px-1">
        {/* Left: Title */}
        <div className="lg:max-w-[45%]">
          <h1 className="text-6xl text-foreground mb-1" style={{ fontFamily: "'WiseSans', 'Inter', sans-serif", fontWeight: 900 }}>PORTFOLIO</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em]">Asset Management & Activity</p>
        </div>

        {/* Right: Account & Tabs */}
        <div className="w-full flex flex-col items-start lg:items-end gap-6">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-primary-foreground"
              style={{
                background: "linear-gradient(135deg, hsl(70 55% 37%), hsl(80 45% 30%))",
              }}
            >
              {walletAddress.slice(0, 1).toUpperCase()}
            </div>
            <div className="text-left lg:text-right">
              <h2 className="text-lg font-bold text-foreground font-mono">
                {walletAddress}
              </h2>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border/50 w-full lg:w-auto overflow-x-auto no-scrollbar">
            {(["overview", "tokens", "activity", "lp"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-4 px-15 text-base font-semibold capitalize transition-colors border-b-[3px] whitespace-nowrap ${
                  tab === t
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {t === "lp" ? "LP Positions" : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        assets={walletAssets}
      />
      <ReceiveModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        address={activeAddress!}
      />



      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Chart, Holdings & Activity) — now first */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Balance chart panel */}
            <div className="glass-panel p-6 flex flex-col w-full flex-grow min-h-[320px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Portfolio performance
                  </p>
                </div>
                {/* Mini legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end max-w-[200px]">
                  {walletAssets.slice(0, 5).map((a) => (
                    <div key={a.symbol} className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full shadow-sm"
                        style={{ background: a.color }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {a.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {assetsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
              ) : balanceHistory.length > 0 ? (
                <div className="flex-1 min-h-0 relative -mx-2 h-full">
                  <BalanceHistoryChart
                    data={balanceHistory}
                    activeSymbols={activeSymbols}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No balance history available yet.
                  </p>
                </div>
              )}
            </div>

            {/* Holdings & Recent Activity Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Token holdings */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-foreground mb-3 px-1">
                  Top holdings
                </h3>
                <div className="glass-panel overflow-hidden flex-1">
                  {assetsLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-5 h-5 text-primary/50 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Fetching balances…
                      </p>
                    </div>
                  ) : walletAssets.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="text-xs">No token balances found.</p>
                    </div>
                  ) : (
                    walletAssets.slice(0, 4).map((a, i) => (
                      <div
                        key={a.symbol}
                        className={`flex items-center gap-3 px-4 py-3.5 data-table-row hover:bg-white/5 transition-colors ${
                          i > 0 ? "border-t border-border/30" : ""
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-inner"
                          style={{ background: a.color }}
                        >
                          {a.symbol.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {a.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {a.balance.toLocaleString("en-US", {
                              maximumFractionDigits: 4,
                            })}{" "}
                            {a.symbol}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(a.value)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-foreground mb-3 px-1">
                  Recent activity
                </h3>
                <div className="glass-panel overflow-hidden flex-1">
                  {personalTxLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-5 h-5 text-primary/50 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Fetching activity…
                      </p>
                    </div>
                  ) : personalTxns.length > 0 ? (
                    personalTxns.slice(0, 4).map((tx, i) => (
                      <div
                        key={tx.id}
                        className={`flex items-center gap-3 px-4 py-3.5 data-table-row hover:bg-white/5 transition-colors ${
                          i > 0 ? "border-t border-border/30" : ""
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-foreground capitalize truncate">
                            {tx.type} {tx.token0}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {timeAgo(new Date(tx.timestamp))}
                          </p>
                        </div>
                        <a
                          href={`https://testnet.explorer.perawallet.app/tx/${tx.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:text-primary/70 transition-colors font-semibold"
                        >
                          Explorer ↗
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="text-xs">No recent activity.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Card, Actions & Stats) — now second */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Credit Card */}
            <div className="w-full flex justify-center lg:justify-start">
              <Card 
                balance={formatCurrency(totalValue)} 
                address={walletAddress} 
              />
            </div>

            {/* Action tiles */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Send, label: "Send", action: () => setSendOpen(true) },
                {
                  icon: ArrowDownToLine,
                  label: "Receive",
                  action: () => setReceiveOpen(true),
                },
                { icon: CreditCard, label: "Buy", action: undefined as (() => void) | undefined },
                { icon: MoreHorizontal, label: "More", action: undefined as (() => void) | undefined },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={a.action}
                  className="bg-white border-2 border-dark-green rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[-6px_6px_0_0_var(--color-dark-green)] group"
                >
                  <div className="w-12 h-12 rounded-xl bg-green/20 border border-dark-green/10 flex items-center justify-center group-hover:bg-[#9FE870] transition-colors">
                    <a.icon className="w-5 h-5 text-dark-green" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-dark-green">{a.label}</span>
                </button>
              ))}
            </div>

            {/* Quick stats — real data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Swaps this week
                  </span>
                </div>
                {personalTxLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xl font-bold text-foreground">
                    {swapCount}
                  </span>
                )}
              </div>
              <div className="glass-panel p-4 hover:border-success/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">
                    Swapped this week
                  </span>
                </div>
                {personalTxLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xl font-bold text-foreground">
                    {formatCurrency(swapVolume)}
                  </span>
                )}
              </div>
            </div>

            {/* Asset Allocation & Yield Summary */}
            <div className="flex flex-col gap-4">
              {/* Asset Allocation */}
              <div className="glass-panel p-5 flex flex-col gap-4 hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Asset Allocation</span>
                  <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                    {walletAssets.length} Assets
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="flex h-3.5 w-full rounded-full overflow-hidden border border-border/20 shadow-inner">
                  {totalValue > 0 ? (
                    walletAssets.map((asset) => (
                      <div
                        key={asset.symbol}
                        style={{
                          width: `${(asset.value / totalValue) * 100}%`,
                          backgroundColor: asset.color
                        }}
                        className="h-full hover:brightness-110 transition-all opacity-95"
                        title={`${asset.symbol} : ${((asset.value / totalValue) * 100).toFixed(1)}%`}
                      />
                    ))
                  ) : (
                    <div className="w-full h-full bg-muted/30" />
                  )}
                </div>
                
                {/* Legend Summary */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-3 mt-1 w-full">
                  {walletAssets.slice(0, 4).map((asset) => (
                    <div key={asset.symbol} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: asset.color }} />
                        <span className="text-muted-foreground truncate">{asset.symbol}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {totalValue > 0 ? ((asset.value / totalValue) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* LP & Yield Teaser */}
              <a href="/trade" className="glass-panel p-5 flex items-center justify-between bg-primary/10 hover:bg-primary/20 transition-all hover:scale-[1.01] hover:shadow-lg border border-primary/20 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-foreground mb-0.5">Maximize Yield</h4>
                    <p className="text-xs text-muted-foreground font-medium">Provide LP to earn fees</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-background/60 shadow-sm flex items-center justify-center text-primary group-hover:translate-x-1 transition-transform">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── TOKENS ── */}
      {tab === "tokens" && (
        <div className="glass-panel overflow-hidden">
          {assetsLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Fetching balances…
              </p>
            </div>
          ) : walletAssets.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-sm text-muted-foreground">
                No token balances found. Use the faucet to get tokens.
              </p>
            </div>
          ) : (
            walletAssets.map((a, i) => (
              <div
                key={a.symbol}
                className={`flex items-center gap-3 px-4 py-3 data-table-row ${
                  i > 0 ? "border-t border-border/30" : ""
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                  style={{ background: a.color }}
                >
                  {a.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.symbol}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-sm text-muted-foreground">
                    {a.asaId ? "$1.00" : "~$0.18"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(a.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.balance.toLocaleString("en-US", {
                      maximumFractionDigits: 4,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ACTIVITY ── */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <div className="inline-flex p-1.5 bg-[#9FE870]/20 border border-dark-green/10 rounded-full">
              {(["personal", "global"] as ActivityView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setActivityView(v)}
                  className={`
                    px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-200
                    ${activityView === v 
                      ? "bg-[#052c05] text-[#89f589] border-[1.5px] border-[#89f589] shadow-[0_0_0_2px_#052c05,0_0_0_3.5px_#89f589] z-10" 
                      : "text-dark-green/50 hover:text-dark-green"
                    }
                  `}
                >
                  {v} activity
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            {txLoading ? (
              <div className="p-16 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-mono">
                  Synchronizing activity…
                </p>
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx, i) => {
                const isOwn = tx.wallet === activeAddress;
                const typeLabel: Record<string, string> = {
                  swap: "Swap",
                  add: "Add Liquidity",
                  remove: "Remove Liquidity",
                  claim: "Claim Fees",
                };
                return (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 px-4 py-3.5 data-table-row ${
                      i > 0 ? "border-t border-border/30" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {typeLabel[tx.type] ?? tx.type}{" "}
                          {tx.token0}
                          {tx.token1 ? ` / ${tx.token1}` : ""}
                        </p>
                        {isOwn && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold tracking-tighter uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-none">
                        {activityView === "global" && !isOwn
                          ? `${tx.wallet.slice(0, 6)}…${tx.wallet.slice(-4)}`
                          : tx.id}{" "}
                        · testnet
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <a
                        href={`https://testnet.explorer.perawallet.app/tx/${tx.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary/70 transition-colors block mb-1 font-semibold"
                      >
                        Pera Explorer ↗
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(new Date(tx.timestamp))}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-16 text-center">
                <p className="text-sm text-muted-foreground">
                  No transaction history found.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LP ── */}
      {tab === "lp" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-1">
            Orbital AMM liquidity positions
          </p>
          {positionsLoading ? (
            <div className="glass-panel p-10 text-center">
              <Loader2 className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Scanning positions…
              </p>
            </div>
          ) : activePositions.length === 0 ? (
            <div className="glass-panel p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No active LP positions found.
              </p>
            </div>
          ) : (
            activePositions.map((pos) => {
              const totalFees = pos.claimableFees.reduce(
                (a, b) => a + b,
                0n
              );
              return (
                <div key={pos.tickId} className="glass-panel p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {pool &&
                        Array.from({ length: pool.n }, (_, i) => (
                          <img
                            key={i}
                            src={getTokenIcon(i)}
                            alt={getTokenSymbol(pool, i)}
                            className="w-5 h-5 rounded-full border border-background object-cover bg-white"
                            style={{ marginLeft: i > 0 ? "-6px" : 0 }}
                          />
                        ))}
                      <span className="text-sm font-semibold text-foreground ml-1">
                        {pool
                          ? Array.from(
                              { length: pool.n },
                              (_, i) => getTokenSymbol(pool, i)
                            ).join("/")
                          : "…"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Tick #{pos.tickId}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Shares
                      </p>
                      <p className="font-medium text-foreground">
                        {pos.shares.toString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Position r
                      </p>
                      <p className="font-medium text-foreground">
                        {rawToDisplay(pos.positionR * 1000n)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Claimable fees
                      </p>
                      <p className="font-medium text-foreground">
                        {rawToDisplay(totalFees)}
                      </p>
                    </div>
                  </div>
                  {pool && pos.claimableFees.some((f) => f > 0n) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pos.claimableFees.map((fee, i) =>
                        fee > 0n ? (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                          >
                            {getTokenSymbol(pool, i)}: {rawToDisplay(fee)}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
