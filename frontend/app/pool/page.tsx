"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet, Loader2, RefreshCw, BarChart3, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useWallet } from '@txnlab/use-wallet-react';
import { usePoolState } from '@/hooks/usePoolState';
import { useAllPositions } from '@/hooks/usePosition';

import { PositionsTable } from '@/components/pool/PositionsTable';
import { AnalyticsPanel } from '@/components/pool/AnalyticsPanel';
import { PortfolioHeader } from '@/components/pool/PortfolioHeader';

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-panel p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-muted/50 rounded w-32" />
            <div className="h-4 bg-muted/50 rounded w-20" />
          </div>
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
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Portfolio Header */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter mb-1">Liquidity Portfolio</h1>
            <p className="text-muted-foreground font-medium uppercase text-xs tracking-[0.2em]">Institutional-Grade Provisioning</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl h-11 px-5 border-border/60 font-bold text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-11 px-5 border-border/60 font-bold text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/pool/analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            <Button
              className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
              onClick={() => router.push('/pool/add')}
              disabled={!isWalletConnected}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Liquidity
            </Button>
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-4 bg-primary rounded-full" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Active Positions</h3>
          </div>

          {poolError && (
            <div className="glass-panel p-4 mb-4 text-sm text-destructive border-destructive/20 bg-destructive/5">
              Failed to load pool state: {poolError.message}
            </div>
          )}

          {!isWalletConnected ? (
            <div className="glass-panel p-16 text-center border-dashed border-2">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Wallet Disconnected</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto font-medium">
                Connect your Algorand wallet to access your liquidity dashboard and manage your TaurusSwap positions.
              </p>
              <Button onClick={() => toggleWalletModal(true)} className="rounded-xl px-10 h-12 font-black uppercase tracking-widest text-xs">
                Connect Algorand Wallet
              </Button>
            </div>
          ) : positionsLoading ? (
            <TableSkeleton rows={3} />
          ) : activePositions.length === 0 ? (
            <div className="glass-panel p-16 text-center border-dashed border-2">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6">
                <Settings2 className="w-8 h-8 text-primary/40" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">No Active Positions</h3>
              <p className="text-sm text-muted-foreground mb-8 font-medium">You haven't provided liquidity to any ticks in this pool yet.</p>
              <Button onClick={() => router.push('/pool/add')} className="rounded-xl px-10 h-12 font-black uppercase tracking-widest text-xs">
                Open New Position
              </Button>
            </div>
          ) : (
            <PositionsTable
              positions={activePositions}
              pool={pool!}
            />
          )}

          {/* Educational Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="glass-panel p-6 border-border/40 hover:bg-muted/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Risk Management</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                Learn how to manage impermanent loss and optimize your tick ranges for maximum fee generation in multi-asset pools.
              </p>
            </div>
            <div className="glass-panel p-6 border-border/40 hover:bg-muted/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Settings2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Geometric AMM Docs</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                Deep dive into the O(1) Torus Invariant and the mathematics of spherical concentrated liquidity on Algorand.
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
