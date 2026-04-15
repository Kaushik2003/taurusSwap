"use client";
import { useState, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SwapCard from '../../components/swap/SwapCard';
import LimitCard from '../../components/swap/LimitCard';
import BuyCard from '../../components/swap/BuyCard';
import SellCard from '../../components/swap/SellCard';

type Tab = 'swap' | 'limit' | 'buy' | 'sell';

const TABS: { id: Tab; label: string }[] = [
  { id: 'swap',  label: 'Swap'  },
  { id: 'limit', label: 'Limit' },
  { id: 'buy',   label: 'Buy'   },
  { id: 'sell',  label: 'Sell'  },
];

const cardVariants = {
  enter: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
  exit:  { opacity: 0, y: -6, transition: { duration: 0.14, ease: 'easeIn' as const } },
};

export default function TradePage() {
  const [activeTab, setActiveTab] = useState<Tab>('swap');

  return (
    <div className="relative min-h-screen overflow-hidden bg-green">
      <div className="relative z-10 flex flex-col items-center px-4">
        <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 py-20 mb-16 px-4">

          {/* Header */}
          <motion.div
            className="lg:max-w-[45%]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-6xl text-foreground mb-1" style={{ fontFamily: "'WiseSans', 'Inter', sans-serif", fontWeight: 900 }}>TRADE PANEL</h1>
            <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em]">Trade tokens, without limits</p>
          </motion.div>

          {/* Card column */}
          <motion.div
            className="w-full max-w-[500px] flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            {/* Tab bar */}
            <div className="flex gap-2 mb-4">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-wider border-[3px] border-dark-green transition-all
                    ${activeTab === tab.id
                      ? 'bg-dark-green text-white shadow-[-3px_3px_0_0_rgba(0,0,0,0.25)]'
                      : 'bg-white text-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:bg-[#FFE169] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Card — animated on tab switch */}
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} variants={cardVariants} initial="enter" animate="visible" exit="exit">
                {activeTab === 'swap'  && <Suspense fallback={null}><SwapCard /></Suspense>}
                {activeTab === 'limit' && <LimitCard />}
                {activeTab === 'buy'   && <BuyCard />}
                {activeTab === 'sell'  && <SellCard />}
              </motion.div>
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
