'use client';

import FaucetForm from '@/components/FaucetForm';
import FaucetBalance from '@/components/FaucetBalance';
import WalletButton from '@/components/WalletButton';
import OptInSection from '@/components/OptInSection';
import StatusCard from '@/components/StatusCard';
import RecentTransactions from '@/components/RecentTransactions';
import { Zap } from '@/components/icons';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-20 bg-[var(--background)]">
      {/* ── Technical Header ─────────────────────────────────────── */}
      <header className="flex flex-col items-center mb-16 animate-fade-in max-w-xl w-full">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 flex items-center justify-center bg-[var(--secondary)] shadow-[0_0_20px_rgba(163,250,0,0.4)]">
            <Zap className="w-6 h-6 text-[var(--on-secondary)] fill-current" />
          </div>
          <div className="h-px w-20 bg-[var(--outline-variant)]" />
          <span className="text-[10px] font-technical uppercase tracking-[0.3em] text-[var(--on-background)]/40">
            Vault_System_v2.0
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-[var(--on-background)] tracking-tighter text-center leading-none mb-4 uppercase italic">
          TaurusSwap <span className="text-[var(--secondary)]">Faucet</span>
        </h1>
        <p className="text-[var(--on-background)]/40 font-mono text-[11px] text-center max-w-sm leading-relaxed uppercase tracking-tighter">
          Strategic Requisition Protocol // Algorand Testnet Stablecoins // High Fidelity AMM Testing
        </p>

        {/* Technical Badge */}
        <div className="mt-8 flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-container-low)] border-l border-[var(--secondary)]">
          <span className="w-1 h-1 bg-[var(--secondary)] animate-pulse" />
          <span className="text-[9px] font-technical uppercase tracking-widest text-[var(--secondary)]">
            Environment: ALGO_TESTNET_GENESIS_2026
          </span>
        </div>
      </header>

      {/* ── Main Engine Interface ───────────────────────────────── */}
      <div className="w-full max-w-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass-monolith p-1">
          <div className="bg-[var(--surface-container-high)] p-8 sm:p-10">
            {/* Control Panel Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
              <div>
                <p className="text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/40 mb-1">
                  Interface_Control
                </p>
                <h2 className="text-xl font-black text-[var(--on-background)] uppercase tracking-tight">
                  Authorization_Panel
                </h2>
              </div>
              <WalletButton />
            </div>

            {/* Opt-in section */}
            <OptInSection />

            {/* Faucet logic */}
            <FaucetForm />
          </div>
        </div>

        {/* Tonal Footnotes */}
        <div className="mt-12 space-y-8">
          <FaucetBalance />
          
          <RecentTransactions />
          
          <div className="pt-8 border-t border-[var(--outline-variant)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[9px] font-technical uppercase tracking-widest text-[var(--on-background)]/20">
              Protocol: TaurusSwap // Engine: Algorand_Standard_Asset_v1
            </p>
            <div className="flex gap-4">
              <a
                href="https://algorand.foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-technical uppercase tracking-widest text-[var(--on-background)]/40 hover:text-[var(--secondary)] transition-colors"
              >
                [ Algorand_Foundation ]
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
