import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { getTokenSymbol, getTokenColor, rawToDisplay } from "@/lib/tokenDisplay";
import type { PositionInfo, PoolState } from "@/lib/orbital-sdk";
import { TickState } from "@/lib/orbital-sdk";
import { getExplorerUrl } from "@/lib/explorer";

interface PositionsTableProps {
  positions: PositionInfo[];
  pool: PoolState;
}

export function PositionsTable({ positions, pool }: PositionsTableProps) {
  return (
    <div className="glass-panel overflow-hidden border-border/50">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 pl-6 text-muted-foreground">Position ID</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pool / Assets</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Depeg Protection</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Liquidity Value</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Fees Earned</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest pr-6 text-right text-muted-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((pos) => {
            const tick = pool.ticks.find(t => t.id === pos.tickId);
            const totalClaimable = pos.claimableFees.reduce((a, b) => a + b, 0n);
            const isInterior = tick?.state === TickState.INTERIOR;
            
            // Estimated value based on shares + depeg k
            // For now displaying total shares as the primary 'Value' metric
            const valueDisplay = rawToDisplay(pos.positionR * 1000n);
            const feesDisplay = rawToDisplay(totalClaimable);

            return (
              <TableRow key={pos.tickId} className="group border-border/40 hover:bg-primary/5 transition-colors">
                <TableCell className="font-mono text-[11px] font-bold py-4 pl-6 text-muted-foreground">
                  #{pos.tickId.toString().padStart(4, '0')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {Array.from({ length: pool.n }, (_, i) => (
                        <a
                          key={i}
                          href={getExplorerUrl(pool.tokenAsaIds[i], 'asset')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-5 h-5 rounded-full border border-background ring-1 ring-border/20 flex items-center justify-center text-[7px] font-black text-white hover:scale-110 transition-transform cursor-pointer"
                          style={{ background: getTokenColor(i) }}
                          title={`View ${getTokenSymbol(pool, i)} on Explorer`}
                        >
                          {getTokenSymbol(pool, i)[0]}
                        </a>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                      {Array.from({ length: pool.n }, (_, i) => getTokenSymbol(pool, i)).join('/')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-foreground">$1.00</span>
                    <span className="text-[10px] text-muted-foreground">protection</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-foreground">${valueDisplay}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Est. Value</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs font-bold text-emerald-500">${feesDisplay}</span>
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={isInterior ? 'active' : 'out'} />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <Link href={`/pool/${pos.tickId}`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-md text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all"
                    >
                      Manage
                      <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
