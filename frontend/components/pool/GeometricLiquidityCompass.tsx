"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Info, Target } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GeometricLiquidityCompassProps {
  reserves: bigint[];
  n: number;
  sBound: bigint;
  tokenSymbols: string[];
}

// ── Internal math ────────────────────────────────────────────────────────────
function computeGeometry(reserves: bigint[], n: number) {
  if (!reserves.length || n === 0) {
    return {
      drift: 0,
      driftNorm: 0,
      projections: { x: 0, y: 0, z: 0 },
      topAxes: [] as { val: number; idx: number; abs: number }[],
      dominantIndex: 0,
      deviations: [] as number[],
    };
  }

  const resNumbers = reserves.map(r => Number(r));
  const sum = resNumbers.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Deviation vector w = x - mean*1  (orthogonal to the "equal-price" direction v)
  const w = resNumbers.map(r => r - mean);
  const driftRaw = Math.sqrt(w.reduce((acc, val) => acc + val ** 2, 0));

  // Normalize drift relative to mean — gives a dimensionless "depeg fraction"
  const driftNorm = mean > 0 ? driftRaw / mean : 0;

  // Sort by absolute deviation to find Principal Deviation Axes
  const axesWithIdx = w.map((val, idx) => ({ val, idx, abs: Math.abs(val) }));
  axesWithIdx.sort((a, b) => b.abs - a.abs);

  const top3 = axesWithIdx.slice(0, 3);
  const dominant = top3[0]?.idx ?? 0;

  // Project into 2D SVG space using top 3 axes placed 120° apart
  // Scale so max deviation reaches ~60 px (sphere radius is 80)
  const MAX_VIS_RADIUS = 58;
  const maxAbsDev = top3[0]?.abs ?? 1;
  const scale = maxAbsDev > 0 ? MAX_VIS_RADIUS / maxAbsDev : 1;

  // Isometric-style: map (x, y, z) onto SVG (2D) using 3 axes at 120°
  const [a, b_, c] = [
    (top3[0]?.val ?? 0) * scale,
    (top3[1]?.val ?? 0) * scale,
    (top3[2]?.val ?? 0) * scale,
  ];
  // Simple 2D isometric projection
  const svgX = a * Math.cos(-30 * Math.PI / 180) + b_ * Math.cos(-150 * Math.PI / 180) + c * 0;
  const svgY = a * Math.sin(-30 * Math.PI / 180) + b_ * Math.sin(-150 * Math.PI / 180) + c * Math.sin(90 * Math.PI / 180);

  // Clamp to sphere boundary
  const len = Math.sqrt(svgX ** 2 + svgY ** 2);
  const maxLen = MAX_VIS_RADIUS - 4;
  const clampedX = len > maxLen ? (svgX / len) * maxLen : svgX;
  const clampedY = len > maxLen ? (svgY / len) * maxLen : svgY;

  return {
    drift: driftRaw,
    driftNorm,
    projections: { x: clampedX, y: clampedY, z: b_ },
    topAxes: top3,
    dominantIndex: dominant,
    deviations: w,
  };
}

function getDriftStatus(driftNorm: number) {
  if (driftNorm < 0.001) return { label: 'STABLE', color: 'text-emerald-400', dot: '#10B981', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  if (driftNorm < 0.005) return { label: 'MODERATE', color: 'text-amber-400', dot: '#F59E0B', bg: 'bg-amber-500/10 border-amber-500/20' };
  return { label: 'STRESS', color: 'text-rose-400', dot: '#F43F5E', bg: 'bg-rose-500/10 border-rose-500/20' };
}

// ── Component ─────────────────────────────────────────────────────────────────
export const GeometricLiquidityCompass: React.FC<GeometricLiquidityCompassProps> = ({
  reserves,
  n,
  sBound,
  tokenSymbols,
}) => {
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const angleRef = useRef(0);
  const [angle, setAngle] = useState(0);

  // Slow orbital rotation — pauses on hover
  useEffect(() => {
    if (isHovering) return;
    const id = setInterval(() => {
      angleRef.current = (angleRef.current + 0.1) % 360;
      setAngle(angleRef.current);
    }, 50);
    return () => clearInterval(id);
  }, [isHovering]);

  const { drift, driftNorm, projections, topAxes, dominantIndex, deviations } = useMemo(
    () => computeGeometry(reserves, n),
    [reserves, n]
  );

  const status = getDriftStatus(driftNorm);
  const isEmpty = !reserves.length || n === 0;

  // Axis positions at 120° apart, rotated by current orbital angle
  const axisAngles = [0, 120, 240].map(base => (base + angle) * (Math.PI / 180));

  return (
    <div
      className="relative w-full h-full flex flex-col select-none"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-5 rounded-full"
            style={{ background: `linear-gradient(to bottom, ${status.dot}, ${status.dot}66)`, boxShadow: `0 0 8px ${status.dot}55` }}
          />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
            Geometric Liquidity Compass
          </h3>
        </div>
        <div className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded-md border ${status.bg} ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Sphere Viewport */}
      <div className="relative flex-1 min-h-[280px] rounded-2xl border border-border/20 bg-gradient-to-br from-background/80 to-muted/10 overflow-hidden">

        {/* Starfield background */}
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute w-[1px] h-[1px] bg-white/30 rounded-full"
            style={{
              top: `${(i * 37 + 13) % 100}%`,
              left: `${(i * 53 + 7) % 100}%`,
              opacity: 0.15 + (i % 5) * 0.07,
            }}
          />
        ))}

        {/* Main SVG canvas */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width="260"
            height="260"
            viewBox="-130 -130 260 260"
            className="overflow-visible"
          >
            <defs>
              {/* Sphere glass gradient */}
              <radialGradient id="glc-sphere" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="60%" stopColor="rgba(16,185,129,0.03)" />
                <stop offset="100%" stopColor="rgba(10,63,47,0.06)" />
              </radialGradient>
              {/* Probe glow */}
              <filter id="glc-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Subtle inner shadow for sphere depth */}
              <radialGradient id="glc-depth" cx="65%" cy="70%" r="50%">
                <stop offset="0%" stopColor="rgba(0,0,0,0.25)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            {/* Outer glow ring */}
            <circle cx="0" cy="0" r="83" fill="none" stroke="rgba(16,185,129,0.06)" strokeWidth="6" />

            {/* Main sphere body */}
            <circle cx="0" cy="0" r="80" fill="url(#glc-sphere)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            {/* Depth shadow */}
            <circle cx="0" cy="0" r="80" fill="url(#glc-depth)" />

            {/* Equatorial ring (slow rotation via CSS transform) */}
            <ellipse
              cx="0" cy="0" rx="80" ry="22"
              fill="none"
              stroke="rgba(16,185,129,0.08)"
              strokeWidth="1"
              strokeDasharray="4 6"
              transform={`rotate(${angle})`}
            />

            {/* Spherical Cap ring (sBound visualization) */}
            <ellipse
              cx="0" cy="-30"
              rx={52} ry={14}
              fill="rgba(16,185,129,0.04)"
              stroke="rgba(16,185,129,0.15)"
              strokeWidth="0.8"
              strokeDasharray="3,5"
              transform={`rotate(${angle * 0.3})`}
            />
            <text x="56" y="-26" style={{ fontSize: '5px', fill: 'rgba(16,185,129,0.5)', fontFamily: 'monospace', fontWeight: 700, transform: `rotate(${angle * 0.3}deg)` }} textAnchor="start">
              Spherical Cap
            </text>

            {/* Principal Deviation Axes */}
            <g opacity={isHovering ? 1 : 0.55} style={{ transition: 'opacity 0.4s' }}>
              {topAxes.map((axis, i) => {
                const a = axisAngles[i];
                const r = 88;
                const x2 = Math.cos(a) * r;
                const y2 = Math.sin(a) * r;
                const isHov = hoveredAxis === axis.idx;
                const pct = axis.abs > 0 ? Math.min(axis.abs / (topAxes[0]?.abs || 1), 1) : 0;
                const axisColor = isHov ? status.dot : 'rgba(255,255,255,0.25)';
                const label = tokenSymbols[axis.idx] ?? `T${axis.idx}`;
                const devPct = ((deviations[axis.idx] ?? 0) / (reserves.map(r => Number(r)).reduce((a, b) => a + b, 0) / n || 1) * 100).toFixed(2);

                return (
                  <g
                    key={axis.idx}
                    onMouseEnter={() => setHoveredAxis(axis.idx)}
                    onMouseLeave={() => setHoveredAxis(null)}
                    style={{ cursor: 'default' }}
                  >
                    {/* Axis line */}
                    <line
                      x1="0" y1="0"
                      x2={x2} y2={y2}
                      stroke={axisColor}
                      strokeWidth={isHov ? 1.5 : 0.6}
                      strokeDasharray="3,4"
                      style={{ transition: 'all 0.25s' }}
                    />
                    {/* Magnitude bar along axis */}
                    <line
                      x1="0" y1="0"
                      x2={Math.cos(a) * r * pct * 0.85}
                      y2={Math.sin(a) * r * pct * 0.85}
                      stroke={isHov ? status.dot : 'rgba(16,185,129,0.3)'}
                      strokeWidth={isHov ? 2.5 : 1}
                      style={{ transition: 'all 0.25s' }}
                    />
                    {/* Token label */}
                    <text
                      x={Math.cos(a) * 100}
                      y={Math.sin(a) * 100}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: '7px',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        fill: isHov ? status.dot : 'rgba(255,255,255,0.5)',
                        transition: 'fill 0.25s',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {label}
                    </text>
                    {/* Hover tooltip: deviation % */}
                    {isHov && (
                      <text
                        x={Math.cos(a) * 100}
                        y={Math.sin(a) * 100 + 10}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '6px', fontWeight: 700, fontFamily: 'monospace', fill: 'rgba(255,255,255,0.7)' }}
                      >
                        {Number(devPct) > 0 ? '+' : ''}{devPct}%
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Center Peg Anchor */}
            <circle cx="0" cy="0" r="3" fill={status.dot} filter="url(#glc-glow)" />
            <circle cx="0" cy="0" r="6" fill="none" stroke={status.dot} strokeWidth="0.5" strokeDasharray="1.5,2" opacity="0.6">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="8s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Live State Probe */}
            {!isEmpty && (
              <g transform={`translate(${projections.x}, ${projections.y})`} filter="url(#glc-glow)">
                {/* Leader line back to center */}
                <line
                  x1={-projections.x}
                  y1={-projections.y}
                  x2="0" y2="0"
                  stroke={`${status.dot}50`}
                  strokeWidth="0.6"
                  strokeDasharray="3,4"
                />
                {/* Probe halo */}
                <circle cx="0" cy="0" r="10" fill={`${status.dot}15`} />
                {/* Probe dot */}
                <circle cx="0" cy="0" r="5" fill={status.dot}>
                  <animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            {/* Specular highlight on sphere */}
            <ellipse cx="-20" cy="-28" rx="22" ry="14" fill="rgba(255,255,255,0.04)" />
          </svg>
        </div>

        {/* HUD: Top-right metrics */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <Target className={`w-3 h-3 ${status.color} animate-pulse`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              Geometric Drift
            </span>
          </div>
          <p className={`text-2xl font-black tabular-nums leading-none ${status.color}`}>
            {isEmpty ? '—' : driftNorm.toFixed(6)}
          </p>
          <span className="text-[8px] text-muted-foreground/60 font-bold">∥w∥ / mean</span>
        </div>

        {/* HUD: Bottom-left info */}
        <div className="absolute bottom-3 left-3">
          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
            Dominant Axis
          </p>
          <p className={`text-[11px] font-black ${status.color}`}>
            {isEmpty ? '—' : (tokenSymbols[dominantIndex] ?? `T${dominantIndex}`)}
          </p>
        </div>

        {/* HUD: Bottom-right legend */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-0.5 rounded-full" style={{ background: status.dot }} />
            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">State Probe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-0.5 rounded-full border border-primary/40 bg-primary/10" />
            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Liquidity Cap</span>
          </div>
        </div>
      </div>

      {/* Info grid below sphere */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-muted/5 border border-border/30 flex flex-col gap-0.5">
          <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Principal Axes</p>
          <p className="text-[10px] font-black text-foreground">
            {isEmpty ? '—' : topAxes.map(a => tokenSymbols[a.idx] ?? `T${a.idx}`).join(' / ')}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/5 border border-border/30 flex flex-col gap-0.5">
          <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Peg Tension</p>
          <p className={`text-[10px] font-black ${status.color}`}>{status.label}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/5 border border-border/30 flex flex-col gap-0.5">
          <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Cap Radius</p>
          <p className="text-[10px] font-black text-foreground">
            {isEmpty ? '—' : Number(sBound) > 0 ? (Number(sBound) / 1e6).toFixed(2) : 'N/A'}
          </p>
        </div>
      </div>

      {/* "How it works" tooltip button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-border/30 bg-muted/5 text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-200 group">
              <Info className="w-3 h-3" />
              Visual Proof of Stability · Orbital AMM
              <Target className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[300px] p-4 bg-background border border-primary/30 text-foreground rounded-2xl shadow-2xl shadow-primary/10"
          >
            <p className="text-[11px] font-bold leading-relaxed text-foreground/80">
              Pool liquidity exists on the surface of an{' '}
              <span className="text-primary font-black">n-dimensional sphere</span>.
              The "Compass" maps any reserve imbalance as{' '}
              <span className="text-primary italic">geometric drift</span>{' '}
              — movement away from the center. Concentrated liquidity is shown as a{' '}
              <span className="text-primary italic">Spherical Cap</span>,
              achieving <span className="text-primary font-black">100x+ capital efficiency</span> over traditional AMMs.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
