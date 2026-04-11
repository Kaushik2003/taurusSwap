'use client';

import { CheckCircle, XCircle, Loader } from './icons';

export type FaucetStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; txId: string; symbol: string; claimed: number; remaining: number; dailyLimit: number }
  | { type: 'error'; message: string };

interface Props {
  status: FaucetStatus;
}

const ALGO_EXPLORER_BASE = 'https://testnet.explorer.perawallet.app/tx';

export default function StatusCard({ status }: Props) {
  if (status.type === 'idle') return null;

  if (status.type === 'loading') {
    return (
      <div className="mt-8 flex items-center gap-4 px-5 py-4 bg-[var(--surface-container-low)] border-l-2 border-[var(--secondary)] animate-pulse">
        <Loader className="w-5 h-5 text-[var(--secondary)] animate-spin shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-technical uppercase tracking-widest text-[var(--secondary)]">
            Executing_Transaction
          </p>
          <p className="text-sm text-[var(--on-background)]/60 font-mono mt-0.5">
            Syncing with Algorand Node...
          </p>
        </div>
      </div>
    );
  }

  if (status.type === 'success') {
    const claimedPercent = Math.min(((status.dailyLimit - status.remaining) / status.dailyLimit) * 100, 100);

    return (
      <div className="mt-8 glass-monolith p-1 animate-glow">
        <div className="bg-[var(--surface-container-high)] p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-[var(--secondary)]" />
              <div>
                <h3 className="text-sm font-technical uppercase tracking-widest text-[var(--on-background)]">
                  Transaction_Complete
                </h3>
                <p className="text-xl font-black text-[var(--secondary)] mt-1">
                  +{status.claimed} {status.symbol}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-technical text-[var(--on-background)]/40 uppercase">Network</p>
              <p className="text-xs font-mono font-bold text-[var(--secondary)]">Algorand_Testnet</p>
            </div>
          </div>

          {/* Technical Metadata Block */}
          <div className="mt-6 bg-[var(--background)]/50 p-4 font-mono text-[11px] border-l border-[var(--outline-variant)]">
            <div className="flex justify-between items-center text-[var(--on-background)]/40 mb-2 uppercase tracking-tighter">
              <span>Metadata</span>
              <span>ID: {status.txId.slice(0, 8)}</span>
            </div>
            <p className="text-[var(--on-background)]/80 break-all leading-relaxed">
              TX_HASH: <a 
                href={`${ALGO_EXPLORER_BASE}/${status.txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--secondary)] hover:underline"
              >
                {status.txId}
              </a>
            </p>
            <p className="mt-1 text-[var(--on-background)]/60">STATUS: PROCESSED_AND_CONFIRMED</p>
          </div>

          {/* Drip Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-technical text-[var(--on-background)]/40 uppercase">Daily_Quota</span>
              <span className="text-xs font-mono text-[var(--on-background)]">
                {status.dailyLimit - status.remaining} / {status.dailyLimit} {status.symbol}
              </span>
            </div>
            <div className="h-1 bg-[var(--surface-container-highest)] relative overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-[var(--secondary)] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(163,250,0,0.5)]"
                style={{ width: `${claimedPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[var(--on-background)]/30 text-right uppercase tracking-tighter">
              Reset in 24h
            </p>
          </div>
        </div>
      </div>
    );
  }

  // error
  return (
    <div className="mt-8 bg-[var(--surface-container-low)] border-l-2 border-[var(--error)] p-5 animate-slide-up">
      <div className="flex items-start gap-4">
        <XCircle className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-xs font-technical uppercase tracking-widest text-[var(--error)]">
            Execution_Failure
          </h3>
          <p className="text-sm font-mono text-[var(--on-background)]/80 mt-2 leading-relaxed">
            {status.message}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/40 hover:text-[var(--on-background)] transition-colors"
          >
            [ Restart_Engine ]
          </button>
        </div>
      </div>
    </div>
  );
}
