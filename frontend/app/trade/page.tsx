"use client";
import FloatingOrbs from '../../components/landing/FloatingOrbs';
import SwapCard from '../../components/swap/SwapCard';

export default function TradePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-green">
      <FloatingOrbs />

      <div className="relative z-10 flex flex-col items-center px-4">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 mt-20 lg:mt-36 mb-16 px-4 lg:px-12 xl:px-20">
          <div className="flex-1 text-center lg:text-left animate-fade-in-up w-full">
            <div className="mx-auto lg:mx-0 mb-6 inline-flex rounded-full border-2 border-dark-green px-4 py-1.5 text-sm font-bold text-dark-green bg-[#C0FCFD] shadow-[-2px_2px_0_0_var(--dark-green)] uppercase tracking-widest">
              Algorand Ecosystem
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-dark-green mb-6 leading-[1.05] tracking-tighter">
              Trade tokens,<br className="hidden lg:block" /> without limits.
            </h1>
            <p className="text-lg sm:text-xl text-dark-green/70 max-w-lg mx-auto lg:mx-0 font-bold mb-8">
              Swap, earn, and build on Algorand with institutional-grade liquidity and sub-4 second finality. Built for everyone.
            </p>
          </div>

          <div className="w-full max-w-[500px] flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <SwapCard />
          </div>
        </div>
      </div>
    </div>
  );
}