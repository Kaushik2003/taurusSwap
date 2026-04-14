"use client";

import { useState } from "react";
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

type Tab = "overview" | "tokens" | "activity" | "lp";
type ActivityView = "personal" | "global";

export default function Portfolio() {
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

  if (!isWalletConnected) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-8">
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
              onClick={() => toggleWalletModal(true)}
              className="rounded-2xl px-8 h-12 text-base font-semibold"
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
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

      {/* Profile */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-primary-foreground"
          style={{
            background: "linear-gradient(135deg, hsl(70 55% 37%), hsl(80 45% 30%))",
          }}
        >
          {walletAddress.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground font-mono">
            {walletAddress}
          </h2>
          <p className="text-xs text-muted-foreground">Algorand · Testnet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-border/50">
        {(["overview", "tokens", "activity", "lp"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
              tab === t
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t === "lp" ? "LP Positions" : t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Balance chart panel */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Portfolio balance
                </p>
                {assetsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalValue)}
                  </span>
                )}
              </div>
              {/* Mini legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end max-w-[200px]">
                {walletAssets.slice(0, 5).map((a) => (
                  <div key={a.symbol} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: a.color }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {a.symbol}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {assetsLoading ? (
              <div className="h-56 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : balanceHistory.length > 0 ? (
              <BalanceHistoryChart
                data={balanceHistory}
                activeSymbols={activeSymbols}
              />
            ) : (
              <div className="h-56 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No balance history available yet.
                </p>
              </div>
            )}
          </div>

          {/* Action tiles */}
          <div className="grid grid-cols-4 gap-3">
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
                className="glass-panel-hover p-4 flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Quick stats — real data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Swaps this week
                </span>
              </div>
              {personalTxLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {swapCount}
                </span>
              )}
            </div>
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-muted-foreground">
                  Swapped this week
                </span>
              </div>
              {personalTxLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(swapVolume)}
                </span>
              )}
            </div>
          </div>

          {/* Token holdings — real */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Token holdings
            </h3>
            <div className="glass-panel overflow-hidden">
              {assetsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Fetching balances…
                  </p>
                </div>
              ) : walletAssets.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No token balances found.
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
                      <p className="text-sm font-medium text-foreground">
                        {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.balance.toLocaleString("en-US", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        {a.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(a.value)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Recent activity
            </h3>
            <div className="glass-panel overflow-hidden">
              {personalTxLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Fetching activity…
                  </p>
                </div>
              ) : personalTxns.length > 0 ? (
                personalTxns.slice(0, 5).map((tx, i) => (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 px-4 py-3 data-table-row ${
                      i > 0 ? "border-t border-border/30" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.token0}
                        {tx.token1 ? ` / ${tx.token1}` : ""} ·{" "}
                        {timeAgo(new Date(tx.timestamp))}
                      </p>
                    </div>
                    <a
                      href={`https://testnet.explorer.perawallet.app/tx/${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-primary/70 transition-colors font-semibold"
                    >
                      Pera Explorer ↗
                    </a>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No recent activity detected.
                  </p>
                </div>
              )}
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
          <div className="flex justify-end p-1 bg-muted/40 rounded-xl border border-border/20 w-fit ml-auto">
            {(["personal", "global"] as ActivityView[]).map((v) => (
              <button
                key={v}
                onClick={() => setActivityView(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activityView === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v} activity
              </button>
            ))}
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
