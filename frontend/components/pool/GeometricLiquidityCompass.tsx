"use client";

import { useEffect, useMemo, useState } from 'react';
import { Target } from 'lucide-react';

interface GeometricLiquidityCompassProps {
  reserves: bigint[];
  n: number;
  sBound: bigint;
  tokenSymbols: string[];
}

function computeGeometry(reserves: bigint[], n: number, tokenSymbols: string[]) {
  if (!reserves.length || n === 0) {
    return {
      mean: 0,
      total: 0,
      driftNorm: 0,
      dominantIndex: 0,
      dominantLabel: '--',
      topAxes: [] as { idx: number; label: string; deviationPct: number; sharePct: number; value: number }[],
      probe: { x: 0, y: 0 },
    };
  }

  const values = reserves.map((reserve) => Number(reserve));
  const total = values.reduce((acc, value) => acc + value, 0);
  const mean = total / n;
  const deviations = values.map((value) => value - mean);
  const driftRaw = Math.sqrt(deviations.reduce((acc, value) => acc + value ** 2, 0));
  const driftNorm = mean > 0 ? driftRaw / mean : 0;

  const ranked = deviations
    .map((value, idx) => ({
      idx,
      label: tokenSymbols[idx] ?? `T${idx}`,
      value,
      abs: Math.abs(value),
      sharePct: total > 0 ? (values[idx] / total) * 100 : 0,
      deviationPct: mean > 0 ? (value / mean) * 100 : 0,
    }))
    .sort((a, b) => b.abs - a.abs);

  const topAxes = ranked.slice(0, Math.min(4, ranked.length));
  const dominantIndex = topAxes[0]?.idx ?? 0;
  const dominantLabel = topAxes[0]?.label ?? '--';

  const projectionAxes = ranked.slice(0, 3);
  const maxAbs = projectionAxes[0]?.abs ?? 1;
  const scale = maxAbs > 0 ? 78 / maxAbs : 1;
  const angles = [-90, 30, 150].map((deg) => (deg * Math.PI) / 180);
  const rawX = projectionAxes.reduce((acc, axis, idx) => acc + Math.cos(angles[idx]) * axis.value * scale, 0);
  const rawY = projectionAxes.reduce((acc, axis, idx) => acc + Math.sin(angles[idx]) * axis.value * scale, 0);
  const length = Math.sqrt(rawX ** 2 + rawY ** 2);
  const maxLength = 82;
  const clampRatio = length > maxLength ? maxLength / length : 1;

  return {
    mean,
    total,
    driftNorm,
    dominantIndex,
    dominantLabel,
    topAxes,
    probe: {
      x: rawX * clampRatio,
      y: rawY * clampRatio,
    },
  };
}

function getDriftStatus(driftNorm: number) {
  if (driftNorm < 0.001) {
    return {
      label: 'Stable',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      dot: '#10B981',
    };
  }

  if (driftNorm < 0.005) {
    return {
      label: 'Moderate',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
      dot: '#F59E0B',
    };
  }

  return {
    label: 'Stress',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 border-rose-500/20',
    dot: '#F43F5E',
  };
}

export function GeometricLiquidityCompass({
  reserves,
  n,
  sBound,
  tokenSymbols,
}: GeometricLiquidityCompassProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const reserveSignature = reserves.map(String).join(':');

  const geometry = useMemo(() => computeGeometry(reserves, n, tokenSymbols), [reserves, n, tokenSymbols]);
  const status = getDriftStatus(geometry.driftNorm);
  const isEmpty = !reserves.length || n === 0;
  const capDisplay = Number(sBound) > 0 ? (Number(sBound) / 1e3).toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'N/A';

  useEffect(() => {
    if (isEmpty) {
      setIsRevealed(false);
      return;
    }

    setIsRevealed(false);
    const timeoutId = window.setTimeout(() => setIsRevealed(true), 180);
    return () => window.clearTimeout(timeoutId);
  }, [isEmpty, reserveSignature]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/20 bg-muted/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Contract Drift
              </p>
              <p className={`mt-1 text-4xl font-black leading-none tabular-nums ${status.color}`}>
                {isEmpty ? '--' : geometry.driftNorm.toFixed(6)}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Live reserve vector vs equal-reserve mean
              </p>
            </div>
            <div className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.bg} ${status.color}`}>
              {status.label}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/20 bg-muted/5 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dominant Axis</p>
            <p className={`mt-2 text-[18px] font-black ${status.color}`}>{geometry.dominantLabel}</p>
          </div>
          <div className="rounded-2xl border border-border/20 bg-muted/5 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cap Radius</p>
            <p className="mt-2 text-[18px] font-black text-foreground tabular-nums">{capDisplay}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/20 bg-muted/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground">Top Imbalances</p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">from contract reserves</span>
          </div>

          <div className="space-y-3">
            {geometry.topAxes.map((axis) => {
              const width = Math.min(Math.abs(axis.deviationPct) * 12, 100);
              return (
                <div key={axis.idx}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.dot }} />
                      <span className="text-[12px] font-black text-foreground truncate">{axis.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[12px] font-black tabular-nums ${axis.deviationPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {axis.deviationPct >= 0 ? '+' : ''}
                        {axis.deviationPct.toFixed(2)}%
                      </span>
                      <span className="ml-2 text-[10px] font-bold text-muted-foreground">
                        {axis.sharePct.toFixed(1)}% share
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${axis.deviationPct >= 0 ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-[radial-gradient(circle_at_top,_rgba(159,232,112,0.45),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.98))] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground">
              Contract State Projection
            </p>
            <p className="mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Values render first, then the live state vector settles into place
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Target className={`w-3.5 h-3.5 ${status.color}`} />
            {isEmpty ? 'Awaiting reserves' : `${n}-asset projection`}
          </div>
        </div>

        <div className="relative min-h-[340px] rounded-[28px] border border-border/15 bg-white/50 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(159,232,112,0.22),_transparent_60%)]" />
          <svg width="360" height="320" viewBox="-180 -160 360 320" className="relative z-10 overflow-visible">
            <defs>
              <radialGradient id="compass-sphere-fill" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
                <stop offset="70%" stopColor="rgba(159,232,112,0.16)" />
                <stop offset="100%" stopColor="rgba(10,63,47,0.10)" />
              </radialGradient>
              <filter id="compass-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="0" cy="0" r="100" fill="url(#compass-sphere-fill)" stroke="rgba(10,63,47,0.12)" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="70" fill="none" stroke="rgba(10,63,47,0.08)" strokeDasharray="5 6" />
            <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(10,63,47,0.06)" strokeDasharray="3 5" />

            {geometry.topAxes.slice(0, 3).map((axis, idx) => {
              const angle = (([-90, 30, 150][idx] ?? 0) * Math.PI) / 180;
              const x2 = Math.cos(angle) * 116;
              const y2 = Math.sin(angle) * 116;
              const lx = Math.cos(angle) * 136;
              const ly = Math.sin(angle) * 136;

              return (
                <g key={axis.idx}>
                  <line
                    x1="0"
                    y1="0"
                    x2={x2}
                    y2={y2}
                    stroke="rgba(10,63,47,0.22)"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: '10px', fontWeight: 900, fill: '#0A3F2F', letterSpacing: '0.08em' }}
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}

            <circle cx="0" cy="0" r="4.5" fill="#0A3F2F" opacity="0.9" />
            <text
              x="0"
              y="-116"
              textAnchor="middle"
              style={{ fontSize: '9px', fontWeight: 800, fill: '#5E7C72', letterSpacing: '0.12em' }}
            >
              EQUAL RESERVE ANCHOR
            </text>

            <g
              transform={`translate(${isRevealed ? geometry.probe.x : 0}, ${isRevealed ? geometry.probe.y : 0})`}
              style={{ transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              filter="url(#compass-glow)"
            >
              <line
                x1={isRevealed ? -geometry.probe.x : 0}
                y1={isRevealed ? -geometry.probe.y : 0}
                x2="0"
                y2="0"
                stroke={status.dot}
                strokeOpacity="0.45"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="0" r="12" fill={status.dot} fillOpacity="0.14" />
              <circle cx="0" cy="0" r="5.5" fill={status.dot} />
            </g>
          </svg>

          <div className="absolute top-4 right-4 rounded-xl border border-border/20 bg-white/80 px-3 py-2 text-right backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live State</p>
            <p className={`text-[20px] font-black leading-none tabular-nums ${status.color}`}>
              {isEmpty ? '--' : geometry.driftNorm.toFixed(6)}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              normalized drift
            </p>
          </div>

          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/15 bg-white/70 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Principal Axes</p>
              <p className="mt-1 text-[12px] font-black text-foreground">
                {geometry.topAxes.slice(0, 3).map((axis) => axis.label).join(' / ') || '--'}
              </p>
            </div>
            <div className="rounded-xl border border-border/15 bg-white/70 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reserve Mean</p>
              <p className="mt-1 text-[12px] font-black text-foreground tabular-nums">
                {isEmpty ? '--' : (geometry.mean / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-border/15 bg-white/70 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reserve Total</p>
              <p className="mt-1 text-[12px] font-black text-foreground tabular-nums">
                {isEmpty ? '--' : (geometry.total / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
