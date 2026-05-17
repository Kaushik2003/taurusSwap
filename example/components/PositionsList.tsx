"use client";

import { useState } from "react";
import { TOKENS, TokenInfo, UserPosition } from "../hooks/useTaurus";
import { Layers, RefreshCw, Loader2, AlertTriangle, CheckCircle2, ExternalLink, Trash2, Award, Coins } from "lucide-react";

interface PositionsListProps {
  wallet: any;
  positions: UserPosition[];
  isWalletLoading: boolean;
  executeRemoveLiquidity: (tickId: number, shares: bigint) => Promise<string>;
  executeClaimFees: (tickId: number) => Promise<string>;
  refreshWalletState: () => void;
}

export default function PositionsList({
  wallet,
  positions,
  isWalletLoading,
  executeRemoveLiquidity,
  executeClaimFees,
  refreshWalletState,
}: PositionsListProps) {
  const [activeActionId, setActiveActionId] = useState<number | null>(null); // tick ID currently acting on
  const [actionType, setActionType] = useState<"claim" | "remove" | null>(null);
  
  const [removePercent, setRemovePercent] = useState<number>(100); // 100% remove default
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const getFriendlyFees = (claimableFees: bigint[]) => {
    if (!claimableFees || claimableFees.length === 0) return "No fees accrued";
    
    // Check if all are zero
    const hasFees = claimableFees.some(f => f > 0n);
    if (!hasFees) return "0.00 fees accrued";

    return TOKENS.map(t => {
      const amount = claimableFees[t.index] || 0n;
      if (amount === 0n) return null;
      return `${(Number(amount) / 10 ** t.decimals).toFixed(4)} ${t.symbol}`;
    }).filter(Boolean).join(" | ");
  };

  const getPositionDepositValue = (rawDeposit: bigint) => {
    // rawDeposit is amount per token. Since there are 5 tokens, total deposit is 5 * amount
    const perToken = Number(rawDeposit) / 1e6;
    return `$${(perToken * 5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Trigger Claim Fees operation
  const handleClaimFees = async (tickId: number) => {
    setActiveActionId(tickId);
    setActionType("claim");
    setIsSubmitting(true);
    setTxSuccess(null);
    setTxError(null);

    try {
      const txid = await executeClaimFees(tickId);
      setTxSuccess(txid);
      refreshWalletState();
    } catch (err: any) {
      console.error("Claim fees failed:", err);
      setTxError(err?.message || "Failed to claim trading fees");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Remove Liquidity operation
  const handleRemoveLiquidity = async (position: UserPosition) => {
    setActiveActionId(position.tickId);
    setActionType("remove");
    setIsSubmitting(true);
    setTxSuccess(null);
    setTxError(null);

    try {
      // Calculate shares to remove
      const sharesToRemove = BigInt(Math.floor(Number(position.shares) * (removePercent / 100)));

      if (sharesToRemove <= 0n) {
        throw new Error("Invalid remove amount selected");
      }

      const txid = await executeRemoveLiquidity(position.tickId, sharesToRemove);
      setTxSuccess(txid);
      
      // Close drawer if completely removed
      if (removePercent === 100) {
        setTimeout(() => {
          setActiveActionId(null);
          setActionType(null);
        }, 1500);
      }
      refreshWalletState();
    } catch (err: any) {
      console.error("Remove liquidity failed:", err);
      setTxError(err?.message || "Failed to remove concentrated liquidity");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!wallet) {
    return (
      <div className="glass-card positions-card text-center py-10">
        <Layers className="text-dim/30 mx-auto mb-3" size={32} />
        <h2 className="card-title text-dim">My Positions</h2>
        <p className="text-dim text-xs mt-2">
          Connect your sandbox wallet in the header to view your active liquidity positions.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card positions-card">
      <div className="card-header flex-between mb-4">
        <h2 className="card-title text-primary flex-center gap-2">
          <Layers className="text-secondary" size={18} />
          My Concentrated Positions
        </h2>
        <button
          className="refresh-btn"
          onClick={refreshWalletState}
          disabled={isWalletLoading}
          title="Refresh Positions"
        >
          <RefreshCw className={isWalletLoading ? "spin" : ""} size={16} />
        </button>
      </div>

      {isWalletLoading && positions.length === 0 ? (
        <div className="py-8 text-center text-xs text-dim">
          <Loader2 className="spin text-secondary mx-auto mb-2" size={18} />
          Polling your Algorand account state & ticks...
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-10 flex-center flex-column gap-2">
          <Coins className="text-dim/40" size={32} />
          <p className="text-dim text-xs">
            No active positions found in this address.
          </p>
          <p className="text-dim text-[11px] max-w-[280px]">
            To start earning swap fees, select a depeg boundary and add liquidity in the <strong>Add Liquidity</strong> panel.
          </p>
        </div>
      ) : (
        <div className="positions-list flex-column gap-3">
          {positions.map((pos) => {
            const isSelfAction = activeActionId === pos.tickId;
            return (
              <div key={pos.tickId} className="position-item glass-card p-4 border border-white/10 relative overflow-hidden">
                <div className="flex-between items-center mb-3">
                  <div className="flex-center gap-2.5">
                    <span className="tick-index bg-primary/20 text-primary font-mono font-bold text-xs py-0.5 px-2 rounded">
                      Tick #{pos.tickId}
                    </span>
                    <span className="price-bound font-bold text-secondary text-xs">
                      ${pos.depegPrice.toFixed(3)} Peg Bound
                    </span>
                  </div>
                  <div className="flex-center gap-2">
                    <button
                      className="btn btn-secondary px-3 py-1 text-xs"
                      onClick={() => {
                        setActiveActionId(isSelfAction && actionType === "remove" ? null : pos.tickId);
                        setActionType("remove");
                        setTxSuccess(null);
                        setTxError(null);
                      }}
                    >
                      Remove LP
                    </button>
                    <button
                      className="btn btn-primary px-3 py-1 text-xs flex-center gap-1"
                      onClick={() => handleClaimFees(pos.tickId)}
                      disabled={isSubmitting && isSelfAction}
                    >
                      {isSubmitting && isSelfAction && actionType === "claim" ? (
                        <Loader2 className="spin" size={12} />
                      ) : (
                        "Claim Fees"
                      )}
                    </button>
                  </div>
                </div>

                <div className="position-details-grid grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 text-xs font-mono">
                  <div className="detail-item">
                    <span className="text-dim block text-[10px] uppercase tracking-wider">Deposited Capital</span>
                    <span className="text-primary font-bold">{getPositionDepositValue(pos.depositPerToken)}</span>
                    <span className="text-dim text-[9px] block">(${(Number(pos.depositPerToken) / 1e6).toFixed(2)} per token)</span>
                  </div>
                  <div className="detail-item">
                    <span className="text-dim block text-[10px] uppercase tracking-wider">Your Shares</span>
                    <span className="text-primary font-bold truncate block">{pos.shares.toString()} shares</span>
                  </div>
                  <div className="detail-item col-span-2 sm:col-span-1">
                    <span className="text-dim block text-[10px] uppercase tracking-wider">Yield Performance</span>
                    <span className="text-emerald font-bold flex-center gap-1 text-[11px] leading-tight mt-0.5">
                      <Award size={12} />
                      Active / Compounding
                    </span>
                  </div>
                </div>

                {/* Accrued Fees List Row */}
                <div className="accrued-fees-shelf bg-white/5 border border-white/5 p-2 rounded text-[11px] font-mono mb-1">
                  <span className="text-dim font-sans mr-2">Claimable Fees:</span>
                  <span className="text-primary font-bold">{getFriendlyFees(pos.claimableFees)}</span>
                </div>

                {/* Local Action Sub-drawer (Remove Liquidity percentage picker) */}
                {isSelfAction && actionType === "remove" && (
                  <div className="action-subdrawer glass-card p-3 mt-3 border border-white/10 text-xs">
                    <h4 className="font-bold text-primary mb-2">Remove Liquidity share percentage</h4>
                    <div className="percent-picker flex-center gap-2 mb-3">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          className={`preset-btn py-1 px-3 flex-1 ${removePercent === pct ? "active" : ""}`}
                          onClick={() => setRemovePercent(pct)}
                        >
                          {pct === 100 ? "MAX (100%)" : `${pct}%`}
                        </button>
                      ))}
                    </div>
                    <div className="flex-between items-center">
                      <span className="text-dim font-mono text-[10px]">
                        Shares to remove:{" "}
                        <strong className="text-primary">
                          {((Number(pos.shares) * removePercent) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </strong>
                      </span>
                      <button
                        className="btn btn-error px-4 py-1 flex-center gap-1 font-bold text-xs"
                        onClick={() => handleRemoveLiquidity(pos)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="spin" size={12} />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 size={12} />
                            Confirm Liquidation
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Operation Alerts specific to this tick */}
                {isSelfAction && txSuccess && (
                  <div className="alert alert-success mt-3 font-sans">
                    <div className="flex gap-2">
                      <CheckCircle2 size={14} className="text-emerald" />
                      <div>
                        <p className="font-bold text-xs">
                          {actionType === "claim" ? "Trading Fees claimed successfully!" : "Position liquidated successfully!"}
                        </p>
                        <a
                          href={`https://testnet.explorer.perawallet.app/tx/${txSuccess}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-center gap-1 text-[10px] text-primary hover-underline font-mono mt-1"
                        >
                          View tx: {txSuccess.slice(0, 10)}...{txSuccess.slice(-8)} <ExternalLink size={8} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {isSelfAction && txError && (
                  <div className="alert alert-error mt-3 flex gap-2 font-sans text-xs">
                    <AlertTriangle size={14} />
                    <div>
                      <p className="font-bold">Transaction Failed</p>
                      <p className="text-[10px] mt-0.5 font-mono">{txError}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
