"use client";

import { TOKENS } from "../hooks/useTaurus";
import { Compass, TrendingUp, Layers, HelpCircle, Info } from "lucide-react";

interface PoolExplorerProps {
  poolState: any;
  prices: number[];
  isLoading: boolean;
  error: string | null;
}

export default function PoolExplorer({
  poolState,
  prices,
  isLoading,
  error,
}: PoolExplorerProps) {
  // Format large reserves
  const formatReserves = (rawAmount: any, tokenIndex: number) => {
    if (rawAmount === undefined || rawAmount === null) return "0.00";
    const token = TOKENS[tokenIndex] || TOKENS[0];
    const amount = typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);
    return (Number(amount) / 10 ** token.decimals).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  };

  // Convert raw fees basis points to percentage
  const feePercent = poolState ? (poolState.feeBps / 100).toFixed(2) : "0.04";

  // Mock total reserves in USD for visual dashboard (TVL)
  const calculateTVL = () => {
    if (!poolState || !poolState.reserves) return "$0.00";
    let sum = 0;
    poolState.reserves.forEach((r: any, idx: number) => {
      const token = TOKENS[idx] || TOKENS[0];
      const val = Number(r) / 10 ** token.decimals;
      sum += val;
    });
    return `$${sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const activeTicks = poolState?.ticks || [];

  return (
    <div className="glass-card pool-explorer">
      {/* Visual Header */}
      <div className="card-header flex-between mb-4">
        <h2 className="card-title text-primary flex-center gap-2">
          <Compass className="text-secondary animate-pulse" size={18} />
          Pool Analytics Explorer
        </h2>
        {poolState && (
          <div className="pool-badge flex-center gap-2 bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs">
            <span className="text-dim">App ID:</span>
            <span className="font-mono text-primary font-bold">{poolState.appId || 758284478}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="loading-explorer-box py-10 text-center text-xs text-dim">
          <div className="loading-spinner mb-2"></div>
          Syncing Taurus concentrated physics pool state...
        </div>
      ) : error ? (
        <div className="alert alert-error mb-4 flex-center gap-2">
          <Info size={15} />
          <span>Failed to connect to pool: {error}</span>
        </div>
      ) : (
        <div className="pool-analytics-content">
          {/* Main reserves grid */}
          <div className="pool-stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="stat-card glass-card p-3 flex-column">
              <span className="stat-label text-dim uppercase tracking-wider text-[9px]">Total Value Locked</span>
              <span className="stat-val font-sans text-2xl font-black text-primary truncate mt-1">
                {calculateTVL()}
              </span>
            </div>
            <div className="stat-card glass-card p-3 flex-column">
              <span className="stat-label text-dim uppercase tracking-wider text-[9px]">Fee Tier</span>
              <span className="stat-val font-sans text-2xl font-black text-secondary mt-1">
                {feePercent}%
              </span>
            </div>
            <div className="stat-card glass-card p-3 flex-column">
              <span className="stat-label text-dim uppercase tracking-wider text-[9px]">Active Ticks</span>
              <span className="stat-val font-sans text-2xl font-black text-primary mt-1">
                {activeTicks.length} ticks
              </span>
            </div>
            <div className="stat-card glass-card p-3 flex-column">
              <span className="stat-label text-dim uppercase tracking-wider text-[9px]">Torus Dimension</span>
              <span className="stat-val font-sans text-2xl font-black text-emerald mt-1">
                {poolState?.n || 5}D Peg
              </span>
            </div>
          </div>

          {/* Token reserves breakdown */}
          <h3 className="section-title text-xs text-dim uppercase tracking-wider mb-3">5-Token Pool Reserves & Spot Prices</h3>
          <div className="tokens-reserves-list flex-column gap-2 mb-5">
            {TOKENS.map((token) => {
              const reserveAmount = poolState?.reserves ? poolState.reserves[token.index] : 0n;
              const spotPrice = prices[token.index] !== undefined ? prices[token.index] : 1.0;
              return (
                <div key={token.index} className="token-reserve-row glass-card flex-between items-center px-4 py-2 text-xs">
                  <div className="flex-center gap-2.5">
                    <span className="token-dot" style={{ backgroundColor: token.color }}></span>
                    <span className="token-name font-bold text-primary">{token.name}</span>
                    <span className="token-symbol font-mono text-dim">({token.symbol})</span>
                  </div>
                  <div className="flex-center gap-6 font-mono text-right">
                    <div className="reserve-val">
                      <span className="text-dim text-[10px] block uppercase tracking-wider">Reserves</span>
                      <span className="text-primary font-bold">{formatReserves(reserveAmount, token.index)}</span>
                    </div>
                    <div className="price-val">
                      <span className="text-dim text-[10px] block uppercase tracking-wider">Spot Price</span>
                      <span className="text-secondary font-bold">${spotPrice.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Concentrated Liquidity Graph Visualizer */}
          <h3 className="section-title text-xs text-dim uppercase tracking-wider mb-3 flex-center gap-1" title="Visual representation of active ticks in the pool, where peak heights indicate concentrated capital depth at boundary peg points.">
            Concentrated Liquidity Graph
            <HelpCircle size={12} className="text-dim" />
          </h3>
          <div className="liquidity-curve-visualizer glass-card p-4 flex-center flex-column mb-5">
            <svg viewBox="0 0 500 120" className="liquidity-svg w-full h-24 overflow-visible">
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#D946EF" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Grid gridlines */}
              <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="250" y1="0" x2="250" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3" />

              {/* Simulated/calculated liquidity curves based on active ticks */}
              {activeTicks.length > 0 ? (
                <>
                  {/* Generated curve paths */}
                  <path
                    d={`M 0,100 C 100,100 150,80 200,40 C 220,20 240,10 250,10 C 260,10 280,20 300,40 C 350,80 400,100 500,100`}
                    fill="none"
                    stroke="url(#curveGradient)"
                    strokeWidth="3"
                    filter="url(#glow)"
                  />
                  <path
                    d={`M 0,100 C 100,100 150,80 200,40 C 220,20 240,10 250,10 C 260,10 280,20 300,40 C 350,80 400,100 500,100 L 500,100 L 0,100 Z`}
                    fill="url(#curveGradient)"
                    fillOpacity="0.05"
                  />

                  {/* Active Tick Indicator Point */}
                  <circle cx="250" cy="10" r="5" fill="#00F2FE" filter="url(#glow)" />
                  <circle cx="250" cy="10" r="8" fill="none" stroke="#00F2FE" strokeWidth="1" className="animate-ping" />
                  <text x="250" y="30" textAnchor="middle" fill="#00F2FE" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    Active Peg ($1.000)
                  </text>
                </>
              ) : (
                <text x="250" y="60" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="10">
                  No active ticks initialized. Add concentrated liquidity to plot curve depth!
                </text>
              )}
            </svg>
            <div className="curve-labels flex-between text-[9px] text-dim font-mono w-full px-2 mt-2">
              <span>$0.950 Depeg Boundary</span>
              <span>Active Spot Peg ($1.00)</span>
              <span>$1.050 Bound</span>
            </div>
          </div>

          {/* Ticks List */}
          <h3 className="section-title text-xs text-dim uppercase tracking-wider mb-3">Initialized Ticks Grid</h3>
          {activeTicks.length === 0 ? (
            <div className="text-center py-6 glass-card text-dim text-xs">
              No ticks found. The pool is in an empty configuration.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ticks-table w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-white/10 text-dim text-[10px] uppercase">
                    <th className="py-2">Tick ID</th>
                    <th className="py-2">Depeg Bound</th>
                    <th className="py-2">Reserves (USDC)</th>
                    <th className="py-2">k constant</th>
                    <th className="py-2">Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTicks.map((tick: any, idx: number) => {
                    const depegRep = 1.0 - (Number(tick.r || 0) / 1000000);
                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2.5 text-primary font-bold">#{tick.id || idx}</td>
                        <td className="py-2.5 text-secondary font-bold">${depegRep.toFixed(3)}</td>
                        <td className="py-2.5 text-primary">
                          {tick.reserves ? formatReserves(tick.reserves[0], 0) : "0.00"}
                        </td>
                        <td className="py-2.5 text-dim truncate max-w-[100px]">{tick.k?.toString() || "0"}</td>
                        <td className="py-2.5 text-primary">{tick.totalShares?.toString() || "0"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
