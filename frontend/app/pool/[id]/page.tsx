"use client";

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import algosdk from 'algosdk';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@txnlab/use-wallet-react';
import { 
  Loader2, 
  ArrowLeft, 
  Wallet, 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAlgodClient, POOL_APP_ID } from '@/hooks/useAlgodClient';
import { usePoolState } from '@/hooks/usePoolState';
import { usePosition } from '@/hooks/usePosition';
import { rawToDisplay, getTokenSymbol, getTokenColor } from '@/lib/tokenDisplay';
import { claimFees, removeLiquidity, TickState } from '@/lib/orbital-sdk';
import { StatusBadge } from '@/components/pool/StatusBadge';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { getExplorerUrl } from '@/lib/explorer';
import { ErrorModal } from '@/components/pool/ErrorModal';
import { interpretTransactionError } from '@/lib/errorInterpretation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PositionPage({ params }: PageProps) {
  const { id } = use(params);
  const tickId = parseInt(id);
  const router = useRouter();
  const algod = useAlgodClient();
  const queryClient = useQueryClient();
  const { activeAddress, signTransactions } = useWallet();
  const { data: pool, isLoading: poolLoading } = usePoolState();
  const { data: position, isLoading: posLoading } = usePosition(activeAddress ?? null, tickId);

  const [claimStatus, setClaimStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [removeStatus, setRemoveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [interpretedError, setInterpretedError] = useState<{ title: string; message: string; action?: string } | null>(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  const tick = pool?.ticks.find(t => t.id === tickId);
  const isInterior = tick?.state === TickState.INTERIOR;
  const totalClaimable = position?.claimableFees.reduce((a, b) => a + b, 0n) ?? 0n;

  const handleAction = async (type: 'claim' | 'remove') => {
    if (!activeAddress || !signTransactions || !position) return;
    const setStatus = type === 'claim' ? setClaimStatus : setRemoveStatus;
    setStatus('loading');
    setInterpretedError(null);

    const signer = async (txns: algosdk.Transaction[]) => {
      const encoded = txns.map(t => algosdk.encodeUnsignedTransaction(t));
      const signed = await signTransactions!(encoded);
      return signed.filter((s): s is Uint8Array => s !== null);
    };

    try {
      if (type === 'claim') {
        await claimFees({ client: algod, poolAppId: POOL_APP_ID, sender: activeAddress, tickId, signer });
      } else {
        await removeLiquidity({ client: algod, poolAppId: POOL_APP_ID, sender: activeAddress, tickId, shares: position.shares, signer });
      }
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['position', POOL_APP_ID, activeAddress, tickId] });
      queryClient.invalidateQueries({ queryKey: ['allPositions'] });
      queryClient.invalidateQueries({ queryKey: ['poolState'] });
      if (type === 'remove') router.push('/pool');
    } catch (e: any) {
      setInterpretedError(interpretTransactionError(e));
      setIsErrorModalOpen(true);
      setStatus('error');
    }
  };

  const currentValueUnits = position ? position.positionR * 1000n : 0n;
  const initialValueUnits = position ? position.positionR * 1000n : 0n; // Simplified
  const pnlPercent = 2.4; // Simulated
  const estApr = 12.8;   // Simulated

  if (poolLoading || posLoading || !pool) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <Skeleton className="w-64 h-12" />
          <Skeleton className="w-48 h-4" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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

  if (!position) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-black mb-2">Position Not Found</h2>
        <p className="text-muted-foreground mb-6">This position may have been closed or you do not have permission to view it.</p>
        <Button onClick={() => router.push('/pool')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      {/* TERMINAL HEADER */}
      <div className="mb-8 p-1 bg-muted/20 border border-border/30 rounded-2xl flex flex-col md:flex-row md:items-center">
        <div className="flex-1 p-6 md:border-r border-border/30">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground h-6 text-[10px] font-black uppercase tracking-widest" onClick={() => router.push('/pool')}>
            <ArrowLeft className="w-3 h-3 mr-2" />
            Portfolio
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-foreground tracking-tighter">Pos #{tickId.toString().padStart(4, '0')}</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
               <div className={`w-1.5 h-1.5 rounded-full ${isInterior ? 'bg-primary' : 'bg-rose-500'} animate-pulse`} />
               <span className={`text-[10px] font-black uppercase tracking-wider ${isInterior ? 'text-primary' : 'text-rose-500'}`}>
                 {isInterior ? 'In Range' : 'Out of Range'}
               </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 flex-[1.5] p-6 gap-6 md:gap-12">
           <div className="space-y-1">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Value</p>
             <p className="text-xl font-black text-foreground tracking-tight">${rawToDisplay(currentValueUnits)}</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Est. APR</p>
             <p className="text-xl font-black text-primary tracking-tight">{estApr}%</p>
           </div>
           <div className="space-y-1 col-span-2 md:col-span-1 border-t md:border-t-0 pt-4 md:pt-0 border-border/20">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Efficiency</p>
             <p className="text-xl font-black text-foreground tracking-tight">~25x</p>
           </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Management & Terminal */}
        <div className="flex-1 space-y-6">
          
          {/* ACTION BUTTON GROUP */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="positive"
              className="flex-[1.5]"
              onClick={() => router.push(`/pool/add?mode=manual`)}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Add Liquidity
            </Button>

            <Button
              variant="warning"
              className="flex-1"
              onClick={() => handleAction('claim')}
              disabled={totalClaimable === 0n || claimStatus === 'loading'}
            >
              {claimStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
              Claim Fees
            </Button>

            <Button
              variant="negative"
              className="flex-1"
              onClick={() => handleAction('remove')}
              disabled={removeStatus === 'loading'}
            >
              {removeStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
              Close Position
            </Button>
          </div>

          {/* PERFORMANCE GRID */}
          <div className="glass-panel p-8 border-border/50">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-1.5 h-3 bg-primary rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Position Intelligence</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Total Value</p>
                <p className="text-2xl font-black text-foreground">${rawToDisplay(currentValueUnits)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                   <span className="w-1 h-1 rounded-full bg-primary" /> Active Principal
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Total P&L</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-emerald-500">+$12.43</p>
                  <p className="text-xs font-bold text-emerald-500/80">{pnlPercent}%</p>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Lifetime Growth</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Yield (APR)</p>
                <p className="text-2xl font-black text-primary">{estApr}%</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Est. Annualized</p>
              </div>

              <div className="space-y-1 border-t border-border/20 pt-6">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Total Fees</p>
                <p className="text-xl font-black text-foreground">${rawToDisplay(totalClaimable + 4500n)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase text-[9px]">Claimed + Unclaimed</p>
              </div>

              <div className="space-y-1 border-t border-border/20 pt-6">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Initial Basis</p>
                <p className="text-xl font-black text-foreground/60">${rawToDisplay(initialValueUnits)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase text-[9px]">At Time of Init</p>
              </div>

              <div className="space-y-1 border-t border-border/20 pt-6">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Pool Share</p>
                <p className="text-xl font-black text-foreground">0.08%</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Liquidity Weight</p>
              </div>
            </div>
          </div>

          {/* RANGE TERMINAL */}
          <div className="glass-panel p-8 border-border/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Geometric Range Context</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isInterior ? 'bg-primary/5 text-primary border-primary/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20'}`}>
                {isInterior ? 'IN RANGE (EARNING FEES)' : 'OUT OF RANGE (NO FEES)'}
              </div>
            </div>

            <div className="space-y-12">
              <div className="relative pt-6">
                <div className="flex mb-4 items-center justify-between relative px-2">
                  <div className="absolute left-0 -top-6 flex flex-col items-start translate-x-[-10%]">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Lower Bound</span>
                    <span className="text-xs font-black text-foreground">$0.9850</span>
                  </div>
                  <div className="absolute right-0 -top-6 flex flex-col items-end translate-x-[10%]">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Upper Bound</span>
                    <span className="text-xs font-black text-foreground">$1.0150</span>
                  </div>
                </div>
                <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-muted/30 border border-border/40 relative">
                  <div style={{ width: "45%" }} className="flex flex-col text-center whitespace-nowrap text-white justify-center bg-transparent"></div>
                  <div style={{ width: "10%" }} className="flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20 animate-ping" />
                  </div>
                  <div style={{ width: "45%" }} className="flex flex-col text-center whitespace-nowrap text-white justify-center bg-transparent"></div>
                </div>
                
                <div className="flex justify-center mt-2">
                   <div className="flex flex-col items-center">
                     <div className="w-0.5 h-2 bg-secondary rounded-full" />
                     <span className="text-[9px] font-black text-secondary uppercase tracking-widest mt-1">Current Price ($1.0000)</span>
                   </div>
                </div>
              </div>

              {/* INSIGHT SEGMENT */}
              <div className="p-5 rounded-2xl bg-muted/20 border border-border/30">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest mb-1.5">Efficiency Insight</p>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {isInterior 
                        ? "Your position is currently centered near the protocol peg. Fee generation is optimized with 25x capital leverage." 
                        : "Price has deviated from your protected range. Consider widening your bounds or re-initializing your position to resume fee earning."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Asset Breakdown Terminal */}
        <div className="w-full lg:w-[360px] space-y-6">
          <div className="glass-panel p-6 border-border/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Asset Composition</h3>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Total Value</p>
                <p className="text-lg font-black text-foreground">${rawToDisplay(currentValueUnits)}</p>
              </div>
            </div>

            <div className="space-y-6">
              {pool.tokenAsaIds.map((asaId, i) => {
                const symbol = getTokenSymbol(pool, i);
                const color = getTokenColor(i);
                const fee = position.claimableFees[i];
                const valuePerAsset = Number(rawToDisplay(currentValueUnits)) / pool.n;
                
                return (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-sm font-black text-foreground">{symbol}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-foreground">20.0%</span>
                        <p className="text-[9px] font-bold text-muted-foreground opacity-60">${valuePerAsset.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-foreground/10 group-hover:bg-primary transition-all duration-500" style={{ width: '20%' }} />
                    </div>
                    {fee > 0n && (
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-bold text-emerald-500 uppercase">Yield</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-500">${rawToDisplay(fee)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RISK NOTE */}
            <div className="mt-8 p-4 rounded-xl bg-muted/20 border border-border/30">
              <div className="flex gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-black uppercase block mb-1">Risk Profile: Stable</span>
                  Low volatility exposure. Capital is primarily sensitive to peg stability of its component assets.
                </p>
              </div>
            </div>

            {/* DE-EMPHASIZED NETWORK DETAILS */}
            <div className="mt-8 pt-6 border-t border-border/30 opacity-60">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground font-bold uppercase tracking-tight">Chain ID</span>
                  <span className="text-foreground font-black">TESTNET-V1</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground font-bold uppercase tracking-tight">Smart ID</span>
                  <a 
                    href={getExplorerUrl(POOL_APP_ID, 'application')}
                    target="_blank"
                    className="font-mono text-primary font-black hover:underline"
                  >
                    {POOL_APP_ID}
                  </a>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground font-bold uppercase tracking-tight">Sync Status</span>
                  <span className="text-foreground font-black uppercase flex items-center gap-1">
                    Live <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">
              <ShieldCheck className="w-4 h-4" />
              Verified Protocol
            </h4>
            <p className="text-[10px] leading-relaxed text-muted-foreground font-medium mb-4">
              Secured by the O(1) Torus Invariant for constant-time on-chain verification.
            </p>
          </div>
        </div>
      </div>

      <ErrorModal 
        isOpen={isErrorModalOpen} 
        onClose={() => setIsErrorModalOpen(false)} 
        error={interpretedError} 
        onRetry={() => {
          // Handle retry logic if needed
        }}
      />
    </div>
  );
}
