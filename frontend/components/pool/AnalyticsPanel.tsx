import { Database, Layers, Activity, Percent } from "lucide-react";
import { getTokenSymbol, getTokenColor, rawToDisplay, formatRawAsUSD } from "@/lib/tokenDisplay";
import type { PoolState } from "@/lib/orbital-sdk";
import { getExplorerUrl } from "@/lib/explorer";

interface AnalyticsPanelProps {
  pool: PoolState;
}

export function AnalyticsPanel({ pool }: AnalyticsPanelProps) {
  const feeRate = (Number(pool.feeBps) / 100).toFixed(2);
  // rInt is AMOUNT_SCALE (microunits/1000) → multiply by 1000 → raw microunits → human display
  const interiorRadius = rawToDisplay(pool.rInt * 1000n);

  // Total real reserves across all tokens (AMOUNT_SCALE → raw → USD)
  const totalTVL = pool.tokenAsaIds.reduce((acc, _, i) => {
    const netAmountScale = pool.reserves[i] - pool.virtualOffset;
    return acc + (netAmountScale > 0n ? netAmountScale * 1000n : 0n);
  }, 0n);

  const stats = [
    {
      label: "Fee Tier",
      value: `${feeRate}%`,
      icon: Percent,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Active Ticks",
      value: pool.ticks.length.toString(),
      icon: Layers,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
    {
      label: "Int. Radius",
      value: Number(interiorRadius).toLocaleString("en-US", { maximumFractionDigits: 3 }),
      icon: Database,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      label: "Protocol",
      value: "Operational",
      icon: Activity,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] text-muted-foreground font-medium">TaurusSwap · Algorand Testnet</p>
          <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-primary/10 text-primary uppercase tracking-tighter">Live</span>
        </div>

        {/* TVL summary */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Total Value Locked</p>
          <p className="text-2xl font-black text-foreground tabular-nums">{formatRawAsUSD(totalTVL)}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/30 bg-muted/20 hover:border-primary/20 hover:bg-muted/40 transition-all"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.iconColor}`} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">{stat.label}</p>
                <p className={`text-[13px] font-black leading-none ${stat.valueColor ?? "text-foreground"}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token Reserves card */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-primary rounded-full" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Token Reserves</h4>
          </div>
        </div>

        <div className="space-y-3">
          {pool.tokenAsaIds.map((asaId, i) => {
            const symbol = getTokenSymbol(pool, i);
            const netAmountScale = pool.reserves[i] - pool.virtualOffset;
            const rawMicrounits = netAmountScale > 0n ? netAmountScale * 1000n : 0n;
            const displayAmt = rawToDisplay(rawMicrounits);
            const numericAmt = Number(rawMicrounits) / 1e6;
            const color = getTokenColor(i);

            // Bar width: stablecoins target around $50k for 100% bar
            const barPct = Math.min(100, (numericAmt / 60000) * 100);

            return (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[12px] font-black text-foreground">{symbol}</span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground tabular-nums">${Number(displayAmt).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, background: color }}
                  />
                </div>

                {/* ASID link */}
                <a
                  href={getExplorerUrl(asaId, 'asset')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono text-muted-foreground hover:text-primary transition-colors"
                >
                  ASA: {asaId}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
