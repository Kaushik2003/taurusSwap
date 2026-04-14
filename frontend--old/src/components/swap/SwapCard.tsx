import { useState, useMemo, useEffect } from 'react';
import { ArrowDownUp, ChevronDown, Settings, Info, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useWallet } from '@txnlab/use-wallet-react';
import { usePoolState } from '@/hooks/usePoolState';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import {
  displayToRaw,
  rawToDisplay,
  getTokenSymbol,
  getTokenColor,
  formatRawAsUSD,
} from '@/lib/tokenDisplay';
import { executeSwap } from '@orbital-amm/sdk';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '@/utils/network/getAlgoClientConfigs';
import { POOL_APP_ID } from '@/hooks/useAlgodClient';


export default function SwapCard() {
  const { activeAddress, signTransactions } = useWallet();
  const isWalletConnected = !!activeAddress;
  const { toggleWalletModal } = useAppStore();

  const { data: pool, isLoading: poolLoading, error: poolError } = usePoolState();

  const [sellIdx, setSellIdx] = useState(0);
  const [buyIdx, setBuyIdx] = useState(1);
  const [sellAmount, setSellAmount] = useState('');
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
    <div className="w-full max-w-[480px] mx-auto">
      <div className="p-1.5 rounded-3xl" style={{ background: '#084734', boxShadow: '0 20px 40px rgba(8,71,52,0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-sm font-bold text-[#CEF17B]">Swap</span>
          <div className="flex items-center gap-2">
            {poolLoading && <Loader2 className="w-3 h-3 text-[#CEF17B]/40 animate-spin" />}
            <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg text-[#CEF17B]/60 hover:text-[#CEF17B] transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pool error */}
        {poolError && (
          <div className="mx-3 mb-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold">
            Failed to load pool: {poolError.message}
          </div>
        )}

        {/* Slippage settings */}
        {showSettings && (
          <div className="mx-3 mb-2 p-3 rounded-xl bg-black/20 animate-scale-in">
            <p className="text-xs text-[#CEF17B]/60 mb-2 font-bold">Max slippage</p>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0].map(v => (
                <button
                  key={v}
                  onClick={() => setSlippage(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${slippage === v ? 'bg-[#CEF17B] text-[#084734]' : 'bg-white/10 text-[#CEF17B]/60 hover:text-[#CEF17B]'}`}
                >
                  {v}%
                </button>
              ))}
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/10 text-xs text-[#CEF17B]">
                <input
                  type="number"
                  value={slippage}
                  onChange={e => setSlippage(parseFloat(e.target.value) || 0)}
                  className="w-12 bg-transparent text-[#CEF17B] outline-none text-right font-bold"
                  step={0.1}
                />
                <span className="text-[#CEF17B]/40">%</span>
              </div>
            </div>
          </div>
        )}

        {/* Token selector dropdown */}
        {selectorFor && pool && (
          <div className="mx-3 mb-2 p-2 rounded-xl bg-black/30">
            <p className="text-xs text-[#CEF17B]/60 font-bold mb-1">Select token</p>
            <div className="flex flex-wrap gap-2">
              {tokenOptions.map(i => (
                <button
                  key={i}
                  onClick={() => {
                    if (selectorFor === 'sell') setSellIdx(i);
                    else setBuyIdx(i);
                    setSelectorFor(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#CEF17B]/10 hover:bg-[#CEF17B]/20 transition-colors"
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: getTokenColor(i) }} />
                  <span className="text-xs font-bold text-[#CEF17B]">{getTokenSymbol(pool, i)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sell panel */}
        <div className="mx-1.5 p-4 rounded-2xl bg-black/20 group hover:bg-black/25 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#CEF17B]/60 font-bold">Sell</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={sellAmount}
              onChange={e => setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-black text-[#CEF17B] outline-none placeholder:text-[#CEF17B]/20 min-w-0"
            />
            <button
              onClick={() => setSelectorFor(selectorFor === 'sell' ? null : 'sell')}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#CEF17B]/10 hover:bg-[#CEF17B]/15 transition-colors shrink-0"
            >
              <div className="w-6 h-6 rounded-full" style={{ background: getTokenColor(sellIdx) }} />
              <span className="text-sm font-bold text-[#CEF17B]">{pool ? getTokenSymbol(pool, sellIdx) : '...'}</span>
              <ChevronDown className="w-3 h-3 text-[#CEF17B]/40" />
            </button>
          </div>
          {sellAmount && amountInRaw > 0n && (
            <p className="text-xs text-[#CEF17B]/40 mt-1 font-bold">{formatRawAsUSD(amountInRaw)}</p>
          )}
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={flipTokens}
            className="w-10 h-10 rounded-xl bg-[#084734] border-4 border-[#084734] flex items-center justify-center hover:scale-105 transition-all shadow-xl"
            style={{ backgroundImage: 'linear-gradient(rgba(206,241,123,0.1), rgba(206,241,123,0.1))' }}
          >
            <ArrowDownUp className="w-4 h-4 text-[#CEF17B]" />
          </button>
        </div>

        {/* Buy panel */}
        <div className="mx-1.5 p-4 rounded-2xl bg-black/20 group hover:bg-black/25 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#CEF17B]/60 font-bold">Buy</span>
            {quoteFetching && <Loader2 className="w-3 h-3 text-[#CEF17B]/40 animate-spin" />}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={buyAmountDisplay}
              readOnly
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-black text-[#CEF17B] outline-none placeholder:text-[#CEF17B]/20 min-w-0"
            />
            <button
              onClick={() => setSelectorFor(selectorFor === 'buy' ? null : 'buy')}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#CEF17B]/10 hover:bg-[#CEF17B]/15 transition-colors shrink-0"
            >
              <div className="w-6 h-6 rounded-full" style={{ background: getTokenColor(buyIdx) }} />
              <span className="text-sm font-bold text-[#CEF17B]">{pool ? getTokenSymbol(pool, buyIdx) : '...'}</span>
              <ChevronDown className="w-3 h-3 text-[#CEF17B]/40" />
            </button>
          </div>
          {quote && (
            <p className="text-xs text-[#CEF17B]/40 mt-1 font-bold">{formatRawAsUSD(quote.amountOut)}</p>
          )}
        </div>

        {/* Quote details */}
        {quote && (
          <div className="mx-1.5 mt-2 p-3 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[#CEF17B]/60">
              <span className="flex items-center gap-1 font-bold"><Info className="w-3 h-3" /> Rate</span>
              <span className="font-bold text-[#CEF17B]">
                1 {pool ? getTokenSymbol(pool, sellIdx) : ''} = {exchangeRate?.toFixed(6)} {pool ? getTokenSymbol(pool, buyIdx) : ''}
              </span>
            </div>
            <div className="flex justify-between text-[#CEF17B]/60 font-bold">
              <span>Price impact</span>
              <span className={Number(priceImpactPct) > 5 ? 'text-red-400' : Number(priceImpactPct) > 1 ? 'text-yellow-400' : 'text-emerald-400'}>
                {priceImpactPct}%
              </span>
            </div>
            <div className="flex justify-between text-[#CEF17B]/60 font-bold">
              <span>Fee ({Number(pool?.feeBps ?? 30n) / 100}%)</span>
              <span className="text-[#CEF17B]">{formatRawAsUSD(amountInRaw * (pool?.feeBps ?? 30n) / 10_000n)}</span>
            </div>
            <div className="flex justify-between text-[#CEF17B]/60 font-bold">
              <span>Min. received ({slippage}% slippage)</span>
              <span className="text-[#CEF17B]">{minReceived !== null ? rawToDisplay(minReceived > 0n ? minReceived : 0n) : '—'} {pool ? getTokenSymbol(pool, buyIdx) : ''}</span>
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
        <div className="p-1.5 pt-2">
          {!isWalletConnected ? (
            <button
              onClick={() => toggleWalletModal(true)}
              className="w-full rounded-2xl h-14 text-base font-black bg-[#CEF17B] text-[#084734] hover:scale-[1.01] transition-all"
            >
              Connect Wallet
            </button>
          ) : !sellAmount || amountInRaw === 0n ? (
            <button
              disabled
              className="w-full rounded-2xl h-14 text-base font-black bg-[#CEF17B]/20 text-[#CEF17B]/40 cursor-not-allowed"
            >
              Enter an amount
            </button>
          ) : !quote ? (
            <button
              disabled
              className="w-full rounded-2xl h-14 text-base font-black bg-[#CEF17B]/20 text-[#CEF17B]/40 cursor-not-allowed flex items-center justify-center gap-2"
            >
              {quoteFetching ? <><Loader2 className="w-4 h-4 animate-spin" />Getting quote…</> : 'Enter an amount'}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={swapping}
              className="w-full rounded-2xl h-14 text-base font-black bg-[#CEF17B] text-[#084734] hover:scale-[1.01] transition-all shadow-lg disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {swapping ? <><Loader2 className="w-4 h-4 animate-spin" />Swapping…</> : 'Swap'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
