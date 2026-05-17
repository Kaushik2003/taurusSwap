"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TOKENS, TokenInfo } from "../hooks/useTaurus";
import { ArrowDownUp, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink, Info, Loader2 } from "lucide-react";

interface SwapCardProps {
  wallet: any;
  prices: number[];
  executeSwap: (fromIndex: number, toIndex: number, amountIn: bigint, slippageBps: number) => Promise<string>;
  refreshWalletState: () => void;
}

export default function SwapCard({
  wallet,
  prices,
  executeSwap,
  refreshWalletState,
}: SwapCardProps) {
  const [fromToken, setFromToken] = useState<TokenInfo>(TOKENS[0]);
  const [toToken, setToToken] = useState<TokenInfo>(TOKENS[1]);
  const [amountIn, setAmountIn] = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("");
  
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [slippage, setSlippage] = useState<number>(50); // in basis points (50 = 0.5%)
  const [customSlippage, setCustomSlippage] = useState<string>("");
  const [showCustomSlippage, setShowCustomSlippage] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Debouncing quoting fetch
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Switch tokens
  const handleSwitchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmountIn(amountOut);
    setAmountOut("");
    setQuote(null);
    setQuoteError(null);
  };

  const getBalance = (token: TokenInfo) => {
    if (!wallet || !wallet.balances) return 0n;
    return wallet.balances[token.asaId] || 0n;
  };

  const formatBalance = (raw: bigint, decimals: number) => {
    return (Number(raw) / 10 ** decimals).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Get Quote function
  const fetchQuote = useCallback(async (inputVal: string, fromT: TokenInfo, toT: TokenInfo) => {
    if (!inputVal || isNaN(Number(inputVal)) || Number(inputVal) <= 0) {
      setAmountOut("");
      setQuote(null);
      setQuoteError(null);
      return;
    }

    setIsLoadingQuote(true);
    setQuoteError(null);

    try {
      // 1. Calculate raw big decimal in microunits (6 decimals)
      const rawIn = BigInt(Math.floor(Number(inputVal) * 10 ** fromT.decimals));
      
      // Import TaurusClient dynamically or assume client is running
      // Since our hook executes transactions, let's create a temporary client or fetch off-chain
      // To ensure no bundle compilation blocks, we'll instantiate a TaurusClient locally
      const { TaurusClient } = await import("@taurusswap/sdk");
      const client = new TaurusClient();

      const q = await client.quote({
        fromIndex: fromT.index,
        toIndex: toT.index,
        amountIn: rawIn,
      });

      setQuote(q);
      
      // Compute human readable output
      const humanOut = Number(q.amountOut) / 10 ** toT.decimals;
      setAmountOut(humanOut.toFixed(4));
    } catch (err: any) {
      console.error("Quoting error:", err);
      // Map known Taurus errors
      if (err?.message?.includes("too small") || err?.code === "SWAP_TOO_SMALL") {
        setQuoteError("Amount too small to route swap.");
      } else if (err?.message?.includes("liquidity") || err?.code === "INSUFFICIENT_LIQUIDITY") {
        setQuoteError("Insufficient liquidity for this trade size.");
      } else {
        setQuoteError(err?.message || "Failed to fetch swap quote.");
      }
      setAmountOut("");
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  // Trigger quote refresh on input change debounced
  useEffect(() => {
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);

    quoteTimeoutRef.current = setTimeout(() => {
      fetchQuote(amountIn, fromToken, toToken);
    }, 500);

    return () => {
      if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    };
  }, [amountIn, fromToken, toToken, fetchQuote]);

  // Set max balance helper
  const handleMaxAmount = () => {
    if (!wallet) return;
    const bal = getBalance(fromToken);
    const humanBal = Number(bal) / 10 ** fromToken.decimals;
    setAmountIn(humanBal.toString());
  };

  // Submit Swap Trigger
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) return;

    setIsSubmitting(true);
    setTxSuccess(null);
    setTxError(null);

    try {
      const rawIn = BigInt(Math.floor(Number(amountIn) * 10 ** fromToken.decimals));
      const activeSlippage = showCustomSlippage ? Math.floor(Number(customSlippage) * 100) : slippage;

      if (isNaN(activeSlippage) || activeSlippage < 0 || activeSlippage > 10000) {
        throw new Error("Invalid slippage. Must be between 0% and 100%");
      }

      const txid = await executeSwap(
        fromToken.index,
        toToken.index,
        rawIn,
        activeSlippage
      );

      setTxSuccess(txid);
      setAmountIn("");
      setAmountOut("");
      setQuote(null);
      refreshWalletState();
    } catch (err: any) {
      console.error("Execution error:", err);
      setTxError(err?.message || "Transaction failed or was rejected");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if balance is exceeded
  const isBalanceExceeded = wallet ? getBalance(fromToken) < BigInt(Math.floor(Number(amountIn) * 10 ** fromToken.decimals)) : false;

  return (
    <div className="glass-card swap-card">
      <div className="card-header flex-between mb-4">
        <h2 className="card-title text-primary">Swap Tokens</h2>
        <button
          className="refresh-btn"
          onClick={() => fetchQuote(amountIn, fromToken, toToken)}
          disabled={isLoadingQuote || !amountIn}
          title="Refresh Quote"
        >
          <RefreshCw className={isLoadingQuote ? "spin" : ""} size={16} />
        </button>
      </div>

      <form onSubmit={handleSwap}>
        {/* FROM Token Input */}
        <div className="swap-input-container mb-3">
          <div className="flex-between mb-2">
            <span className="label-text text-dim">From</span>
            {wallet && (
              <span className="balance-text text-dim font-mono">
                Balance: {formatBalance(getBalance(fromToken), fromToken.decimals)}{" "}
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  className="text-primary hover-underline font-bold text-xs"
                >
                  MAX
                </button>
              </span>
            )}
          </div>
          <div className="flex-center gap-3">
            <select
              value={fromToken.index}
              onChange={(e) => {
                const idx = Number(e.target.value);
                const selected = TOKENS.find((t) => t.index === idx)!;
                setFromToken(selected);
                if (toToken.index === idx) {
                  setToToken(fromToken);
                }
              }}
              className="token-select"
            >
              {TOKENS.map((t) => (
                <option key={t.index} value={t.index}>
                  {t.symbol}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              step="any"
              className="amount-input text-right font-mono"
              required
            />
          </div>
        </div>

        {/* Switch Direction Button */}
        <div className="flex-center my-3 relative">
          <hr className="divider-line" />
          <button
            type="button"
            className="switch-btn"
            onClick={handleSwitchTokens}
            title="Switch swap direction"
          >
            <ArrowDownUp size={16} className="text-secondary" />
          </button>
        </div>

        {/* TO Token Input */}
        <div className="swap-input-container mb-4">
          <div className="flex-between mb-2">
            <span className="label-text text-dim">To (Estimated)</span>
            {wallet && (
              <span className="balance-text text-dim font-mono">
                Balance: {formatBalance(getBalance(toToken), toToken.decimals)}
              </span>
            )}
          </div>
          <div className="flex-center gap-3">
            <select
              value={toToken.index}
              onChange={(e) => {
                const idx = Number(e.target.value);
                const selected = TOKENS.find((t) => t.index === idx)!;
                setToToken(selected);
                if (fromToken.index === idx) {
                  setFromToken(toToken);
                }
              }}
              className="token-select"
            >
              {TOKENS.map((t) => (
                <option key={t.index} value={t.index}>
                  {t.symbol}
                </option>
              ))}
            </select>
            <div className="amount-display-container flex-center gap-2">
              {isLoadingQuote && <Loader2 className="spin text-dim" size={16} />}
              <input
                type="text"
                value={amountOut}
                readOnly
                placeholder="0.0"
                className="amount-input text-right font-mono cursor-not-allowed text-primary"
              />
            </div>
          </div>
        </div>

        {/* Slippage Settings Toggle Panel */}
        <div className="slippage-settings mb-4">
          <div className="flex-between mb-2">
            <span className="label-text text-dim flex-center gap-1" title="Maximum price difference allowed before transaction reverts">
              Slippage Tolerance
              <Info size={12} />
            </span>
            <span className="slippage-display font-mono text-primary font-bold">
              {showCustomSlippage ? `${customSlippage || "0"}%` : `${slippage / 100}%`}
            </span>
          </div>
          <div className="slippage-presets flex-center gap-2">
            <button
              type="button"
              className={`preset-btn ${!showCustomSlippage && slippage === 10 ? "active" : ""}`}
              onClick={() => {
                setSlippage(10);
                setShowCustomSlippage(false);
              }}
            >
              0.1%
            </button>
            <button
              type="button"
              className={`preset-btn ${!showCustomSlippage && slippage === 50 ? "active" : ""}`}
              onClick={() => {
                setSlippage(50);
                setShowCustomSlippage(false);
              }}
            >
              0.5%
            </button>
            <button
              type="button"
              className={`preset-btn ${!showCustomSlippage && slippage === 100 ? "active" : ""}`}
              onClick={() => {
                setSlippage(100);
                setShowCustomSlippage(false);
              }}
            >
              1.0%
            </button>
            <button
              type="button"
              className={`preset-btn ${showCustomSlippage ? "active" : ""}`}
              onClick={() => setShowCustomSlippage(true)}
            >
              Custom
            </button>

            {showCustomSlippage && (
              <div className="custom-input-wrap flex-center gap-1 font-mono">
                <input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => setCustomSlippage(e.target.value)}
                  placeholder="0.5"
                  step="0.01"
                  min="0"
                  max="100"
                  className="custom-slippage-input"
                />
                <span>%</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Off-chain Quote Breakdown Panel */}
        {quote && !quoteError && (
          <div className="quote-breakdown-panel glass-card p-3 mb-4 font-mono text-xs">
            <div className="flex-between py-1 border-b border-white/5">
              <span className="text-dim">Rate:</span>
              <span>
                1 {fromToken.symbol} = {(Number(quote.effectivePrice) || 1).toFixed(6)} {toToken.symbol}
              </span>
            </div>
            <div className="flex-between py-1 border-b border-white/5">
              <span className="text-dim flex-center gap-1">
                Price Impact:
                {quote.priceImpact > 0.01 && <AlertTriangle size={10} className="text-warning animate-pulse" />}
              </span>
              <span className={quote.priceImpact > 0.01 ? "text-warning font-bold" : "text-emerald"}>
                {(quote.priceImpact * 100).toFixed(4)}%
              </span>
            </div>
            <div className="flex-between py-1">
              <span className="text-dim">Ticks Crossed:</span>
              <span className="badge-ticks bg-white/10 px-2 py-0.5 rounded text-[10px] text-primary">
                {quote.ticksCrossed || 0} ticks
              </span>
            </div>
          </div>
        )}

        {/* Quoting and General Errors */}
        {quoteError && (
          <div className="alert alert-error mb-4 flex-center gap-2">
            <AlertTriangle size={15} />
            <span>{quoteError}</span>
          </div>
        )}

        {/* Action Button */}
        {!wallet ? (
          <div className="connect-wallet-tip text-center py-2 text-xs text-dim mb-2 flex-center gap-2 justify-center">
            <AlertTriangle size={12} className="text-warning" />
            Connect sandbox wallet in the header to execute swaps
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!wallet || !amountIn || isLoadingQuote || isSubmitting || isBalanceExceeded || !!quoteError}
          className={`btn w-full flex-center gap-2 ${
            isBalanceExceeded ? "btn-error" : "btn-primary"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="spin" size={16} />
              Routing Transaction...
            </>
          ) : isBalanceExceeded ? (
            "Insufficient Balance"
          ) : (
            `Swap ${fromToken.symbol} to ${toToken.symbol}`
          )}
        </button>
      </form>

      {/* Transaction Success Alert */}
      {txSuccess && (
        <div className="alert alert-success mt-4">
          <div className="flex gap-2">
            <CheckCircle2 size={16} className="text-emerald" />
            <div>
              <p className="font-bold">Swap Completed!</p>
              <a
                href={`https://testnet.explorer.perawallet.app/tx/${txSuccess}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-center gap-1 text-xs text-primary hover-underline font-mono mt-1"
              >
                View tx: {txSuccess.slice(0, 10)}...{txSuccess.slice(-8)} <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Failure Alert */}
      {txError && (
        <div className="alert alert-error mt-4 flex gap-2">
          <AlertTriangle size={16} />
          <div>
            <p className="font-bold">Transaction Failed</p>
            <p className="text-xs mt-0.5 font-mono">{txError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
