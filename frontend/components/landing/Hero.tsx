"use client";

import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import DummySwap from '../swap/DummySwap'
import localFont from 'next/font/local';

const wiseSans = localFont({ src: '../../public/fonts/wise-sans.otf' });

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay },
});

const Hero = () => {
  return (
    <div className="w-full flex items-center min-h-[calc(100svh-5rem)] lg:min-h-[calc(100svh-4rem)]">
      <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 py-12 sm:py-16 md:py-20 lg:py-16">

        {/* Dark layer */}
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

            {/* Hero Content */}
            <div className="flex-1 text-center lg:text-left w-full">
              <motion.h1
                className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-green mb-6 leading-[1.05] drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] ${wiseSans.className}`}
                {...fadeUp(0)}
              >
                STABLECOIN<br className="hidden lg:block" /> SWAPS<br className="hidden lg:block" /> DONE RIGHT
              </motion.h1>

              <motion.p
                className="text-base sm:text-lg md:text-xl text-green/85 max-w-lg mx-auto lg:mx-0 font-bold mb-7"
                {...fadeUp(0.14)}
              >
                A simpler, more efficient way to trade stablecoins — built for better prices and smoother execution.
              </motion.p>
            </div>

            {/* Swap card */}
            <motion.div
              className="relative w-full max-w-[500px] mx-auto lg:mx-0 flex-shrink-0 lg:min-h-[560px]"
              {...fadeUp(0.22)}
            >
              <div className="lg:absolute lg:inset-x-0 lg:top-0">
                <Suspense fallback={null}>
                  <DummySwap />
                </Suspense>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
