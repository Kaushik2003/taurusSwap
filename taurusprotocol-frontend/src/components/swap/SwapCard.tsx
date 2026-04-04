import { useState } from 'react';
import { ArrowDownUp, ChevronDown, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/data/mock';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import TokenSelectorModal from './TokenSelectorModal';

export default function SwapCard() {
  const { isWalletConnected, connectWallet } = useAppStore();
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
      <div className="glass-panel p-1.5 glow-accent">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-sm font-medium text-foreground">Swap</span>
          <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Slippage settings */}
        {showSettings && (
          <div className="mx-3 mb-2 p-3 rounded-xl bg-secondary/50 animate-scale-in">
            <p className="text-xs text-muted-foreground mb-2">Max slippage</p>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0].map(v => (
                <button
                  key={v}
                  onClick={() => setSlippage(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${slippage === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  {v}%
                </button>
              ))}
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted text-xs">
                <input
                  type="number"
                  value={slippage}
                  onChange={e => setSlippage(parseFloat(e.target.value) || 0)}
                  className="w-12 bg-transparent text-foreground outline-none text-right"
                  step={0.1}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        )}

        {/* Sell panel */}
        <div className="mx-1.5 p-4 rounded-2xl bg-secondary/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Sell</span>
            {isWalletConnected && (
              <span className="text-xs text-muted-foreground">Balance: {(sellToken.balance || 4.284).toFixed(4)}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={sellAmount}
              onChange={e => setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-medium text-foreground outline-none placeholder:text-muted-foreground/50 min-w-0"
            />
            <button
              onClick={() => setSelectorOpen('sell')}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-muted hover:bg-muted/80 transition-colors shrink-0"
            >
              <div className="w-6 h-6 rounded-full token-icon" style={{ background: sellToken.color }}>
                <span className="text-[10px] font-bold text-primary-foreground">{sellToken.symbol[0]}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{sellToken.symbol}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          {sellAmount && <p className="text-xs text-muted-foreground mt-1">{formatCurrency(parseFloat(sellAmount) * sellToken.price)}</p>}
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={flipTokens}
            className="w-10 h-10 rounded-xl bg-secondary border-4 border-card flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowDownUp className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Buy panel */}
        <div className="mx-1.5 p-4 rounded-2xl bg-secondary/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Buy</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={buyAmount}
              readOnly
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-medium text-foreground outline-none placeholder:text-muted-foreground/50 min-w-0"
            />
            <button
              onClick={() => setSelectorOpen('buy')}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-primary/10 hover:bg-primary/15 transition-colors shrink-0 border border-primary/20"
            >
              <div className="w-6 h-6 rounded-full token-icon" style={{ background: buyToken.color }}>
                <span className="text-[10px] font-bold text-primary-foreground">{buyToken.symbol[0]}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{buyToken.symbol}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          {buyAmount && <p className="text-xs text-muted-foreground mt-1">{formatCurrency(parseFloat(buyAmount) * buyToken.price)}</p>}
        </div>

        {/* Quote details */}
        {sellAmount && parseFloat(sellAmount) > 0 && (
          <div className="mx-1.5 mt-2 p-3 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Rate</span>
              <span>1 {sellToken.symbol} = {exchangeRate.toFixed(6)} {buyToken.symbol}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Price impact</span>
              <span className="text-success">{'<0.01%'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Max slippage</span>
              <span>{slippage}%</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Network fee</span>
              <span>~$2.45</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="p-1.5 pt-2">
          {!isWalletConnected ? (
            <Button onClick={connectWallet} className="w-full rounded-2xl h-14 text-base font-semibold">
              Connect Wallet
            </Button>
          ) : !sellAmount ? (
            <Button disabled className="w-full rounded-2xl h-14 text-base font-semibold opacity-50">
              Enter an amount
            </Button>
          ) : (
            <Button className="w-full rounded-2xl h-14 text-base font-semibold">
              Swap
            </Button>
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
