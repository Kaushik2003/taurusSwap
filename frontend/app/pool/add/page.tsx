"use client";

import algosdk from 'algosdk';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@txnlab/use-wallet-react';
import { Loader2, ArrowLeft, Info, CheckCircle2, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { getExplorerUrl, shortenId } from '@/lib/explorer';
import { useAlgodClient, POOL_APP_ID } from '@/hooks/useAlgodClient';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { usePoolState } from '@/hooks/usePoolState';
import { TransactionModal } from '@/components/pool/TransactionModal';
import { ErrorModal } from '@/components/pool/ErrorModal';
import { interpretTransactionError } from '@/lib/errorInterpretation';
import { rawToDisplay, displayToRaw, getTokenSymbol } from '@/lib/tokenDisplay';
import {
  addLiquidity,
  executeSwap,
  tickParamsFromDepegPrice,
  computeDepositPerToken,
  getCapitalEfficiencyForDepegPrice,
  computeZap,
} from '@/lib/orbital-sdk';
import type { ZapPlan } from '@/lib/orbital-sdk';

const DEPEG_MIN = 0.9;
const DEPEG_MAX = 0.9999;
const DEPEG_DEFAULT = 0.99;
const PREVIEW_DEPOSIT_RAW = 1_000_000n;
const ZAP_SLIPPAGE_BPS = 50;

export default function AddLiquidityPage() {
  const router = useRouter();
  const algod = useAlgodClient();
  const queryClient = useQueryClient();
  const { activeAddress, signTransactions } = useWallet();
  const { data: pool, isLoading: poolLoading } = usePoolState();
  const balances = useTokenBalances(pool?.tokenAsaIds ?? []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<'simple' | 'manual'>('simple');
  const [depegPrice, setDepegPrice] = useState(DEPEG_DEFAULT);
  const [depegInput, setDepegInput] = useState(DEPEG_DEFAULT.toFixed(4));
  const [previewEfficiency, setPreviewEfficiency] = useState<number | null>(null);

  const [depositInput, setDepositInput] = useState('');
  const [computedR, setComputedR] = useState<bigint | null>(null);
  const [computedK, setComputedK] = useState<bigint | null>(null);
  const [computedDepositPerToken, setComputedDepositPerToken] = useState<bigint | null>(null);
  const [totalCostRaw, setTotalCostRaw] = useState<bigint | null>(null);
  const [liveEfficiency, setLiveEfficiency] = useState<number | null>(null);

  const [sourceTokenIdx, setSourceTokenIdx] = useState(0);
  const [simpleInput, setSimpleInput] = useState('');
  const [zapPlan, setZapPlan] = useState<ZapPlan | null>(null);
  const [zapError, setZapError] = useState<string | null>(null);
  const [zapR, setZapR] = useState<bigint | null>(null);
  const [zapK, setZapK] = useState<bigint | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string | null>(null);
  const [submittingDetails, setSubmittingDetails] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [interpretedError, setInterpretedError] = useState<{ title: string; message: string; action?: string } | null>(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ txId: string; tickId: number; depositPerTokenRaw: bigint } | null>(null);

  // Recompute efficiency preview
  useEffect(() => {
    if (!pool) return;
    try {
      const { r } = tickParamsFromDepegPrice(depegPrice, PREVIEW_DEPOSIT_RAW, pool.n, pool.sqrtN, pool.invSqrtN);
      const { efficiency } = getCapitalEfficiencyForDepegPrice(pool, depegPrice, r);
      setPreviewEfficiency(efficiency);
    } catch {
      setPreviewEfficiency(null);
    }
  }, [depegPrice, pool]);

  // Manual mode recompute
  useEffect(() => {
    if (mode !== 'manual' || !pool) return;
    const raw = displayToRaw(depositInput);
    if (!raw || raw <= 0n) {
      setComputedR(null); setComputedK(null); setComputedDepositPerToken(null); setTotalCostRaw(null); setLiveEfficiency(null);
      return;
    }
    try {
      const { r, k } = tickParamsFromDepegPrice(depegPrice, raw, pool.n, pool.sqrtN, pool.invSqrtN);
      const depPerToken = computeDepositPerToken(r, k, pool.n, pool.sqrtN, pool.invSqrtN);
      const { efficiency } = getCapitalEfficiencyForDepegPrice(pool, depegPrice, r);
      setComputedR(r); setComputedK(k); setComputedDepositPerToken(depPerToken); setTotalCostRaw(depPerToken * BigInt(pool.n)); setLiveEfficiency(efficiency);
    } catch {
      setComputedR(null); setComputedK(null); setComputedDepositPerToken(null); setTotalCostRaw(null); setLiveEfficiency(null);
    }
  }, [depositInput, depegPrice, pool, mode]);

  // Simple mode recompute
  useEffect(() => {
    if (mode !== 'simple' || !pool) return;
    const raw = displayToRaw(simpleInput);
    if (!raw || raw <= 0n) {
      setZapPlan(null); setZapError(null); setZapR(null); setZapK(null);
      return;
    }
    try {
      const plan = computeZap(pool, sourceTokenIdx, raw);
      setZapPlan(plan);
      setZapError(null);
      const { r, k } = tickParamsFromDepegPrice(depegPrice, plan.depositPerToken, pool.n, pool.sqrtN, pool.invSqrtN);
      setZapR(r); setZapK(k);
    } catch (e) {
      setZapPlan(null); setZapError(e instanceof Error ? e.message : 'Could not compute zap'); setZapR(null); setZapK(null);
    }
  }, [simpleInput, sourceTokenIdx, depegPrice, pool, mode]);

  const activeR = mode === 'manual' ? computedR : zapR;
  const activeK = mode === 'manual' ? computedK : zapK;
  const activeDepositPerToken = mode === 'manual' ? computedDepositPerToken : zapPlan?.depositPerToken ?? null;

  const handleAddLiquidity = async () => {
    if (!activeAddress || !signTransactions || !activeR || !activeK || !pool) return;
    setSubmitting(true);
    setSubmitError(null);
    const signer = async (txns: algosdk.Transaction[]) => {
      const encoded = txns.map(t => algosdk.encodeUnsignedTransaction(t));
      const signed = await signTransactions!(encoded);
      
      // Ensure we return an array of Uint8Arrays representing the signed txns.
      // If signTransactions returns null for a txn (e.g. if already signed),
      // we must still include a blob in the array to keep the group contiguous.
      return signed.map((s, i) => {
        if (s) return s;
        // Fallback: if not signed by the wallet, it might be already signed or a dummy txn.
        // But for this flow, every txn IN the group is from the sender, so s should exist.
        // We log a warning if it doesn't, but still return a placeholder to avoid "Incomplete Group"
        console.warn(`Transaction at index ${i} was not signed by the wallet.`);
        return encoded[i]; // Return the unsigned fallback if possible (usually fails node-side, but preserves indexing)
      });
    };

    try {
      if (mode === 'simple' && zapPlan && zapPlan.swaps.length > 0) {
        for (let i = 0; i < zapPlan.swaps.length; i++) {
          const swap = zapPlan.swaps[i];
          const fromSymbol = getTokenSymbol(pool, swap.fromIdx);
          const toSymbol = getTokenSymbol(pool, swap.toIdx);
          setSubmittingStep(`Step ${i + 1}/${zapPlan.swaps.length + 1}: Rebalancing Asset`);
          setSubmittingDetails(`${rawToDisplay(swap.amountIn)} ${fromSymbol} → ${rawToDisplay(swap.amountOut)} ${toSymbol}`);
          await executeSwap(algod, POOL_APP_ID, activeAddress, swap.fromIdx, swap.toIdx, swap.amountIn, ZAP_SLIPPAGE_BPS, signer);
        }
      }
      setSubmittingStep(`Step ${zapPlan?.swaps.length ? zapPlan.swaps.length + 1 : 1}/${zapPlan?.swaps.length ? zapPlan.swaps.length + 1 : 1}: Initializing Liquidity`);
      setSubmittingDetails(activeDepositPerToken ? `Depositing ${rawToDisplay(activeDepositPerToken)} of EACH asset` : "Adding initial liquidity");
      const result = await addLiquidity({ client: algod, poolAppId: POOL_APP_ID, sender: activeAddress, r: activeR, k: activeK, signer });
      setSubmitResult(result);
      queryClient.invalidateQueries({ queryKey: ['allPositions'] });
      queryClient.invalidateQueries({ queryKey: ['poolState'] });
      setStep(3);
      setStep(3);
    } catch (e: any) {
      setInterpretedError(interpretTransactionError(e));
      setIsErrorModalOpen(true);
      
      let msg = e.message || 'Transaction failed';
      if (pool.actualReservesRaw.every(r => r === 0n)) {
        msg = "The pool is currently empty. Please use 'Manual Ratio' mode first to seed the initial liquidity.";
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
      setSubmittingStep(null);
    }
  };

  if (poolLoading || !pool) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <Skeleton className="w-64 h-12" />
          <Skeleton className="w-96 h-4" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          <div className="lg:col-span-8">
            <CardSkeleton />
          </div>
          <div className="lg:col-span-4">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portfolio
        </Button>
        <h1 className="text-3xl font-black text-foreground tracking-tighter">Initialize Position</h1>
        <p className="text-muted-foreground font-medium">Configure your concentrated liquidity parameters for the Orbital AMM pool.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-7 space-y-6">
          {step === 3 && submitResult ? (
            <div className="glass-panel p-10 text-center border-emerald-500/20 bg-emerald-500/5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2 mt-4">Liquidity Provisioned</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto font-medium">Your global liquidity position has been successfully recorded on-chain.</p>
              
              <div className="flex flex-col gap-3 mb-10 text-left">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Transaction Signature</span>
                    <a 
                      href={getExplorerUrl(submitResult.txId || '', 'transaction')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      View Explorer <ChevronRight className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="text-xs font-mono font-bold text-foreground truncate break-all opacity-80">
                    {shortenId(submitResult.txId)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="p-4 rounded-xl bg-background border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Position ID</p>
                  <p className="text-lg font-black text-foreground">#{submitResult.tickId}</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Deposit Per Token</p>
                  <p className="text-lg font-black text-foreground">${rawToDisplay(submitResult.depositPerTokenRaw)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="flex-1 rounded-xl h-12 font-bold" onClick={() => router.push(`/pool/${submitResult.tickId}`)}>
                  View Position Details
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => router.push('/pool')}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Depeg Price */}
              <div className="glass-panel p-6 border-border/50">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">01</div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Set Range Protection</h3>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-sm font-black text-foreground mb-1">Depeg Price Protection</p>
                        <p className="text-xs text-muted-foreground font-medium">Protect your capital by setting a depeg threshold.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Current Selection</p>
                        <div className="px-3 py-1 rounded bg-background border border-border/40 font-mono text-sm font-bold text-foreground">
                          ${depegPrice.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    
                    <Slider value={[depegPrice]} min={DEPEG_MIN} max={DEPEG_MAX} step={0.0001} onValueChange={(val) => setDepegPrice(val[0])} className="py-4" />
                    
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {[0.90, 0.99, 0.9999].map((p) => (
                        <button key={p} onClick={() => setDepegPrice(p)} className={`p-3 rounded-lg border text-left transition-all ${depegPrice === p ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/40 hover:border-border'}`}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mb-1">{p === 0.90 ? 'Wide' : p === 0.99 ? 'Medium' : 'Tight'}</p>
                          <p className={`text-xs font-black ${depegPrice === p ? 'text-primary' : 'text-foreground'}`}>${p.toFixed(4)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Deposit Amount */}
              <div className="glass-panel p-6 border-border/50">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">02</div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Deposit Strategy</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex p-1 bg-muted/40 border border-border/30 rounded-xl">
                    <button onClick={() => setMode('simple')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${mode === 'simple' ? 'bg-background text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}>Auto-Balanced (Zap)</button>
                    <button onClick={() => setMode('manual')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${mode === 'manual' ? 'bg-background text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}>Manual Ratio</button>
                  </div>

                  {mode === 'simple' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-background border border-border/30">
                        <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Select Funding Token</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: pool.n }, (_, i) => (
                            <button key={i} onClick={() => setSourceTokenIdx(i)} className={`px-3 py-2 rounded-lg text-xs font-black border transition-all ${sourceTokenIdx === i ? 'bg-primary text-white border-primary border-b-2 border-b-primary-foreground/30' : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-border'}`}>
                              {getTokenSymbol(pool, i)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                          <label className={`text-sm font-black uppercase tracking-tight ${Number(simpleInput) > 0 && Number(simpleInput) < 0.05 ? 'text-rose-500' : 'text-foreground'}`}>
                            Deposit Amount
                          </label>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-muted-foreground">BAL: {rawToDisplay(balances[sourceTokenIdx])} {getTokenSymbol(pool, sourceTokenIdx)}</span>
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${Number(simpleInput) > 0 && Number(simpleInput) < 0.05 ? 'text-rose-500' : 'text-primary'}`}>
                              Minimum: 0.05 {getTokenSymbol(pool, sourceTokenIdx)}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0.00 (min 0.05)" 
                            value={simpleInput} 
                            onChange={(e) => setSimpleInput(e.target.value)} 
                            className={`h-14 pl-4 pr-20 text-xl font-black bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl transition-all ${Number(simpleInput) > 0 && Number(simpleInput) < 0.05 ? 'border-rose-500/50 bg-rose-500/5' : ''}`} 
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground tracking-tighter">{getTokenSymbol(pool, sourceTokenIdx)}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                          <label className="text-sm font-black text-foreground uppercase tracking-tight">Equal Amount Per Asset</label>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Manual 1:1 Ratio</span>
                        </div>
                        <div className="relative">
                          <Input type="number" placeholder="0.00" value={depositInput} onChange={(e) => setDepositInput(e.target.value)} className="h-14 pl-4 pr-32 text-xl font-black bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl" />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-xs uppercase text-right tracking-tight">
                            EACH <br/> <span className="text-[10px] font-bold">OF {pool.n} ASSETS</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex gap-3">
                          <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0"><Info className="w-3.5 h-3.5" /></div>
                          <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">Manual mode requires you to have equal portions of all {pool.n} assets. We recommend Auto-Balanced (Zap) for a simpler experience.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.1em] shadow-lg shadow-primary/20" 
                    disabled={
                      mode === 'simple' 
                        ? (!simpleInput || Number(simpleInput) < 0.05) 
                        : (!depositInput || Number(depositInput) < 0.01)
                    } 
                    onClick={() => setStep(2)}
                  >
                    Review Deployment Details
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Live Summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 space-y-6">
            <div className="glass-panel p-6 border-border/50 bg-muted/10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Deployment Review</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border/30">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Protocol</span>
                  <span className="text-xs font-black text-foreground">Orbital AMM v1</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/30">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Efficiency</span>
                  <span className="text-xs font-black text-primary">~{(liveEfficiency ?? previewEfficiency ?? 0).toFixed(1)}x</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/30">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Depeg At</span>
                  <span className="text-xs font-black text-foreground">${depegPrice.toFixed(4)}</span>
                </div>
                {mode === 'simple' && zapPlan && (
                  <div className="space-y-3 py-3 border-b border-border/30">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Zap Rebalancing</span>
                    {zapPlan.swaps.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-muted-foreground">{getTokenSymbol(pool, s.fromIdx)} → {getTokenSymbol(pool, s.toIdx)}</span>
                        <span className="text-foreground tracking-tighter">Impact: {(s.priceImpact * 100).toFixed(3)}%</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center py-4">
                  <span className="text-[11px] font-black text-foreground uppercase tracking-[0.2em]">Estimated Total</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-foreground leading-none">${mode === 'simple' ? simpleInput || '0.00' : rawToDisplay(totalCostRaw || 0n)}</span>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Across {pool.n} Assets</p>
                  </div>
                </div>
              </div>

              {step === 2 && !submitResult && (
                <div className="mt-6 space-y-3">
                  <Button className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20" onClick={handleAddLiquidity} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-3" />
                        {submittingStep || 'Broadcasting…'}
                      </>
                    ) : (
                      'Initialize Position'
                    )}
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-muted-foreground" onClick={() => setStep(1)} disabled={submitting}>
                    Modify Parameters
                  </Button>
                </div>
              )}

              {submitError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-[10px] font-black text-rose-500 uppercase mb-1">Transaction Rejected</p>
                  <p className="text-xs font-medium text-rose-500/80 leading-relaxed">{submitError}</p>
                </div>
              )}
            </div>

            <div className="glass-panel p-5 border-border/50 bg-primary/5">
              <div className="flex gap-4">
                <div className="p-2 h-fit rounded-lg bg-primary/10 text-primary">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground mb-1">Concentrated Liquidity</h4>
                  <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
                    Your capital is concentrated around the $1 peg. This maximizes trading fees but increases risk if assets significantly depeg. 
                    <Link href="#" className="text-primary hover:underline ml-1">Read technical docs</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <TransactionModal isOpen={submitting} step={submittingStep} details={submittingDetails} address={activeAddress} />
      <ErrorModal isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} error={interpretedError} onRetry={handleAddLiquidity} />
    </div>
  );
}
