'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { FAUCET_TOKENS, TokenMeta } from '@/lib/tokens';
import TokenSelector from './TokenSelector';
import StatusCard, { FaucetStatus } from './StatusCard';
import { Loader, Zap } from './icons';

const ALGO_ADDRESS_RE = /^[A-Z2-7]{58}$/;

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function FaucetForm() {
  const { activeAddress } = useWallet();

  const [token, setToken] = useState<TokenMeta>(FAUCET_TOKENS[0]);
  const [amount, setAmount] = useState<string>('10');
  const [wallet, setWallet] = useState<string>('');
  const [status, setStatus] = useState<FaucetStatus>({ type: 'idle' });

  // Auto-fill the wallet address field when a wallet is connected.
  useEffect(() => {
    if (activeAddress) setWallet(activeAddress);
  }, [activeAddress]);

  const isValidWallet = ALGO_ADDRESS_RE.test(wallet.trim());
  const amountNum = parseFloat(amount);
  const isValidAmount =
    !isNaN(amountNum) && amountNum >= 1 && amountNum <= token.dailyLimit && Number.isFinite(amountNum);

  const canSubmit = isValidWallet && isValidAmount && status.type !== 'loading';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      setStatus({ type: 'loading' });

      try {
        const res = await fetch('/api/faucet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: wallet.trim(),
            assetId: token.assetId,
            amount: amountNum,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setStatus({
            type: 'success',
            txId: data.txId,
            symbol: data.symbol,
            claimed: data.claimed,
            remaining: data.remaining,
            dailyLimit: token.dailyLimit,
          });
          setAmount('10');
        } else {
          setStatus({ type: 'error', message: data.error ?? 'Something went wrong.' });
        }
      } catch {
        setStatus({ type: 'error', message: 'Network error. Please check your connection.' });
      }
    },
    [canSubmit, wallet, token, amountNum],
  );

  const handleTokenChange = (t: TokenMeta) => {
    setToken(t);
    setStatus({ type: 'idle' });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <div className="space-y-10">
        {/* Token selector */}
        <div className="space-y-3">
          <label className="block text-xs font-black uppercase tracking-widest text-dark-green/60 ml-2">
            01 — Select Asset
          </label>
          <TokenSelector value={token} onChange={handleTokenChange} />
        </div>

        {/* Amount */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <label
              htmlFor="amount"
              className="block text-xs font-black uppercase tracking-widest text-dark-green/60"
            >
              02 — Amount
            </label>
            <span className="text-[10px] font-black text-dark-green/40 uppercase tracking-widest">
              Daily Limit: {token.dailyLimit}
            </span>
          </div>
          
          <div className="relative group">
            <input
              id="amount"
              type="number"
              min={1}
              max={token.dailyLimit}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              className="w-full bg-green/5 px-6 py-5 rounded-3xl text-2xl font-black text-dark-green placeholder:text-dark-green/10 border-[2.5px] border-dark-green/20 focus:outline-none focus:border-dark-green focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black uppercase tracking-widest text-dark-green/40 pointer-events-none group-focus-within:text-dark-green transition-colors">
              {token.symbol}
            </span>
          </div>

          {/* Quick-pick Pills */}
          <div className="flex gap-3">
            {[1, 10, 50, 100].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={cn(
                  "flex-1 py-3.5 rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all border-[2.5px]",
                  amount === String(v)
                    ? 'bg-[#FFE169] text-dark-green border-dark-green shadow-[-3px_3px_0_0_var(--dark-green)]'
                    : 'bg-white text-dark-green/60 border-dark-green/10 hover:border-dark-green/30 hover:bg-green/5'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Wallet address */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <label
              htmlFor="wallet"
              className="block text-xs font-black uppercase tracking-widest text-dark-green/60"
            >
              03 — Recipient
            </label>
            {activeAddress && wallet === activeAddress && (
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600">
                Wallet Linked
              </span>
            )}
          </div>
          <div className="relative">
            <input
              id="wallet"
              type="text"
              value={wallet}
              onChange={(e) => {
                setWallet(e.target.value);
                setStatus({ type: 'idle' });
              }}
              placeholder="AAAA…AAAA"
              spellCheck={false}
              autoComplete="off"
              className={cn(
                "w-full bg-green/5 px-6 py-5 rounded-3xl font-mono text-sm text-dark-green placeholder:text-dark-green/10 border-[2.5px] transition-all focus:outline-none focus:bg-white",
                wallet && !isValidWallet 
                  ? 'border-red-500 text-red-600 bg-red-50/50' 
                  : 'border-dark-green/20 focus:border-dark-green'
              )}
            />
            {wallet && !isValidWallet && (
              <p className="mt-3 ml-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                Invalid Algorand Address
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status feedback */}
      <StatusCard status={status} />

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full relative group overflow-hidden flex items-center justify-center gap-3 py-6 bg-dark-green text-green rounded-full font-black uppercase tracking-[0.2em] shadow-[-6px_6px_0_0_rgba(159,232,112,1)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-4px_4px_0_0_rgba(159,232,112,1)] disabled:opacity-30 disabled:translate-none disabled:shadow-none transition-all active:scale-[0.98]"
        >
          {status.type === 'loading' ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current" />
              Claim {isValidAmount ? `${amountNum} ` : ''}{token.symbol}
            </>
          )}
        </button>
      </div>

      <p className="text-center text-[10px] font-black uppercase tracking-widest text-dark-green/30 leading-relaxed max-w-[80%] mx-auto">
        Testnet assets only. Monitored for rate-limit protection.
      </p>
    </form>
  );
}
