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
    // total_fees_i (AMOUNT_SCALE units) = feeGrowth[i] * totalR / PRECISION
    // convert to display: AMOUNT_SCALE → /1e3 → raw microunits → /1e6 → tokens
    const feeAmountScale =
      pool.totalR > 0n ? (pool.feeGrowth[i] * pool.totalR) / PRECISION : 0n;
    const feeDisplay = Number(feeAmountScale) / 1e3 / 1e6;
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
        <p className="text-sm font-black text-foreground">
          ${d.value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
        </p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Accumulated fees</p>
      </div>
    );
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
          />
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
