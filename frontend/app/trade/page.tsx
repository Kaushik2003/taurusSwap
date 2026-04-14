"use client";
import { useState } from 'react';
import FloatingOrbs from '../../components/landing/FloatingOrbs';
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

export default function TradePage() {
  const [activeTab, setActiveTab] = useState<Tab>('swap');

  return (
    <div className="relative min-h-screen overflow-hidden bg-green">
      <FloatingOrbs />

      <div className="relative z-10 flex flex-col items-center px-4">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 mt-20 lg:mt-36 mb-16 px-4 lg:px-12 xl:px-20">

          <div className="w-full max-w-[500px] flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
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

            {/* Card */}
            {activeTab === 'swap'  && <SwapCard />}
            {activeTab === 'limit' && <LimitCard />}
            {activeTab === 'buy'   && <BuyCard />}
            {activeTab === 'sell'  && <SellCard />}
          </div>

        </div>
      </div>
    </div>
  );
}
