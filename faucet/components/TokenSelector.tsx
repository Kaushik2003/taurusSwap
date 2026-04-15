'use client';

import { useState, useRef, useEffect } from 'react';
import { FAUCET_TOKENS, TokenMeta } from '@/lib/tokens';
import { ChevronDown } from './icons';

interface Props {
  value: TokenMeta;
  onChange: (token: TokenMeta) => void;
}

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function TokenSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-4 w-full px-6 py-5 bg-white border-2 border-dark-green rounded-3xl transition-all focus:outline-none shadow-[-5px_5px_0_0_var(--dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-3px_3px_0_0_var(--dark-green)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Token Icon / Swatch */}
        <div 
          className="w-10 h-10 flex items-center justify-center shrink-0 border-2 border-dark-green/10 bg-white rounded-2xl shadow-sm"
          aria-hidden="true"
        >
          <div
            className="w-5 h-5 rounded-full border border-dark-green/20"
            style={{ background: value.color }}
          />
        </div>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-dark-green/40 leading-none mb-1.5">Asset Requisition</span>
          <span className="text-base font-black text-dark-green leading-none tracking-tight uppercase">{value.symbol}</span>
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-dark-green/10 flex items-center justify-center group-hover:border-dark-green/30 transition-colors">
          <ChevronDown
            className={cn("w-4 h-4 text-dark-green/40 shrink-0 transition-transform duration-300", open ? 'rotate-180' : '')}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-4 w-full bg-white rounded-3xl border-2 border-dark-green shadow-[8px_8px_0_0_var(--dark-green)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {FAUCET_TOKENS.map((token, index) => (
            <li key={token.assetId} role="option" aria-selected={token.assetId === value.assetId}>
              <button
                type="button"
                onClick={() => {
                  onChange(token);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-5 w-full px-6 py-5 text-left transition-all border-b-2 border-dark-green/5 last:border-0",
                  token.assetId === value.assetId 
                    ? 'bg-green/10' 
                    : 'hover:bg-green/5'
                )}
              >
                <div 
                  className="w-10 h-10 flex items-center justify-center shrink-0 border-2 border-dark-green/10 bg-white rounded-2xl"
                  aria-hidden="true"
                >
                  <div
                    className="w-5 h-5 rounded-full border border-dark-green/20"
                    style={{ background: token.color }}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    "text-sm font-black uppercase tracking-wide leading-none",
                    token.assetId === value.assetId ? 'text-dark-green' : 'text-dark-green/60'
                  )}>
                    {token.symbol}
                  </span>
                  <span className="text-[10px] font-bold text-dark-green/30 uppercase tracking-widest mt-1.5">{token.name}</span>
                </div>
                <div className="ml-auto flex flex-col items-end">
                  <span className="text-[9px] font-black text-dark-green/20 uppercase tracking-widest bg-dark-green/5 px-2 py-0.5 rounded-md">
                    ID #{token.assetId}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>

  );
}
