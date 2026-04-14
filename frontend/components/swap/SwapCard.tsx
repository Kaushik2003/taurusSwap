import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, ChevronDown, Settings, Info, Loader2, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useWallet } from '@txnlab/use-wallet-react';
import { usePoolState } from '@/hooks/usePoolState';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import {
  displayToRaw,
  rawToDisplay,
  getTokenSymbol,
  getTokenIcon,
  formatRawAsUSD,
} from '@/lib/tokenDisplay';
import { executeSwap } from '@/lib/orbital-sdk';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '@/utils/network/getAlgoClientConfigs';
import { POOL_APP_ID } from '@/hooks/useAlgodClient';


interface SwapCardProps {
  redirectTo?: string;
}

export default function SwapCard({ redirectTo }: SwapCardProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeAddress, signTransactions } = useWallet();
  const isWalletConnected = !!activeAddress;
  const { toggleWalletModal } = useAppStore();

  const { data: pool, isLoading: poolLoading, error: poolError } = usePoolState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [sellIdx, setSellIdx] = useState(0);
  const [buyIdx, setBuyIdx] = useState(1);
  const [sellAmount, setSellAmount] = useState(() => {
    const initial = searchParams?.get('sell');
    return initial ? initial.replace(/[^0-9.]/g, '') : '';
  });
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapTxId, setSwapTxId] = useState<string | null>(null);

  // Raw microunits from user input
  const amountInRaw = useMemo(() => displayToRaw(sellAmount) ?? 0n, [sellAmount]);

  const {
    data: quote,
    isFetching: quoteFetching,
    error: quoteError,
  } = useSwapQuote(pool, sellIdx, buyIdx, amountInRaw);

  const n = pool?.n ?? 5;

  // Derived display values
  const buyAmountDisplay = quote ? rawToDisplay(quote.amountOut) : '';
  const exchangeRate = quote ? (Number(quote.amountOut) / Number(amountInRaw)) : null;
  const priceImpactPct = quote ? (quote.priceImpact * 100).toFixed(3) : null;
  const minReceived = quote
    ? quote.amountOut - (quote.amountOut * BigInt(Math.round(slippage * 100))) / 10_000n
    : null;

  const flipTokens = () => {
    setSellIdx(buyIdx);
    setBuyIdx(sellIdx);
    setSellAmount(buyAmountDisplay);
  };

  // Reset tx state when inputs change
  useEffect(() => { setSwapTxId(null); setSwapError(null); }, [sellAmount, sellIdx, buyIdx]);

  const handleSwap = async () => {
    if (!quote || !activeAddress || !signTransactions) return;
    setSwapping(true);
    setSwapError(null);
    setSwapTxId(null);
    try {
      const cfg = getAlgodConfigFromViteEnvironment();
      const algod = new algosdk.Algodv2(cfg.token ?? '', cfg.server, cfg.port);
      const slippageBps = Math.round(slippage * 100);

      const { txId } = await executeSwap(
        algod,
        POOL_APP_ID,
        activeAddress,
        sellIdx,
        buyIdx,
        amountInRaw,
        slippageBps,
        async (txns) => {
          const encoded = txns.map(t => algosdk.encodeUnsignedTransaction(t));
          return signTransactions(encoded);
        },
      );
      setSwapTxId(txId);
      setSellAmount('');
    } catch (e: unknown) {
      setSwapError(e instanceof Error ? e.message : 'Swap failed');
    } finally {
      setSwapping(false);
    }
  };

  // Token selector state (simple dropdown list)
  const [selectorFor, setSelectorFor] = useState<'sell' | 'buy' | null>(null);

  const tokenOptions = Array.from({ length: n }, (_, i) => i).filter(
    i => i !== (selectorFor === 'sell' ? buyIdx : sellIdx),
  );

  return (
    <div className="w-full max-w-[480px] mx-auto relative z-10">
      <div className="p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black text-dark-green uppercase tracking-wider">Swap</span>
          <div className="flex items-center gap-2">
            {poolLoading && <Loader2 className="w-5 h-5 text-dark-green/40 animate-spin" />}
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-xl bg-white border-2 border-dark-green text-dark-green hover:bg-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all">
              <Settings className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Pool error */}
        {poolError && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-700 text-sm font-bold">
            Failed to load pool: {poolError.message}
          </div>
        )}

        {/* Settings Popover */}
        {showSettings && (
          <div className="absolute top-[70px] right-2 z-[60] w-[320px] p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)] animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-black text-dark-green uppercase tracking-wider">Settings</span>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg text-dark-green/40 hover:text-dark-green hover:bg-green/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-dark-green uppercase tracking-wider">Max slippage</span>
                  <Info className="w-3 h-3 text-dark-green/40" />
                </div>
                <div className="flex items-center gap-2 p-1 rounded-xl bg-[#C0FCFD] border-2 border-dark-green shadow-[-2px_2px_0_0_var(--color-dark-green)]">
                  <button className="px-2 py-0.5 rounded-lg bg-dark-green text-white text-[8px] font-black uppercase">Auto</button>
                  <span className="px-1 text-xs font-black text-dark-green">{slippage}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-dark-green uppercase tracking-wider">Swap deadline</span>
                  <Info className="w-3 h-3 text-dark-green/40" />
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#FFC1D9] border-2 border-dark-green shadow-[-2px_2px_0_0_var(--color-dark-green)]">
                  <span className="text-[10px] font-black text-dark-green">15 minutes</span>
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer hover:bg-green/10 p-1.5 -mx-1.5 rounded-lg transition-colors">
                <span className="text-[10px] font-black text-dark-green uppercase tracking-wider">Trade options</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-dark-green/60">Default</span>
                  <ChevronDown className="w-4 h-4 text-dark-green/60 -rotate-90" />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t-2 border-dark-green/10">
              <div className="flex gap-1.5">
                {[0.1, 0.5, 1.0].map(v => (
                  <button
                    key={v}
                    onClick={() => setSlippage(v)}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all border-2 border-dark-green ${slippage === v ? 'bg-dark-green text-white shadow-[-1px_1px_0_0_var(--color-dark-green)]' : 'bg-white text-dark-green hover:bg-green'}`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Token selector modal overlay */}
        {selectorFor && pool && (
          <div className="absolute inset-x-5 top-24 bottom-24 z-[70] p-6 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-12px_12px_0_0_var(--color-dark-green)] animate-scale-in flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-dark-green font-black uppercase tracking-wider">Select token</p>
              <button 
                onClick={() => setSelectorFor(null)}
                className="p-1 rounded-lg hover:bg-green/10 transition-colors"
              >
                <X className="w-4 h-4 text-dark-green" />
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
              {tokenOptions.map(i => (
                <button
                  key={i}
                  onClick={() => {
                    if (selectorFor === 'sell') setSellIdx(i);
                    else setBuyIdx(i);
                    setSelectorFor(null);
                  }}
                  className="flex items-center justify-between w-full p-3 rounded-2xl bg-white border-2 border-dark-green hover:bg-[#FCA5F1] shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[1px] hover:translate-x-[-1px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <img src={getTokenIcon(i)} alt={getTokenSymbol(pool, i)} className="w-8 h-8 rounded-full border-2 border-dark-green object-cover" />
                    <div className="text-left">
                      <p className="text-sm font-black text-dark-green uppercase">{getTokenSymbol(pool, i)}</p>
                      <p className="text-[10px] font-bold text-dark-green/40">Asset ID: {i}</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-dark-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="w-2 h-2 rounded-full bg-dark-green" />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t-2 border-dark-green/10 text-center">
               <p className="text-[9px] font-black text-dark-green/30 uppercase tracking-widest">More tokens available via governance</p>
            </div>
          </div>
        )}

        {/* Sell panel */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-green font-black uppercase tracking-wider">Sell</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={sellAmount}
              onChange={e => {
                const next = e.target.value.replace(/[^0-9.]/g, '');
                setSellAmount(next);
              }}
              placeholder="0"
              className="flex-1 bg-transparent text-4xl sm:text-5xl font-black text-dark-green outline-none placeholder:text-dark-green/30 min-w-0"
            />
            <button
              onClick={() => setSelectorFor(selectorFor === 'sell' ? null : 'sell')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:bg-[#FCA5F1] transition-all shrink-0"
            >
              <img src={getTokenIcon(sellIdx)} alt={pool ? getTokenSymbol(pool, sellIdx) : ''} className="w-6 h-6 rounded-full border border-black/10 object-cover" />
              <span className="text-sm font-black text-dark-green">{pool ? getTokenSymbol(pool, sellIdx) : '...'}</span>
              <ChevronDown className="w-4 h-4 text-dark-green" strokeWidth={3} />
            </button>
          </div>
          {sellAmount && amountInRaw > 0n && (
            <p className="text-sm text-dark-green/60 mt-2 font-bold">{formatRawAsUSD(amountInRaw)}</p>
          )}
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-4 relative z-10">
          <button
            onClick={flipTokens}
            className="w-12 h-12 rounded-full bg-white border-2 border-dark-green flex items-center justify-center hover:bg-[#FFE169] transition-all shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] group"
          >
            <ArrowDownUp className="w-5 h-5 text-dark-green group-hover:rotate-180 transition-transform duration-300" strokeWidth={3} />
          </button>
        </div>

        {/* Buy panel */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] relative mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-green font-black uppercase tracking-wider">Buy</span>
            {quoteFetching && <Loader2 className="w-4 h-4 text-dark-green/40 animate-spin" />}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={buyAmountDisplay}
              readOnly
              placeholder="0"
              className="flex-1 bg-transparent text-4xl sm:text-5xl font-black text-dark-green outline-none placeholder:text-dark-green/30 min-w-0"
            />
            <button
              onClick={() => setSelectorFor(selectorFor === 'buy' ? null : 'buy')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:bg-green transition-all shrink-0"
            >
              <img src={getTokenIcon(buyIdx)} alt={pool ? getTokenSymbol(pool, buyIdx) : ''} className="w-6 h-6 rounded-full border border-black/10 object-cover" />
              <span className="text-sm font-black text-dark-green">{pool ? getTokenSymbol(pool, buyIdx) : '...'}</span>
              <ChevronDown className="w-4 h-4 text-dark-green" strokeWidth={3} />
            </button>
          </div>
          {quote && (
            <p className="text-sm text-dark-green/60 mt-2 font-bold">{formatRawAsUSD(quote.amountOut)}</p>
          )}
        </div>

        {/* Quote details */}
        {quote && (
          <div className="mt-4 p-4 rounded-2xl border-[2.5px] border-dark-green bg-white space-y-2 relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between text-dark-green/80">
              <span className="flex items-center gap-1 font-black uppercase text-xs tracking-wider"><Info className="w-4 h-4" /> Rate</span>
              <span className="font-bold text-dark-green">
                1 {pool ? getTokenSymbol(pool, sellIdx) : ''} = {exchangeRate?.toFixed(6)} {pool ? getTokenSymbol(pool, buyIdx) : ''}
              </span>
            </div>
            <div className="flex justify-between text-dark-green/80 font-black uppercase text-xs tracking-wider">
              <span>Price impact</span>
              <span className={Number(priceImpactPct) > 5 ? 'text-red-500 font-black' : Number(priceImpactPct) > 1 ? 'text-yellow-600 font-black' : 'text-dark-green font-bold'}>
                {priceImpactPct}%
              </span>
            </div>
            <div className="flex justify-between text-dark-green/80 font-black uppercase text-xs tracking-wider">
              <span>Fee ({Number(pool?.feeBps ?? 30n) / 100}%)</span>
              <span className="text-dark-green font-bold">{formatRawAsUSD(amountInRaw * (pool?.feeBps ?? 30n) / 10_000n)}</span>
            </div>
            <div className="flex justify-between text-dark-green/80 font-black uppercase text-xs tracking-wider">
              <span>Min. received ({slippage}% slippage)</span>
              <span className="text-dark-green font-bold">{minReceived !== null ? rawToDisplay(minReceived > 0n ? minReceived : 0n) : '—'} {pool ? getTokenSymbol(pool, buyIdx) : ''}</span>
            </div>
          </div>
        )}

        {/* Quote error */}
        {quoteError && amountInRaw > 0n && (
          <div className="mx-3 mb-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-bold">
            Quote failed: {quoteError.message}
          </div>
        )}

        {/* Swap error */}
        {swapError && (
          <div className="mx-3 mb-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold break-all">
            {swapError}
          </div>
        )}

        {/* Success */}
        {swapTxId && (
          <div className="mx-3 mb-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold break-all">
            Swapped! TX: {swapTxId.slice(0, 12)}…
          </div>
        )}

        {/* CTA */}
        <div className="mt-5">
          {redirectTo ? (
            <button
              onClick={() => {
                if (sellAmount) {
                  router.push(`${redirectTo}?sell=${encodeURIComponent(sellAmount)}`);
                } else {
                  router.push(redirectTo);
                }
              }}
              className="w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest bg-[#FFE169] text-dark-green border-[3px] border-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)] hover:shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:bg-[#ffe88f] transition-all"
            >
              Get Started
            </button>
          ) : !mounted || !isWalletConnected ? (
            <button
              onClick={() => toggleWalletModal(true)}
              className="w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest bg-[#FFE169] text-dark-green border-[3px] border-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)] hover:shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:bg-[#ffe88f] transition-all"
            >
              Connect Wallet
            </button>
          ) : !sellAmount || amountInRaw === 0n ? (
            <button
              disabled
              className="w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest bg-gray-200 text-gray-500 border-[3px] border-gray-400 cursor-not-allowed"
            >
              Enter an amount
            </button>
          ) : !quote ? (
            <button
              disabled
              className="w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest bg-gray-200 text-gray-500 border-[3px] border-gray-400 cursor-not-allowed flex items-center justify-center gap-3"
            >
              {quoteFetching ? <><Loader2 className="w-5 h-5 animate-spin" />Getting quote…</> : 'Enter an amount'}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={swapping}
              className="w-full rounded-2xl h-16 text-lg font-black uppercase tracking-widest bg-[#FFE169] text-dark-green border-[3px] border-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)] hover:shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:bg-[#ffe88f] transition-all disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-3"
            >
              {swapping ? <><Loader2 className="w-5 h-5 animate-spin" />Swapping…</> : 'Swap Tokens'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
