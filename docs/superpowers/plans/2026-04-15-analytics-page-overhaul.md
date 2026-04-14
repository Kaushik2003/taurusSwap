# Analytics Page Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock/generated data on the analytics page with 100% real on-chain contract data, restructure into a tab-based layout (Overview / Depth), and add production-grade charts (reserve pie, fee growth bars, tick depth bar, peg deviation line, decoded tx feed).

**Architecture:** The existing `app/pool/analytics/page.tsx` is rewritten in-place. A new `useTransactions` upgrade decodes swap `amountIn`/`amountOut` from `applicationArgs`. Three new pure chart components are extracted into `components/pool/analytics/`. No backend required — all data comes from `usePoolState` + `useTransactions` hooks already in place.

**Tech Stack:** Next.js 16 (App Router), React 19, Recharts 3, @radix-ui/react-tabs, Tailwind CSS 4, lucide-react, framer-motion, algosdk v3 (already installed).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `frontend/hooks/useTransactions.ts` | Decode `amountIn`, `amountOut`, `tokenInIdx`, `tokenOutIdx` from applicationArgs |
| Create | `frontend/components/pool/analytics/ReservePieChart.tsx` | Donut pie chart of per-token reserves |
| Create | `frontend/components/pool/analytics/FeeGrowthBarChart.tsx` | Per-token fee growth bar chart |
| Create | `frontend/components/pool/analytics/TickDepthChart.tsx` | Per-tick liquidity distribution bar chart |
| Create | `frontend/components/pool/analytics/PegDeviationChart.tsx` | Line chart of per-token deviation from mean reserve |
| Rewrite | `frontend/app/pool/analytics/page.tsx` | Tab-based page wiring Overview + Depth tabs with real data |

---

## Task 1: Decode swap amounts in `useTransactions`

**Files:**
- Modify: `frontend/hooks/useTransactions.ts`

The swap ABI method signature is `swap(uint64,uint64,uint64,uint64,uint64)void`. After the 4-byte selector, args[1] = tokenInIdx (uint64), args[2] = tokenOutIdx (uint64), args[3] = amountIn (uint64), args[4] = minAmountOut (uint64). For `swap_with_crossings` the signature is `swap_with_crossings(uint64,uint64,uint64,byte[],uint64)void` — args[1]=tokenInIdx, args[2]=tokenOutIdx, args[3]=amountIn.

Each arg is a raw `Uint8Array` encoded as a big-endian uint64 (8 bytes). algosdk v3 does NOT automatically decode ABI args from indexer results — we decode manually with `DataView`.

- [ ] **Step 1: Add a helper to decode a big-endian uint64 Uint8Array**

In `frontend/hooks/useTransactions.ts`, add this helper above the `useTransactions` function:

```ts
function decodeBigEndianUint64(bytes: Uint8Array): bigint {
  if (bytes.length < 8) return 0n;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getBigUint64(0, false); // big-endian
}
```

- [ ] **Step 2: Extend the `AMMTransaction` interface with decoded swap fields**

Replace the existing interface:

```ts
export interface AMMTransaction {
  id: string;
  type: 'swap' | 'add' | 'remove' | 'claim';
  timestamp: number;
  wallet: string;
  token0: string;
  token1?: string;
  amount0?: string;
  amount1?: string;
  tokenInIdx?: number;   // ADD
  tokenOutIdx?: number;  // ADD
  amountIn?: bigint;     // ADD — raw microunits
  amountOut?: bigint;    // ADD — raw microunits (minAmountOut from args, best available)
  value?: number;
  status: 'confirmed' | 'pending';
}
```

- [ ] **Step 3: Decode tokenInIdx, tokenOutIdx, amountIn inside the `.map()` block**

Replace the `return { ... }` inside the `.map()` callback with:

```ts
let tokenInIdx: number | undefined;
let tokenOutIdx: number | undefined;
let amountIn: bigint | undefined;
let amountOut: bigint | undefined;

if (type === 'swap' && args.length >= 4) {
  // args[0] = selector (4 bytes), args[1..4] = ABI-encoded uint64s (each 8 bytes)
  if (args[1] instanceof Uint8Array && args[1].length >= 8)
    tokenInIdx = Number(decodeBigEndianUint64(args[1]));
  if (args[2] instanceof Uint8Array && args[2].length >= 8)
    tokenOutIdx = Number(decodeBigEndianUint64(args[2]));
  if (args[3] instanceof Uint8Array && args[3].length >= 8)
    amountIn = decodeBigEndianUint64(args[3]);
  if (args[4] instanceof Uint8Array && args[4].length >= 8)
    amountOut = decodeBigEndianUint64(args[4]);
}

return {
  id: tx.id,
  type,
  timestamp: (tx.roundTime || 0) * 1000,
  wallet: tx.sender || '',
  token0: POOL_TOKEN_SYMBOLS[tokenInIdx ?? 0] ?? POOL_TOKEN_SYMBOLS[0],
  token1: type === 'swap' ? (POOL_TOKEN_SYMBOLS[tokenOutIdx ?? 1] ?? POOL_TOKEN_SYMBOLS[1]) : undefined,
  tokenInIdx,
  tokenOutIdx,
  amountIn,
  amountOut,
  value: amountIn ? Number(amountIn) / 1e6 : (type === 'swap' ? 100 : 500),
  status: 'confirmed' as const,
};
```

- [ ] **Step 4: Commit**

```bash
cd /home/kzark/Documents/coding/TaurusProtocol
git add frontend/hooks/useTransactions.ts
git commit -m "feat: decode swap amountIn/tokenInIdx/tokenOutIdx from applicationArgs"
```

---

## Task 2: `ReservePieChart` component

**Files:**
- Create: `frontend/components/pool/analytics/ReservePieChart.tsx`

A donut PieChart using recharts `PieChart` + `Pie` + `Cell` + `Tooltip` + `Legend`. Shows each token's share of total TVL. Data is derived from `pool.actualReservesRaw`.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getTokenSymbol, getTokenColor, POOL_TOKEN_SYMBOLS } from '@/lib/tokenDisplay';
import type { PoolState } from '@/lib/orbital-sdk';

interface ReservePieChartProps {
  pool: PoolState;
}

export function ReservePieChart({ pool }: ReservePieChartProps) {
  const data = pool.tokenAsaIds.map((_, i) => {
    const raw = pool.actualReservesRaw[i] ?? 0n;
    const value = Number(raw) / 1e6;
    return {
      name: getTokenSymbol(pool, i),
      value,
      color: getTokenColor(i),
    };
  });

  const total = data.reduce((acc, d) => acc + d.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(2) : '0.00';
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{d.name}</p>
        <p className="text-sm font-black text-foreground">${d.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-[10px] font-bold text-muted-foreground">{pct}% of pool</p>
      </div>
    );
  };

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.9} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/pool/analytics/ReservePieChart.tsx
git commit -m "feat: add ReservePieChart component with real on-chain reserve data"
```

---

## Task 3: `FeeGrowthBarChart` component

**Files:**
- Create: `frontend/components/pool/analytics/FeeGrowthBarChart.tsx`

Shows per-token accumulated fee growth. `feeGrowth[i]` is a PRECISION-scaled (×10^9) monotone accumulator per unit of liquidity-radius. To get total accumulated fees per token in display units: `feeGrowth[i] × totalR / PRECISION / 1000` (the `/1000` converts AMOUNT_SCALE to raw microunits, then `/1e6` for display). Labeled "Accumulated" clearly.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getTokenSymbol, getTokenColor } from '@/lib/tokenDisplay';
import { PRECISION } from '@/lib/orbital-sdk/constants';
import type { PoolState } from '@/lib/orbital-sdk';

interface FeeGrowthBarChartProps {
  pool: PoolState;
}

export function FeeGrowthBarChart({ pool }: FeeGrowthBarChartProps) {
  const data = pool.tokenAsaIds.map((_, i) => {
    // total_fees_i (raw microunits) = feeGrowth[i] * totalR / PRECISION * AMOUNT_SCALE
    // feeGrowth is PRECISION-scaled per-unit-r accumulator
    // totalR is AMOUNT_SCALE units; multiply by 1000 to get raw microunits
    const feeRaw = pool.totalR > 0n
      ? (pool.feeGrowth[i] * pool.totalR) / PRECISION
      : 0n;
    // feeRaw is in AMOUNT_SCALE units → convert to display (÷1000 for raw microunits, ÷1e6 for tokens)
    const feeDisplay = Number(feeRaw) / 1e3 / 1e6;
    return {
      name: getTokenSymbol(pool, i),
      value: feeDisplay,
      color: getTokenColor(i),
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{d.name}</p>
        <p className="text-sm font-black text-foreground">${d.value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Accumulated fees</p>
      </div>
    );
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/pool/analytics/FeeGrowthBarChart.tsx
git commit -m "feat: add FeeGrowthBarChart using real feeGrowth × totalR on-chain data"
```

---

## Task 4: `TickDepthChart` component

**Files:**
- Create: `frontend/components/pool/analytics/TickDepthChart.tsx`

A bar chart showing liquidity depth per active tick. Each bar = one tick. X-axis = tick ID, Y-axis = `tick.r` (in display units = `Number(tick.r) / 1e3`). Bars colored by dominant-radius share. This is the equivalent of Uniswap's "liquidity distribution" chart but for this pool's spherical tick structure.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PoolState } from '@/lib/orbital-sdk';

interface TickDepthChartProps {
  pool: PoolState;
}

export function TickDepthChart({ pool }: TickDepthChartProps) {
  if (!pool.ticks.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        No active ticks
      </div>
    );
  }

  const maxR = pool.ticks.reduce((max, t) => t.r > max ? t.r : max, 0n);

  const data = pool.ticks.map((tick) => ({
    id: `T${tick.id}`,
    r: Number(tick.r) / 1e3,       // AMOUNT_SCALE → display (stablecoin units)
    shares: Number(tick.totalShares),
    pct: maxR > 0n ? Number((tick.r * 100n) / maxR) : 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{d.id}</p>
        <p className="text-sm font-black text-foreground">{d.r.toLocaleString('en-US', { maximumFractionDigits: 2 })} units r</p>
        <p className="text-[9px] font-bold text-muted-foreground">{d.shares.toLocaleString()} shares · {d.pct}% of max</p>
      </div>
    );
  };

  // Gradient color: deeper ticks (higher r) → more saturated green
  const getBarColor = (pct: number) => {
    const alpha = 0.3 + (pct / 100) * 0.7;
    return `rgba(16, 185, 129, ${alpha})`;
  };

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="r" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/pool/analytics/TickDepthChart.tsx
git commit -m "feat: add TickDepthChart showing real per-tick liquidity distribution"
```

---

## Task 5: `PegDeviationChart` component

**Files:**
- Create: `frontend/components/pool/analytics/PegDeviationChart.tsx`

A line chart showing each token's deviation from mean reserve as a percentage. All lines on one chart, one line per token. This replaces the fake "Price Stability" area chart with a real live snapshot. Since there is no historical data, this is a radial/point-in-time snapshot rendered as a multi-line bar chart showing current deviation% per token. Label clearly: "Live Peg Snapshot".

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getTokenSymbol, getTokenColor } from '@/lib/tokenDisplay';
import type { PoolState } from '@/lib/orbital-sdk';

interface PegDeviationChartProps {
  pool: PoolState;
}

export function PegDeviationChart({ pool }: PegDeviationChartProps) {
  const reserves = pool.actualReservesRaw.map(r => Number(r) / 1e6);
  const mean = reserves.reduce((a, b) => a + b, 0) / (reserves.length || 1);

  // Each data point is one token: { token: 'USDC', deviation: 0.5 }
  // deviation = abs(reserve - mean) / mean * 100 (%)
  const data = pool.tokenAsaIds.map((_, i) => ({
    token: getTokenSymbol(pool, i),
    deviation: mean > 0 ? Math.abs((reserves[i] - mean) / mean * 100) : 0,
    reserve: reserves[i],
    color: getTokenColor(i),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{d.token}</p>
        <p className="text-sm font-black text-foreground">{d.deviation.toFixed(4)}% deviation</p>
        <p className="text-[9px] font-bold text-muted-foreground">${d.reserve.toLocaleString('en-US', { maximumFractionDigits: 2 })} reserve</p>
      </div>
    );
  };

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
          <PolarGrid stroke="rgba(255,255,255,0.07)" />
          <PolarAngleAxis
            dataKey="token"
            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
          />
          <Radar
            name="Deviation %"
            dataKey="deviation"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/pool/analytics/PegDeviationChart.tsx
git commit -m "feat: add PegDeviationChart radar showing live per-token peg deviation"
```

---

## Task 6: Rewrite `analytics/page.tsx`

**Files:**
- Rewrite: `frontend/app/pool/analytics/page.tsx`

This is the main wiring task. Full rewrite of the page. Remove all `generateHistory` mock data and all fake metrics. Wire up the four new chart components + existing `GeometricLiquidityCompass` into a tab-based layout using `@radix-ui/react-tabs`.

**Tab layout:**
- **OVERVIEW tab**: 4 real metric cards → ReservePieChart (left) + PegDeviationChart (right) → GeometricLiquidityCompass full-width
- **DEPTH tab**: TickDepthChart (left, 8 col) → FeeGrowthBarChart (right, 4 col) → decoded activity feed full-width

**4 Metric cards (all real):**
1. TVL = `sum(actualReservesRaw[i]) / 1e6`
2. Fee Tier = `feeBps / 100`%
3. Active Ticks = `ticks.length`
4. Protocol Fees Accumulated = `sum over i of feeGrowth[i] * totalR / PRECISION / 1e3 / 1e6`

- [ ] **Step 1: Write the new page**

Replace the entire content of `frontend/app/pool/analytics/page.tsx` with:

```tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
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
import { getTokenSymbol, getTokenColor, rawToDisplay, POOL_TOKEN_SYMBOLS } from '@/lib/tokenDisplay';
import { getExplorerUrl, shortenId } from '@/lib/explorer';
import { formatCurrency, formatNumber, timeAgo } from '@/lib/format';
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

  // ── Real metrics ──────────────────────────────────────────────────────────────
  const totalTVLRaw = pool?.actualReservesRaw.reduce((acc, val) => acc + val, 0n) ?? 0n;
  const tvlDisplay = Number(totalTVLRaw) / 1e6;

  const feeTier = pool ? `${(Number(pool.feeBps) / 100).toFixed(2)}%` : '—';
  const activeTicks = pool?.ticks.length ?? 0;

  // Protocol fees accumulated: sum over tokens of feeGrowth[i] * totalR / PRECISION
  // Result is AMOUNT_SCALE units → /1e3 → raw microunits → /1e6 → display USD
  const totalFeesAccumulated = pool
    ? pool.feeGrowth.reduce((acc, fg, i) => {
        const feeAmountScale = pool.totalR > 0n ? (fg * pool.totalR) / PRECISION : 0n;
        return acc + feeAmountScale;
      }, 0n)
    : 0n;
  const feesDisplay = Number(totalFeesAccumulated) / 1e3 / 1e6;

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
      <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8">
        <Skeleton className="w-64 h-12" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <h1 className="text-4xl font-black text-foreground tracking-tighter">Pool Analytics</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em] mt-1">
            Stableswap-{pool?.n ?? '?'}-Asset · Orbital AMM v1 · <span className="text-primary">Live On-Chain</span>
          </p>
        </div>

        <a
          href={getExplorerUrl(pool?.appId ?? '', 'application')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          View Contract <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Metrics strip — always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m, i) => (
          <div key={i} className="glass-panel p-5 bg-muted/5 border-border/40">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.iconBg}`}>
                <m.icon className={`w-4 h-4 ${m.iconColor}`} strokeWidth={2.5} />
              </div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{m.label}</p>
            </div>
            <p className="text-2xl font-black text-foreground tabular-nums">{m.value}</p>
            {m.sublabel && (
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{m.sublabel}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <Tabs.Root defaultValue="overview" className="w-full">
        <Tabs.List className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/30 w-fit mb-8">
          {(['overview', 'depth'] as const).map(tab => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/20"
            >
              {tab}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
        <Tabs.Content value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Reserve Composition Pie */}
            <div className="lg:col-span-5 glass-panel p-6 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Reserve Composition</h3>
              </div>
              {pool && <ReservePieChart pool={pool} />}
              {/* Per-token breakdown list */}
              <div className="mt-4 space-y-2">
                {pool?.tokenAsaIds.map((asaId, i) => {
                  const raw = pool.actualReservesRaw[i] ?? 0n;
                  const display = Number(raw) / 1e6;
                  const pct = tvlDisplay > 0 ? (display / tvlDisplay * 100).toFixed(1) : '0.0';
                  return (
                    <div key={asaId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: getTokenColor(i) }} />
                        <span className="text-[11px] font-black text-foreground">{getTokenSymbol(pool, i)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-black text-foreground tabular-nums">
                          ${display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground ml-2">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peg Deviation Radar */}
            <div className="lg:col-span-7 glass-panel p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Live Peg Snapshot</h3>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Deviation from mean reserve</span>
              </div>
              {pool && <PegDeviationChart pool={pool} />}
            </div>

            {/* Geometric Liquidity Compass — full width */}
            <div className="lg:col-span-12 glass-panel p-6 border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Geometric Liquidity Compass</h3>
              </div>
              <div className="max-w-[600px] mx-auto">
                {pool && (
                  <GeometricLiquidityCompass
                    reserves={pool.reserves}
                    n={pool.n}
                    sBound={pool.sBound}
                    tokenSymbols={pool.tokenAsaIds.map((_, i) => getTokenSymbol(pool, i))}
                  />
                )}
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* ── DEPTH TAB ──────────────────────────────────────────────────────── */}
        <Tabs.Content value="depth">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tick Depth Chart */}
            <div className="lg:col-span-8 glass-panel p-6 border-border/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 bg-primary rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Liquidity Depth by Tick</h3>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{activeTicks} active ticks</span>
              </div>
              {pool && <TickDepthChart pool={pool} />}
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-3 text-center">
                Y-axis = tick radius (r) · higher = more concentrated liquidity
              </p>
            </div>

            {/* Fee Growth Bar Chart */}
            <div className="lg:col-span-4 glass-panel p-6 border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-4 bg-amber-500 rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Fee Growth per Token</h3>
              </div>
              {pool && <FeeGrowthBarChart pool={pool} />}
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-3 text-center">
                All-time accumulated · feeGrowth × totalR
              </p>

              {/* Pool invariant stats */}
              <div className="mt-6 space-y-3 pt-4 border-t border-border/30">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Interior Radius (rInt)</span>
                  <span className="text-[11px] font-black text-foreground tabular-nums">
                    {pool ? (Number(pool.rInt) / 1e3).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Bound Radius (sBound)</span>
                  <span className="text-[11px] font-black text-foreground tabular-nums">
                    {pool ? (Number(pool.sBound) / 1e3).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Radius (totalR)</span>
                  <span className="text-[11px] font-black text-foreground tabular-nums">
                    {pool ? (Number(pool.totalR) / 1e3).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Num Ticks (lifetime)</span>
                  <span className="text-[11px] font-black text-foreground tabular-nums">
                    {pool?.numTicks ?? '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Decoded Activity Feed — full width */}
            <div className="lg:col-span-12 glass-panel p-6 border-border/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Recent Activity</h3>
                </div>
                <a
                  href={getExplorerUrl(pool?.appId ?? '', 'application')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="link" className="text-[10px] font-black uppercase tracking-widest text-primary h-auto p-0">
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              </div>

              {!transactions?.length ? (
                <p className="text-[10px] text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/30">
                        {['Type', 'From', 'Amount In', 'Amount Out', 'Wallet', 'Time', 'Tx'].map(h => (
                          <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-3 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 15).map(tx => {
                        const amtIn = tx.amountIn ? (Number(tx.amountIn) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';
                        const amtOut = tx.amountOut ? (Number(tx.amountOut) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';
                        const tokenIn = tx.tokenInIdx !== undefined ? (POOL_TOKEN_SYMBOLS[tx.tokenInIdx] ?? tx.token0) : tx.token0;
                        const tokenOut = tx.tokenOutIdx !== undefined ? (POOL_TOKEN_SYMBOLS[tx.tokenOutIdx] ?? tx.token1 ?? '—') : (tx.token1 ?? '—');
                        return (
                          <tr key={tx.id} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                            <td className="py-3 pr-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                tx.type === 'swap' ? 'bg-emerald-500/10 text-emerald-500' :
                                tx.type === 'add' ? 'bg-blue-500/10 text-blue-500' :
                                tx.type === 'remove' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>{tx.type}</span>
                            </td>
                            <td className="py-3 pr-4 text-[11px] font-black text-muted-foreground">
                              {tx.type === 'swap' ? `${tokenIn} → ${tokenOut}` : tx.type}
                            </td>
                            <td className="py-3 pr-4 text-[11px] font-black text-foreground tabular-nums">
                              {tx.amountIn ? `${amtIn} ${tokenIn}` : '—'}
                            </td>
                            <td className="py-3 pr-4 text-[11px] font-black text-foreground tabular-nums">
                              {tx.amountOut ? `${amtOut} ${tokenOut}` : '—'}
                            </td>
                            <td className="py-3 pr-4">
                              <a
                                href={getExplorerUrl(tx.wallet, 'address')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
                              >
                                {shortenId(tx.wallet, 6, 4)}
                              </a>
                            </td>
                            <td className="py-3 pr-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                              {timeAgo(new Date(tx.timestamp))}
                            </td>
                            <td className="py-3">
                              <a
                                href={getExplorerUrl(tx.id, 'transaction')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/pool/analytics/page.tsx
git commit -m "feat: rewrite analytics page with tab layout, real on-chain data, decoded tx feed"
```

---

## Task 7: Verify the build compiles

- [ ] **Step 1: Run the Next.js type check**

```bash
cd /home/kzark/Documents/coding/TaurusProtocol/frontend
npx tsc --noEmit 2>&1 | head -60
```

Expected: no errors. If errors appear, fix the reported file/line.

- [ ] **Step 2: Start dev server and manually verify**

```bash
cd /home/kzark/Documents/coding/TaurusProtocol/frontend
npm run dev
```

Navigate to `http://localhost:3000/pool/analytics`. Verify:
- Overview tab: 4 metric cards with real values, ReservePieChart renders, PegDeviationChart renders, GeometricLiquidityCompass renders
- Depth tab: TickDepthChart renders, FeeGrowthBarChart renders, activity table shows decoded swaps

- [ ] **Step 3: Final commit**

```bash
cd /home/kzark/Documents/coding/TaurusProtocol
git add -A
git commit -m "feat: production-grade analytics page — real on-chain data, tabs, charts"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Tab-based layout (Overview / Depth)
- ✅ All mock `generateHistory` data removed
- ✅ Real TVL from `actualReservesRaw`
- ✅ Real fee tier from `feeBps`
- ✅ Real active ticks from `ticks.length`
- ✅ Real protocol fees from `feeGrowth × totalR / PRECISION`
- ✅ ReservePieChart — real on-chain
- ✅ PegDeviationChart radar — real on-chain
- ✅ GeometricLiquidityCompass — already real, wired into Overview tab
- ✅ TickDepthChart — real on-chain ticks
- ✅ FeeGrowthBarChart — real on-chain
- ✅ Decoded swap amounts in activity feed
- ✅ Pool invariant stats (rInt, sBound, totalR) in Depth sidebar

**Type consistency check:**
- `ReservePieChart`, `FeeGrowthBarChart`, `TickDepthChart`, `PegDeviationChart` all accept `{ pool: PoolState }` — consistent
- `decodeBigEndianUint64` defined before use in Task 1 — consistent
- `AMMTransaction.amountIn` / `amountOut` typed as `bigint | undefined` — consistent with usage in page (converted via `Number(tx.amountIn) / 1e6`)
- `PRECISION` imported from `@/lib/orbital-sdk/constants` — correct path confirmed
- `shortenId` imported from `@/lib/explorer` — confirmed exported there
- `timeAgo` imported from `@/lib/format` — confirmed exported there
