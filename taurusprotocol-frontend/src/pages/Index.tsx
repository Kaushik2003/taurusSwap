import FloatingOrbs from '@/components/landing/FloatingOrbs';
import SwapCard from '@/components/swap/SwapCard';
import { ArrowDown } from 'lucide-react';

export default function Index() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-gradient-hero overflow-hidden">
      <FloatingOrbs />
      
      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Hero */}
        <div className="text-center mt-16 mb-10 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
            Trade tokens <br />
            <span className="text-gradient">without limits</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Swap, earn, and build across multiple networks with zero platform fees.
          </p>
        </div>

        {/* Swap card */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <SwapCard />
        </div>

        {/* Value props */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            6 networks supported
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Zero platform fees
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Best price routing
          </span>
        </div>

        {/* Scroll hint */}
        <div className="mt-16 mb-8 flex flex-col items-center gap-2 text-muted-foreground/50 animate-float">
          <span className="text-xs">Scroll to explore</span>
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Stats section */}
        <div className="w-full max-w-4xl mx-auto pb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Volume', value: '$1.2T+' },
              { label: 'Total Value Locked', value: '$4.8B' },
              { label: 'Tokens Listed', value: '15,000+' },
              { label: 'Integrations', value: '300+' },
            ].map(s => (
              <div key={s.label} className="glass-panel p-5 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
