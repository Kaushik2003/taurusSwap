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


export default function DummySwap() {
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
    if (!sellAmount || amountInRaw === 0n) return;
    
    setSwapping(true);
    setSwapError(null);
    setSwapTxId(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockTxId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setSwapTxId(mockTxId);
      setSellAmount('');
    } catch (e: unknown) {
      setSwapError('Swap simulation failed');
    } finally {
      setSwapping(false);
    }
  };

  const [selectorFor, setSelectorFor] = useState<'sell' | 'buy' | null>(null);

  const tokenOptions = Array.from({ length: n }, (_, i) => i).filter(
    i => i !== (selectorFor === 'sell' ? buyIdx : sellIdx),
  );

  return (
    <div className="w-full max-w-[480px] mx-auto relative z-10">
      <div className="p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-xl font-black text-dark-green uppercase tracking-widest">Swap</span>
          </div>
          <div className="flex items-center gap-2">
            {poolLoading && <Loader2 className="w-5 h-5 text-dark-green/40 animate-spin" />}
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-xl bg-white border-2 border-dark-green text-dark-green hover:bg-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all">
              <Settings className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Settings Popover and Selector Modal (remain Same) */}
        {showSettings && (
          <div className="absolute top-[70px] right-2 z-[60] w-[320px] p-5 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)] animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-black text-dark-green uppercase tracking-wider">Settings</span>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg text-dark-green/40 hover:text-dark-green hover:bg-green/10 transition-colors"
                title="Close settings"
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

        {selectorFor && pool && (
          <div className="absolute inset-x-5 top-24 bottom-24 z-[70] p-6 rounded-3xl bg-white border-[3px] border-dark-green shadow-[-12px_12px_0_0_var(--color-dark-green)] animate-scale-in flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-dark-green font-black uppercase tracking-wider">Select token</p>
              <button 
                onClick={() => setSelectorFor(null)}
                className="p-1 rounded-lg hover:bg-green/10 transition-colors"
                title="Close selector"
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
                  className="flex items-center justify-between w-full p-3 rounded-2xl bg-white border-2 border-dark-green hover:bg-[#FCA5F1] shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[1px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <img src={getTokenIcon(i)} alt={getTokenSymbol(pool, i)} className="w-8 h-8 rounded-full border-2 border-dark-green object-cover" />
                    <div className="text-left">
                      <p className="text-sm font-black text-dark-green uppercase">{getTokenSymbol(pool, i)}</p>
                      <p className="text-[10px] font-bold text-dark-green/40">Asset ID: {i}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Token panels */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-green font-black uppercase tracking-wider">Sell</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={sellAmount}
              onChange={e => setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-4xl sm:text-5xl font-black text-dark-green outline-none placeholder:text-dark-green/30 min-w-0"
            />
            <button
              onClick={() => setSelectorFor('sell')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:bg-[#FCA5F1] transition-all shrink-0"
            >
              <img src={getTokenIcon(sellIdx)} alt={pool ? getTokenSymbol(pool, sellIdx) : ''} className="w-6 h-6 rounded-full border border-black/10 object-cover" />
              <span className="text-sm font-black text-dark-green">{pool ? getTokenSymbol(pool, sellIdx) : '...'}</span>
              <ChevronDown className="w-4 h-4 text-dark-green" strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex justify-center -my-4 relative z-10">
          <button
            onClick={flipTokens}
            className="w-12 h-12 rounded-full bg-white border-2 border-dark-green flex items-center justify-center hover:bg-[#FFE169] transition-all shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] group"
          >
            <ArrowDownUp className="w-5 h-5 text-dark-green group-hover:rotate-180 transition-transform duration-300" strokeWidth={3} />
          </button>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#f8f9fa] border-2 border-dark-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] relative mt-2">
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
              onClick={() => setSelectorFor('buy')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] hover:bg-green transition-all shrink-0"
            >
              <img src={getTokenIcon(buyIdx)} alt={pool ? getTokenSymbol(pool, buyIdx) : ''} className="w-6 h-6 rounded-full border border-black/10 object-cover" />
              <span className="text-sm font-black text-dark-green">{pool ? getTokenSymbol(pool, buyIdx) : '...'}</span>
              <ChevronDown className="w-4 h-4 text-dark-green" strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => router.push('/trade')}
            className="w-full rounded-full h-16 text-lg font-black uppercase tracking-widest bg-[#FFE169] text-dark-green border-[3px] border-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)] hover:shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:bg-[#ffe88f] transition-all flex items-center justify-center"
          >
            Get Started
          </button>
        </div>




      </div>
    </div>
  );
}
