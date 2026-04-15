"use client";

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  ExternalLink,
  ChevronRight,
  Layers,
  Percent,
  Database,
  DollarSign,
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePoolState } from '@/hooks/usePoolState';
import { useTransactions } from '@/hooks/useTransactions';
import { getTokenSymbol, getTokenColor, POOL_TOKEN_SYMBOLS } from '@/lib/tokenDisplay';
import { getExplorerUrl, shortenId } from '@/lib/explorer';
import { formatCurrency, timeAgo } from '@/lib/format';
import { PRECISION } from '@/lib/orbital-sdk/constants';
import { GeometricLiquidityCompass } from '@/components/pool/GeometricLiquidityCompass';
import { ReservePieChart } from '@/components/pool/analytics/ReservePieChart';
import { FeeGrowthBarChart } from '@/components/pool/analytics/FeeGrowthBarChart';
import { TickDepthChart } from '@/components/pool/analytics/TickDepthChart';
import { PegDeviationChart } from '@/components/pool/analytics/PegDeviationChart';

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: pool, isLoading: poolLoading } = usePoolState();
  const { data: transactions } = useTransactions(null, 20);

  const totalTVLRaw = pool?.actualReservesRaw.reduce((acc, val) => acc + val, 0n) ?? 0n;
  const tvlDisplay = Number(totalTVLRaw) / 1e6;

  const feeTier = pool ? `${(Number(pool.feeBps) / 100).toFixed(2)}%` : '--';
  const activeTicks = pool?.ticks.length ?? 0;

  const totalFeesAccumulated = pool
    ? pool.feeGrowth.reduce((acc, fg) => {
        const feeAmountScale = pool.totalR > 0n ? (fg * pool.totalR) / PRECISION : 0n;
        return acc + feeAmountScale;
      }, 0n)
    : 0n;
  const feesDisplay = Number(totalFeesAccumulated) / 1e3 / 1e6;

  const recentTransactions = [...(transactions ?? [])]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);
  const latestTransaction = recentTransactions[0];

  const metrics = [
    {
      label: 'Total Value Locked',
      value: formatCurrency(tvlDisplay, true),
      icon: Database,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Fee Tier',
      value: feeTier,
      icon: Percent,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Active Ticks',
      value: activeTicks.toString(),
      icon: Layers,
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
    },
    {
      label: 'Fees Accumulated',
      value: formatCurrency(feesDisplay, true),
      icon: DollarSign,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      sublabel: 'all-time',
    },
  ];

  if (poolLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-20 space-y-6">
        <Skeleton className="w-80 h-16" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-20">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/pool')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1
            className="text-6xl text-foreground mb-1"
            style={{ fontFamily: "'WiseSans', 'Inter', sans-serif", fontWeight: 900 }}
          >
            POOL ANALYTICS
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em]">
            Stableswap-{pool?.n ?? '?'}-Asset · Orbital AMM v1 · Live On-Chain
          </p>
        </div>

        <a
          href={getExplorerUrl(pool?.appId ?? '', 'application')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="neo" className="h-9 px-4">
            View Contract <ExternalLink className="w-3 h-3 ml-2" strokeWidth={2.5} />
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, i) => (
          <div key={i} className="glass-panel p-4 bg-muted/5 border-border/40">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metric.iconBg}`}>
                <metric.icon className={`w-4 h-4 ${metric.iconColor}`} strokeWidth={2.5} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {metric.label}
              </p>
            </div>
            <p className="text-[22px] font-black text-foreground leading-none tabular-nums">{metric.value}</p>
            {metric.sublabel && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {metric.sublabel}
              </p>
            )}
          </div>
        ))}
      </div>

      <Tabs.Root defaultValue="overview" className="w-full">
        <div className="inline-flex p-1.5 rounded-full border border-dark-green/10 mb-8 bg-dark-green/[0.02]">
          <Tabs.List className="inline-flex items-center gap-1 bg-transparent w-fit h-10">
            {(['overview', 'depth'] as const).map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className="rounded-full transition-all text-dark-green/50 hover:text-dark-green
                  data-[state=active]:bg-[#052c05] data-[state=active]:text-[#89f589] data-[state=active]:border-[1.5px] data-[state=active]:border-[#89f589]
                  data-[state=active]:shadow-[0_0_0_2px_#052c05,0_0_0_3.5px_#89f589]
                  px-8 h-full font-bold uppercase tracking-widest text-[10px]"
              >
                {tab}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <Tabs.Content value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 glass-panel p-5 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                  Reserve Composition
                </h3>
              </div>
              {pool && <ReservePieChart pool={pool} />}
              <div className="mt-3 space-y-2">
                {pool?.tokenAsaIds.map((asaId, i) => {
                  const raw = pool.actualReservesRaw[i] ?? 0n;
                  const display = Number(raw) / 1e6;
                  const pct = tvlDisplay > 0 ? ((display / tvlDisplay) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={asaId} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: getTokenColor(i) }} />
                        <span className="text-[12px] font-black text-foreground truncate">{getTokenSymbol(pool, i)}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[12px] font-black text-foreground tabular-nums">
                          ${display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground ml-2">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-8 glass-panel p-5 border-border/50">
              <div className="flex items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                    Live Peg Snapshot
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                  Deviation from mean reserve
                </span>
              </div>
              {pool && <PegDeviationChart pool={pool} />}
            </div>

            <div className="lg:col-span-12 glass-panel p-5 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                  Geometric Liquidity Compass
                </h3>
              </div>
              {pool && (
                <GeometricLiquidityCompass
                  reserves={pool.actualReservesRaw}
                  n={pool.n}
                  sBound={pool.sBound}
                  tokenSymbols={pool.tokenAsaIds.map((_, i) => getTokenSymbol(pool, i))}
                />
              )}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="depth">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 glass-panel p-5 border-border/50">
              <div className="flex items-center justify-between mb-5 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 bg-primary rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                    Liquidity Depth by Tick
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {activeTicks} active ticks
                </span>
              </div>
              {pool && <TickDepthChart pool={pool} />}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3 text-center">
                Tick radius increases with concentrated liquidity
              </p>
            </div>

            <div className="lg:col-span-4 glass-panel p-5 border-border/50">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-4 bg-amber-500 rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                  Fee Growth per Token
                </h3>
              </div>
              {pool && <FeeGrowthBarChart pool={pool} />}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3 text-center">
                All-time accumulated
              </p>

              <div className="mt-5 space-y-3 pt-4 border-t border-border/30">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Interior Radius
                  </span>
                  <span className="text-[12px] font-black text-foreground tabular-nums">
                    {pool ? (Number(pool.rInt) / 1e3).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Bound Radius
                  </span>
                  <span className="text-[12px] font-black text-foreground tabular-nums">
                    {pool ? (Number(pool.sBound) / 1e3).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Radius
                  </span>
                  <span className="text-[12px] font-black text-foreground tabular-nums">
                    {pool ? (Number(pool.totalR) / 1e3).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Lifetime Ticks
                  </span>
                  <span className="text-[12px] font-black text-foreground tabular-nums">{pool?.numTicks ?? '--'}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12 glass-panel p-5 border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                    Recent Activity
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {latestTransaction && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Latest {timeAgo(new Date(latestTransaction.timestamp))}
                    </span>
                  )}
                  <a
                    href={getExplorerUrl(pool?.appId ?? '', 'application')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity inline-flex items-center"
                  >
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>

              {!recentTransactions.length ? (
                <p className="text-[10px] text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((tx, index) => {
                    const amtIn = tx.amountIn
                      ? (Number(tx.amountIn) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })
                      : '--';
                    const amtOut = tx.amountOut
                      ? (Number(tx.amountOut) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })
                      : '--';
                    const tokenIn =
                      tx.tokenInIdx !== undefined ? POOL_TOKEN_SYMBOLS[tx.tokenInIdx] ?? tx.token0 : tx.token0;
                    const tokenOut =
                      tx.tokenOutIdx !== undefined
                        ? POOL_TOKEN_SYMBOLS[tx.tokenOutIdx] ?? tx.token1 ?? '--'
                        : tx.token1 ?? '--';

                    return (
                      <div
                        key={tx.id}
                        className={`rounded-2xl border p-4 transition-colors ${
                          index === 0
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border/20 bg-muted/5 hover:bg-muted/10'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={`mt-0.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0 ${
                                tx.type === 'swap'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : tx.type === 'add'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : tx.type === 'remove'
                                      ? 'bg-rose-500/10 text-rose-500'
                                      : 'bg-amber-500/10 text-amber-500'
                              }`}
                            >
                              {index === 0 ? `latest ${tx.type}` : tx.type}
                            </span>

                            <div className="min-w-0">
                              <p className="text-[12px] font-black text-foreground truncate">
                                {tx.type === 'swap' ? `${tokenIn} -> ${tokenOut}` : tx.type}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <span>
                                  In {tx.amountIn ? `${amtIn} ${tokenIn}` : '--'}
                                </span>
                                <span>
                                  Out {tx.amountOut ? `${amtOut} ${tokenOut}` : '--'}
                                </span>
                                <span>{timeAgo(new Date(tx.timestamp))}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 lg:gap-5 shrink-0">
                            <a
                              href={getExplorerUrl(tx.wallet, 'address')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
                            >
                              {shortenId(tx.wallet, 6, 4)}
                            </a>
                            <a
                              href={getExplorerUrl(tx.id, 'transaction')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
