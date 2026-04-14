"use client";
import FloatingOrbs from '../components/landing/FloatingOrbs';
import SwapCard from '../components/swap/SwapCard';
import Features from '../components/landing/Features';
import BentoGrid from '../components/landing/BentoGrid';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';
import { ArrowDown } from 'lucide-react';

import localFont from 'next/font/local';

const wiseSans = localFont({ src: '../public/fonts/wise-sans.otf' });

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-green">
      <FloatingOrbs />

      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Hero & Swap Container */}
        <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 mt-20 lg:mt-36 mb-16 px-4 lg:px-12 xl:px-20">

          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left animate-fade-in-up w-full">
            <h1 className={`text-4xl sm:text-6xl lg:text-9xl xl:text-10xl font-black text-dark-green mb-6 leading-[1.05] ${wiseSans.className}`}>
              SWAP<br className="hidden lg:block" /> ANYTIME,<br className="hidden lg:block" /> ANYWHERE.
            </h1>
            <p className="text-lg sm:text-xl text-dark-green/70 max-w-lg mx-auto lg:mx-0 font-bold mb-8">
              Swap, earn, and build on Algorand with institutional-grade liquidity and sub-4 second finality. Built for everyone.
            </p>
          </div>

          {/* Swap card */}
          <div className="w-full max-w-[500px] flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <SwapCard redirectTo="/trade" />
          </div>
        </div>

        {/* Features section */}
        <div className="mt-20">
          <Features />
        </div>

        {/* Bento Grid section */}
        <div className="mt-20 w-full max-w-7xl">
          <BentoGrid />
        </div>

        {/* FAQ section */}
        <div className="mt-20 mb-20 w-full max-w-7xl">
          <FAQ />
        </div>
      </div>

      <Footer />
    </div>
  );
}
