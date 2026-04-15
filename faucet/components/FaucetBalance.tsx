'use client';

import { useEffect, useState } from 'react';
import { FAUCET_TOKENS } from '@/lib/tokens';
import { Droplets } from './icons';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface BalanceEntry {
  assetId: number;
  symbol: string;
  balance: number | null;
}

export default function FaucetBalance() {
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/faucet')
      .then((r) => r.json())
      .then((data: { balances: BalanceEntry[] }) => setBalances(data.balances ?? []))
      .catch(() => {
        // Non-critical — silently fail
        setBalances(FAUCET_TOKENS.map((t) => ({ assetId: t.assetId, symbol: t.symbol, balance: null })));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel overflow-hidden shadow-[-6px_6px_0_0_var(--dark-green)] h-full">
      <div className="flex items-center gap-2 px-6 py-4 border-b-2 border-dark-green/10 bg-white">
        <Droplets className="w-4 h-4 text-dark-green" />
        <span className="text-[11px] font-black uppercase tracking-widest text-dark-green">
          Vault Reserves
        </span>
      </div>

      <div className="bg-white p-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            {FAUCET_TOKENS.map((t) => (
              <div key={t.assetId} className="flex items-center justify-between animate-pulse">
                <div className="w-20 h-3 bg-dark-green/5 rounded" />
                <div className="w-12 h-3 bg-dark-green/5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {balances.map((b) => {
              const meta = FAUCET_TOKENS.find((t) => t.assetId === b.assetId);
              const isLow = b.balance !== null && b.balance < 1000;
              return (
                <div key={b.assetId} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2.5 h-2.5 rounded-full border border-dark-green/20"
                      style={{ background: meta?.color ?? '#888' }}
                    />
                    <span className="text-xs font-black text-dark-green/40 uppercase tracking-widest group-hover:text-dark-green transition-colors">{b.symbol}</span>
                  </div>
                  
                  {b.balance === null ? (
                    <span className="text-[11px] font-black text-dark-green/20 uppercase tracking-widest">Offline</span>
                  ) : (
                    <span
                      className={cn(
                        "text-[13px] font-black tracking-widest",
                        isLow ? 'text-red-500' : 'text-dark-green'
                      )}
                    >
                      {b.balance >= 1_000_000
                        ? `${(b.balance / 1_000_000).toFixed(1)}M`
                        : b.balance >= 1_000
                        ? `${(b.balance / 1_000).toFixed(1)}K`
                        : b.balance.toFixed(0)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-green/10 border-t-2 border-dark-green/10">
        <p className="text-[10px] font-black uppercase tracking-widest text-dark-green/30 text-center">
          Drip Feed: Active
        </p>
      </div>
    </div>

  );
}
