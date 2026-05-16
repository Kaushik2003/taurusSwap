"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { PoolState } from '@/lib/orbital-sdk';
import { TickState, xMax, mulScaled, PRECISION } from '@/lib/orbital-sdk';

const PEG_KEY = '$1.0000';

function depegPrice(tick: PoolState['ticks'][number], pool: PoolState): number {
  try {
    const xMaxVal = xMax(tick.r, tick.k, pool.n, pool.sqrtN);
    const N = BigInt(pool.n);
    const kSqrtN = mulScaled(tick.k, pool.sqrtN, PRECISION);
    const xOther = (kSqrtN - xMaxVal) / (N - 1n);
    const denom = tick.r - xMaxVal;
    if (denom <= 0n) return 0;
    const p = Number(tick.r - xOther) / Number(denom);
    return isFinite(p) && p >= 0 ? p : 0;
  } catch {
    return 0;
  }
}

interface TooltipPayload {
  active?: boolean;
  payload?: { payload: RowData }[];
}

interface RowData {
  label: string;
  price: number;
  r: number;
  state: TickState;
  id: number;
  shares: number;
}

const CustomTooltip = ({ active, payload }: TooltipPayload) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.id === -1) return null;
  const isInterior = d.state === TickState.INTERIOR;
  const upper = d.price > 0 ? `$${(1 / d.price).toFixed(4)}` : '∞';
  return (
    <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg space-y-0.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
        Tick #{String(d.id).padStart(4, '0')}
      </p>
      <p className="text-sm font-black text-foreground">
        {d.r.toLocaleString('en-US', { maximumFractionDigits: 2 })} r depth
      </p>
      <p className="text-[9px] font-bold text-muted-foreground">
        Range: {d.label === 'Full' ? '$0.00' : d.label} – {upper}
      </p>
      <p className="text-[9px] font-bold text-muted-foreground">
        {d.shares.toLocaleString()} shares ·{' '}
        <span className={isInterior ? 'text-emerald-500' : 'text-slate-400'}>
          {isInterior ? 'Active' : 'Inactive'}
        </span>
      </p>
    </div>
  );
};

export function TickDepthChart({ pool }: { pool: PoolState }) {
  if (!pool.ticks.length) {
    return (
      <div className="h-[240px] flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        No active ticks
      </div>
    );
  }

  const rows: RowData[] = pool.ticks
    .map(tick => {
      const p = depegPrice(tick, pool);
      return {
        label: p === 0 ? 'Full' : `$${p.toFixed(4)}`,
        price: p,
        r: Number(tick.r) / 1e3,
        state: tick.state,
        id: tick.id,
        shares: Number(tick.totalShares),
      };
    })
    .sort((a, b) => a.price - b.price);

  // Insert a zero-height sentinel at $1.0000 (current peg) so ReferenceLine anchors correctly
  const data: RowData[] = rows.some(r => r.label === PEG_KEY)
    ? rows
    : [
        ...rows,
        { label: PEG_KEY, price: 1.0, r: 0, state: TickState.INTERIOR, id: -1, shares: 0 },
      ].sort((a, b) => a.price - b.price);

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 36 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b', dy: 4 }}
            angle={-40}
            textAnchor="end"
            interval={0}
          />
          <YAxis hide />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(100,116,139,0.07)' }}
          />
          <ReferenceLine
            x={PEG_KEY}
            stroke="#22c55e"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: 'peg',
              position: 'top',
              fontSize: 9,
              fontWeight: 700,
              fill: '#22c55e',
              dy: -4,
            }}
          />
          <Bar dataKey="r" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.id === -1
                    ? 'transparent'
                    : entry.state === TickState.INTERIOR
                    ? '#22c55e'
                    : '#94a3b8'
                }
                fillOpacity={entry.id === -1 ? 0 : entry.state === TickState.INTERIOR ? 0.8 : 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
