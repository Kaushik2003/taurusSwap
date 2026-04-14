import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, Wallet, ChevronDown, Zap } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { networks } from '@/data/mock';
import { useWallet } from '@txnlab/use-wallet-react';
import ConnectWallet from '../ConnectWallet';

const navItems = [
  { label: 'Trade', to: '/' },
  { label: 'Explore', to: '/explore' },
  { label: 'Pool', to: '/pool' },
  { label: 'Portfolio', to: '/portfolio' },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { selectedNetwork, setNetwork, isWalletModalOpen, toggleWalletModal } = useAppStore();
  const [networkOpen, setNetworkOpen] = useState(false);
  
  const { activeAddress, wallets } = useWallet();
  const isWalletConnected = !!activeAddress;
  const walletAddress = activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}` : '';

  const currentNetwork = networks.find(n => n.id === selectedNetwork) || networks[0];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/10" style={{ background: 'rgba(206,241,123,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-2">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 mr-2 shrink-0">
            <img src="/favicon.ico" alt="TaurusSwap" className="w-8 h-8 rounded-xl" />
            <span className="text-xl font-black text-[#084734] hidden sm:block tracking-tighter">TaurusSwap</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${location.pathname === item.to ? 'nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 flex justify-center mx-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm text-[#084734]/60 hover:text-[#084734] transition-colors w-full max-w-sm cursor-pointer rounded-xl bg-black/5 border border-black/5"
            >
              <Search className="w-4 h-4" />
              <span>Search tokens, pools...</span>
              <kbd className="ml-auto text-xs bg-black/10 px-1.5 py-0.5 rounded opacity-50">/</kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Network selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setNetworkOpen(!networkOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[#084734]/80 hover:text-[#084734] transition-colors border border-[#084734]/10 hover:border-[#084734]/20 bg-white/10"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: currentNetwork.color }} />
                <span className="hidden lg:inline font-bold">{currentNetwork.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {networkOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass-panel border border-border p-2 animate-scale-in">
                  {networks.map(n => (
                    <button
                      key={n.id}
                      onClick={() => { setNetwork(n.id as any); setNetworkOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[#084734]/70 hover:text-[#084734] hover:bg-[#084734]/10 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                      <span className="font-bold">{n.name}</span>
                      {n.id === selectedNetwork && <span className="ml-auto text-[#084734]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Connect */}
            {isWalletConnected ? (
              <button
                onClick={async () => {
                  if (wallets) {
                    const activeWallet = wallets.find((w) => w.isActive);
                    if (activeWallet) {
                      await activeWallet.disconnect();
                    } else {
                      localStorage.removeItem('@txnlab/use-wallet:v3')
                      window.location.reload()
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold bg-[#084734] text-[#CEF17B] transition-all hover:scale-[1.02]"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline">{walletAddress}</span>
                <Wallet className="w-4 h-4 sm:hidden" />
              </button>
            ) : (
              <Button
                onClick={() => toggleWalletModal(true)}
                className="rounded-2xl px-6 font-bold z-50 relative bg-[#084734] text-[#CEF17B] border-none hover:bg-[#0a5a42]"
                size="sm"
              >
                Connect
              </Button>
            )}

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-black/5 px-4 py-3 animate-fade-in bg-[#CEF17B]/95 backdrop-blur-md">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${location.pathname === item.to ? 'text-[#084734] bg-[#084734]/10' : 'text-[#084734]/60 hover:text-[#084734]'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Click outside to close network dropdown */}
      {networkOpen && <div className="fixed inset-0 z-40" onClick={() => setNetworkOpen(false)} />}
      
      {/* Wallet Modal */}
      <ConnectWallet openModal={isWalletModalOpen} closeModal={() => toggleWalletModal(false)} />
    </>
  );
}
