"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet, Loader2, RefreshCw, BarChart3, Settings2, Activity, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useWallet } from '@txnlab/use-wallet-react';
import { usePoolState } from '@/hooks/usePoolState';
import { useAllPositions } from '@/hooks/usePosition';
import { getTokenSymbol, getTokenIcon, rawToDisplay } from '@/lib/tokenDisplay';
import { PositionCard } from '@/components/pool/PositionCard';
import { AddLiquidityModal } from '@/components/pool/AddLiquidityModal';
import { PortfolioHeader } from '@/components/pool/PortfolioHeader';
import { PositionsTable } from '@/components/pool/PositionsTable';
import { AnalyticsPanel } from '@/components/pool/AnalyticsPanel';

function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="glass-panel p-8 space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-12 w-full bg-muted/40 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function Pool() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { activeAddress } = useWallet();
  const isWalletConnected = mounted && !!activeAddress;
  const { toggleWalletModal } = useAppStore();

  const { data: pool, isLoading: poolLoading, error: poolError, refetch } = usePoolState();
  const {
    data: positions = [],
    isLoading: positionsLoading,
  } = useAllPositions(activeAddress ?? null, pool?.numTicks ?? 0);

  const activePositions = positions.filter(p => p.shares > 0n);

  const totalValue = activePositions.reduce((acc, pos) => acc + (pos.positionR * 1000n), 0n);
  const totalFees = activePositions.reduce((acc, pos) => acc + pos.claimableFees.reduce((a, b) => a + b, 0n), 0n);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-20">
      {/* Portfolio Header */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-6xl text-foreground mb-1" style={{ fontFamily: "'WiseSans', 'Inter', sans-serif", fontWeight: 900 }}>LIQUIDITY POOL PROFILE</h1>
            <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em]">Institutional-Grade Provisioning</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="bg-[#052c05] text-[#89f589] border-[1.5px] border-[#89f589] px-6 h-11 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-[0_0_0_2px_#052c05,0_0_0_3.5px_#89f589] hover:brightness-110 transition-all flex items-center justify-center m-1"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={2.5} />
              Refresh
            </button>
            <button
              className="bg-[#052c05] text-[#89f589] border-[1.5px] border-[#89f589] px-6 h-11 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-[0_0_0_2px_#052c05,0_0_0_3.5px_#89f589] hover:brightness-110 transition-all flex items-center justify-center m-1"
              onClick={() => router.push('/pool/analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-2" strokeWidth={2.5} />
              Analytics
            </button>
            <button
              className="bg-[#052c05] text-[#89f589] border-[1.5px] border-[#89f589] px-8 h-11 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-[0_0_0_2px_#052c05,0_0_0_3.5px_#89f589] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center m-1"
              onClick={() => router.push('/pool/add')}
              disabled={!mounted || !isWalletConnected}
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
              Add Liquidity
            </button>
          </div>
        </div>

        {isWalletConnected && (
          <PortfolioHeader
            totalValue={totalValue}
            totalFees={totalFees}
            positionCount={activePositions.length}
          />
        )}
      </div>

      {/* Section headers — one row, flush above both columns */}
      <div className="flex flex-col lg:flex-row gap-8 mb-4">
        <div className="flex-1 flex items-center gap-2">
          <div className="w-2 h-4 bg-primary rounded-full" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Active Positions</h3>
        </div>
        <div className="w-full lg:w-[350px] shrink-0 flex items-center gap-2">
          <div className="w-2 h-4 bg-primary rounded-full" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Pool Analytics</h3>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {poolError && (
            <div className="glass-panel p-4 mb-4 text-sm text-destructive border-destructive/20 bg-destructive/5">
              Failed to load pool state: {poolError.message}
            </div>
          )}

          {!mounted ? (
             <TableSkeleton rows={3} />
          ) : !isWalletConnected ? (
            <div className="p-16 text-center border-[3px] border-dashed border-dark-green rounded-3xl bg-white shadow-[-8px_8px_0_0_rgba(0,0,0,0.05)]">
              <div className="w-16 h-16 rounded-full bg-green flex items-center justify-center mx-auto mb-6 border-2 border-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)]">
                <Wallet className="w-8 h-8 text-dark-green" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-dark-green uppercase mb-2">Wallet Disconnected</h3>
              <p className="text-sm text-dark-green/60 mb-8 max-w-sm mx-auto font-bold">
                Connect your Algorand wallet to access your liquidity dashboard and manage your TaurusSwap positions.
              </p>
              <button 
                onClick={() => toggleWalletModal(true)} 
                className="bg-[#052c05] text-[#89f589] border-[1.5px] border-[#89f589] px-12 h-14 rounded-full font-bold uppercase tracking-widest text-xs shadow-[0_0_0_2px_#052c05,0_0_0_4px_#89f589] hover:brightness-110 transition-all m-2"
              >
                Connect Algorand Wallet
              </button>
            </div>
          ) : positionsLoading ? (
            <TableSkeleton rows={3} />
          ) : activePositions.length === 0 ? (
            <div className="p-16 text-center border-[3px] border-dashed border-dark-green rounded-3xl bg-white shadow-[-8px_8px_0_0_rgba(0,0,0,0.05)]">
              <div className="w-16 h-16 rounded-full bg-[#C0FCFD] flex items-center justify-center mx-auto mb-6 border-2 border-dark-green shadow-[-4px_4px_0_0_var(--color-dark-green)]">
                <Settings2 className="w-8 h-8 text-dark-green" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-dark-green uppercase mb-2">No Active Positions</h3>
              <p className="text-sm text-dark-green/60 mb-8 font-bold">You haven't provided liquidity to any ticks in this pool yet.</p>
              <button 
                onClick={() => router.push('/pool/add')} 
                className="bg-[#052c05] text-[#89f589] border-[1.5px] border-[#89f589] px-12 h-14 rounded-full font-bold uppercase tracking-widest text-xs shadow-[0_0_0_2px_#052c05,0_0_0_4px_#89f589] hover:brightness-110 transition-all m-2"
              >
                Open New Position
              </button>
            </div>
          ) : (
            <PositionsTable
              positions={activePositions}
              pool={pool!}
            />
          )}

          {/* Info Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="glass-panel p-6 hover:bg-muted/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">LP Strategy Guide</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">Learn how to manage impermanent loss and optimize your tick ranges for maximum fee generation in multi-asset pools.</p>
            </div>

            <div className="glass-panel p-6 hover:bg-muted/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Activity className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Geometric AMM Docs</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                Deep dive into the O(1) Torus Invariant and the mathematics of spherical concentrated liquidity on Algorand.
              </p>
            </div>

            <div className="glass-panel p-6 hover:bg-muted/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Fee Compounding</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                Earned fees accumulate per-tick and can be claimed or reinvested into new positions to compound your yield over time.
              </p>
            </div>

            <div className="glass-panel p-6 hover:bg-muted/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Depeg Protection</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                The Torus Invariant constrains prices geometrically — positions stay solvent even when one stablecoin depegs from its peg.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="w-full lg:w-[350px] shrink-0">
          {pool && <AnalyticsPanel pool={pool} />}
        </div>
      </div>
    </div>
  );
}
