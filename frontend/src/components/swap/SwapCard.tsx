import { useState } from 'react';
import { ArrowDownUp, ChevronDown, Settings, Info } from 'lucide-react';
import { tokens } from '@/data/mock';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import TokenSelectorModal from './TokenSelectorModal';
import { useWallet } from '@txnlab/use-wallet-react';

export default function SwapCard() {
  const { activeAddress } = useWallet();
  const isWalletConnected = !!activeAddress;
  const { toggleWalletModal } = useAppStore();
  const [sellToken, setSellToken] = useState(tokens[0]);
  const [buyToken, setBuyToken] = useState(tokens[1]);
  const [sellAmount, setSellAmount] = useState('');
  const [selectorOpen, setSelectorOpen] = useState<'sell' | 'buy' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState(0.5);

  const buyAmount = sellAmount ? (parseFloat(sellAmount) * sellToken.price / buyToken.price).toFixed(6) : '';
  const exchangeRate = sellToken.price / buyToken.price;

  const flipTokens = () => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmount(buyAmount);
  };

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <div className="p-1.5 rounded-3xl" style={{ background: '#084734', boxShadow: '0 20px 40px rgba(8,71,52,0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-sm font-bold text-[#CEF17B]">Swap</span>
          <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg text-[#CEF17B]/60 hover:text-[#CEF17B] transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

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

        {/* Sell panel */}
        <div className="mx-1.5 p-4 rounded-2xl bg-black/20 group hover:bg-black/25 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#CEF17B]/60 font-bold">Sell</span>
            {isWalletConnected && (
              <span className="text-xs text-[#CEF17B]/60 font-bold">Balance: {(sellToken.balance || 4.284).toFixed(4)}</span>
            )}
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
              onClick={() => setSelectorOpen('sell')}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#CEF17B]/10 hover:bg-[#CEF17B]/15 transition-colors shrink-0"
            >
              <div className="w-6 h-6 rounded-full token-icon" style={{ background: sellToken.color }}>
                <span className="text-[10px] font-black text-white">{sellToken.symbol[0]}</span>
              </div>
              <span className="text-sm font-bold text-[#CEF17B]">{sellToken.symbol}</span>
              <ChevronDown className="w-3 h-3 text-[#CEF17B]/40" />
            </button>
          </div>
          {sellAmount && <p className="text-xs text-[#CEF17B]/40 mt-1 font-bold">{formatCurrency(parseFloat(sellAmount) * sellToken.price)}</p>}
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
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={buyAmount}
              readOnly
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-black text-[#CEF17B] outline-none placeholder:text-[#CEF17B]/20 min-w-0"
            />
            <button
              onClick={() => setSelectorOpen('buy')}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#CEF17B]/10 hover:bg-[#CEF17B]/15 transition-colors shrink-0"
            >
              <div className="w-6 h-6 rounded-full token-icon" style={{ background: buyToken.color }}>
                <span className="text-[10px] font-black text-white">{buyToken.symbol[0]}</span>
              </div>
              <span className="text-sm font-bold text-[#CEF17B]">{buyToken.symbol}</span>
              <ChevronDown className="w-3 h-3 text-[#CEF17B]/40" />
            </button>
          </div>
          {buyAmount && <p className="text-xs text-[#CEF17B]/40 mt-1 font-bold">{formatCurrency(parseFloat(buyAmount) * buyToken.price)}</p>}
        </div>

        {/* Quote details */}
        {sellAmount && parseFloat(sellAmount) > 0 && (
          <div className="mx-1.5 mt-2 p-3 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[#CEF17B]/60">
              <span className="flex items-center gap-1 font-bold"><Info className="w-3 h-3" /> Rate</span>
              <span className="font-bold text-[#CEF17B]">1 {sellToken.symbol} = {exchangeRate.toFixed(6)} {buyToken.symbol}</span>
            </div>
            <div className="flex justify-between text-[#CEF17B]/60 font-bold">
              <span>Price impact</span>
              <span className="text-emerald-400">{'<0.01%'}</span>
            </div>
            <div className="flex justify-between text-[#CEF17B]/60 font-bold">
              <span>Max slippage</span>
              <span className="text-[#CEF17B]">{slippage}%</span>
            </div>
            <div className="flex justify-between text-[#CEF17B]/60 font-bold">
              <span>Network fee</span>
              <span className="text-[#CEF17B]">~$2.45</span>
            </div>
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
          ) : !sellAmount ? (
            <button
              disabled
              className="w-full rounded-2xl h-14 text-base font-black bg-[#CEF17B]/20 text-[#CEF17B]/40 cursor-not-allowed"
            >
              Enter an amount
            </button>
          ) : (
            <button
              className="w-full rounded-2xl h-14 text-base font-black bg-[#CEF17B] text-[#084734] hover:scale-[1.01] transition-all shadow-lg"
            >
              Swap
            </button>
          )}
        </div>
      </div>

      {/* Token selector */}
      <TokenSelectorModal
        open={selectorOpen !== null}
        onClose={() => setSelectorOpen(null)}
        onSelect={(token) => {
          if (selectorOpen === 'sell') setSellToken(token);
          else setBuyToken(token);
          setSelectorOpen(null);
        }}
        selectedToken={selectorOpen === 'sell' ? sellToken : buyToken}
      />
    </div>
  );
}
