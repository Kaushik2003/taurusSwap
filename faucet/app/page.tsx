import FaucetForm from '@/components/FaucetForm';
import FaucetBalance from '@/components/FaucetBalance';
import OptInSection from '@/components/OptInSection';
import RecentTransactions from '@/components/RecentTransactions';
import { Zap } from '@/components/icons';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 bg-background">


      {/* ── Faucet Interface ───────────────────────────────── */}
      <div className="w-full max-w-2xl space-y-12 animate-slide-up">
        <div className="glass-panel overflow-hidden shadow-[-8px_8px_0_0_var(--dark-green)]">
          <div className="bg-white p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 border-b-2 border-dark-green/10 pb-8">
              <div>
                <h2 className="text-2xl font-black text-dark-green uppercase tracking-tight font-wise">
                  Claim Test Assets
                </h2>
                <p className="text-sm font-bold text-dark-green/60 uppercase tracking-widest mt-1">
                  Request stablecoins for testing
                </p>
              </div>
            </div>

            {/* Opt-in section */}
            <OptInSection />

            {/* Faucet logic */}
            <FaucetForm />
          </div>
        </div>

        {/* Dashboard Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FaucetBalance />
          <RecentTransactions />
        </div>

        {/* Footer info */}
        <footer className="pt-12 border-t-[2.5px] border-dark-green/20 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-60">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dark-green">
            TaurusSwap Protocol // V2.0.4-STABLE
          </p>
          <div className="flex gap-6">
            <a
              href="https://algorand.foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black uppercase tracking-widest text-dark-green hover:underline decoration-2"
            >
              Algorand Foundation
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

