"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { getTokenSymbol, getTokenColor } from '@/lib/tokenDisplay';
import type { PoolState } from '@/lib/orbital-sdk';

interface PegDeviationChartProps {
  pool: PoolState;
}

export function PegDeviationChart({ pool }: PegDeviationChartProps) {
  const reserves = pool.actualReservesRaw.map((r) => Number(r) / 1e6);
  const mean = reserves.reduce((a, b) => a + b, 0) / (reserves.length || 1);

  const data = pool.tokenAsaIds
    .map((_, i) => ({
      token: getTokenSymbol(pool, i),
      deviation: mean > 0 ? Math.abs(((reserves[i] - mean) / mean) * 100) : 0,
      reserve: reserves[i],
      color: getTokenColor(i),
    }))
    .sort((a, b) => b.deviation - a.deviation);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{d.token}</p>
        <p className="text-sm font-black text-foreground">{d.deviation.toFixed(4)}% deviation</p>
        <p className="text-[9px] font-bold text-muted-foreground">
          ${d.reserve.toLocaleString('en-US', { maximumFractionDigits: 2 })} reserve
        </p>
      </div>
    );
  };

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 28, left: 6, bottom: 10 }}
          barCategoryGap={12}
        >
          <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
          <YAxis
            type="category"
            dataKey="token"
            axisLine={false}
            tickLine={false}
            width={56}
            tick={{ fontSize: 10, fontWeight: 800, fill: '#0A3F2F' }}
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
            tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
            domain={[0, (max: number) => Math.max(max, 0.01)]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="deviation"
            radius={[6, 6, 6, 6]}
            isAnimationActive
            animationDuration={650}
            animationEasing="ease-out"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.9} />
            ))}
            <LabelList
              dataKey="deviation"
              position="right"
              formatter={(v: any) => `${Number(v).toFixed(2)}%`}
              style={{ fill: '#0A3F2F', fontWeight: 900, fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
