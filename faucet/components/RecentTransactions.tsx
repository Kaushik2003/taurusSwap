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

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
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
    <div className="glass-panel overflow-hidden shadow-[-6px_6px_0_0_var(--dark-green)] mt-12">
      <div className="bg-white">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-8 border-b-2 border-dark-green/10">
          <div>
            <h2 className="text-2xl font-black text-dark-green uppercase tracking-tight font-wise">
              Recent Activity
            </h2>
            <p className="text-sm font-bold text-dark-green/40 uppercase tracking-widest mt-1">
              Live Network Transactions
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex p-1 bg-green/5 rounded-2xl border-2 border-dark-green/10">
            <button
              onClick={() => setView('global')}
              className={cn(
                "px-5 py-2 text-[11px] font-black tracking-widest uppercase transition-all rounded-xl",
                view === 'global'
                  ? 'bg-dark-green text-green'
                  : 'text-dark-green/40 hover:text-dark-green'
              )}
            >
              Global
            </button>
            <button
              onClick={() => setView('user')}
              disabled={!activeAddress}
              className={cn(
                "px-5 py-2 text-[11px] font-black tracking-widest uppercase transition-all rounded-xl disabled:opacity-20",
                view === 'user'
                  ? 'bg-dark-green text-green'
                  : 'text-dark-green/40 hover:text-dark-green'
              )}
            >
              My History
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="divide-y-2 divide-dark-green/5">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4">
              <Loader className="w-8 h-8 text-dark-green animate-spin" />
              <p className="text-[11px] font-black uppercase tracking-widest text-dark-green/30">
                Syncing Ledger...
              </p>
            </div>
          ) : isError ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border-2 border-red-200">
                <span className="text-red-500 font-black">!</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-red-500/60 max-w-[240px]">
                Failed to connect to indexer.
              </p>
              <button 
                onClick={() => refetch()}
                className="text-xs font-black uppercase tracking-widest text-dark-green hover:underline decoration-2"
              >
                Retry Handshake
              </button>
            </div>
          ) : data && data.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-green">
              {data.map((tx) => (
                <div 
                  key={tx.txId} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-green/5 transition-colors gap-4"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 flex items-center justify-center bg-white border-2 border-dark-green/10 rounded-2xl group-hover:border-dark-green/30 transition-colors shadow-sm">
                      <Droplets className="w-5 h-5 text-dark-green" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base font-black text-dark-green tracking-tight">
                          +{tx.amount} {tx.symbol}
                        </span>
                      </div>
                      <p className="text-[10px] font-black text-dark-green/30 uppercase tracking-widest">
                        Asset #{tx.assetId} — Round {tx.confirmedRound}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-8">
                    <div className="text-right hidden xs:block">
                      <p className="text-[9px] font-black uppercase tracking-widest text-dark-green/30 mb-0.5">
                        Recipient
                      </p>
                      <p className="text-xs font-mono font-medium text-dark-green/60">
                        {truncate(tx.receiver)}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="h-10 w-[2px] bg-dark-green/5 hidden sm:block" />
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-dark-green mb-0.5">
                          {formatTime(tx.timestamp)}
                        </p>
                        <a
                          href={`https://testnet.explorer.perawallet.app/tx/${tx.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-end gap-1.5 text-[10px] font-black uppercase tracking-widest text-dark-green/40 hover:text-dark-green transition-all"
                        >
                          View <ExternalLink className="w-3.5 h-3.5" strokeWidth={3} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <p className="text-xs font-black uppercase tracking-widest text-dark-green/20 text-center">
                No active requisition history.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-green/10 flex items-center justify-between border-t-2 border-dark-green/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse border border-dark-green/10" />
            <span className="text-[9px] font-black uppercase tracking-widest text-dark-green/40">
              Indexer Sync State: OK
            </span>
          </div>
          <p className="text-[8px] font-black uppercase tracking-widest text-dark-green/20">
            Source: Algorand Testnet
          </p>
        </div>
      </div>
    </div>

  );
}
