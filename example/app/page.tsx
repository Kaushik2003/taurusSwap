"use client";

import { useState } from "react";
import { useTaurus } from "../hooks/useTaurus";
import Header from "../components/Header";
import SwapCard from "../components/SwapCard";
import LiquidityCard from "../components/LiquidityCard";
import PoolExplorer from "../components/PoolExplorer";
import PositionsList from "../components/PositionsList";
import { Coins, Layers, Compass, Sparkles, Activity, Award, HelpCircle } from "lucide-react";

export default function Home() {
  const {
    poolState,
    prices,
    isLoading,
    error,
    wallet,
    isWalletLoading,
    positions,
    connectWallet,
    disconnectWallet,
    refreshWalletState,
    executeSwap,
    executeAddLiquidity,
    executeRemoveLiquidity,
    executeClaimFees,
  } = useTaurus();

  const [activeTab, setActiveTab] = useState<"swap" | "liquidity" | "explorer">("swap");

  return (
    <main className="min-h-screen bg-obsidian flex flex-col relative overflow-x-hidden text-white font-sans antialiased">
      {/* Premium background cosmic glow nodes */}
      <div className="cosmic-glow-1"></div>
      <div className="cosmic-glow-2"></div>
      <div className="cosmic-glow-3"></div>

      {/* Global Navigation Header bar */}
      <Header
        wallet={wallet}
        isWalletLoading={isWalletLoading}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        refreshWalletState={refreshWalletState}
      />

      <div className="dashboard-content-wrapper flex-grow max-w-7xl w-full mx-auto px-4 py-6 md:py-10 z-10">
        
        {/* Banner introduction card */}
        <div className="intro-card glass-card p-6 mb-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="glow-bg absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-secondary/5 -z-10"></div>
          
          <div className="max-w-2xl">
            <h2 className="text-xl md:text-2xl font-sans font-black flex items-center gap-2 mb-2 text-primary">
              TaurusSwap Stablecoin Swap
              <span className="badge-math font-mono font-bold text-[9px] bg-secondary/20 text-secondary border border-secondary/30 rounded py-0.5 px-2">
                N-Torus Concentrated AMM
              </span>
            </h2>
            <p className="text-dim text-sm leading-relaxed">
              Explore the next-generation Algorand Concentrated Liquidity protocol. Symmetrically deposit reserves with highly configurable boundary boundaries to increase trading yield with up to 100x capital efficiency. Connect your active Pera or Defly wallet to interact securely on Testnet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="stats-metric-pill flex-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-primary font-mono">
              <Activity size={13} className="text-secondary animate-pulse" />
              <span>Testnet Pool: 758284478</span>
            </div>
            <div className="stats-metric-pill flex-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-primary font-mono">
              <Award size={13} className="text-emerald" />
              <span>5 assets symmetric</span>
            </div>
          </div>
        </div>

        {/* Dynamic Grid Layout */}
        <div className="dashboard-grid grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main operation panels (Swap / Liquidity additions toggles) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Tab navigation pills */}
            <div className="tab-navigation-bar flex-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
              <button
                className={`tab-btn flex-center gap-2 py-2 px-6 rounded-lg text-sm font-bold flex-1 transition-all ${
                  activeTab === "swap" ? "active bg-primary/20 text-primary border border-primary/30" : "text-dim hover:text-white"
                }`}
                onClick={() => setActiveTab("swap")}
              >
                <Coins size={16} />
                Swap Tokens
              </button>
              <button
                className={`tab-btn flex-center gap-2 py-2 px-6 rounded-lg text-sm font-bold flex-1 transition-all ${
                  activeTab === "liquidity" ? "active bg-secondary/20 text-secondary border border-secondary/30" : "text-dim hover:text-white"
                }`}
                onClick={() => setActiveTab("liquidity")}
              >
                <Sparkles size={16} />
                Add Liquidity
              </button>
              <button
                className={`tab-btn flex-center gap-2 py-2 px-6 rounded-lg text-sm font-bold flex-1 transition-all ${
                  activeTab === "explorer" ? "active bg-emerald/20 text-emerald border border-emerald/30" : "text-dim hover:text-white"
                }`}
                onClick={() => setActiveTab("explorer")}
              >
                <Compass size={16} />
                Pool Explorer
              </button>
            </div>

            {/* Selected Tab content panels */}
            <div className="tab-pane-container">
              {activeTab === "swap" && (
                <SwapCard
                  wallet={wallet}
                  prices={prices}
                  executeSwap={executeSwap}
                  refreshWalletState={refreshWalletState}
                />
              )}
              {activeTab === "liquidity" && (
                <LiquidityCard
                  wallet={wallet}
                  executeAddLiquidity={executeAddLiquidity}
                  refreshWalletState={refreshWalletState}
                />
              )}
              {activeTab === "explorer" && (
                <PoolExplorer
                  poolState={poolState}
                  prices={prices}
                  isLoading={isLoading}
                  error={error}
                />
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Active user positions tracking & LP Claim panels */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <PositionsList
              wallet={wallet}
              positions={positions}
              isWalletLoading={isWalletLoading}
              executeRemoveLiquidity={executeRemoveLiquidity}
              executeClaimFees={executeClaimFees}
              refreshWalletState={refreshWalletState}
            />

            {/* Real wallet guidelines box */}
            <div className="glass-card guide-box p-4 border border-white/5 font-sans text-xs">
              <h3 className="font-bold text-primary flex items-center gap-1.5 mb-2">
                <HelpCircle size={14} className="text-secondary" />
                Algorand Testnet Guide:
              </h3>
              <ul className="list-disc pl-4 space-y-2 text-dim">
                <li>
                  Click the **Connect Wallet** button above to link your Pera Wallet or Defly Wallet on Algorand Testnet.
                </li>
                <li>
                  If you need testnet ALGOs, copy your address and click the **Algorand Testnet Dispenser** link on the balances shelf to receive free ALGOs instantly.
                </li>
                <li>
                  Use the **Swap Tab** to exchange your ALGOs for USDC, USDT, or USDD to fund stablecoin reserves. Make sure to opt-in to the ASAs if your wallet prompts you!
                </li>
                <li>
                  Go to the **Add Liquidity Tab** to deposit stablecoin ratios within your chosen price depeg peg boundaries. This will mint shares in a custom concentrated tick.
                </li>
                <li>
                  Watch your position accrue real-time trading fees from swappers! You can claim fees or liquidate positions in the **My Positions** panel.
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>

      <footer className="glass-footer text-center py-6 border-t border-white/5 text-[11px] text-dim z-10">
        <p>© 2026 TaurusSwap Stablecoin AMM. Built on concentration-optimized torus geometry. Algorand Network.</p>
      </footer>
    </main>
  );
}
