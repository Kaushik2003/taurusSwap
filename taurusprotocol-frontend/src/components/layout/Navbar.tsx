import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, Wallet, ChevronDown, Zap } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { networks } from '@/data/mock';

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
  const { isWalletConnected, walletAddress, connectWallet, disconnectWallet, selectedNetwork, setNetwork } = useAppStore();
  const [networkOpen, setNetworkOpen] = useState(false);

  const currentNetwork = networks.find(n => n.id === selectedNetwork) || networks[0];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/50" style={{ background: 'hsl(240 10% 4% / 0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-2">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 mr-2 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center glow-primary" style={{ background: 'linear-gradient(135deg, hsl(328 100% 54%), hsl(270 80% 60%))' }}>
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:block">FluxSwap</span>
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
              className="hidden lg:flex items-center gap-2 glass-panel px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full max-w-sm cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search tokens, pools...</span>
              <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">/</kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Network selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setNetworkOpen(!networkOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/50 hover:border-border"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: currentNetwork.color }} />
                <span className="hidden lg:inline">{currentNetwork.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {networkOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass-panel border border-border p-2 animate-scale-in">
                  {networks.map(n => (
                    <button
                      key={n.id}
                      onClick={() => { setNetwork(n.id); setNetworkOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                      {n.name}
                      {n.id === selectedNetwork && <span className="ml-auto text-primary">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Connect */}
            {isWalletConnected ? (
              <button
                onClick={disconnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="hidden sm:inline">{walletAddress}</span>
                <Wallet className="w-4 h-4 sm:hidden" />
              </button>
            ) : (
              <Button
                onClick={connectWallet}
                className="rounded-2xl px-5 font-semibold"
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
          <div className="md:hidden border-t border-border/50 px-4 py-3 animate-fade-in">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.to ? 'text-foreground bg-muted/50' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Click outside to close network dropdown */}
      {networkOpen && <div className="fixed inset-0 z-40" onClick={() => setNetworkOpen(false)} />}
    </>
  );
}
