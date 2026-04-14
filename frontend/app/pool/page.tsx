"use client";

import { useState, useEffect } from 'react';
import { Plus, Wallet, ArrowRight, BookOpen, Zap, Shield, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useWallet } from '@txnlab/use-wallet-react';
import { usePoolState } from '@/hooks/usePoolState';
import { useAllPositions } from '@/hooks/usePosition';
import { getTokenSymbol, getTokenIcon, rawToDisplay } from '@/lib/tokenDisplay';
import { PositionCard } from '@/components/pool/PositionCard';
import { AddLiquidityModal } from '@/components/pool/AddLiquidityModal';

export default function Pool() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { activeAddress } = useWallet();
  const isWalletConnected = mounted && !!activeAddress;
  const { toggleWalletModal } = useAppStore();
  const [addLiquidityOpen, setAddLiquidityOpen] = useState(false);

  const { data: pool, isLoading: poolLoading, error: poolError, refetch } = usePoolState();
  const {
    data: positions = [],
    isLoading: positionsLoading,
  } = useAllPositions(activeAddress ?? null, pool?.numTicks ?? 0);

  const activePositions = positions.filter(p => p.shares > 0n);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Your positions</h1>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => refetch()}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh pool state"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Button
                variant="outline"
                className="rounded-2xl border-border"
                size="sm"
                onClick={() => setAddLiquidityOpen(true)}
                disabled={!isWalletConnected}
              >
                <Plus className="w-4 h-4 mr-1" /> New position
              </Button>
            </div>
          </div>

          {/* Pool error */}
          {poolError && (
            <div className="glass-panel p-4 mb-4 text-sm text-destructive">
              Failed to load pool: {poolError.message}
            </div>
          )}

          {!isWalletConnected ? (
            <div className="glass-panel p-10 text-center mb-8">
              <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-2">Connect your wallet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Connect your wallet to view your liquidity positions and earned rewards.
              </p>
              <Button onClick={() => toggleWalletModal(true)} className="rounded-2xl px-6">
                Connect Wallet
              </Button>
            </div>
          ) : positionsLoading ? (
            <div className="glass-panel p-10 text-center mb-8">
              <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading your positions…</p>
            </div>
          ) : activePositions.length === 0 ? (
            <div className="glass-panel p-10 text-center mb-8">
              <p className="text-sm text-muted-foreground mb-2">No active liquidity positions found.</p>
              <p className="text-xs text-muted-foreground">Add liquidity to start earning fees.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {activePositions.map(pos => (
                <PositionCard key={pos.tickId} position={pos} pool={pool!} />
              ))}
            </div>
          )}

          {/* Info cards */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: BookOpen, title: 'Learn about liquidity', desc: 'Understand concentrated liquidity and earn more.' },
              { icon: Zap, title: 'Fee tiers explained', desc: 'Pick the right fee tier for your strategy.' },
              { icon: Shield, title: 'Impermanent loss', desc: 'Learn how to manage risk as a liquidity provider.' },
            ].map(c => (
              <div key={c.title} className="glass-panel-hover p-4 cursor-pointer group">
                <c.icon className="w-5 h-5 text-primary mb-2" />
                <h4 className="text-sm font-medium text-foreground mb-1">{c.title}</h4>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-2 group-hover:translate-x-1 transition-transform" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar — live pool stats */}
        <div className="w-full lg:w-80 shrink-0">
          <h3 className="text-sm font-semibold text-foreground mb-3">Orbital AMM pool</h3>
          {poolLoading ? (
            <div className="glass-panel p-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : pool ? (
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">App ID</span>
                <span className="font-mono text-foreground">{pool.appId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tokens (n)</span>
                <span className="text-foreground font-medium">{pool.n}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fee tier</span>
                <span className="text-foreground font-medium">{Number(pool.feeBps) / 100}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active ticks</span>
                <span className="text-foreground font-medium">{pool.ticks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Interior radius</span>
                <span className="text-foreground font-medium">{rawToDisplay(pool.rInt * 1000n)}</span>
              </div>
              <div className="border-t border-border/30 pt-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Token reserves</p>
                {pool.tokenAsaIds.map((asaId, i) => (
                  <div key={i} className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <img src={getTokenIcon(i)} alt={getTokenSymbol(pool, i)} className="w-4 h-4 rounded-full object-cover bg-white" />
                      <span className="text-foreground font-medium">{getTokenSymbol(pool, i)}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{asaId}</span>
                    </div>
                    <span className="text-muted-foreground">{rawToDisplay((pool.reserves[i] - pool.virtualOffset) * 1000n)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {pool && (
        <AddLiquidityModal
          open={addLiquidityOpen}
          onOpenChange={setAddLiquidityOpen}
          pool={pool}
        />
      )}
    </div>
  );
}
