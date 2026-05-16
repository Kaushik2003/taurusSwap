"use client";

import { ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import { useTransactions, AMMTransaction } from '@/hooks/useTransactions';
import { getExplorerUrl, shortenId } from '@/lib/explorer';
import { motion } from 'framer-motion';

const TYPE_STYLES: Record<AMMTransaction['type'], { label: string; className: string }> = {
  swap:   { label: 'SWAP',   className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  add:    { label: 'ADD',    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  remove: { label: 'REMOVE', className: 'bg-amber-500/15 text-amber-500 border border-amber-500/20' },
  claim:  { label: 'CLAIM',  className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatAmount(raw: bigint | undefined): string {
  if (raw === undefined) return '—';
  const n = Number(raw) / 1e6;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

interface TransactionFeedProps {
  address?: string | null;
  limit?: number;
}

export function TransactionFeed({ address, limit = 15 }: TransactionFeedProps) {
  const { data: txns = [], isLoading, isError } = useTransactions(address, limit);

  if (isLoading) {
    return (
      <div className="glass-panel p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-medium uppercase tracking-widest">Loading transactions…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-panel p-6 text-center text-xs text-destructive font-medium">
        Failed to load transactions — indexer may be unavailable.
      </div>
    );
  }

  if (txns.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-xs text-muted-foreground font-medium uppercase tracking-widest">
        No recent transactions found.
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden border-border/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b border-border/50">
              <th className="text-[10px] font-bold uppercase tracking-widest py-3 pl-5 text-left text-muted-foreground">Type</th>
              <th className="text-[10px] font-bold uppercase tracking-widest text-left text-muted-foreground">Wallet</th>
              <th className="text-[10px] font-bold uppercase tracking-widest text-left text-muted-foreground">Details</th>
              <th className="text-[10px] font-bold uppercase tracking-widest text-right text-muted-foreground">Amount</th>
              <th className="text-[10px] font-bold uppercase tracking-widest text-right pr-5 text-muted-foreground">Time</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((tx, i) => {
              const style = TYPE_STYLES[tx.type];
              return (
                <motion.tr
                  key={tx.id}
                  className="border-b border-border/30 hover:bg-primary/5 transition-colors group"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <td className="py-3 pl-5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${style.className}`}>
                      {style.label}
                    </span>
                  </td>
                  <td className="py-3">
                    <a
                      href={getExplorerUrl(tx.wallet, 'address')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      {shortenId(tx.wallet, 6, 4)}
                    </a>
                  </td>
                  <td className="py-3">
                    {tx.type === 'swap' && tx.token1 ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                        <span>{tx.token0}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span>{tx.token1}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-foreground">{tx.token0}</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] font-bold text-foreground">
                    {formatAmount(tx.amountIn)}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(tx.timestamp)}</span>
                      <a
                        href={getExplorerUrl(tx.id, 'transaction')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground/50 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
