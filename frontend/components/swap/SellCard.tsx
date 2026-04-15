"use client";
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const PCT_PRESETS = ['25%', '50%', '75%', 'Max'] as const;
type PctPreset = typeof PCT_PRESETS[number];

export default function SellCard() {
  const [amount, setAmount] = useState('');
  const [activePreset, setActivePreset] = useState<PctPreset | null>(null);

  const handlePreset = (preset: PctPreset) => {
    setActivePreset(preset);
  };

  return (
    <div className="w-full max-w-[480px] mx-auto relative z-10">
      <div className="p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black text-dark-green uppercase tracking-wider">Sell</span>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all">
            <span className="text-lg">🇮🇳</span>
            <ChevronRight className="w-4 h-4 text-dark-green rotate-90" strokeWidth={3} />
          </button>
        </div>

        {/* Fiat amount display panel */}
        <div className="p-6 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] mb-3">
          <p className="text-sm font-black text-dark-green/50 uppercase tracking-wider mb-4">You&apos;re selling</p>

          <div className="flex justify-center mb-6">
            <div className="relative flex items-center justify-center w-full">
              <span className="text-6xl font-black text-dark-green/30 mr-1">$</span>
              <input
                type="text"
                value={amount}
                onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setActivePreset(null); }}
                placeholder="0"
                className="bg-transparent text-6xl font-black text-dark-green outline-none w-32 placeholder:text-dark-green/30"
              />
            </div>
          </div>

          {/* Percentage preset chips */}
          <div className="flex justify-center gap-3">
            {PCT_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => handlePreset(preset)}
                className={`px-4 py-2 rounded-full text-sm font-black border-2 border-dark-green transition-all
                  ${activePreset === preset
                    ? 'bg-dark-green text-white shadow-[-1px_1px_0_0_rgba(0,0,0,0.25)]'
                    : 'bg-white text-dark-green hover:bg-[#FFE169] shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:translate-y-[1px] hover:translate-x-[-1px]'
                  }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Token row */}
        <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:bg-[#FFE169] transition-all mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-400/30 border-2 border-dark-green flex items-center justify-center">
              <span className="text-xs font-black text-dark-green">E</span>
            </div>
            <span className="text-base font-black text-dark-green">ETH</span>
          </div>
          <ChevronRight className="w-5 h-5 text-dark-green" strokeWidth={3} />
        </button>

        {/* CTA */}
        <button
          disabled={!amount && !activePreset}
          className={`w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest border-[3px] border-dark-green transition-all
            ${(amount || activePreset)
              ? 'bg-[#FFE169] text-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)] hover:shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:bg-[#ffe88f]'
              : 'bg-gray-200 text-gray-500 border-gray-400 cursor-not-allowed'
            }`}
        >
          {(amount || activePreset) ? 'Sell Now' : 'Enter an amount'}
        </button>

      </div>
    </div>
  );
}
