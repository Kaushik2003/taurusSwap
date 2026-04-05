import algosdk from 'algosdk';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@txnlab/use-wallet-react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAlgodClient, POOL_APP_ID } from '@/hooks/useAlgodClient';
import { rawToDisplay, displayToRaw, getTokenSymbol } from '@/lib/tokenDisplay';
import {
  addLiquidity,
  tickParamsFromDepegPrice,
  computeDepositPerToken,
  getCapitalEfficiencyForDepegPrice,
} from '@orbital-amm/sdk';
import type { PoolState } from '@orbital-amm/sdk';

const DEPEG_MIN = 0.9;
const DEPEG_MAX = 0.9999;
const DEPEG_DEFAULT = 0.99;
const PREVIEW_DEPOSIT_RAW = 1_000_000n; // 1 token — used only for step 1 efficiency preview

interface AddLiquidityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool: PoolState;
}

interface SubmitResult {
  txId: string;
  tickId: number;
  depositPerTokenRaw: bigint;
}

export function AddLiquidityModal({ open, onOpenChange, pool }: AddLiquidityModalProps) {
  const algod = useAlgodClient();
  const queryClient = useQueryClient();
  const { activeAddress, signTransactions } = useWallet();

  // Step
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — depeg price
  const [depegPrice, setDepegPrice] = useState(DEPEG_DEFAULT);
  const [depegInput, setDepegInput] = useState(DEPEG_DEFAULT.toFixed(4));
  const [previewR, setPreviewR] = useState<bigint | null>(null);
  const [previewEfficiency, setPreviewEfficiency] = useState<number | null>(null);

  // Step 2 — deposit amount + derived
  const [depositInput, setDepositInput] = useState('');
  const [depositRaw, setDepositRaw] = useState<bigint | null>(null);
  const [computedR, setComputedR] = useState<bigint | null>(null);
  const [computedK, setComputedK] = useState<bigint | null>(null);
  const [computedDepositPerToken, setComputedDepositPerToken] = useState<bigint | null>(null);
  const [totalCostRaw, setTotalCostRaw] = useState<bigint | null>(null);
  const [liveEfficiency, setLiveEfficiency] = useState<number | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  // Reset all state when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setDepegPrice(DEPEG_DEFAULT);
      setDepegInput(DEPEG_DEFAULT.toFixed(4));
      setPreviewR(null);
      setPreviewEfficiency(null);
      setDepositInput('');
      setDepositRaw(null);
      setComputedR(null);
      setComputedK(null);
      setComputedDepositPerToken(null);
      setTotalCostRaw(null);
      setLiveEfficiency(null);
      setSubmitting(false);
      setSubmitError(null);
      setSubmitResult(null);
    }
  }, [open]);

  // Step 1: recompute efficiency preview when depegPrice changes
  useEffect(() => {
    try {
      const { r } = tickParamsFromDepegPrice(
        depegPrice,
        PREVIEW_DEPOSIT_RAW,
        pool.n,
        pool.sqrtN,
        pool.invSqrtN,
      );
      setPreviewR(r);
      const { efficiency } = getCapitalEfficiencyForDepegPrice(pool, depegPrice, r);
      setPreviewEfficiency(efficiency);
    } catch {
      setPreviewR(null);
      setPreviewEfficiency(null);
    }
  }, [depegPrice, pool]);

  // Step 2: recompute derived values when depositInput or depegPrice changes
  useEffect(() => {
    const raw = displayToRaw(depositInput);
    setDepositRaw(raw);
    if (!raw || raw <= 0n) {
      setComputedR(null);
      setComputedK(null);
      setComputedDepositPerToken(null);
      setTotalCostRaw(null);
      setLiveEfficiency(null);
      return;
    }
    try {
      const { r, k } = tickParamsFromDepegPrice(depegPrice, raw, pool.n, pool.sqrtN, pool.invSqrtN);
      const depositPerToken = computeDepositPerToken(r, k, pool.n, pool.sqrtN, pool.invSqrtN);
      const totalCost = depositPerToken * BigInt(pool.n);
      const { efficiency } = getCapitalEfficiencyForDepegPrice(pool, depegPrice, r);
      setComputedR(r);
      setComputedK(k);
      setComputedDepositPerToken(depositPerToken);
      setTotalCostRaw(totalCost);
      setLiveEfficiency(efficiency);
    } catch {
      setComputedR(null);
      setComputedK(null);
      setComputedDepositPerToken(null);
      setTotalCostRaw(null);
      setLiveEfficiency(null);
    }
  }, [depositInput, depegPrice, pool]);

  const handleDepegSlider = (vals: number[]) => {
    const v = vals[0];
    setDepegPrice(v);
    setDepegInput(v.toFixed(4));
  };

  const handleDepegInputBlur = () => {
    const parsed = parseFloat(depegInput);
    if (isNaN(parsed)) {
      setDepegInput(depegPrice.toFixed(4));
      return;
    }
    const clamped = Math.min(DEPEG_MAX, Math.max(DEPEG_MIN, parsed));
    setDepegPrice(clamped);
    setDepegInput(clamped.toFixed(4));
  };

  const step2Valid =
    computedR !== null &&
    computedK !== null &&
    computedDepositPerToken !== null &&
    computedDepositPerToken > 0n;

  const handleAddLiquidity = async () => {
    if (!activeAddress || !signTransactions || !computedR || !computedK) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await addLiquidity({
        client: algod,
        poolAppId: POOL_APP_ID,
        sender: activeAddress,
        r: computedR,
        k: computedK,
        signer: async (txns) => {
          const encoded = txns.map(t => algosdk.encodeUnsignedTransaction(t));
          return signTransactions(encoded);
        },
      });
      setSubmitResult(result);
      queryClient.invalidateQueries({ queryKey: ['allPositions'] });
      queryClient.invalidateQueries({ queryKey: ['poolState'] });
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const efficiencyDisplay = liveEfficiency ?? previewEfficiency;
  const token0Symbol = getTokenSymbol(pool, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Liquidity</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {([1, 2, 3] as const).map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : step > s
                    ? 'bg-primary/30 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {idx < 2 && <span className="text-muted-foreground text-xs">→</span>}
            </div>
          ))}
        </div>

        {/* ── Step 1 — Depeg Price ──────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Depeg price protection</p>
              <p className="text-xs text-muted-foreground mb-4">
                Set the price at which your position starts providing liquidity. Tighter = higher capital efficiency.
              </p>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-muted-foreground w-10">{DEPEG_MIN.toFixed(2)}</span>
                <Slider
                  value={[depegPrice]}
                  min={DEPEG_MIN}
                  max={DEPEG_MAX}
                  step={0.0001}
                  onValueChange={handleDepegSlider}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-12 text-right">{DEPEG_MAX.toFixed(4)}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-muted-foreground">Depeg at $</span>
                  <Input
                    type="number"
                    value={depegInput}
                    onChange={e => setDepegInput(e.target.value)}
                    onBlur={handleDepegInputBlur}
                    className="w-28 h-8 text-sm"
                    step={0.001}
                    min={DEPEG_MIN}
                    max={DEPEG_MAX}
                  />
                </div>
                {efficiencyDisplay !== null && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Capital efficiency</p>
                    <p className="text-sm font-bold text-primary">~{efficiencyDisplay.toFixed(1)}×</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-3 text-xs text-muted-foreground space-y-1">
              <p>
                <span className="text-foreground font-medium">$0.90</span> — wide protection, low efficiency
              </p>
              <p>
                <span className="text-foreground font-medium">$0.99</span> — tight protection, high efficiency
              </p>
              <p>
                <span className="text-foreground font-medium">$0.9999</span> — ultra-tight, maximum efficiency
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2 — Deposit Amount ───────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Deposit amount per token</p>
              <p className="text-xs text-muted-foreground mb-3">
                Each of the {pool.n} tokens receives this amount. Your full deposit = amount × {pool.n}.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="100"
                  value={depositInput}
                  onChange={e => setDepositInput(e.target.value)}
                  className="text-base"
                  min="0"
                  step="1"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground font-medium shrink-0">{token0Symbol}</span>
              </div>
            </div>

            {depositInput && (
              <div className="glass-panel p-3 space-y-2">
                {step2Valid ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit per token</span>
                      <span className="text-foreground font-medium">
                        {rawToDisplay(computedDepositPerToken!)} {token0Symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total deposit ({pool.n} tokens)</span>
                      <span className="text-foreground font-medium">
                        {rawToDisplay(totalCostRaw!)}
                      </span>
                    </div>
                    {liveEfficiency !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capital efficiency</span>
                        <span className="text-primary font-bold">~{liveEfficiency.toFixed(1)}×</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-destructive">
                    Amount too small or invalid. Minimum ~0.001 {token0Symbol} per token.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3 — Confirm ─────────────────────────────────────── */}
        {step === 3 && !submitResult && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Confirm position</p>
            <div className="glass-panel p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Depeg price</span>
                <span className="text-foreground font-medium">${depegPrice.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capital efficiency</span>
                <span className="text-primary font-bold">
                  ~{efficiencyDisplay !== null ? efficiencyDisplay.toFixed(1) : '—'}×
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Per token</span>
                <span className="text-foreground font-medium">
                  {computedDepositPerToken ? rawToDisplay(computedDepositPerToken) : '—'} {token0Symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-border/30 pt-3">
                <span className="text-muted-foreground font-semibold">Total deposit</span>
                <span className="text-foreground font-bold">
                  {totalCostRaw ? rawToDisplay(totalCostRaw) : '—'} across {pool.n} tokens
                </span>
              </div>
            </div>

            {submitError && (
              <div className="glass-panel p-3 text-xs text-destructive break-all">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* ── Success ──────────────────────────────────────────────── */}
        {step === 3 && submitResult && (
          <div className="space-y-3 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <span className="text-success text-xl">✓</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Liquidity added!</p>
            <div className="glass-panel p-3 text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tick ID</span>
                <span className="text-foreground font-medium">#{submitResult.tickId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit per token</span>
                <span className="text-foreground font-medium">
                  {rawToDisplay(submitResult.depositPerTokenRaw)} {token0Symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TX</span>
                <span className="font-mono text-foreground">{submitResult.txId.slice(0, 12)}…</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 mt-2">
          {/* Step 1 */}
          {step === 1 && (
            <Button className="w-full rounded-2xl" onClick={() => setStep(2)}>
              Next →
            </Button>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <Button variant="outline" className="rounded-2xl" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button
                className="flex-1 rounded-2xl"
                onClick={() => setStep(3)}
                disabled={!step2Valid}
              >
                Review →
              </Button>
            </>
          )}

          {/* Step 3 — not yet submitted */}
          {step === 3 && !submitResult && (
            <>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setStep(2)}
                disabled={submitting}
              >
                ← Back
              </Button>
              <Button
                className="flex-1 rounded-2xl"
                onClick={handleAddLiquidity}
                disabled={submitting || !activeAddress}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding liquidity…</>
                ) : (
                  'Add Liquidity'
                )}
              </Button>
            </>
          )}

          {/* Step 3 — success */}
          {step === 3 && submitResult && (
            <Button className="w-full rounded-2xl" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
