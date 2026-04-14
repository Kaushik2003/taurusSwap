import { TrendingUp, Wallet, Coins, Percent } from "lucide-react";
import { rawToDisplay } from "@/lib/tokenDisplay";

interface PortfolioHeaderProps {
  totalValue: bigint;
  totalFees: bigint;
  positionCount: number;
}

export function PortfolioHeader({ totalValue, totalFees, positionCount }: PortfolioHeaderProps) {
  // Using $1.00 valuation for stablecoins as discussed
  const formattedValue = rawToDisplay(totalValue); 
  const formattedFees = rawToDisplay(totalFees);
  const simulatedAPR = "8.40%";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { 
          label: "Total Value", 
          value: `$${formattedValue}`, 
          icon: Wallet, 
          color: "text-primary",
          bg: "bg-primary/5"
        },
        { 
          label: "Total Fees Earned", 
          value: `$${formattedFees}`, 
          icon: Coins, 
          color: "text-emerald-500",
          bg: "bg-emerald-500/5"
        },
        { 
          label: "Active Positions", 
          value: positionCount.toString(), 
          icon: TrendingUp, 
          color: "text-blue-500",
          bg: "bg-blue-500/5"
        },
        { 
          label: "Average APR", 
          value: simulatedAPR, 
          icon: Percent, 
          color: "text-primary",
          bg: "bg-primary/5",
          suffix: "Est."
        },
      ].map((item, i) => (
        <div 
          key={i} 
          className="glass-panel p-5 border-border/50 relative overflow-hidden group hover:border-primary/30 transition-all duration-300"
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-foreground tracking-tight">
                  {item.value}
                </h2>
                {item.suffix && <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.suffix}</span>}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${item.bg}`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
          </div>
          
          {/* Subtle background decoration */}
          <div className="absolute -bottom-4 -right-4 w-16 h-16 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <item.icon className="w-full h-full text-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
}
