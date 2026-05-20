"use client";

import { useState } from "react";
import { useTaurus } from "../hooks/useTaurus";
import Header from "../components/Header";
import SwapCard from "../components/SwapCard";
import LiquidityCard from "../components/LiquidityCard";
import PoolExplorer from "../components/PoolExplorer";
import PositionsList from "../components/PositionsList";
import SdkActivityLog from "../components/SdkActivityLog";
import { Coins, Layers, Compass, Sparkles, Activity, Award, HelpCircle, Terminal } from "lucide-react";

export default function Home() {
  const {
    client,
    poolState,
    prices,
    isLoading,
    error,
    sdkLog,
    trackCall,
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

  const [activeTab, setActiveTab] = useState<"swap" | "liquidity" | "explorer" | "sdk">("swap");

  return (
    <main className="min-h-screen bg-obsidian flex flex-col relative overflow-x-hidden text-white font-sans antialiased">
      <div className="cosmic-glow-1" />
      <div className="cosmic-glow-2" />
      <div className="cosmic-glow-3" />

      <Header
        wallet={wallet}
        isWalletLoading={isWalletLoading}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        refreshWalletState={refreshWalletState}
      />

      <div className="dashboard-content-wrapper flex-grow max-w-7xl w-full mx-auto px-4 py-6 md:py-10 z-10">

        {/* Banner */}
        <div className="intro-card glass-card p-6 mb-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="glow-bg absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-secondary/5 -z-10" />
          <div className="max-w-2xl">
            <h2 className="text-xl md:text-2xl font-sans font-black flex items-center gap-2 mb-2 text-primary">
              TaurusSwap Stablecoin AMM
              <span className="badge-math font-mono font-bold text-[9px] bg-secondary/20 text-secondary border border-secondary/30 rounded py-0.5 px-2">
                N-Torus Concentrated Liquidity
              </span>
            </h2>
            <p className="text-dim text-sm leading-relaxed">
              Next-generation Algorand concentrated liquidity protocol. Deposit stablecoins symmetrically with configurable depeg boundaries for up to 100x capital efficiency. Connect Pera or Defly wallet to interact on Testnet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="stats-metric-pill flex-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-primary font-mono">
              <Activity size={13} className="text-secondary animate-pulse" />
              <span>Pool: 758284478</span>
            </div>
            <div className="stats-metric-pill flex-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-primary font-mono">
              <Award size={13} className="text-emerald" />
              <span>5 assets · symmetric</span>
            </div>
            {sdkLog.length > 0 && (
              <div
                className="stats-metric-pill flex-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-mono cursor-pointer hover:border-white/20 transition-colors"
                onClick={() => setActiveTab("sdk")}
                style={{ color: "#00F2FE", borderColor: "rgba(0,242,254,0.2)" }}
              >
                <Terminal size={13} />
                <span>{sdkLog.length} SDK calls</span>
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="dashboard-grid grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Tab bar */}
            <div className="tab-navigation-bar flex-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
              <button
                className={`tab-btn flex-center gap-2 py-2 px-4 rounded-lg text-sm font-bold flex-1 transition-all ${
                  activeTab === "swap" ? "active bg-primary/20 text-primary border border-primary/30" : "text-dim hover:text-white"
                }`}
                onClick={() => setActiveTab("swap")}
              >
                <Coins size={16} />Swap
              </button>
              <button
                className={`tab-btn flex-center gap-2 py-2 px-4 rounded-lg text-sm font-bold flex-1 transition-all ${
                  activeTab === "liquidity" ? "active bg-secondary/20 text-secondary border border-secondary/30" : "text-dim hover:text-white"
                }`}
                onClick={() => setActiveTab("liquidity")}
              >
                <Sparkles size={16} />Liquidity
              </button>
              <button
                className={`tab-btn flex-center gap-2 py-2 px-4 rounded-lg text-sm font-bold flex-1 transition-all ${
                  activeTab === "explorer" ? "active bg-emerald/20 text-emerald border border-emerald/30" : "text-dim hover:text-white"
                }`}
                onClick={() => setActiveTab("explorer")}
              >
                <Compass size={16} />Explorer
              </button>
              <button
                className={`tab-btn flex-center gap-2 py-2 px-4 rounded-lg text-sm font-bold flex-1 transition-all ${
                  activeTab === "sdk" ? "active" : "text-dim hover:text-white"
                }`}
                style={activeTab === "sdk" ? {
                  background: "rgba(0,242,254,0.1)",
                  color: "#00F2FE",
                  border: "1px solid rgba(0,242,254,0.3)",
                } : {}}
                onClick={() => setActiveTab("sdk")}
              >
                <Terminal size={16} />SDK Log
                {sdkLog.filter(e => e.status === "pending").length > 0 && (
                  <span style={{
                    background: "#00F2FE", color: "#0a0a0e",
                    borderRadius: "50%", width: 16, height: 16,
                    fontSize: 9, fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {sdkLog.filter(e => e.status === "pending").length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="tab-pane-container">
              {activeTab === "swap" && (
                <SwapCard
                  client={client}
                  trackCall={trackCall}
                  wallet={wallet}
                  prices={prices}
                  executeSwap={executeSwap}
                  refreshWalletState={refreshWalletState}
                />
              )}
              {activeTab === "liquidity" && (
                <LiquidityCard
                  client={client}
                  trackCall={trackCall}
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
              {activeTab === "sdk" && (
                <SdkActivityLog entries={sdkLog} />
              )}
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <PositionsList
              wallet={wallet}
              positions={positions}
              isWalletLoading={isWalletLoading}
              executeRemoveLiquidity={executeRemoveLiquidity}
              executeClaimFees={executeClaimFees}
              refreshWalletState={refreshWalletState}
            />

            <div className="glass-card guide-box p-4 border border-white/5 font-sans text-xs">
              <h3 className="font-bold text-primary flex items-center gap-1.5 mb-2">
                <HelpCircle size={14} className="text-secondary" />
                Algorand Testnet Guide
              </h3>
              <ul className="list-disc pl-4 space-y-2 text-dim">
                <li>Connect Pera or Defly wallet in the header to start interacting on Testnet.</li>
                <li>Need testnet ALGOs? Copy your address and use the Algorand Testnet Dispenser.</li>
                <li>Use the Swap tab to exchange tokens — watch the SDK tab for live call output.</li>
                <li>Add liquidity with a custom depeg boundary to earn concentrated trading fees.</li>
                <li>Track your positions and claim accrued fees in the My Positions panel.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      <footer className="glass-footer text-center py-6 border-t border-white/5 text-[11px] text-dim z-10">
        <p>© 2026 TaurusSwap · N-Torus Concentrated AMM · Algorand Testnet</p>
      </footer>
    </main>
  );
}
