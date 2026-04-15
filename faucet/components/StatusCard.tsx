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

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {status.type === 'loading' && (
        <div className="flex items-center gap-5 px-6 py-5 bg-white rounded-3xl border-2 border-dark-green shadow-[-6px_6px_0_0_var(--dark-green)] group">
          <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center shrink-0 border-2 border-dark-green/10">
            <Loader className="w-6 h-6 text-dark-green animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-dark-green/40 mb-0.5">
              Protocol Execution
            </p>
            <p className="text-sm font-black text-dark-green uppercase tracking-tight">
              Synchronizing with Node...
            </p>
          </div>
        </div>
      )}

      {status.type === 'success' && (() => {
        const claimedPercent = Math.min(((status.dailyLimit - status.remaining) / status.dailyLimit) * 100, 100);
        return (
          <div className="glass-panel overflow-hidden shadow-[-8px_8px_0_0_var(--dark-green)] border-2 border-dark-green bg-white">
            <div className="p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-3xl bg-[#9FE870] flex items-center justify-center border-2 border-dark-green shadow-[-4px_4px_0_0_var(--dark-green)] shrink-0">
                    <CheckCircle className="w-8 h-8 text-dark-green" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-dark-green/40 mb-1">
                      Success Confirmation
                    </h3>
                    <p className="text-4xl font-black text-dark-green font-wise tracking-tight">
                      +{status.claimed} {status.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right hidden xs:block">
                  <p className="text-[10px] font-black text-dark-green/30 uppercase tracking-widest">Network</p>
                  <p className="text-xs font-black text-dark-green uppercase mt-1">Algorand Testnet</p>
                </div>
              </div>

              {/* Technical Metadata */}
              <div className="mt-8 bg-green/5 rounded-2xl border-2 border-dark-green/10 p-5 font-mono text-xs overflow-hidden">
                <div className="flex justify-between items-center text-dark-green/30 mb-3 uppercase font-black text-[10px] tracking-widest">
                  <span>Requisition Receipt</span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-dark-green/10">ID: {status.txId.slice(0, 8)}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-dark-green/60 leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap">
                    <span className="font-black text-dark-green/40 mr-2">TX:</span>
                    <a 
                      href={`${ALGO_EXPLORER_BASE}/${status.txId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dark-green hover:underline decoration-2 font-bold"
                    >
                      {status.txId}
                    </a>
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Confirmed on ledger
                  </p>
                </div>
              </div>

              {/* Drip Progress Bar */}
              <div className="mt-8">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[11px] font-black text-dark-green/40 uppercase tracking-widest">Daily Quota Status</span>
                  <span className="text-xs font-black text-dark-green uppercase">
                    {status.dailyLimit - status.remaining} / {status.dailyLimit} <span className="text-dark-green/40">{status.symbol}</span>
                  </span>
                </div>
                <div className="h-5 bg-green/10 rounded-full border-2 border-dark-green/10 p-0.5 overflow-hidden">
                  <div 
                    className="h-full bg-dark-green rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(159,232,112,0.3)]"
                    style={{ width: `${claimedPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3">
                  <p className="text-[9px] font-black text-dark-green/30 uppercase tracking-widest">Rate limited</p>
                  <p className="text-[9px] font-black text-dark-green/30 uppercase tracking-widest">Reset in 24h</p>
                </div>
              </div>
            </div>
            
            <div className="bg-dark-green py-3 px-8">
              <p className="text-[10px] font-black text-green uppercase tracking-[0.3em] text-center">
                Verified Cryptographic Proof
              </p>
            </div>
          </div>
        );
      })()}

      {status.type === 'error' && (
        <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-6 shadow-[-6px_6px_0_0_rgba(239,68,68,1)] animate-shake">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 border-2 border-red-200">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">
                Execution Fault
              </h3>
              <p className="text-sm font-bold text-red-800 leading-relaxed bg-white/50 p-3 rounded-xl border border-red-100">
                {status.message}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors py-2 px-4 bg-white rounded-full border border-red-200 shadow-sm"
              >
                [ Restart Engine ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
