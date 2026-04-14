"use client";
import FloatingOrbs from '../components/landing/FloatingOrbs';
import DummySwap from '../components/swap/DummySwap';
import Features from '../components/landing/Features';
import BentoGrid from '../components/landing/BentoGrid';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';

import localFont from 'next/font/local';

const wiseSans = localFont({ src: '../public/fonts/wise-sans.otf' });

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-green">
      <FloatingOrbs />

      <div className="relative z-10 flex flex-col items-center">
        {/* Hero & Swap Container — fills viewport on large screens so Features never peeks in */}
        <section className="w-full flex items-center min-h-[calc(100svh-5rem)] lg:min-h-[calc(100svh-4rem)]">
          <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 py-12 sm:py-16 md:py-20 lg:py-16">

            {/* Dark layer — nested card wrapping the hero with light text */}
            <div className="relative rounded-[2rem] sm:rounded-[2.5rem] bg-[#163300] border border-[#163300] shadow-[0_30px_80px_-30px_rgba(22,51,0,0.6)] p-6 sm:p-10 md:p-12 lg:p-14 xl:p-16 overflow-hidden">
              {/* subtle inner glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={{
                  background:
                    'radial-gradient(ellipse at 20% 10%, rgba(159,232,112,0.12) 0%, transparent 55%)',
                }}
              />

              <div className="relative flex flex-col lg:flex-row items-center lg:items-start justify-between gap-10 sm:gap-12 lg:gap-14 xl:gap-20">

                {/* Hero Content — light text on the dark layer */}
                <div className="flex-1 text-center lg:text-left animate-fade-in-up w-full">
                  <h1 className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-green mb-6 leading-[1.05] drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] ${wiseSans.className}`}>
                    SWAP<br className="hidden lg:block" /> ANYTIME,<br className="hidden lg:block" /> ANYWHERE.
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl text-green/85 max-w-lg mx-auto lg:mx-0 font-bold mb-8">
                    Swap, earn, and build on Algorand with institutional-grade liquidity and sub-4 second finality. Built for everyone.
                  </p>
                </div>

                {/* Swap card — reserves fixed height on lg+ so settings/slippage expansion doesn't push siblings */}
                <div
                  className="relative w-full max-w-[500px] mx-auto lg:mx-0 flex-shrink-0 lg:min-h-[560px] animate-fade-in-up"
                  style={{ animationDelay: '0.15s' }}
                >
                  <div className="lg:absolute lg:inset-x-0 lg:top-0">
                    <DummySwap />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 py-16 sm:py-20 md:py-24 lg:py-28">
          <Features />
        </section>

        {/* Bento Grid section */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 pb-16 sm:pb-20 md:pb-24">
          <BentoGrid />
        </section>

        {/* FAQ section */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 pb-20 sm:pb-24 md:pb-28">
          <FAQ />
        </section>
      </div>

      <Footer />
    </div>
  );
}
