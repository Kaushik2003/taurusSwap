'use client';

import { useState, useRef, useEffect } from 'react';
import { FAUCET_TOKENS, TokenMeta } from '@/lib/tokens';
import { ChevronDown } from './icons';

interface Props {
  value: TokenMeta;
  onChange: (token: TokenMeta) => void;
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
        className="flex items-center gap-3 w-full px-5 py-4 bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)] border-b-2 border-[var(--outline-variant)] transition-all focus:outline-none focus:border-[var(--secondary)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Token Icon / Swatch */}
        <div 
          className="w-8 h-8 flex items-center justify-center shrink-0 border border-[var(--outline-variant)] bg-[var(--background)]"
          aria-hidden="true"
        >
          <span
            className="w-5 h-5"
            style={{ background: value.color }}
          />
        </div>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-xs font-technical uppercase tracking-widest text-[var(--on-background)]/40 leading-none mb-1">Asset_Class</span>
          <span className="text-sm font-bold text-[var(--secondary)] leading-none tracking-tight">{value.symbol}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--on-background)]/20 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full glass-monolith shadow-2xl overflow-hidden animate-slide-up"
        >
          {FAUCET_TOKENS.map((token) => (
            <li key={token.assetId} role="option" aria-selected={token.assetId === value.assetId}>
              <button
                type="button"
                onClick={() => {
                  onChange(token);
                  setOpen(false);
                }}
                className={`flex items-center gap-4 w-full px-5 py-4 text-left transition-colors border-l-2 ${
                  token.assetId === value.assetId 
                    ? 'border-[var(--secondary)] bg-[var(--secondary)]/10' 
                    : 'border-transparent hover:bg-[var(--on-background)]/5'
                }`}
              >
                <div 
                  className="w-7 h-7 flex items-center justify-center shrink-0 border border-[var(--outline-variant)] bg-[var(--background)]"
                  aria-hidden="true"
                >
                  <span
                    className="w-4 h-4"
                    style={{ background: token.color }}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold uppercase tracking-wide leading-none ${token.assetId === value.assetId ? 'text-[var(--secondary)]' : 'text-[var(--on-background)]/80'}`}>
                    {token.symbol}
                  </span>
                  <span className="text-[10px] text-[var(--on-background)]/40 truncate mt-1">{token.name}</span>
                </div>
                <span className="ml-auto text-[10px] text-[var(--on-background)]/20 font-mono tracking-tighter shrink-0">
                  ID::{token.assetId}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
