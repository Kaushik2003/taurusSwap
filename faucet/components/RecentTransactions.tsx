'use client';

import { useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader, Droplets } from './icons';

interface Transaction {
  txId: string;
  assetId: number;
  symbol: string;
  amount: number;
  receiver: string;
  timestamp: number;
  confirmedRound: number;
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTime(seconds: number) {
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RecentTransactions() {
  const { activeAddress } = useWallet();
  const [view, setView] = useState<'global' | 'user'>('global');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', view, view === 'user' ? activeAddress : null],
    queryFn: async () => {
      const url = new URL('/api/transactions', window.location.origin);
      if (view === 'user' && activeAddress) {
        url.searchParams.set('address', activeAddress);
      }
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      return json.transactions as Transaction[];
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  return (
    <div className="glass-monolith p-1 mt-12 overflow-hidden">
      <div className="bg-[var(--surface-container-high)] p-6 sm:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/40 mb-1">
              Transaction_Protocol_v1.0
            </p>
            <h2 className="text-xl font-black text-[var(--on-background)] uppercase tracking-tight italic">
              Recent_Activity_<span className="text-[var(--secondary)]">Feed</span>
            </h2>
          </div>

          {/* View Toggle */}
          <div className="flex p-1 bg-[var(--surface-container-low)] border border-[var(--outline-variant)]">
            <button
              onClick={() => setView('global')}
              className={`px-4 py-1.5 text-[10px] font-technical tracking-widest uppercase transition-all ${
                view === 'global'
                  ? 'bg-[var(--secondary)] text-[var(--on-secondary)] font-bold'
                  : 'text-[var(--on-background)]/40 hover:text-[var(--on-background)]'
              }`}
            >
              [ GLOBAL_LOG ]
            </button>
            <button
              onClick={() => setView('user')}
              disabled={!activeAddress}
              className={`px-4 py-1.5 text-[10px] font-technical tracking-widest uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
                view === 'user'
                  ? 'bg-[var(--secondary)] text-[var(--on-secondary)] font-bold'
                  : 'text-[var(--on-background)]/40 hover:text-[var(--on-background)]'
              }`}
            >
              [ USER_LOG ]
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-px bg-[var(--outline-variant)] border border-[var(--outline-variant)]">
          {isLoading ? (
            <div className="bg-[var(--surface-container-low)] p-12 flex flex-col items-center justify-center gap-4">
              <Loader className="w-6 h-6 text-[var(--secondary)] animate-spin" />
              <p className="text-[9px] font-technical uppercase tracking-[0.2em] text-[var(--on-background)]/40">
                Synchronizing_Ledger...
              </p>
            </div>
          ) : isError ? (
            <div className="bg-[var(--surface-container-low)] p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[var(--error-container)] flex items-center justify-center">
                <span className="text-[var(--error)] font-bold">!</span>
              </div>
              <p className="text-[10px] font-technical uppercase tracking-widest text-[var(--error)]/60 max-w-[200px]">
                Failed to establish connection to indexer.
              </p>
              <button 
                onClick={() => refetch()}
                className="text-[9px] font-technical uppercase tracking-widest text-[var(--secondary)] hover:underline"
              >
                [ RETRY_HANDSHAKE ]
              </button>
            </div>
          ) : data && data.length > 0 ? (
            data.map((tx) => (
              <div 
                key={tx.txId} 
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)] transition-colors gap-4"
              >
                {/* Left: Asset & Amount */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-full shrink-0 group-hover:bg-[var(--secondary)]/20 transition-colors">
                    <Droplets className="w-4 h-4 text-[var(--secondary)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-[var(--on-background)] tracking-tight">
                        +{tx.amount} {tx.symbol}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[var(--on-background)]/40">
                      ID: {tx.assetId} // Round: {tx.confirmedRound}
                    </p>
                  </div>
                </div>

                {/* Right: Receiver & Link */}
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="text-right">
                    <p className="text-[9px] font-technical uppercase tracking-widest text-[var(--on-background)]/30 mb-0.5">
                      Target_Address
                    </p>
                    <p className="text-[11px] font-mono text-[var(--on-background)]/60">
                      {truncate(tx.receiver)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-8 w-px bg-[var(--outline-variant)] hidden sm:block" />
                    <div className="text-right">
                      <p className="text-[9px] font-technical uppercase tracking-widest text-[var(--secondary)] mb-0.5">
                        {formatTime(tx.timestamp)}
                      </p>
                      <a
                        href={`https://testnet.explorer.perawallet.app/tx/${tx.txId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[9px] font-technical uppercase tracking-widest text-[var(--on-background)]/40 hover:text-[var(--secondary)] transition-colors"
                      >
                        [ VIEW ] <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[var(--surface-container-low)] p-12 flex flex-col items-center justify-center gap-4">
              <p className="text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/30 text-center">
                No recent activity detected in this sector.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--secondary)] animate-pulse" />
            <span className="text-[9px] font-technical uppercase tracking-widest text-[var(--on-background)]/30">
              Ledger_Status: SYNCHRONIZED
            </span>
          </div>
          <p className="text-[8px] font-technical uppercase tracking-widest text-[var(--on-background)]/20">
            Source: Algorand_Indexer_v2
          </p>
        </div>
      </div>
    </div>
  );
}
