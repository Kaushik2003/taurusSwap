"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, Wallet, ChevronDown, Copy, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { networks } from '@/data/mock';
import ConnectWallet from '../ConnectWallet';
import localFont from 'next/font/local';

const wiseSans = localFont({ src: '../../public/fonts/wise-sans.otf' });

const navItems = [
  { label: 'Trade', to: '/trade', bg: '#FCA5F1' },
  { label: 'Explore', to: '/explore', bg: '#B6F4CC' },
  { label: 'Pool', to: '/pool', bg: '#FFC1D9' },
  { label: 'Portfolio', to: '/portfolio', bg: '#C0FCFD' },
  { label: 'Docs', to: '/docs', bg: '#b5aaffff' },
];

export default function Navbar() {
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const { activeAddress, wallets } = useWallet();
  const { selectedNetwork, setNetwork, isWalletModalOpen, toggleWalletModal } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWalletConnected = !!activeAddress;
  const walletAddress = activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}` : "";
  const currentNetwork = networks.find((n) => n.id === selectedNetwork) || networks[0];

  return (
    <>
      <nav className={`sticky top-0 z-50 pt-5 pb-3 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 mr-2 shrink-0">
            <img src="/favicon.ico" alt="TaurusSwap" className="w-14 h-14 rounded-full border-[2.5px] border-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)]" />
            <span className={`hidden sm:block text-2xl font-black text-dark-green tracking-widest leading-none ${wiseSans.className}`}>TAURUS SWAP</span>
          </Link>

          <div className="hidden md:flex items-center gap-3 ml-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                href={item.to}
                className="px-5 py-2 rounded-full border-[2.5px] border-dark-green font-black text-sm uppercase tracking-wider text-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all"
                style={{ backgroundColor: item.bg }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            {mounted ? (
              <>
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => { setNetworkOpen((open) => !open); setWalletOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border-[2.5px] border-dark-green font-black text-sm uppercase tracking-wider text-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] bg-white transition-all"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ background: currentNetwork.color }} />
                    <span className="hidden lg:inline">{currentNetwork.name}</span>
                    <ChevronDown className="w-4 h-4" strokeWidth={3} />
                  </button>
                  {networkOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 glass-panel border border-border p-2 animate-scale-in">
                      {networks.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNetwork(n.id);
                            setNetworkOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-dark-green/70 hover:text-dark-green hover:bg-dark-green/10 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                          <span className="font-bold">{n.name}</span>
                          {n.id === selectedNetwork && <span className="ml-auto text-dark-green">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  {isWalletConnected ? (
                    <button
                      type="button"
                      onClick={() => { setWalletOpen((o) => !o); setNetworkOpen(false); }}
                      className="flex items-center gap-2 px-5 py-2 rounded-full border-[2.5px] border-dark-green font-black text-sm uppercase tracking-wider text-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] bg-white transition-all"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-green border border-dark-green" />
                      <span className="hidden sm:inline">{walletAddress}</span>
                      <Wallet className="w-5 h-5 sm:hidden" strokeWidth={2.5} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setWalletOpen((o) => !o); setNetworkOpen(false); }}
                      className="flex items-center gap-2 px-5 py-2 rounded-full border-[2.5px] border-dark-green font-black text-sm uppercase tracking-wider text-dark-green shadow-[-3px_3px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] bg-[#FFE169] transition-all"
                    >
                      <Wallet className="w-[18px] h-[18px]" strokeWidth={3} />
                      <span>Connect Wallet</span>
                    </button>
                  )}

                  {walletOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-dark-green/10 overflow-hidden animate-scale-in z-50">
                      {isWalletConnected ? (
                        <div className="flex flex-col">
                          <div className="p-5 pb-4">
                            <span className="text-[13px] font-bold text-dark-green/50 uppercase tracking-[0.05em] block mb-2">Connected</span>
                            <div className="text-[15px] font-mono font-medium text-dark-green break-all leading-snug">
                              {activeAddress}
                            </div>
                          </div>

                          <div className="h-px bg-border/40" />
                          <button
                            onClick={() => {
                              if (activeAddress) navigator.clipboard.writeText(activeAddress);
                              setWalletOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-5 py-4 text-dark-green hover:bg-black/[0.03] transition-colors font-bold text-[16px]"
                          >
                            <Copy className="w-[20px] h-[20px] text-dark-green" strokeWidth={2} />
                            Copy address
                          </button>

                          <div className="h-px bg-border/40" />
                          <button
                            onClick={async () => {
                              if (wallets) {
                                const activeWallet = wallets.find((w) => w.isActive);
                                if (activeWallet) {
                                  await activeWallet.disconnect();
                                } else {
                                  localStorage.removeItem('@txnlab/use-wallet:v3');
                                  window.location.reload();
                                }
                              }
                              setWalletOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-5 py-4 text-[#E53E3E] hover:bg-black/[0.03] transition-colors font-bold text-[16px]"
                          >
                            <LogOut className="w-[20px] h-[20px] text-[#E53E3E]" strokeWidth={2} />
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col p-3">
                          <span className="text-[12px] font-bold text-dark-green/50 uppercase tracking-[0.05em] block mb-2 px-3 pt-2">Select Wallet</span>
                          {wallets?.map((wallet) => (
                            <button
                              key={`provider-${wallet.id}`}
                              className="flex items-center gap-4 w-full p-3 rounded-2xl hover:bg-black/[0.03] transition-colors group"
                              onClick={async () => {
                                try {
                                  setWalletOpen(false);
                                  await wallet.connect();
                                } catch (e) {
                                  console.error('Wallet connection failed:', e);
                                }
                              }}
                            >
                              {wallet.id !== 'kmd' && (
                                <img
                                  alt={`${wallet.id}_icon`}
                                  src={wallet.metadata.icon}
                                  className="w-[42px] h-[42px] object-contain rounded-xl"
                                />
                              )}
                              {wallet.id === 'kmd' && (
                                <div className="w-[42px] h-[42px] rounded-xl bg-black/5 flex items-center justify-center">
                                  <Wallet className="w-6 h-6 text-dark-green" />
                                </div>
                              )}
                              <span className="font-bold text-[18px] text-dark-green">
                                {wallet.id === 'kmd' ? 'LocalNet Wallet' : wallet.metadata.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-24 h-10 animate-pulse bg-white border-2 border-dark-green rounded-full hidden sm:block"></div>
            )}

            <button
              type="button"
              className="md:hidden p-2 text-dark-green"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-black/5 px-4 py-3 animate-fade-in bg-green/95 backdrop-blur-md">
            {navItems.map((item) => (
              <Link
                key={item.to}
                href={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${pathname === item.to ? "text-dark-green bg-dark-green/10" : "text-dark-green/60 hover:text-dark-green"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {(networkOpen || walletOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setNetworkOpen(false);
            setWalletOpen(false);
          }}
        />
      )}
      <ConnectWallet openModal={isWalletModalOpen} closeModal={() => toggleWalletModal(false)} />
    </>
  );
}
