import { Info, Database, Layers, Activity } from "lucide-react";
import { getTokenSymbol, getTokenColor, rawToDisplay } from "@/lib/tokenDisplay";
import type { PoolState } from "@/lib/orbital-sdk";
import { getExplorerUrl } from "@/lib/explorer";

interface AnalyticsPanelProps {
  pool: PoolState;
}

export function AnalyticsPanel({ pool }: AnalyticsPanelProps) {
  const feeRate = (Number(pool.feeBps) / 100).toFixed(2);
  const interiorRadius = rawToDisplay(pool.rInt * 1000n);

  const stats = [
    { label: "Fee Tier", value: `${feeRate}%`, icon: PercentIcon },
    { label: "Active Ticks", value: pool.ticks.length.toString(), icon: Layers },
    { label: "Int. Radius", value: interiorRadius, icon: Database },
    { label: "Protocol Status", value: "Operational", icon: Activity, color: "text-emerald-500" },
  ];

  function PercentIcon({ className }: { className?: string }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-4 bg-primary rounded-full" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Pool Analytics</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/20 group hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-background border border-border/40 text-muted-foreground group-hover:text-primary transition-colors">
                  <stat.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</span>
              </div>
              <span className={`text-xs font-black ${stat.color || 'text-foreground'}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Token Reserves</h4>
            <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-primary/10 text-primary uppercase tracking-tighter">Live</span>
          </div>
          
          <div className="space-y-3">
            {pool.tokenAsaIds.map((asaId, i) => {
              const symbol = getTokenSymbol(pool, i);
              const balance = rawToDisplay((pool.reserves[i] - pool.virtualOffset) * 1000n);
              const color = getTokenColor(i);
              
              return (
                <div key={i} className="group cursor-default">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="text-[12px] font-black text-foreground">{symbol}</span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">${balance}</span>
                  </div>
                  <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground/10 group-hover:bg-primary/40 transition-all" 
                      style={{ width: `${Math.min(100, (Number(balance) / 100000) * 100)}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <a 
                      href={getExplorerUrl(asaId, 'asset')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      ASID: {asaId}
                    </a>
                    <a
                      href={getExplorerUrl(asaId, 'asset')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-bold text-muted-foreground uppercase opacity-0 group-hover:opacity-100 hover:text-primary transition-all cursor-pointer"
                    >
                      View Asset
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-panel p-5 border-border/50 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground mb-1">Algorand AVM Net</h4>
            <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
              Deployed on Testnet (App ID <a href={getExplorerUrl(pool.appId, 'application')} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold decoration-primary/30 underline-offset-2">{pool.appId}</a>). All transactions are final within 3.3 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
