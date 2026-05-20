"use client";

import { useState, useEffect, useCallback } from "react";
import { TaurusClient } from "@taurus-swap/sdk";
import { TOKENS } from "../hooks/useTaurus";
import SdkCallPanel from "./SdkCallPanel";
import type { SdkCallStatus } from "./SdkCallPanel";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, ExternalLink, Info, Award } from "lucide-react";

interface LiquidityCardProps {
  client: TaurusClient | null;
  trackCall: <T>(method: string, code: string, fn: () => Promise<T>) => Promise<T>;
  wallet: any;
  executeAddLiquidity: (depegPrice: number, depositPerTokenRaw: bigint) => Promise<{ txid: string; tickId: number; depositPerToken: bigint }>;
  refreshWalletState: () => void;
}

export default function LiquidityCard({
  client,
  trackCall,
  wallet,
  executeAddLiquidity,
  refreshWalletState,
}: LiquidityCardProps) {
  const [depegPrice,     setDepegPrice]     = useState<number>(0.99);
  const [depositAmount,  setDepositAmount]  = useState<string>("100");

  const [isLoadingEfficiency, setIsLoadingEfficiency] = useState(false);
  const [efficiencyData, setEfficiencyData] = useState<{
    r: bigint; k: bigint; efficiency: number; actualDeposit: bigint;
  } | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState<{ txid: string; tickId: number; amount: number } | null>(null);
  const [txError,   setTxError]   = useState<string | null>(null);

  // SdkCallPanel state — shows the last tickParamsFromDepegPrice call
  const [panelCode,     setPanelCode]     = useState(
    "// Adjust the slider above to preview tick parameters\nconst { r, k } = await client.tickParamsFromDepegPrice(\n  0.990,         // $0.990 depeg boundary\n  100_000_000n,  // 100 per token (6 decimals)\n);"
  );
  const [panelStatus,   setPanelStatus]   = useState<SdkCallStatus>("idle");
  const [panelDuration, setPanelDuration] = useState<number | undefined>();
  const [panelError,    setPanelError]    = useState<string | undefined>();

  const calculateParams = useCallback(async (price: number, amount: string) => {
    if (!client || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setEfficiencyData(null);
      return;
    }

    setIsLoadingEfficiency(true);
    setCalcError(null);

    const rawDeposit = BigInt(Math.floor(Number(amount) * 1e6));

    const paramsCode = `const { r, k } = await client.tickParamsFromDepegPrice(\n  ${price},           // $${price.toFixed(3)} depeg boundary\n  ${rawDeposit}n,    // ${amount} per token (6 dec)\n);`;
    setPanelCode(paramsCode);
    setPanelStatus("loading");
    setPanelDuration(undefined);
    setPanelError(undefined);

    const t0 = Date.now();
    try {
      const { r, k } = await trackCall(
        "client.tickParamsFromDepegPrice",
        paramsCode,
        () => client.tickParamsFromDepegPrice(price, rawDeposit),
      );

      const effCode = `const { efficiency, depositPerToken } =\n  await client.getCapitalEfficiency(\n    ${price},   // depeg price\n    ${r}n,      // tick radius r\n  );`;
      const { efficiency, depositPerToken } = await trackCall(
        "client.getCapitalEfficiency",
        effCode,
        () => client.getCapitalEfficiency(price, r),
      );

      setPanelStatus("success");
      setPanelDuration(Date.now() - t0);
      setEfficiencyData({ r, k, efficiency, actualDeposit: depositPerToken });
    } catch (err: any) {
      const msg = err?.message || "Failed to calculate tick metrics";
      setCalcError(msg);
      setEfficiencyData(null);
      setPanelStatus("error");
      setPanelError(msg);
    } finally {
      setIsLoadingEfficiency(false);
    }
  }, [client, trackCall]);

  useEffect(() => {
    const timer = setTimeout(() => calculateParams(depegPrice, depositAmount), 500);
    return () => clearTimeout(timer);
  }, [depegPrice, depositAmount, calculateParams]);

  const handleAddLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return;
    setIsSubmitting(true);
    setTxSuccess(null);
    setTxError(null);
    try {
      const rawDeposit = BigInt(Math.floor(Number(depositAmount) * 1e6));
      const { txid, tickId, depositPerToken } = await executeAddLiquidity(depegPrice, rawDeposit);
      setTxSuccess({ txid, tickId, amount: Number(depositPerToken) / 1e6 });
      setDepositAmount("100");
      refreshWalletState();
    } catch (err: any) {
      setTxError(err?.message || "Failed to submit transactions");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card liquidity-card">
      <div className="card-header mb-4">
        <h2 className="card-title text-primary flex-center gap-2">
          <Sparkles className="text-secondary animate-pulse" size={18} />
          Add Concentrated Liquidity
        </h2>
        <p className="card-subtitle text-dim text-xs mt-1">
          Deposit all 5 stablecoins symmetrically with custom depeg ranges to boost trading fees.
        </p>
      </div>

      <form onSubmit={handleAddLiquidity}>
        {/* Depeg boundary slider */}
        <div className="range-slider-container mb-4">
          <div className="flex-between mb-2">
            <span className="label-text text-dim flex-center gap-1" title="Tick activates when any token falls below this USD price">
              Depeg Price Boundary <Info size={12} />
            </span>
            <span className="price-bound-val font-mono text-secondary font-bold">
              ${depegPrice.toFixed(3)}
            </span>
          </div>
          <input
            type="range" min="0.950" max="0.995" step="0.005"
            value={depegPrice}
            onChange={e => setDepegPrice(Number(e.target.value))}
            className="boundary-slider"
          />
          <div className="slider-labels flex-between text-[10px] text-dim font-mono mt-1 px-1">
            <span>$0.950 (Safer / Loose)</span>
            <span>$0.995 (Aggressive / Tight)</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="swap-input-container mb-4">
          <div className="flex-between mb-2">
            <span className="label-text text-dim flex-center gap-1" title="Amount deposited for each of the 5 assets">
              Deposit Per Token <Info size={12} />
            </span>
            {wallet && (
              <span className="text-dim text-[11px]">Requires ALGO for gas &amp; tick setup</span>
            )}
          </div>
          <div className="flex-center gap-3">
            <div className="static-tokens-badge font-bold text-xs bg-white/5 py-2 px-3 rounded border border-white/10">
              5 tokens (USDC/T/D/DAI/FRX)
            </div>
            <input
              type="number" value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="100.0" step="any"
              className="amount-input text-right font-mono"
              required
            />
          </div>
        </div>

        {/* Capital Efficiency stats */}
        {efficiencyData && !calcError && (
          <div className="efficiency-metric-card glass-card p-3 mb-4 flex-column gap-3 relative overflow-hidden">
            <div className="glow-bg absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -z-10" />
            <div className="flex-between items-center">
              <div>
                <span className="text-dim text-[11px] block uppercase tracking-wider">Capital Efficiency</span>
                <span className="efficiency-multiplier font-sans text-3xl font-black text-secondary leading-none">
                  {efficiencyData.efficiency.toFixed(1)}x
                </span>
              </div>
              <div className="efficiency-badge flex-center gap-1 bg-secondary/20 border border-secondary/30 rounded-full px-3 py-1 text-xs text-secondary font-bold">
                <Award size={14} />
                Peg-Optimized
              </div>
            </div>
            <p className="text-dim text-xs font-sans">
              This position generates the same fee weight as depositing{" "}
              <strong className="text-primary font-mono">
                ${(Number(depositAmount) * efficiencyData.efficiency).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </strong>{" "}
              per token in a standard constant-product AMM.
            </p>
            <div className="divider-line my-1" />
            <div className="tick-params-grid grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="param-item">
                <span className="text-dim">Tick Radius (r):</span>
                <span className="block text-primary truncate">{efficiencyData.r.toString()}</span>
              </div>
              <div className="param-item">
                <span className="text-dim">Tick Plane (k):</span>
                <span className="block text-primary truncate">{efficiencyData.k.toString()}</span>
              </div>
            </div>
          </div>
        )}

        {isLoadingEfficiency && (
          <div className="loading-efficiency-box glass-card p-4 mb-4 flex-center gap-2 justify-center text-xs text-dim">
            <Loader2 className="spin text-secondary" size={16} />
            Recalculating AMM physics boundaries...
          </div>
        )}

        {calcError && (
          <div className="alert alert-error mb-4 flex-center gap-2">
            <AlertTriangle size={15} /><span className="text-xs font-mono">{calcError}</span>
          </div>
        )}

        {!wallet && (
          <div className="connect-wallet-tip text-center py-2 text-xs text-dim mb-2 flex-center gap-2 justify-center">
            <AlertTriangle size={12} className="text-warning" />
            Connect your wallet in the header to add liquidity
          </div>
        )}

        <button
          type="submit"
          disabled={!wallet || !depositAmount || isLoadingEfficiency || isSubmitting || !!calcError}
          className="btn btn-secondary w-full flex-center gap-2 font-bold py-3"
        >
          {isSubmitting
            ? <><Loader2 className="spin" size={16} />Assembling Concentrated Tick…</>
            : `Deposit Liquidity (${depegPrice.toFixed(3)} bound)`}
        </button>
      </form>

      {/* SDK call panel — shows tickParamsFromDepegPrice params live */}
      <SdkCallPanel
        method="client.tickParamsFromDepegPrice"
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
              <p className="font-bold">Liquidity Added!</p>
              <p className="text-xs text-dim mt-1">
                Created Tick <strong className="text-primary font-mono">#{txSuccess.tickId}</strong> — deposit{" "}
                <strong className="text-primary font-mono">${txSuccess.amount.toFixed(2)}</strong>/token
              </p>
              <a href={`https://testnet.explorer.perawallet.app/tx/${txSuccess.txid}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-center gap-1 text-xs text-primary hover-underline font-mono mt-2">
                View tx: {txSuccess.txid.slice(0, 10)}…{txSuccess.txid.slice(-8)} <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      )}

      {txError && (
        <div className="alert alert-error mt-4 flex gap-2">
          <AlertTriangle size={16} />
          <div>
            <p className="font-bold">Setup Failed</p>
            <p className="text-xs mt-0.5 font-mono">{txError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
