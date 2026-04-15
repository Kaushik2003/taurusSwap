"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getTokenSymbol, getTokenColor } from '@/lib/tokenDisplay';
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
        <p className="text-sm font-black text-foreground">
          ${d.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
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
