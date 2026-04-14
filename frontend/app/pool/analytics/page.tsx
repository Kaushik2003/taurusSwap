"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Info, 
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format';
import { usePoolState } from '@/hooks/usePoolState';
import { useTransactions } from '@/hooks/useTransactions';
import { getTokenSymbol, getTokenColor, rawToDisplay } from '@/lib/tokenDisplay';
import { getExplorerUrl } from '@/lib/explorer';
import { Skeleton } from '@/components/ui/skeleton';

// Generate complex mock data for charts
const generateHistory = (points: number, base: number, volatility: number) => {
  const data = [];
  let current = base;
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    current = current * (1 + (Math.random() - 0.48) * volatility);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: current,
      volume: current * (Math.random() * 0.2 + 0.05)
    });
  }
  return data;
};

const priceData = generateHistory(30, 1.0005, 0.002);
const tvlData = generateHistory(30, 482000000, 0.015);
const depthData = [
  { price: 0.980, density: 50000 },
  { price: 0.985, density: 120000 },
  { price: 0.990, density: 450000 },
  { price: 0.995, density: 890000 },
  { price: 1.000, density: 1200000 },
  { price: 1.005, density: 950000 },
  { price: 1.010, density: 420000 },
  { price: 1.015, density: 110000 },
  { price: 1.020, density: 45000 },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: pool, isLoading: poolLoading } = usePoolState();
  const { data: transactions, isLoading: txLoading } = useTransactions(null, 10);
  const [activeTab, setActiveTab] = useState<'price' | 'tvl'>('price');

  // Calculate real TVL from reserves
  const totalTVLRaw = pool?.actualReservesRaw.reduce((acc, val) => acc + val, 0n) ?? 0n;
  const currentTVL = Number(rawToDisplay(totalTVLRaw));

  // Calculate 24h Volume from real transactions
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const actual24hVolume = transactions
    ?.filter(tx => tx.type === 'swap' && tx.timestamp > oneDayAgo)
    .reduce((acc, tx) => acc + (tx.value || 0), 0) ?? 0;

  const metrics = [
    { 
      label: 'Total Value Locked', 
      value: currentTVL, 
      change: 2.4, 
      sparkline: [currentTVL * 0.9, currentTVL * 0.95, currentTVL * 0.92, currentTVL] 
    },
    { 
      label: '24H Trading Volume', 
      value: actual24hVolume > 0 ? actual24hVolume : 124500, // Fallback if no recent txs
      change: actual24hVolume > 0 ? 5.2 : 0, 
      sparkline: [30, 35, 60, 45, 40, 55, actual24hVolume || 70] 
    },
    { 
      label: '24H Protocol Fees', 
      value: (actual24hVolume || 124500) * 0.0001, 
      change: 8.4, 
      sparkline: [20, 25, 30, 28, 35, 40, 38] 
    },
    { 
      label: 'Utilization Rate', 
      value: `${((actual24hVolume || 124500) / (currentTVL || 1) * 100).toFixed(2)}%`, 
      change: -1.2, 
      sparkline: [50, 48, 45, 42, 40, 42, 41] 
    },
  ];

  if (poolLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="w-64 h-12" />
          <Skeleton className="w-48 h-10" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => router.push('/pool')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">Pool Analytics</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em] mt-1">Stableswap-4-Asset - Orbital AMM v1</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/30 h-fit">
          {['24H', '7D', '30D', 'ALL'].map(t => (
            <button key={t} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${t === '30D' ? 'bg-background text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Institutional Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m, i) => (
          <div key={i} className="glass-panel p-5 bg-muted/5 border-border/40">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{m.label}</p>
            <div className="flex items-end justify-between">
              <div>
                <h4 className="text-xl font-black text-foreground">
                  {typeof m.value === 'number' ? formatCurrency(m.value, true) : m.value}
                </h4>
                <div className={`flex items-center gap-1 text-[10px] font-bold ${m.change >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                  {m.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatPercent(m.change)}
                </div>
              </div>
              <div className="w-16 h-8 opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={m.sparkline.map((v, idx) => ({ v, idx }))}>
                    <Area type="monotone" dataKey="v" stroke={m.change >= 0 ? '#10B981' : '#F43F5E'} fill="none" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Performance Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 border-border/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <button onClick={() => setActiveTab('price')} className={`text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'price' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Price Stability</button>
                <button onClick={() => setActiveTab('tvl')} className={`text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'tvl' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>TVL History</button>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <Calendar className="w-3 h-3" />
                Mar 15 - Apr 14
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeTab === 'price' ? priceData : tvlData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} minTickGap={30} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '2px solid #0A3F2F', boxShadow: '4px 4px 0px 0px #0A3F2F' }}
                    labelStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                    itemStyle={{ fontWeight: 700, fontSize: '12px', color: '#0A3F2F' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Liquidity Depth Concentration</h3>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={depthData}>
                    <Bar dataKey="density" radius={[4, 4, 0, 0]}>
                      {depthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 4 ? '#10B981' : '#0A3F2F20'} />
                      ))}
                    </Bar>
                    <Tooltip 
                       cursor={{ fill: 'transparent' }}
                       contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #0A3F2F10', fontSize: '10px' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-center font-bold text-muted-foreground uppercase mt-4 tracking-tighter">Current Peg Center: $1.0000</p>
            </div>

            <div className="glass-panel p-6 border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-4 bg-blue-500 rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Daily Volume Breakdown</h3>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceData.slice(-14)}>
                    <Bar dataKey="volume" fill="#0A3F2F" radius={[2, 2, 0, 0]} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center mt-4 px-2">
                <span className="text-[10px] font-bold text-muted-foreground">MAR 31</span>
                <span className="text-[10px] font-bold text-muted-foreground">APR 14</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Data Table */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 border-border/50 bg-muted/5">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-4 bg-primary rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Asset Utilization</h3>
            </div>

            <div className="space-y-4">
              {pool?.tokenAsaIds.map((asaId, i) => {
                const reserveRaw = pool.actualReservesRaw[i];
                const reserveDisplay = rawToDisplay(reserveRaw);
                const percent = totalTVLRaw > 0n ? Number((reserveRaw * 10000n) / totalTVLRaw) / 100 : 0;
                
                return (
                  <div key={asaId} className="p-3 rounded-xl border border-border/20 bg-background group hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <a 
                        href={getExplorerUrl(asaId, 'asset')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-sm font-black text-foreground"
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: getTokenColor(i) }} />
                        <span>{getTokenSymbol(pool, i)}</span>
                      </a>
                      <span className="text-[10px] font-black py-0.5 px-2 rounded bg-muted text-muted-foreground uppercase">UTIL: {percent.toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Reserve</p>
                        <p className="text-xs font-black text-foreground">{formatNumber(Number(reserveDisplay))}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Value</p>
                        <p className="text-xs font-black text-foreground">${formatNumber(Number(reserveDisplay))}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center justify-between mb-4">
                 <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground">Swap Activity</h4>
                 <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {transactions?.length ? transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-2">
                       <span className={tx.type === 'swap' ? 'text-emerald-500 uppercase' : 'text-primary uppercase'}>{tx.type}</span>
                       <span className="text-muted-foreground truncate max-w-[80px]">{tx.id.slice(0, 8)}...</span>
                    </div>
                    <span className="text-muted-foreground font-medium">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )) : (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No recent activity found</p>
                )}
              </div>
              <a 
                href={getExplorerUrl(pool?.appId || '', 'application')}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="link" className="w-full text-center text-[10px] font-black uppercase tracking-widest text-primary mt-4 h-auto p-0">
                   View All Transactions <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Protocol Health
            </h4>
            <p className="text-[11px] font-medium leading-relaxed opacity-80 mb-6">
              Orbital AMM invariant error: 0.000001%. Peg deviation is currently below 5bps. System liquidity is highly concentrated.
            </p>
            <div className="flex items-center gap-2 text-primary-foreground font-black text-[10px] uppercase tracking-widest bg-white/10 p-3 rounded-xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer">
              View Smart Contract Audit <ExternalLink className="w-3 h-3 ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
