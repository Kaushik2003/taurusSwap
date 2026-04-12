'use client';

import { useEffect, useState } from 'react';
import { FAUCET_TOKENS } from '@/lib/tokens';
import { Droplets } from './icons';

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
    <div className="bg-[var(--surface-container-low)] border-l-2 border-[var(--outline-variant)] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--outline-variant)]">
        <Droplets className="w-3 h-3 text-[var(--on-background)]/40" />
        <span className="text-[9px] font-technical uppercase tracking-widest text-[var(--on-background)]/40">
          Engine_Reserves // Realtime_Feed
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-px bg-[var(--outline-variant)]">
          {FAUCET_TOKENS.map((t) => (
            <div key={t.assetId} className="flex flex-col items-center py-4 px-2 bg-[var(--surface-container-low)]">
              <div className="w-2 h-2 rounded-full bg-[var(--on-background)]/10 animate-pulse mb-3" />
              <div className="w-8 h-2 bg-[var(--on-background)]/5 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-px bg-[var(--outline-variant)]">
          {balances.map((b) => {
            const meta = FAUCET_TOKENS.find((t) => t.assetId === b.assetId);
            const isLow = b.balance !== null && b.balance < 1000;
            return (
              <div key={b.assetId} className="flex flex-col items-center py-5 px-2 bg-[var(--surface-container-low)]">
                <span
                  className="w-1.5 h-1.5 mb-2.5 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  style={{ background: meta?.color ?? '#888' }}
                />
                <span className="text-[9px] font-technical text-[var(--on-background)]/30 uppercase tracking-tighter">{b.symbol}</span>
                {b.balance === null ? (
                  <span className="text-[10px] font-mono text-[var(--on-background)]/20 mt-1 uppercase">Null</span>
                ) : (
                  <span
                    className={`text-[11px] font-mono font-bold mt-1 tracking-tighter ${isLow ? 'text-[var(--error)]' : 'text-[var(--secondary)]'}`}
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
      <div className="px-5 py-2 bg-[var(--background)]/50">
        <p className="text-[8px] font-technical uppercase tracking-widest text-[var(--on-background)]/20 text-center">
          Drip_Controller: Active_Stabilization
        </p>
      </div>
    </div>
  );
}
