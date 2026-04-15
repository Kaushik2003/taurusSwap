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

  const maxR = pool.ticks.reduce((max, t) => (t.r > max ? t.r : max), 0n);

  const data = pool.ticks.map((tick) => ({
    id: `T${tick.id}`,
    r: Number(tick.r) / 1e3, // AMOUNT_SCALE → display (stablecoin units)
    shares: Number(tick.totalShares),
    pct: maxR > 0n ? Number((tick.r * 100n) / maxR) : 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{d.id}</p>
        <p className="text-sm font-black text-foreground">
          {d.r.toLocaleString('en-US', { maximumFractionDigits: 2 })} units r
        </p>
        <p className="text-[9px] font-bold text-muted-foreground">
          {d.shares.toLocaleString()} shares · {d.pct}% of max
        </p>
      </div>
    );
  };

  const getBarColor = (pct: number) => {
    const alpha = 0.3 + (pct / 100) * 0.7;
    return `rgba(16, 185, 129, ${alpha})`;
  };

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="id"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
          />
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

