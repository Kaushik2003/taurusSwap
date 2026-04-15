"use client";

import Link from 'next/link';
import { Home, Wallet, Copy, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const { activeAddress, wallets } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWalletConnected = !!activeAddress;
  const walletAddressShort = activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}` : "";

  return (
    <>
      <nav className="sticky top-0 z-50 pt-5 pb-3">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 mr-2 shrink-0">
            <img 
              src="/logo.png" 
              alt="TaurusSwap" 
              className="w-12 h-12 rounded-full border-[2.5px] border-dark-green shadow-[-3px_3px_0_0_var(--dark-green)]" 
            />
            <span className="hidden sm:block text-xl font-black text-dark-green tracking-widest leading-none font-wise uppercase">
              TAURUS FAUCET
            </span>
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            {mounted ? (
              <div className="relative">
                {isWalletConnected ? (
                  <button
                    type="button"
                    onClick={() => setWalletOpen(!walletOpen)}
                    className="flex items-center gap-2 px-5 py-2 rounded-full border-[2.5px] border-dark-green font-black text-sm uppercase tracking-wider text-dark-green shadow-[-3px_3px_0_0_var(--dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--dark-green)] bg-white transition-all"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-green border border-dark-green" />
                    <span className="hidden sm:inline">{walletAddressShort}</span>
                    <Wallet className="w-5 h-5 sm:hidden" strokeWidth={2.5} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWalletOpen(!walletOpen)}
                    className="flex items-center gap-2 px-5 py-2 rounded-full border-[2.5px] border-dark-green font-black text-sm uppercase tracking-wider text-dark-green shadow-[-3px_3px_0_0_var(--dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--dark-green)] bg-[#FFE169] transition-all"
                  >
                    <Wallet className="w-[18px] h-[18px]" strokeWidth={3} />
                    <span>Connect</span>
                  </button>
                )}

                {walletOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] bg-white rounded-3xl shadow-[4px_4px_0_0_rgba(10,63,47,1)] border-2 border-dark-green overflow-hidden animate-in fade-in zoom-in duration-200 z-50">
                    {isWalletConnected ? (
                      <div className="flex flex-col">
                        <div className="p-4 border-b-2 border-dark-green/10">
                          <span className="text-[10px] font-bold text-dark-green/50 uppercase tracking-widest block mb-1">Active Address</span>
                          <div className="text-[13px] font-mono font-medium text-dark-green break-all">
                            {activeAddress}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (activeAddress) navigator.clipboard.writeText(activeAddress);
                            setWalletOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-5 py-3 text-dark-green hover:bg-green/10 transition-colors font-bold text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copy address
                        </button>

                        <button
                          onClick={async () => {
                            if (wallets) {
                              const activeWallet = wallets.find((w) => w.isActive);
                              if (activeWallet) await activeWallet.disconnect();
                            }
                            setWalletOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-5 py-3 text-[#E53E3E] hover:bg-red-50 transition-colors font-bold text-sm"
                        >
                          <LogOut className="w-4 h-4" />
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col p-2">
                        <span className="text-[10px] font-bold text-dark-green/50 uppercase tracking-widest block mb-2 px-3 pt-2">Select Wallet</span>
                        {wallets?.map((wallet) => (
                          <button
                            key={wallet.id}
                            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-green/10 transition-colors group"
                            onClick={async () => {
                              try {
                                setWalletOpen(false);
                                await wallet.connect();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                          >
                            <img src={wallet.metadata.icon} alt={wallet.id} className="w-8 h-8 rounded-lg" />
                            <span className="font-bold text-sm text-dark-green">{wallet.metadata.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 h-10 animate-pulse bg-white/50 border-2 border-dark-green rounded-full"></div>
            )}
          </div>
        </div>
      </nav>

      {walletOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setWalletOpen(false)} />
      )}
    </>
  );
}
