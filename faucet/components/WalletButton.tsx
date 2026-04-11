'use client';

import { useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  const { activeAddress, wallets, isReady } = useWallet();
  const [open, setOpen] = useState(false);

  // ── Disconnected state ──────────────────────────────────────────────────
  if (!activeAddress) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={!isReady}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold bg-[#084734] text-[#CEF17B] hover:bg-[#0a5a42] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <WalletIcon />
          Connect Wallet
        </button>

        {/* Wallet picker dropdown */}
        {open && wallets && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-40 w-56 rounded-2xl border border-[#084734]/10 bg-white shadow-xl overflow-hidden animate-fade-in">
              <p className="px-4 pt-3 pb-1 text-xs font-bold text-[#084734]/40 uppercase tracking-wider">
                Select wallet
              </p>
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={async () => {
                    setOpen(false);
                    await wallet.connect();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-[#084734] hover:bg-[#CEF17B]/20 transition-colors"
                >
                  {wallet.metadata.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={wallet.metadata.icon}
                      alt={wallet.metadata.name}
                      className="w-6 h-6 rounded-lg"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-lg bg-[#084734]/10 flex items-center justify-center text-xs font-black text-[#084734]">
                      {wallet.metadata.name[0]}
                    </span>
                  )}
                  {wallet.metadata.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Connected state ─────────────────────────────────────────────────────
  const activeWallet = wallets?.find((w) => w.isActive);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-bold bg-[#084734] text-[#CEF17B] hover:bg-[#0a5a42] transition-all hover:scale-[1.02]"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        <span className="font-mono">{truncate(activeAddress)}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-40 w-56 rounded-2xl border border-[#084734]/10 bg-white shadow-xl overflow-hidden animate-fade-in">
            {/* Address */}
            <div className="px-4 py-3 border-b border-[#084734]/10">
              <p className="text-xs text-[#084734]/40 font-bold uppercase tracking-wider mb-0.5">
                Connected
              </p>
              <p className="text-xs font-mono text-[#084734] break-all">{activeAddress}</p>
            </div>

            {/* Copy */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeAddress);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-[#084734] hover:bg-[#CEF17B]/20 transition-colors"
            >
              <CopyIcon />
              Copy address
            </button>

            {/* Disconnect */}
            <button
              onClick={async () => {
                setOpen(false);
                if (activeWallet) await activeWallet.disconnect();
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-[#084734]/10"
            >
              <DisconnectIcon />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tiny inline icons ────────────────────────────────────────────────────────

function WalletIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
