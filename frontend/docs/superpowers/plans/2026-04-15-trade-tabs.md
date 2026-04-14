# Trade Tabs (Limit / Buy / Sell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Swap / Limit / Buy / Sell tab switcher above the SwapCard, with three new design-only card components (LimitCard, BuyCard, SellCard) matching the existing chunky dark-green/white/yellow design system.

**Architecture:** A tab bar rendered in `trade/page.tsx` controls `activeTab` state. Each tab value maps to a card component. `SwapCard` is unchanged. The three new cards are pure UI — no blockchain logic — built in `frontend/components/swap/`. Shared outer card shell styles are inlined (no abstraction) since YAGNI.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS v4 (via `@import "tailwindcss"`), Lucide React, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `frontend/app/trade/page.tsx` | Add tab state + tab bar UI, conditionally render card |
| Create | `frontend/components/swap/LimitCard.tsx` | Limit order UI: trigger price, presets, sell/buy inputs, expiry, confirm |
| Create | `frontend/components/swap/BuyCard.tsx` | Buy UI: fiat amount, $100/$300/$1000 presets, token selector row, CTA |
| Create | `frontend/components/swap/SellCard.tsx` | Sell UI: fiat amount, 25%/50%/75%/Max presets, token selector row, CTA |

---

### Task 1: Tab bar + routing in `trade/page.tsx`

**Files:**
- Modify: `frontend/app/trade/page.tsx`

- [ ] **Step 1: Add tab state and tab bar UI**

Replace the entire file with:

```tsx
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
```

- [ ] **Step 2: Verify the file saved cleanly** — open `frontend/app/trade/page.tsx` and confirm the content matches above.

- [ ] **Step 3: Commit (stubs not yet created — commit just the page change after cards exist)**

---

### Task 2: `LimitCard` component

**Files:**
- Create: `frontend/components/swap/LimitCard.tsx`

The Limit card mirrors Uniswap's limit UI:
- Top row: "When 1 [token] is worth [price] [token]" with swap icon
- Price input with Market / +1% / +5% / +10% preset chips
- Sell input panel + flip button + Buy input panel (same visual style as SwapCard)
- Expiry row: 1 day / 1 week / 1 month / 1 year pills
- Confirm button (yellow)
- Disclaimer note at bottom

- [ ] **Step 1: Create `frontend/components/swap/LimitCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify the file was created at `frontend/components/swap/LimitCard.tsx`.**

---

### Task 3: `BuyCard` component

**Files:**
- Create: `frontend/components/swap/BuyCard.tsx`

The Buy card shows a large fiat amount display, quick-fill preset amounts, a token row below, and a CTA button.

- [ ] **Step 1: Create `frontend/components/swap/BuyCard.tsx`**

```tsx
"use client";
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const AMOUNT_PRESETS = ['$100', '$300', '$1000'] as const;

export default function BuyCard() {
  const [amount, setAmount] = useState('');

  const displayValue = amount ? `$${amount}` : '$0';

  return (
    <div className="w-full max-w-[480px] mx-auto relative z-10">
      <div className="p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black text-dark-green uppercase tracking-wider">Buy</span>
          {/* Currency selector placeholder */}
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all">
            <span className="text-lg">🇮🇳</span>
            <ChevronRight className="w-4 h-4 text-dark-green rotate-90" strokeWidth={3} />
          </button>
        </div>

        {/* Fiat amount display panel */}
        <div className="p-6 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] mb-3">
          <p className="text-sm font-black text-dark-green/50 uppercase tracking-wider mb-4">You&apos;re buying</p>

          {/* Amount display — click to edit */}
          <div className="flex justify-center mb-6">
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="bg-transparent text-6xl font-black text-dark-green/30 outline-none text-center w-full placeholder:text-dark-green/20"
              style={{ color: amount ? 'var(--color-dark-green)' : undefined }}
            />
          </div>

          {/* Amount display overlay (formatted) */}
          {/* Preset chips */}
          <div className="flex justify-center gap-3">
            {AMOUNT_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => setAmount(preset.replace('$', ''))}
                className="px-4 py-2 rounded-full text-sm font-black border-2 border-dark-green bg-white text-dark-green hover:bg-[#FFE169] shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:translate-y-[1px] hover:translate-x-[-1px] transition-all"
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
          disabled={!amount}
          className={`w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest border-[3px] border-dark-green transition-all
            ${amount
              ? 'bg-[#FFE169] text-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)] hover:shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:bg-[#ffe88f]'
              : 'bg-gray-200 text-gray-500 border-gray-400 cursor-not-allowed'
            }`}
        >
          {amount ? 'Buy Now' : 'Enter an amount'}
        </button>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created at `frontend/components/swap/BuyCard.tsx`.**

---

### Task 4: `SellCard` component

**Files:**
- Create: `frontend/components/swap/SellCard.tsx`

The Sell card mirrors BuyCard but replaces fixed-dollar presets with percentage presets (25% / 50% / 75% / Max).

- [ ] **Step 1: Create `frontend/components/swap/SellCard.tsx`**

```tsx
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
    // No real balance logic yet — just mark active
  };

  return (
    <div className="w-full max-w-[480px] mx-auto relative z-10">
      <div className="p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black text-dark-green uppercase tracking-wider">Sell</span>
          {/* Currency selector placeholder */}
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all">
            <span className="text-lg">🇮🇳</span>
            <ChevronRight className="w-4 h-4 text-dark-green rotate-90" strokeWidth={3} />
          </button>
        </div>

        {/* Fiat amount display panel */}
        <div className="p-6 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] mb-3">
          <p className="text-sm font-black text-dark-green/50 uppercase tracking-wider mb-4">You&apos;re selling</p>

          {/* Amount input */}
          <div className="flex justify-center mb-6">
            <input
              type="text"
              value={amount}
              onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setActivePreset(null); }}
              placeholder="0"
              className="bg-transparent text-6xl font-black text-dark-green/30 outline-none text-center w-full placeholder:text-dark-green/20"
              style={{ color: amount ? 'var(--color-dark-green)' : undefined }}
            />
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
```

- [ ] **Step 2: Verify the file was created at `frontend/components/swap/SellCard.tsx`.**

---

### Task 5: Wire everything up and verify

**Files:**
- Modify: `frontend/app/trade/page.tsx` (already done in Task 1)

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && bun run dev
```

- [ ] **Step 2: Open `http://localhost:3000/trade` in the browser**

Expected: Tab bar visible above the card with Swap / Limit / Buy / Sell pills. Swap tab active by default, showing the existing SwapCard unchanged.

- [ ] **Step 3: Click each tab and verify**

- **Swap** → existing SwapCard renders (sell/buy inputs, slippage settings, flip button)
- **Limit** → LimitCard renders with trigger price panel, presets, sell/buy inputs, expiry row, confirm button, disclaimer
- **Buy** → BuyCard renders with "You're buying" label, $0 display, $100/$300/$1000 chips, ETH token row, "Enter an amount" CTA
- **Sell** → SellCard renders with "You're selling" label, $0 display, 25%/50%/75%/Max chips, ETH token row, "Enter an amount" CTA

- [ ] **Step 4: Check active tab styling** — active pill should be dark-green background with white text; inactive pills white with dark-green text, yellow hover.

- [ ] **Step 5: Commit all four files**

```bash
cd frontend && git add app/trade/page.tsx components/swap/LimitCard.tsx components/swap/BuyCard.tsx components/swap/SellCard.tsx
git commit -m "feat: add Swap/Limit/Buy/Sell tab bar with design-only Limit, Buy, Sell cards"
```
