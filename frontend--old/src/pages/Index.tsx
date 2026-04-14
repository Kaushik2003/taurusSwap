import FloatingOrbs from '@/components/landing/FloatingOrbs';
import SwapCard from '@/components/swap/SwapCard';
import Features from '@/components/landing/Features';
import BentoGrid from '@/components/landing/BentoGrid';
import FAQ from '@/components/landing/FAQ';
import { ArrowDown } from 'lucide-react';

export default function Index() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden" style={{ background: '#CEF17B' }}>
      <FloatingOrbs />

      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Hero */}
        <div className="text-center mt-16 mb-10 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-[#084734] mb-4 leading-tight tracking-tighter">
            Trade tokens,without limits.
          </h1>
          <p className="text-lg sm:text-xl text-[#084734]/70 max-w-lg mx-auto font-bold">
            Swap, earn, and build on Algorand with institutional-grade liquidity and sub-4 second finality.
          </p>
        </div>

        {/* Swap card */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <SwapCard />
        </div>


        {/* Scroll hint */}
        <div className="mt-16 mb-8 flex flex-col items-center gap-2 text-[#084734]/30 animate-float">
          <span className="text-xs font-bold uppercase tracking-widest">Scroll to explore</span>
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Stats section */}
        <div className="w-full max-w-4xl mx-auto pb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Volume', value: '$1.2T+' },
              { label: 'Total Value Locked', value: '$4.8B' },
              { label: 'ALGO Staked', value: '850M+' },
              { label: 'Network Finality', value: '3.3s' },
            ].map(s => (
              <div key={s.label} className="p-6 text-center rounded-3xl" style={{ background: '#084734' }}>
                <p className="text-2xl sm:text-3xl font-black text-[#CEF17B] mb-1">{s.value}</p>
                <p className="text-xs text-[#CEF17B]/60 font-bold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features section */}
        <div className="mt-20">
          <Features />
        </div>

        {/* Bento Grid section */}
        <div className="mt-20">
          <BentoGrid />
        </div>

        {/* FAQ section */}
        <div className="mt-20 mb-20">
          <FAQ />
        </div>
      </div>
    </div>
  );
}
