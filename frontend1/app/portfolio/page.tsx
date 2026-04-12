"use client";

import { useState } from 'react';
import { Wallet, Send, ArrowDownToLine, CreditCard, MoreHorizontal, TrendingUp, Activity, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { demoWalletAssets, demoTransactions, portfolioChartData } from '@/data/mock';
import { formatCurrency, formatPercent, timeAgo } from '@/lib/format';
import TokenIcon from '@/components/shared/TokenIcon';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useWallet } from '@txnlab/use-wallet-react';
import { usePoolState } from '@/hooks/usePoolState';
import { useAllPositions } from '@/hooks/usePosition';
import { getTokenSymbol, getTokenColor, rawToDisplay } from '@/lib/tokenDisplay';

type Tab = 'overview' | 'tokens' | 'nfts' | 'activity' | 'lp';
type Timeframe = '1H' | '1D' | '1W' | '1M' | '1Y' | 'All';

export default function Portfolio() {
  const { activeAddress } = useWallet();
  const isWalletConnected = !!activeAddress;
  const { toggleWalletModal } = useAppStore();
  const walletAddress = activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}` : '';
  const [tab, setTab] = useState<Tab>('overview');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  const { data: pool } = usePoolState();
  const { data: positions = [], isLoading: positionsLoading } = useAllPositions(
    activeAddress ?? null,
    pool?.numTicks ?? 0,
  );
  const activePositions = positions.filter(p => p.shares > 0n);

  const totalValue = demoWalletAssets.reduce((s, a) => s + a.value, 0);
  const dailyChange = totalValue * 0.0234;

  if (!isWalletConnected) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-8" style={{ background: 'linear-gradient(135deg, hsl(70 55% 20% / 0.5), hsl(80 45% 15% / 0.5), hsl(240 10% 8%))' }}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(70 55% 37% / 0.3), transparent 50%), radial-gradient(circle at 80% 30%, hsl(80 45% 30% / 0.2), transparent 40%)' }} />
          <div className="relative p-10 sm:p-16 text-center">
            <Wallet className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Your crypto portfolio</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your wallet to track your tokens, NFTs, and DeFi positions in one place.
            </p>
            <Button onClick={() => toggleWalletModal(true)} className="rounded-2xl px-8 h-12 text-base font-semibold">
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Profile */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-primary-foreground" style={{ background: 'linear-gradient(135deg, hsl(70 55% 37%), hsl(80 45% 30%))' }}>
          F
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{walletAddress}</h2>
          <p className="text-xs text-muted-foreground">Ethereum · Demo wallet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-border/50">
        {(['overview', 'tokens', 'nfts', 'activity', 'lp'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
          >
            {t === 'nfts' ? 'NFTs' : t === 'lp' ? 'LP Positions' : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Value + Chart */}
          <div className="glass-panel p-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">Total balance</p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">{formatCurrency(totalValue)}</span>
                <span className="text-sm percentage-up">{formatPercent(2.34)} ({formatCurrency(dailyChange)})</span>
              </div>
            </div>

            {/* Timeframe pills */}
            <div className="flex gap-1 mb-4">
              {(['1H', '1D', '1W', '1M', '1Y', 'All'] as Timeframe[]).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeframe === tf ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioChartData}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(70, 55%, 37%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(70, 55%, 37%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} interval="preserveStartEnd" />
                  <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(240 8% 10%)', border: '1px solid hsl(240 6% 18%)', borderRadius: '12px', fontSize: 12 }}
                    labelStyle={{ color: 'hsl(0 0% 55%)' }}
                    itemStyle={{ color: 'hsl(0 0% 95%)' }}
                    formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(70, 55%, 37%)" strokeWidth={2} fill="url(#portfolioGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action tiles */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Send, label: 'Send' },
              { icon: ArrowDownToLine, label: 'Receive' },
              { icon: CreditCard, label: 'Buy' },
              { icon: MoreHorizontal, label: 'More' },
            ].map(a => (
              <button key={a.label} className="glass-panel-hover p-4 flex flex-col items-center gap-2 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Swaps this week</span>
              </div>
              <span className="text-lg font-bold text-foreground">12</span>
            </div>
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-muted-foreground">Swapped this week</span>
              </div>
              <span className="text-lg font-bold text-foreground">$8,420</span>
            </div>
          </div>

          {/* Token holdings */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Token holdings</h3>
            <div className="glass-panel overflow-hidden">
              {demoWalletAssets.map((a, i) => (
                <div key={a.token.id} className={`flex items-center gap-3 px-4 py-3 data-table-row ${i > 0 ? 'border-t border-border/30' : ''}`}>
                  <TokenIcon token={a.token} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.token.name}</p>
                    <p className="text-xs text-muted-foreground">{a.balance.toFixed(4)} {a.token.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{formatCurrency(a.value)}</p>
                    <p className={`text-xs ${a.token.change1d >= 0 ? 'percentage-up' : 'percentage-down'}`}>{formatPercent(a.token.change1d)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent activity</h3>
            <div className="glass-panel overflow-hidden">
              {demoTransactions.map((tx, i) => (
                <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 data-table-row ${i > 0 ? 'border-t border-border/30' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground capitalize">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.token0.symbol}{tx.token1 ? ` → ${tx.token1.symbol}` : ''} · {timeAgo(tx.timestamp)}
                    </p>
                  </div>
                  <span className="text-sm text-foreground">{formatCurrency(tx.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'tokens' && (
        <div className="glass-panel overflow-hidden">
          {demoWalletAssets.map((a, i) => (
            <div key={a.token.id} className={`flex items-center gap-3 px-4 py-3 data-table-row ${i > 0 ? 'border-t border-border/30' : ''}`}>
              <TokenIcon token={a.token} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.token.name}</p>
                <p className="text-xs text-muted-foreground">{a.token.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground">{formatCurrency(a.token.price)}</p>
                <p className={`text-xs ${a.token.change1d >= 0 ? 'percentage-up' : 'percentage-down'}`}>{formatPercent(a.token.change1d)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{formatCurrency(a.value)}</p>
                <p className="text-xs text-muted-foreground">{a.balance.toFixed(4)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'nfts' && (
        <div className="text-center py-16">
          <Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No NFTs found in this wallet</p>
        </div>
      )}

      {tab === 'activity' && (
        <div className="glass-panel overflow-hidden">
          {demoTransactions.map((tx, i) => (
            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 data-table-row ${i > 0 ? 'border-t border-border/30' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground capitalize">{tx.type} {tx.token0.symbol}{tx.token1 ? ` → ${tx.token1.symbol}` : ''}</p>
                <p className="text-xs text-muted-foreground">{tx.hash} · {tx.network}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-foreground">{formatCurrency(tx.value)}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(tx.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'lp' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-1">Orbital AMM liquidity positions</p>
          {positionsLoading ? (
            <div className="glass-panel p-10 text-center">
              <Loader2 className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">Scanning positions…</p>
            </div>
          ) : activePositions.length === 0 ? (
            <div className="glass-panel p-10 text-center">
              <p className="text-sm text-muted-foreground">No active LP positions found.</p>
            </div>
          ) : (
            activePositions.map(pos => {
              const totalFees = pos.claimableFees.reduce((a, b) => a + b, 0n);
              return (
                <div key={pos.tickId} className="glass-panel p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {pool && Array.from({ length: pool.n }, (_, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border border-background"
                          style={{ background: getTokenColor(i), marginLeft: i > 0 ? '-6px' : 0 }}
                        />
                      ))}
                      <span className="text-sm font-semibold text-foreground ml-1">
                        {pool ? Array.from({ length: pool.n }, (_, i) => getTokenSymbol(pool, i)).join('/') : '…'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Tick #{pos.tickId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Shares</p>
                      <p className="font-medium text-foreground">{pos.shares.toString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Position r</p>
                      <p className="font-medium text-foreground">{rawToDisplay(pos.positionR * 1000n)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Claimable fees</p>
                      <p className="font-medium text-foreground">{rawToDisplay(totalFees)}</p>
                    </div>
                  </div>
                  {pool && pos.claimableFees.some(f => f > 0n) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pos.claimableFees.map((fee, i) =>
                        fee > 0n ? (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
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
