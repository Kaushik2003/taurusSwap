"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TaurusClient } from "@taurusswap/sdk";
import { TOKENS, TokenInfo } from "../hooks/useTaurus";
import SdkCallPanel from "./SdkCallPanel";
import type { SdkCallStatus } from "./SdkCallPanel";
import {
  ArrowDownUp, RefreshCw, AlertTriangle, CheckCircle2,
  ExternalLink, Info, Loader2,
} from "lucide-react";

interface SwapCardProps {
  client: TaurusClient | null;
  trackCall: <T>(method: string, code: string, fn: () => Promise<T>) => Promise<T>;
  wallet: any;
  prices: number[];
  executeSwap: (fromIndex: number, toIndex: number, amountIn: bigint, slippageBps: number) => Promise<string>;
  refreshWalletState: () => void;
}

export default function SwapCard({ client, trackCall, wallet, prices, executeSwap, refreshWalletState }: SwapCardProps) {
  const [fromToken, setFromToken] = useState<TokenInfo>(TOKENS[0]);
  const [toToken,   setToToken]   = useState<TokenInfo>(TOKENS[1]);
  const [amountIn,  setAmountIn]  = useState("");
  const [amountOut, setAmountOut] = useState("");

  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quote,          setQuote]          = useState<any>(null);
  const [quoteError,     setQuoteError]     = useState<string | null>(null);

  const [slippage,           setSlippage]           = useState(50);
  const [customSlippage,     setCustomSlippage]      = useState("");
  const [showCustomSlippage, setShowCustomSlippage]  = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess,    setTxSuccess]    = useState<string | null>(null);
  const [txError,      setTxError]      = useState<string | null>(null);

  // SdkCallPanel state — tracks the current quote call for display
  const [panelCode,     setPanelCode]     = useState(
    "// Enter an amount above to see a live quote\nconst quote = await client.quote({\n  fromIndex: 0,  // USDC\n  toIndex:   1,  // USDT\n  amountIn:  1_000_000n, // 1 USDC\n});"
  );
  const [panelStatus,   setPanelStatus]   = useState<SdkCallStatus>("idle");
  const [panelDuration, setPanelDuration] = useState<number | undefined>();
  const [panelError,    setPanelError]    = useState<string | undefined>();

  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSwitchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmountIn(amountOut);
    setAmountOut("");
    setQuote(null);
    setQuoteError(null);
  };

  const getBalance = (token: TokenInfo) => wallet?.balances?.[token.asaId] ?? 0n;

  const formatBalance = (raw: bigint, decimals: number) =>
    (Number(raw) / 10 ** decimals).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Quote — uses shared client directly (no ephemeral TaurusClient instance)
  const fetchQuote = useCallback(async (inputVal: string, fromT: TokenInfo, toT: TokenInfo) => {
    if (!client || !inputVal || isNaN(Number(inputVal)) || Number(inputVal) <= 0) {
      setAmountOut(""); setQuote(null); setQuoteError(null);
      setPanelStatus("idle");
      return;
    }

    const rawIn = BigInt(Math.floor(Number(inputVal) * 10 ** fromT.decimals));
    const code  = `// Off-chain quote — no transaction built\nconst quote = await client.quote({\n  fromIndex: ${fromT.index},  // ${fromT.symbol}\n  toIndex:   ${toT.index},    // ${toT.symbol}\n  amountIn:  ${rawIn}n,\n});\n// quote.amountOut, quote.priceImpact, quote.ticksCrossed`;

    setPanelCode(code);
    setPanelStatus("loading");
    setPanelDuration(undefined);
    setPanelError(undefined);
    setIsLoadingQuote(true);
    setQuoteError(null);

    const t0 = Date.now();
    try {
      const q = await trackCall("client.quote", code,
        () => client.quote({ fromIndex: fromT.index, toIndex: toT.index, amountIn: rawIn }),
      );
      const duration = Date.now() - t0;
      setQuote(q);
      setAmountOut((Number(q.amountOut) / 10 ** toT.decimals).toFixed(4));
      setPanelStatus("success");
      setPanelDuration(duration);
    } catch (err: any) {
      const msg = err?.code === "SWAP_TOO_SMALL"        ? "Amount too small to route swap."
                : err?.code === "INSUFFICIENT_LIQUIDITY" ? "Insufficient liquidity for this trade size."
                : err?.message || "Failed to fetch swap quote.";
      setQuoteError(msg);
      setAmountOut("");
      setQuote(null);
      setPanelStatus("error");
      setPanelError(msg);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [client, trackCall]);

  useEffect(() => {
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    quoteTimeoutRef.current = setTimeout(() => fetchQuote(amountIn, fromToken, toToken), 500);
    return () => { if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current); };
  }, [amountIn, fromToken, toToken, fetchQuote]);

  const handleMaxAmount = () => {
    if (!wallet) return;
    setAmountIn((Number(getBalance(fromToken)) / 10 ** fromToken.decimals).toString());
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !amountIn || Number(amountIn) <= 0) return;
    setIsSubmitting(true);
    setTxSuccess(null);
    setTxError(null);
    try {
      const rawIn          = BigInt(Math.floor(Number(amountIn) * 10 ** fromToken.decimals));
      const activeSlippage = showCustomSlippage ? Math.floor(Number(customSlippage) * 100) : slippage;
      if (isNaN(activeSlippage) || activeSlippage < 0 || activeSlippage > 10_000)
        throw new Error("Invalid slippage — must be 0–100%");
      const txid = await executeSwap(fromToken.index, toToken.index, rawIn, activeSlippage);
      setTxSuccess(txid);
      setAmountIn(""); setAmountOut(""); setQuote(null);
      refreshWalletState();
    } catch (err: any) {
      setTxError(err?.message || "Transaction failed or was rejected");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBalanceExceeded = wallet
    ? getBalance(fromToken) < BigInt(Math.floor(Number(amountIn || "0") * 10 ** fromToken.decimals))
    : false;

  return (
    <div className="glass-card swap-card" style={{ padding: "1.25rem" }}>
      {/* Header */}
      <div className="flex-between mb-4">
        <h2 className="card-title text-primary">Swap Tokens</h2>
        <button
          className="refresh-btn"
          onClick={() => fetchQuote(amountIn, fromToken, toToken)}
          disabled={isLoadingQuote || !amountIn}
          title="Refresh quote"
        >
          <RefreshCw className={isLoadingQuote ? "spin" : ""} size={16} />
        </button>
      </div>

      <form onSubmit={handleSwap}>
        {/* From */}
        <div className="swap-input-container mb-3">
          <div className="flex-between mb-2">
            <span className="label-text text-dim">From</span>
            {wallet && (
              <span className="balance-text text-dim font-mono">
                Balance: {formatBalance(getBalance(fromToken), fromToken.decimals)}{" "}
                <button type="button" onClick={handleMaxAmount} className="text-primary hover-underline font-bold text-xs">MAX</button>
              </span>
            )}
          </div>
          <div className="flex-center gap-3">
            <select
              value={fromToken.index}
              onChange={e => {
                const t = TOKENS.find(x => x.index === Number(e.target.value))!;
                setFromToken(t);
                if (toToken.index === t.index) setToToken(fromToken);
              }}
              className="token-select"
            >
              {TOKENS.map(t => <option key={t.index} value={t.index}>{t.symbol}</option>)}
            </select>
            <input
              type="number" value={amountIn}
              onChange={e => setAmountIn(e.target.value)}
              placeholder="0.0" step="any"
              className="amount-input text-right font-mono" required
            />
          </div>
        </div>

        {/* Switch */}
        <div className="flex-center my-3 relative">
          <hr className="divider-line" />
          <button type="button" className="switch-btn" onClick={handleSwitchTokens} title="Switch direction">
            <ArrowDownUp size={16} className="text-secondary" />
          </button>
        </div>

        {/* To */}
        <div className="swap-input-container mb-4">
          <div className="flex-between mb-2">
            <span className="label-text text-dim">To (estimated)</span>
            {wallet && (
              <span className="balance-text text-dim font-mono">
                Balance: {formatBalance(getBalance(toToken), toToken.decimals)}
              </span>
            )}
          </div>
          <div className="flex-center gap-3">
            <select
              value={toToken.index}
              onChange={e => {
                const t = TOKENS.find(x => x.index === Number(e.target.value))!;
                setToToken(t);
                if (fromToken.index === t.index) setFromToken(toToken);
              }}
              className="token-select"
            >
              {TOKENS.map(t => <option key={t.index} value={t.index}>{t.symbol}</option>)}
            </select>
            <div className="flex-center gap-2" style={{ flex: 1, justifyContent: "flex-end" }}>
              {isLoadingQuote && <Loader2 className="spin text-dim" size={16} />}
              <input
                type="text" value={amountOut} readOnly placeholder="0.0"
                className="amount-input text-right font-mono cursor-not-allowed text-primary"
              />
            </div>
          </div>
        </div>

        {/* Slippage */}
        <div className="slippage-settings mb-4">
          <div className="flex-between mb-2">
            <span className="label-text text-dim flex-center gap-1" title="Max price movement allowed">
              Slippage Tolerance <Info size={12} />
            </span>
            <span className="slippage-display font-mono text-primary font-bold">
              {showCustomSlippage ? `${customSlippage || "0"}%` : `${slippage / 100}%`}
            </span>
          </div>
          <div className="slippage-presets flex-center gap-2">
            {[{ label: "0.1%", val: 10 }, { label: "0.5%", val: 50 }, { label: "1.0%", val: 100 }].map(o => (
              <button key={o.val} type="button"
                className={`preset-btn ${!showCustomSlippage && slippage === o.val ? "active" : ""}`}
                onClick={() => { setSlippage(o.val); setShowCustomSlippage(false); }}
              >{o.label}</button>
            ))}
            <button type="button"
              className={`preset-btn ${showCustomSlippage ? "active" : ""}`}
              onClick={() => setShowCustomSlippage(true)}
            >Custom</button>
            {showCustomSlippage && (
              <div className="custom-input-wrap flex-center gap-1 font-mono">
                <input
                  type="number" value={customSlippage}
                  onChange={e => setCustomSlippage(e.target.value)}
                  placeholder="0.5" step="0.01" min="0" max="100"
                  className="custom-slippage-input"
                />
                <span>%</span>
              </div>
            )}
          </div>
        </div>

        {/* Quote breakdown */}
        {quote && !quoteError && (
          <div className="quote-breakdown-panel glass-card p-3 mb-4 font-mono text-xs">
            <div className="flex-between py-1 border-b border-white/5">
              <span className="text-dim">Rate:</span>
              <span>1 {fromToken.symbol} = {(Number(quote.effectivePrice) || 1).toFixed(6)} {toToken.symbol}</span>
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
              <span className="text-dim">Ticks crossed:</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-primary">{quote.ticksCrossed || 0}</span>
            </div>
          </div>
        )}

        {quoteError && (
          <div className="alert alert-error mb-4 flex-center gap-2">
            <AlertTriangle size={15} /><span>{quoteError}</span>
          </div>
        )}

        {!wallet && (
          <div className="connect-wallet-tip text-center py-2 text-xs text-dim mb-2 flex-center gap-2 justify-center">
            <AlertTriangle size={12} className="text-warning" />
            Connect your wallet in the header to execute swaps
          </div>
        )}

        <button
          type="submit"
          disabled={!wallet || !amountIn || isLoadingQuote || isSubmitting || isBalanceExceeded || !!quoteError}
          className={`btn w-full flex-center gap-2 ${isBalanceExceeded ? "btn-error" : "btn-primary"}`}
        >
          {isSubmitting
            ? <><Loader2 className="spin" size={16} />Routing transaction…</>
            : isBalanceExceeded ? "Insufficient balance"
            : `Swap ${fromToken.symbol} → ${toToken.symbol}`}
        </button>
      </form>

      {/* SDK call panel — shows exactly what code runs for each quote */}
      <SdkCallPanel
        method="client.quote"
        code={panelCode}
        status={panelStatus}
        duration={panelDuration}
        error={panelError}
      />

      {txSuccess && (
        <div className="alert alert-success mt-4">
          <div className="flex gap-2">
            <CheckCircle2 size={16} className="text-emerald" />
            <div>
              <p className="font-bold">Swap completed!</p>
              <a href={`https://testnet.explorer.perawallet.app/tx/${txSuccess}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-center gap-1 text-xs text-primary hover-underline font-mono mt-1">
                View tx: {txSuccess.slice(0, 10)}…{txSuccess.slice(-8)} <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      )}

      {txError && (
        <div className="alert alert-error mt-4 flex gap-2">
          <AlertTriangle size={16} />
          <div><p className="font-bold">Transaction failed</p><p className="text-xs mt-0.5 font-mono">{txError}</p></div>
        </div>
      )}
    </div>
  );
}
