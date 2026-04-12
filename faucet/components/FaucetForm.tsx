'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { FAUCET_TOKENS, TokenMeta } from '@/lib/tokens';
import TokenSelector from './TokenSelector';
import StatusCard, { FaucetStatus } from './StatusCard';
import { Loader, Zap } from './icons';

const ALGO_ADDRESS_RE = /^[A-Z2-7]{58}$/;

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
      <div className="glass-monolith p-1">
        <div className="bg-[var(--surface-container-high)] p-6 space-y-8">
          {/* Token selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/40">
              01 // Select_Asset
            </label>
            <TokenSelector value={token} onChange={handleTokenChange} />
          </div>

          {/* Amount */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="amount"
                className="block text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/40"
              >
                02 // Amount_Entry
              </label>
              <span className="text-[10px] font-mono text-[var(--secondary)]/60 uppercase">
                Quota: {token.dailyLimit} / unit
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
                className="w-full bg-[var(--surface-container-low)] px-5 py-4 text-xl font-bold text-[var(--secondary)] placeholder:text-[var(--on-background)]/10 border-b-2 border-[var(--outline-variant)] focus:outline-none focus:border-[var(--secondary)] transition-all"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-technical uppercase tracking-widest text-[var(--on-background)]/20 pointer-events-none group-focus-within:text-[var(--secondary)]/40 transition-colors">
                {token.symbol}
              </span>
            </div>

            {/* Quick-pick Pills */}
            <div className="flex gap-2">
              {[1, 10, 50, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={`flex-1 py-2 font-mono text-[10px] tracking-tighter uppercase transition-colors border-b ${
                    amount === String(v)
                      ? 'bg-[var(--secondary)] text-[var(--on-secondary)] border-[var(--secondary)]'
                      : 'bg-[var(--surface-container-low)] text-[var(--on-background)]/40 border-[var(--outline-variant)] hover:bg-[var(--on-background)]/5'
                  }`}
                >
                  [ {v} ]
                </button>
              ))}
            </div>
          </div>

          {/* Wallet address */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="wallet"
                className="block text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/40"
              >
                03 // Recipient_Address
              </label>
              {activeAddress && wallet === activeAddress && (
                <span className="text-[10px] font-technical uppercase text-[var(--secondary)] animate-pulse">
                  Device_Linked
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
                className={`w-full bg-[var(--surface-container-low)] px-5 py-4 font-mono text-sm text-[var(--on-background)] placeholder:text-[var(--on-background)]/10 border-b-2 transition-all focus:outline-none ${
                  wallet && !isValidWallet 
                    ? 'border-[var(--error)] text-[var(--error)]' 
                    : 'border-[var(--outline-variant)] focus:border-[var(--secondary)]'
                }`}
              />
              {wallet && !isValidWallet && (
                <p className="mt-2 text-[10px] font-technical uppercase tracking-widest text-[var(--error)]">
                  Err // Invalid_Algorand_Checksum
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status feedback */}
      <StatusCard status={status} />

      {/* Submit */}
      <div className="relative group">
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full relative overflow-hidden flex items-center justify-center gap-3 py-5 bg-[var(--secondary)] text-[var(--on-secondary)] font-technical uppercase tracking-[0.2em] shadow-[0_0_0px_rgba(163,250,0,0)] hover:shadow-[0_0_30px_rgba(163,250,0,0.3)] disabled:opacity-20 disabled:grayscale disabled:shadow-none transition-all active:scale-[0.98]"
        >
          {status.type === 'loading' ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Syncing_Engine...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current" />
              Request_{isValidAmount ? `${amountNum}_` : ''}{token.symbol}
            </>
          )}
        </button>
        {/* Decorative corner accents */}
        <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[var(--secondary)] group-hover:scale-150 transition-transform" />
        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[var(--secondary)] group-hover:scale-150 transition-transform" />
      </div>

      <p className="text-center text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/20 leading-relaxed max-w-[80%] mx-auto">
        Caution: Testnet assets only. Requisition system monitored for rate-limit violations.
      </p>
    </form>
  );
}
