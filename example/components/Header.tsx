"use client";

import { useState } from "react";
import { TOKENS, TokenInfo } from "../hooks/useTaurus";
import { Wallet, RefreshCw, LogOut, ExternalLink, Smartphone, ShieldCheck, Check } from "lucide-react";

interface HeaderProps {
  wallet: any;
  isWalletLoading: boolean;
  connectWallet: (type: "pera" | "defly") => void;
  disconnectWallet: () => void;
  refreshWalletState: () => void;
}

export default function Header({
  wallet,
  isWalletLoading,
  connectWallet,
  disconnectWallet,
  refreshWalletState,
}: HeaderProps) {
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  const getFriendlyTokenBalance = (token: TokenInfo) => {
    if (!wallet || !wallet.balances) return "0.00";
    const balance = wallet.balances[token.asaId] || 0n;
    return (Number(balance) / 10 ** token.decimals).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  const algoBalanceFormatted = wallet
    ? (Number(wallet.algoBalance) / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  const handleSelectWallet = (type: "pera" | "defly") => {
    connectWallet(type);
    setIsConnectOpen(false);
  };

  return (
    <header className="glass-header">
      <div className="header-container">
        {/* Logo and Brand */}
        <div className="brand">
          <div className="logo-icon">T</div>
          <div className="brand-text">
            <h1>TaurusSwap</h1>
            <span> concentrated-liquidity stable-AMM </span>
          </div>
        </div>

        {/* Wallet Controller Panel */}
        <div className="wallet-panel">
          {wallet ? (
            <div className="wallet-connected-container">
              {/* Address indicator with connector label */}
              <div className="wallet-badge flex-center">
                <span className="wallet-type-label uppercase text-[8px] bg-secondary/20 text-secondary border border-secondary/30 px-1.5 py-0.5 rounded mr-2 font-bold font-mono">
                  {wallet.connectorType || "pera"}
                </span>
                <span className="algo-amount">{algoBalanceFormatted} ALGO</span>
                <span className="address-hash ml-2">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}
                </span>
                <button
                  className="refresh-btn ml-2"
                  onClick={refreshWalletState}
                  disabled={isWalletLoading}
                  title="Refresh Balances"
                >
                  <RefreshCw className={isWalletLoading ? "spin" : ""} size={14} />
                </button>
              </div>

              {/* Connected wallet options */}
              <div className="header-actions">
                <a
                  href={`https://testnet.explorer.perawallet.app/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-icon-btn"
                  title="View on Pera Explorer"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  className="action-icon-btn disconnect"
                  onClick={disconnectWallet}
                  title="Disconnect Wallet Session"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="wallet-disconnected-actions">
              <button
                className="btn btn-sandbox flex-center gap-2"
                onClick={() => setIsConnectOpen(!isConnectOpen)}
              >
                <Wallet size={14} />
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown drawer select wallet option */}
      {isConnectOpen && !wallet && (
        <div className="import-drawer glass-card select-wallet-drawer">
          <h3 className="drawer-title flex-center gap-2 mb-2 font-mono font-bold text-sm text-primary">
            <Smartphone size={16} className="text-secondary animate-pulse" />
            Connect Algorand Provider
          </h3>
          <p className="drawer-desc text-dim text-xs mb-4">
            Select a verified Algorand wallet provider to sign and submit smart contract transactions on Testnet securely.
          </p>
          
          <div className="wallet-options-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pera Wallet Connector Button */}
            <button
              onClick={() => handleSelectWallet("pera")}
              className="wallet-option-button glass-card p-4 text-left flex-center gap-3 border border-white/5 hover:border-amber-400/40 bg-white/5 transition-all w-full cursor-pointer"
            >
              <div className="wallet-option-icon bg-amber-400/10 text-amber-400 p-2 rounded-lg">
                <Smartphone size={24} />
              </div>
              <div className="wallet-option-text">
                <div className="font-bold text-xs text-white">Pera Wallet</div>
                <div className="text-[10px] text-dim font-sans mt-0.5">Connect via mobile QR or web extension</div>
              </div>
            </button>

            {/* Defly Wallet Connector Button */}
            <button
              onClick={() => handleSelectWallet("defly")}
              className="wallet-option-button glass-card p-4 text-left flex-center gap-3 border border-white/5 hover:border-secondary/40 bg-white/5 transition-all w-full cursor-pointer"
            >
              <div className="wallet-option-icon bg-secondary/10 text-secondary p-2 rounded-lg">
                <ShieldCheck size={24} />
              </div>
              <div className="wallet-option-text">
                <div className="font-bold text-xs text-white">Defly Wallet</div>
                <div className="text-[10px] text-dim font-sans mt-0.5">Pro Algorand wallet connect for power traders</div>
              </div>
            </button>
          </div>

          <div className="drawer-footer flex-end gap-2 mt-4 text-[10px] text-dim text-right">
            <span>Don't have a wallet? Install Pera Wallet on iOS/Android.</span>
          </div>
        </div>
      )}

      {/* Connected active balances shelf */}
      {wallet && (
        <div className="balances-shelf flex-center">
          <div className="balances-container">
            <div className="faucet-helper">
              <span className="helper-label text-dim">Active balances:</span>
              <a
                href="https://bank.testnet.algorand.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="faucet-link flex-center gap-1 text-[11px]"
                title="Dispense Algo to this address"
              >
                Algorand Testnet Dispenser <ExternalLink size={10} />
              </a>
            </div>
            <div className="token-balances-row">
              {TOKENS.map((token) => (
                <div key={token.index} className="token-balance-card flex-center gap-2">
                  <span className="token-dot" style={{ backgroundColor: token.color }}></span>
                  <span className="token-bal-symbol">{token.symbol}:</span>
                  <span className="token-bal-val font-mono">{getFriendlyTokenBalance(token)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
