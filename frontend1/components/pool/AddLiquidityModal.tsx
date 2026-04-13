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
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { rawToDisplay, displayToRaw, getTokenSymbol } from '@/lib/tokenDisplay';
import {
  addLiquidity,
  executeSwap,
  tickParamsFromDepegPrice,
  computeDepositPerToken,
  getCapitalEfficiencyForDepegPrice,
  computeZap,
} from '@/lib/orbital-sdk';
import type { PoolState, ZapPlan } from '@/lib/orbital-sdk';

const DEPEG_MIN = 0.9;
const DEPEG_MAX = 0.9999;
const DEPEG_DEFAULT = 0.99;
const PREVIEW_DEPOSIT_RAW = 1_000_000n;
const ZAP_SLIPPAGE_BPS = 50; // 0.5% slippage on each zap swap

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

type Mode = 'simple' | 'manual';

export function AddLiquidityModal({ open, onOpenChange, pool }: AddLiquidityModalProps) {
  const algod = useAlgodClient();
  const queryClient = useQueryClient();
  const { activeAddress, signTransactions } = useWallet();
  const balances = useTokenBalances(pool.tokenAsaIds);

  // ── Shared ────────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<Mode>('simple');

  // Step 1 — depeg price
  const [depegPrice, setDepegPrice] = useState(DEPEG_DEFAULT);
  const [depegInput, setDepegInput] = useState(DEPEG_DEFAULT.toFixed(4));
  const [previewEfficiency, setPreviewEfficiency] = useState<number | null>(null);

  // ── Manual mode state ─────────────────────────────────────────────────────────
  const [depositInput, setDepositInput] = useState('');
  const [computedR, setComputedR] = useState<bigint | null>(null);
  const [computedK, setComputedK] = useState<bigint | null>(null);
  const [computedDepositPerToken, setComputedDepositPerToken] = useState<bigint | null>(null);
  const [totalCostRaw, setTotalCostRaw] = useState<bigint | null>(null);
  const [liveEfficiency, setLiveEfficiency] = useState<number | null>(null);

  // ── Simple (zap) mode state ───────────────────────────────────────────────────
  const [sourceTokenIdx, setSourceTokenIdx] = useState(0);
  const [simpleInput, setSimpleInput] = useState('');
  const [zapPlan, setZapPlan] = useState<ZapPlan | null>(null);
  const [zapError, setZapError] = useState<string | null>(null);
  const [zapR, setZapR] = useState<bigint | null>(null);
  const [zapK, setZapK] = useState<bigint | null>(null);

  // ── Submission ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  // ── Reset on close ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setStep(1);
      setMode('simple');
      setDepegPrice(DEPEG_DEFAULT);
      setDepegInput(DEPEG_DEFAULT.toFixed(4));
      setPreviewEfficiency(null);
      setDepositInput('');
      setComputedR(null);
      setComputedK(null);
      setComputedDepositPerToken(null);
      setTotalCostRaw(null);
      setLiveEfficiency(null);
      setSourceTokenIdx(0);
      setSimpleInput('');
      setZapPlan(null);
      setZapError(null);
      setZapR(null);
      setZapK(null);
      setSubmitting(false);
      setSubmittingStep(null);
      setSubmitError(null);
      setSubmitResult(null);
    }
  }, [open]);

  // ── Step 1: efficiency preview ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const { r } = tickParamsFromDepegPrice(
        depegPrice,
        PREVIEW_DEPOSIT_RAW,
        pool.n,
        pool.sqrtN,
        pool.invSqrtN,
      );
      const { efficiency } = getCapitalEfficiencyForDepegPrice(pool, depegPrice, r);
      setPreviewEfficiency(efficiency);
    } catch {
      setPreviewEfficiency(null);
    }
  }, [depegPrice, pool]);

  // ── Manual mode: recompute on input change ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'manual') return;
    const raw = displayToRaw(depositInput);
    if (!raw || raw <= 0n) {
      setComputedR(null); setComputedK(null);
      setComputedDepositPerToken(null); setTotalCostRaw(null); setLiveEfficiency(null);
      return;
    }
    try {
      const { r, k } = tickParamsFromDepegPrice(depegPrice, raw, pool.n, pool.sqrtN, pool.invSqrtN);
      const depPerToken = computeDepositPerToken(r, k, pool.n, pool.sqrtN, pool.invSqrtN);
      const { efficiency } = getCapitalEfficiencyForDepegPrice(pool, depegPrice, r);
      setComputedR(r); setComputedK(k);
      setComputedDepositPerToken(depPerToken);
      setTotalCostRaw(depPerToken * BigInt(pool.n));
      setLiveEfficiency(efficiency);
    } catch {
      setComputedR(null); setComputedK(null);
      setComputedDepositPerToken(null); setTotalCostRaw(null); setLiveEfficiency(null);
    }
  }, [depositInput, depegPrice, pool, mode]);

  // ── Simple mode: compute zap plan on input change ─────────────────────────────
  useEffect(() => {
    if (mode !== 'simple') return;
    const raw = displayToRaw(simpleInput);
    if (!raw || raw <= 0n) {
      setZapPlan(null); setZapError(null); setZapR(null); setZapK(null);
      return;
    }
    try {
      const plan = computeZap(pool, sourceTokenIdx, raw);
      setZapPlan(plan);
      setZapError(null);
      const { r, k } = tickParamsFromDepegPrice(
        depegPrice, plan.depositPerToken, pool.n, pool.sqrtN, pool.invSqrtN,
      );
      setZapR(r);
      setZapK(k);
    } catch (e) {
      setZapPlan(null);
      setZapError(e instanceof Error ? e.message : 'Could not compute zap');
      setZapR(null); setZapK(null);
    }
  }, [simpleInput, sourceTokenIdx, depegPrice, pool, mode]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const efficiencyDisplay = liveEfficiency ?? previewEfficiency;
  const token0Symbol = getTokenSymbol(pool, 0);

  const manualStep2Valid =
    computedR !== null && computedK !== null &&
    computedDepositPerToken !== null && computedDepositPerToken > 0n;

  const simpleStep2Valid = zapPlan !== null && zapR !== null && zapK !== null;
  const step2Valid = mode === 'manual' ? manualStep2Valid : simpleStep2Valid;

  const activeR = mode === 'manual' ? computedR : zapR;
  const activeK = mode === 'manual' ? computedK : zapK;
  const activeDepositPerToken = mode === 'manual' ? computedDepositPerToken : zapPlan?.depositPerToken ?? null;

  // ── Signer helper ─────────────────────────────────────────────────────────────
  const makeSigner = () => async (txns: algosdk.Transaction[]) => {
    const encoded = txns.map(t => algosdk.encodeUnsignedTransaction(t));
    const signed = await signTransactions!(encoded);
    return signed.filter((s): s is Uint8Array => s !== null);
  };

  // ── Depeg handlers ────────────────────────────────────────────────────────────
  const handleDepegSlider = (vals: number[]) => {
    setDepegPrice(vals[0]);
    setDepegInput(vals[0].toFixed(4));
  };

  const handleDepegInputBlur = () => {
    const parsed = parseFloat(depegInput);
    if (isNaN(parsed)) { setDepegInput(depegPrice.toFixed(4)); return; }
    const clamped = Math.min(DEPEG_MAX, Math.max(DEPEG_MIN, parsed));
    setDepegPrice(clamped);
    setDepegInput(clamped.toFixed(4));
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleAddLiquidity = async () => {
    if (!activeAddress || !signTransactions || !activeR || !activeK) return;
    setSubmitting(true);
    setSubmitError(null);
    const signer = makeSigner();

    try {
      // Simple mode: execute zap swaps sequentially first
      if (mode === 'simple' && zapPlan && zapPlan.swaps.length > 0) {
        for (let i = 0; i < zapPlan.swaps.length; i++) {
          const swap = zapPlan.swaps[i];
          setSubmittingStep(
            `Swap ${i + 1}/${zapPlan.swaps.length}: ${getTokenSymbol(pool, swap.fromIdx)} → ${getTokenSymbol(pool, swap.toIdx)}`,
          );
          await executeSwap(
            algod, POOL_APP_ID, activeAddress,
            swap.fromIdx, swap.toIdx, swap.amountIn,
            ZAP_SLIPPAGE_BPS, signer,
          );
        }
      }

      setSubmittingStep('Adding liquidity…');
      const result = await addLiquidity({
        client: algod,
        poolAppId: POOL_APP_ID,
        sender: activeAddress,
        r: activeR,
        k: activeK,
        signer,
      });

      setSubmitResult(result);
      queryClient.invalidateQueries({ queryKey: ['allPositions'] });
      queryClient.invalidateQueries({ queryKey: ['poolState'] });
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setSubmitting(false);
      setSubmittingStep(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
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
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-primary text-primary-foreground'
                  : step > s ? 'bg-primary/30 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
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
                {previewEfficiency !== null && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Capital efficiency</p>
                    <p className="text-sm font-bold text-primary">~{previewEfficiency.toFixed(1)}×</p>
                  </div>
                )}
              </div>
            </div>
            <div className="glass-panel p-3 text-xs text-muted-foreground space-y-1">
              <p><span className="text-foreground font-medium">$0.90</span> — wide protection, low efficiency</p>
              <p><span className="text-foreground font-medium">$0.99</span> — tight protection, high efficiency</p>
              <p><span className="text-foreground font-medium">$0.9999</span> — ultra-tight, maximum efficiency</p>
            </div>
          </div>
        )}

        {/* ── Step 2 — Deposit Amount ───────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setMode('simple')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'simple'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Simple (Zap)
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'manual'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Manual
              </button>
            </div>

            {/* ── Simple mode ── */}
            {mode === 'simple' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Which token do you have?</p>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {Array.from({ length: pool.n }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setSourceTokenIdx(i)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                          sourceTokenIdx === i
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {getTokenSymbol(pool, i)}
                      </button>
                    ))}
                  </div>

                  <p className="text-sm font-semibold text-foreground mb-1">Total amount to deposit</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    We'll split this across all {pool.n} tokens automatically.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="500"
                      value={simpleInput}
                      onChange={e => setSimpleInput(e.target.value)}
                      className="text-base"
                      min="0"
                      step="1"
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground font-medium shrink-0">
                      {getTokenSymbol(pool, sourceTokenIdx)}
                    </span>
                  </div>
                  {balances[sourceTokenIdx] > 0n && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Balance: {rawToDisplay(balances[sourceTokenIdx])} {getTokenSymbol(pool, sourceTokenIdx)}
                    </p>
                  )}
                </div>

                {/* Zap preview */}
                {zapError && (
                  <p className="text-xs text-destructive">{zapError}</p>
                )}
                {zapPlan && (
                  <div className="glass-panel p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground mb-1">Swap breakdown</p>
                    {zapPlan.swaps.map((swap, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {rawToDisplay(swap.amountIn)} {getTokenSymbol(pool, swap.fromIdx)} →
                        </span>
                        <span className="text-foreground">
                          ~{rawToDisplay(swap.amountOut)} {getTokenSymbol(pool, swap.toIdx)}
                          <span className="text-muted-foreground ml-1">
                            ({(swap.priceImpact * 100).toFixed(3)}%)
                          </span>
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-border/30 pt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit per token</span>
                      <span className="text-foreground font-medium">
                        ~{rawToDisplay(zapPlan.depositPerToken)} each
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg slippage</span>
                      <span className="text-foreground">
                        {(zapPlan.avgPriceImpact * 100).toFixed(3)}%
                      </span>
                    </div>
                    {efficiencyDisplay !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capital efficiency</span>
                        <span className="text-primary font-bold">~{efficiencyDisplay.toFixed(1)}×</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Manual mode ── */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Deposit amount per token</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Each of the {pool.n} tokens receives this amount. You must hold equal amounts of all tokens.
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
                    {manualStep2Valid ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Deposit per token</span>
                          <span className="text-foreground font-medium">
                            {rawToDisplay(computedDepositPerToken!)} {token0Symbol}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total deposit ({pool.n} tokens)</span>
                          <span className="text-foreground font-medium">{rawToDisplay(totalCostRaw!)}</span>
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
          </div>
        )}

        {/* ── Step 3 — Confirm ─────────────────────────────────────── */}
        {step === 3 && !submitResult && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Confirm position</p>
            <div className="glass-panel p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mode</span>
                <span className="text-foreground font-medium">
                  {mode === 'simple' ? `Zap from ${getTokenSymbol(pool, sourceTokenIdx)}` : 'Manual'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Depeg price</span>
                <span className="text-foreground font-medium">${depegPrice.toFixed(4)}</span>
              </div>
              {efficiencyDisplay !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capital efficiency</span>
                  <span className="text-primary font-bold">~{efficiencyDisplay.toFixed(1)}×</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposit per token</span>
                <span className="text-foreground font-medium">
                  {activeDepositPerToken ? `~${rawToDisplay(activeDepositPerToken)}` : '—'} {token0Symbol}
                </span>
              </div>
              {mode === 'simple' && zapPlan && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Swaps required</span>
                  <span className="text-foreground font-medium">{zapPlan.swaps.length}</span>
                </div>
              )}
              {mode === 'manual' && totalCostRaw && (
                <div className="flex justify-between text-sm border-t border-border/30 pt-3">
                  <span className="text-muted-foreground font-semibold">Total deposit</span>
                  <span className="text-foreground font-bold">{rawToDisplay(totalCostRaw)} across {pool.n} tokens</span>
                </div>
              )}
            </div>

            {mode === 'simple' && (
              <p className="text-xs text-muted-foreground">
                You will sign {(zapPlan?.swaps.length ?? 0) + 1} transaction group(s): one per swap, then the deposit.
              </p>
            )}

            {submitError && (
              <div className="glass-panel p-3 text-xs text-destructive break-all">{submitError}</div>
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

        {/* ── Footer buttons ────────────────────────────────────────── */}
        <DialogFooter className="flex gap-2 mt-2">
          {step === 1 && (
            <Button className="w-full rounded-2xl" onClick={() => setStep(2)}>
              Next →
            </Button>
          )}

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
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />{submittingStep ?? 'Processing…'}</>
                ) : (
                  mode === 'simple' ? 'Zap & Add Liquidity' : 'Add Liquidity'
                )}
              </Button>
            </>
          )}

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
