"use client";

import { useState, useEffect, useCallback } from "react";
import { TOKENS } from "../hooks/useTaurus";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, ExternalLink, Info, Award } from "lucide-react";

interface LiquidityCardProps {
  wallet: any;
  executeAddLiquidity: (depegPrice: number, depositPerTokenRaw: bigint) => Promise<{ txid: string; tickId: number; depositPerToken: bigint }>;
  refreshWalletState: () => void;
}

export default function LiquidityCard({
  wallet,
  executeAddLiquidity,
  refreshWalletState,
}: LiquidityCardProps) {
  const [depegPrice, setDepegPrice] = useState<number>(0.99); // boundary (default 0.99)
  const [depositAmount, setDepositAmount] = useState<string>("100"); // 100 per token
  
  const [isLoadingEfficiency, setIsLoadingEfficiency] = useState<boolean>(false);
  const [efficiencyData, setEfficiencyData] = useState<{
    r: bigint;
    k: bigint;
    efficiency: number;
    actualDeposit: bigint;
  } | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<{ txid: string; tickId: number; amount: number } | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Live calculation of tick parameters and capital efficiency
  const calculateParams = useCallback(async (price: number, amount: string) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setEfficiencyData(null);
      return;
    }

    setIsLoadingEfficiency(true);
    setCalcError(null);

    try {
      const { TaurusClient } = await import("@taurusswap/sdk");
      const client = new TaurusClient();

      const rawDeposit = BigInt(Math.floor(Number(amount) * 1e6)); // 6 decimals

      // 1. Calculate r and k parameters
      const { r, k } = await client.tickParamsFromDepegPrice(price, rawDeposit);

      // 2. Fetch capital efficiency
      const { efficiency, depositPerToken } = await client.getCapitalEfficiency(price, r);

      setEfficiencyData({
        r,
        k,
        efficiency,
        actualDeposit: depositPerToken,
      });
    } catch (err: any) {
      console.error("Efficiency calculation failed:", err);
      setCalcError(err?.message || "Failed to calculate tick metrics");
      setEfficiencyData(null);
    } finally {
      setIsLoadingEfficiency(false);
    }
  }, []);

  // Recalculate parameters when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateParams(depegPrice, depositAmount);
    }, 500);

    return () => clearTimeout(timer);
  }, [depegPrice, depositAmount, calculateParams]);

  // Execute Add Liquidity
  const handleAddLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return;

    setIsSubmitting(true);
    setTxSuccess(null);
    setTxError(null);

    try {
      const rawDeposit = BigInt(Math.floor(Number(depositAmount) * 1e6));
      
      const { txid, tickId, depositPerToken } = await executeAddLiquidity(
        depegPrice,
        rawDeposit
      );

      const humanDeposited = Number(depositPerToken) / 1e6;

      setTxSuccess({
        txid,
        tickId,
        amount: humanDeposited,
      });
      setDepositAmount("100");
      refreshWalletState();
    } catch (err: any) {
      console.error("Add liquidity execution failed:", err);
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
            <span className="label-text text-dim flex-center gap-1" title="Tick activates when any token falls below this USD price. Tighter bounds = higher yield & efficiency but higher risk of peg-out">
              Depeg Price Boundary
              <Info size={12} />
            </span>
            <span className="price-bound-val font-mono text-secondary font-bold">
              ${depegPrice.toFixed(3)}
            </span>
          </div>
          <input
            type="range"
            min="0.950"
            max="0.995"
            step="0.005"
            value={depegPrice}
            onChange={(e) => setDepegPrice(Number(e.target.value))}
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
            <span className="label-text text-dim flex-center gap-1" title="Amount of raw tokens deposited for each of the 5 assets in the pool">
              Deposit Per Token
              <Info size={12} />
            </span>
            {wallet && (
              <span className="text-dim text-[11px]">
                Requires ALGO for gas & ticks setup
              </span>
            )}
          </div>
          <div className="flex-center gap-3">
            <div className="static-tokens-badge font-bold text-xs bg-white/5 py-2 px-3 rounded border border-white/10">
              5 tokens (USDC/T/D/DAI/FRX)
            </div>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="100.0"
              step="any"
              className="amount-input text-right font-mono"
              required
            />
          </div>
        </div>

        {/* Live Capital Efficiency Stats */}
        {efficiencyData && !calcError && (
          <div className="efficiency-metric-card glass-card p-3 mb-4 flex-column gap-3 relative overflow-hidden">
            <div className="glow-bg absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -z-10"></div>
            
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
              per token in a standard constant-product AMM (e.g. Uniswap V2)!
            </p>

            <div className="divider-line my-1"></div>

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

        {/* Calc Loading State */}
        {isLoadingEfficiency && (
          <div className="loading-efficiency-box glass-card p-4 mb-4 flex-center gap-2 justify-center text-xs text-dim">
            <Loader2 className="spin text-secondary" size={16} />
            Recalculating AMM physics boundaries...
          </div>
        )}

        {/* Calculation Errors */}
        {calcError && (
          <div className="alert alert-error mb-4 flex-center gap-2">
            <AlertTriangle size={15} />
            <span className="text-xs font-mono">{calcError}</span>
          </div>
        )}

        {/* Wallet check */}
        {!wallet && (
          <div className="connect-wallet-tip text-center py-2 text-xs text-dim mb-2 flex-center gap-2 justify-center">
            <AlertTriangle size={12} className="text-warning" />
            Connect sandbox wallet in the header to add liquidity
          </div>
        )}

        <button
          type="submit"
          disabled={!wallet || !depositAmount || isLoadingEfficiency || isSubmitting || !!calcError}
          className="btn btn-secondary w-full flex-center gap-2 font-bold py-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="spin" size={16} />
              Assembling Concentrated Tick...
            </>
          ) : (
            `Deposit Liquidity (${depegPrice.toFixed(3)} bound)`
          )}
        </button>
      </form>

      {/* Success alert */}
      {txSuccess && (
        <div className="alert alert-success mt-4">
          <div className="flex gap-2">
            <CheckCircle2 size={16} className="text-emerald" />
            <div>
              <p className="font-bold">Liquidity Added successfully!</p>
              <p className="text-xs text-dim mt-1">
                Created Concentrated Tick <strong className="text-primary font-mono">#{txSuccess.tickId}</strong> with a deposit of{" "}
                <strong className="text-primary font-mono">${txSuccess.amount.toFixed(2)}</strong> per token.
              </p>
              <a
                href={`https://testnet.explorer.perawallet.app/tx/${txSuccess.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-center gap-1 text-xs text-primary hover-underline font-mono mt-2"
              >
                View tx: {txSuccess.txid.slice(0, 10)}...{txSuccess.txid.slice(-8)} <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Failure alert */}
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
