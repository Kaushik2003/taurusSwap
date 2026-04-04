import { Plus, Wallet, ArrowRight, BookOpen, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { pools, demoPositions } from '@/data/mock';
import { formatCurrency } from '@/lib/format';
import TokenIcon from '@/components/shared/TokenIcon';
import { useWallet } from '@txnlab/use-wallet-react';

export default function Pool() {
  const { activeAddress } = useWallet();
  const isWalletConnected = !!activeAddress;
  const { toggleWalletModal } = useAppStore();

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Your positions</h1>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-2xl border-border" size="sm">
                <Plus className="w-4 h-4 mr-1" /> New position
              </Button>
            </div>
          </div>

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
          ) : (
            <div className="space-y-3 mb-8">
              {demoPositions.map(pos => (
                <div key={pos.id} className="glass-panel-hover p-5 cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <TokenIcon token={pos.pool.token0} size={28} />
                        <TokenIcon token={pos.pool.token1} size={28} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">{pos.pool.token0.symbol}/{pos.pool.token1.symbol}</span>
                        <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{pos.pool.feeTier}%</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${pos.inRange ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {pos.inRange ? 'In range' : 'Out of range'}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Liquidity</p>
                      <p className="text-foreground font-medium">{formatCurrency(pos.liquidity)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Uncollected fees</p>
                      <p className="text-foreground font-medium">{formatCurrency(pos.uncollectedFees)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">APR</p>
                      <p className="percentage-up font-medium">{pos.apr.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Range: {formatCurrency(pos.minPrice)} — {formatCurrency(pos.maxPrice)}</span>
                  </div>
                </div>
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

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top pools by TVL</h3>
          <div className="space-y-2">
            {pools.slice(0, 6).map(p => (
              <div key={p.id} className="glass-panel-hover p-3 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <TokenIcon token={p.token0} size={20} />
                      <TokenIcon token={p.token1} size={20} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.token0.symbol}/{p.token1.symbol}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{p.version}</span>
                  </div>
                  <span className="text-xs percentage-up">{p.apr.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>TVL {formatCurrency(p.tvl, true)}</span>
                  <span>{p.feeTier}% fee</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-sm text-primary hover:text-primary/80 transition-colors font-medium text-center py-2">
            Explore all pools →
          </button>
        </div>
      </div>
    </div>
  );
}
