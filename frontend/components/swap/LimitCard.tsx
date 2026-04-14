"use client";
import { useState } from 'react';
import { ArrowDownUp, ArrowLeftRight, ChevronDown } from 'lucide-react';

const EXPIRY_OPTIONS = ['1 day', '1 week', '1 month', '1 year'] as const;
type Expiry = typeof EXPIRY_OPTIONS[number];

const PRICE_PRESETS = ['Market', '+1%', '+5%', '+10%'] as const;
type PricePreset = typeof PRICE_PRESETS[number];

export default function LimitCard() {
  const [limitPrice, setLimitPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [expiry, setExpiry] = useState<Expiry>('1 week');
  const [activePreset, setActivePreset] = useState<PricePreset>('Market');

  return (
    <div className="w-full max-w-[480px] mx-auto relative z-10">
      <div className="p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black text-dark-green uppercase tracking-wider">Limit</span>
        </div>

        {/* Trigger price panel */}
        <div className="p-4 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]">
          {/* "When 1 ETH is worth" row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-dark-green uppercase tracking-wider">
              <span>When</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 border-dark-green shadow-[-2px_2px_0_0_var(--color-dark-green)]">
                <div className="w-4 h-4 rounded-full bg-dark-green/20" />
                <span>ETH</span>
              </div>
              <span>is worth</span>
            </div>
            <button className="p-1.5 rounded-lg border-2 border-dark-green bg-white hover:bg-[#FFE169] transition-all shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:translate-y-[1px] hover:translate-x-[-1px]">
              <ArrowLeftRight className="w-4 h-4 text-dark-green" strokeWidth={3} />
            </button>
          </div>

          {/* Price input + USDC */}
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-4xl font-black text-dark-green outline-none placeholder:text-dark-green/30 min-w-0"
            />
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] shrink-0">
              <div className="w-5 h-5 rounded-full bg-blue-400/30" />
              <span className="text-sm font-black text-dark-green">USDC</span>
            </div>
          </div>

          {/* Preset chips */}
          <div className="flex gap-2 flex-wrap">
            {PRICE_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => setActivePreset(preset)}
                className={`px-3 py-1.5 rounded-full text-xs font-black border-2 border-dark-green transition-all
                  ${activePreset === preset
                    ? 'bg-dark-green text-white'
                    : 'bg-white text-dark-green hover:bg-[#FFE169]'
                  }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Sell panel */}
        <div className="p-4 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] mt-3">
          <span className="text-sm text-dark-green font-black uppercase tracking-wider">Sell</span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="text"
              value={sellAmount}
              onChange={e => setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-4xl font-black text-dark-green outline-none placeholder:text-dark-green/30 min-w-0"
            />
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:bg-[#FCA5F1] transition-all shrink-0">
              <div className="w-5 h-5 rounded-full bg-blue-400/40" />
              <span className="text-sm font-black text-dark-green">ETH</span>
              <ChevronDown className="w-4 h-4 text-dark-green" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-4 relative z-10">
          <button
            onClick={() => { setSellAmount(buyAmount); setBuyAmount(sellAmount); }}
            className="w-12 h-12 rounded-full bg-white border-2 border-dark-green flex items-center justify-center hover:bg-[#FFE169] transition-all shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] group"
          >
            <ArrowDownUp className="w-5 h-5 text-dark-green group-hover:rotate-180 transition-transform duration-300" strokeWidth={3} />
          </button>
        </div>

        {/* Buy panel */}
        <div className="p-4 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] mt-2">
          <span className="text-sm text-dark-green font-black uppercase tracking-wider">Buy</span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="text"
              value={buyAmount}
              onChange={e => setBuyAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-4xl font-black text-dark-green outline-none placeholder:text-dark-green/30 min-w-0"
            />
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:bg-green transition-all shrink-0">
              <div className="w-5 h-5 rounded-full bg-green/60" />
              <span className="text-sm font-black text-dark-green">USDC</span>
              <ChevronDown className="w-4 h-4 text-dark-green" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Expiry */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-black text-dark-green uppercase tracking-wider">Expiry</span>
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setExpiry(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-black border-2 border-dark-green transition-all
                  ${expiry === opt
                    ? 'bg-dark-green text-white'
                    : 'bg-white text-dark-green hover:bg-[#FFE169]'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm button */}
        <div className="mt-5">
          <button className="w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest bg-[#FFE169] text-dark-green border-[3px] border-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)] hover:shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:bg-[#ffe88f] transition-all">
            Confirm
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-[#f8f9fa] border-2 border-dark-green/20">
          <span className="text-dark-green/50 text-lg leading-none mt-0.5">⚠</span>
          <p className="text-xs text-dark-green/60 font-bold leading-relaxed">
            Limits may not execute exactly when tokens reach the specified price.{' '}
            <span className="text-dark-green underline cursor-pointer">Learn more</span>
          </p>
        </div>

      </div>
    </div>
  );
}
