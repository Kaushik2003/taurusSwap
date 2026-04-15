'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  href: string;
  group: string;
  excerpt?: string;
}

const allPages: SearchResult[] = [
  // Introduction
  { title: 'What is Orbital?', href: '/docs/introduction/what-is-orbital', group: 'Introduction', excerpt: 'Learn about the Orbital AMM concept and how it generalizes concentrated liquidity to any number of tokens' },
  { title: 'Why Algorand?', href: '/docs/introduction/why-algorand', group: 'Introduction', excerpt: 'Discover why Algorand is the perfect blockchain for implementing Orbital AMM' },
  { title: 'Quickstart', href: '/docs/introduction/quickstart', group: 'Introduction', excerpt: 'Get started with TaurusSwap in 5 simple steps' },
  
  // Math
  { title: 'Math Overview', href: '/docs/math/overview', group: 'Math', excerpt: 'Bird\'s-eye view of the mathematical foundations' },
  { title: 'Sphere AMM', href: '/docs/math/sphere-amm', group: 'Math', excerpt: 'Full derivation of the sphere invariant and pricing formulas' },
  { title: 'Polar Decomposition', href: '/docs/math/polar-decomposition', group: 'Math', excerpt: 'Decomposing reserves into alpha and w components' },
  { title: 'Ticks and Caps', href: '/docs/math/ticks-and-caps', group: 'Math', excerpt: 'Understanding tick geometry and spherical caps' },
  { title: 'Consolidation', href: '/docs/math/consolidation', group: 'Math', excerpt: 'How multiple ticks collapse into a single pool state' },
  { title: 'Torus Invariant', href: '/docs/math/torus-invariant', group: 'Math', excerpt: 'The master equation that enables O(1) verification' },
  { title: 'Capital Efficiency', href: '/docs/math/capital-efficiency', group: 'Math', excerpt: 'Understanding the 150x capital efficiency advantage' },
  
  // Protocol
  { title: 'Architecture', href: '/docs/protocol/architecture', group: 'Protocol', excerpt: 'Compute off-chain, verify on-chain pattern' },
  { title: 'Smart Contract', href: '/docs/protocol/smart-contract', group: 'Protocol', excerpt: 'ARC-4 contract methods and verification logic' },
  { title: 'State Layout', href: '/docs/protocol/state-layout', group: 'Protocol', excerpt: 'Global state and box storage structure' },
  { title: 'Swap Verification', href: '/docs/protocol/swap-verification', group: 'Protocol', excerpt: 'How the contract verifies swap transactions' },
  { title: 'Tick Crossing', href: '/docs/protocol/tick-crossing', group: 'Protocol', excerpt: 'Multi-segment swaps with tick boundary crossings' },
  { title: 'Fee Accounting', href: '/docs/protocol/fee-accounting', group: 'Protocol', excerpt: 'O(1) fee settlement using growth accumulators' },
  { title: 'Unit Scaling', href: '/docs/protocol/unit-scaling', group: 'Protocol', excerpt: 'Three scaling layers and overflow prevention' },
  
  // SDK
  { title: 'SDK Overview', href: '/docs/sdk/overview', group: 'SDK', excerpt: 'TypeScript SDK architecture and capabilities' },
  { title: 'Installation', href: '/docs/sdk/installation', group: 'SDK', excerpt: 'Install and configure the SDK' },
  { title: 'Reading Pool State', href: '/docs/sdk/reading-pool-state', group: 'SDK', excerpt: 'Read on-chain pool data and decode reserves' },
  { title: 'Quoting Swaps', href: '/docs/sdk/quoting-swaps', group: 'SDK', excerpt: 'Get swap quotes with price impact calculation' },
  { title: 'Executing Swaps', href: '/docs/sdk/executing-swaps', group: 'SDK', excerpt: 'Build and submit swap transactions' },
  { title: 'Adding Liquidity', href: '/docs/sdk/adding-liquidity', group: 'SDK', excerpt: 'Provide liquidity with custom tick parameters' },
  { title: 'Managing Positions', href: '/docs/sdk/managing-positions', group: 'SDK', excerpt: 'Read positions, claim fees, and remove liquidity' },
  { title: 'API Reference', href: '/docs/sdk/api-reference', group: 'SDK', excerpt: 'Complete SDK function reference' },
  
  // Frontend
  { title: 'Frontend Overview', href: '/docs/frontend/overview', group: 'Frontend', excerpt: 'Next.js app structure and architecture' },
  { title: 'Data Hooks', href: '/docs/frontend/data-hooks', group: 'Frontend', excerpt: 'React Query hooks for pool data' },
  { title: 'Visualizations', href: '/docs/frontend/visualizations', group: 'Frontend', excerpt: 'Three.js animations gallery' },
  
  // Reference
  { title: 'Glossary', href: '/docs/reference/glossary', group: 'Reference', excerpt: 'Definitions of key terms and concepts' },
  { title: 'Constants', href: '/docs/reference/constants', group: 'Reference', excerpt: 'Numeric constants and their rationale' },
  { title: 'Deployed Addresses', href: '/docs/reference/deployed-addresses', group: 'Reference', excerpt: 'Live testnet deployment information' },
  { title: 'Paper', href: '/docs/reference/paper', group: 'Reference', excerpt: 'Link to the Paradigm Orbital paper' },
];

interface DocsSearchProps {
  onOpenChange?: (open: boolean) => void;
}

export default function DocsSearch({ onOpenChange }: DocsSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return allPages
      .filter(page => 
        page.title.toLowerCase().includes(lowerQuery) ||
        page.group.toLowerCase().includes(lowerQuery) ||
        page.excerpt?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        onOpenChange?.(true);
      }
      
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        onOpenChange?.(false);
        setQuery('');
      }

      // Navigate with arrow keys
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].href);
            setIsOpen(false);
            onOpenChange?.(false);
            setQuery('');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onOpenChange]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleResultClick = (href: string) => {
    router.push(href);
    setIsOpen(false);
    onOpenChange?.(false);
    setQuery('');
  };

  return (
    <>
      {/* Search trigger */}
      <div className="relative">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search docs... (⌘K)"
          className="docs-search-input cursor-pointer"
          onClick={() => {
            setIsOpen(true);
            onOpenChange?.(true);
          }}
          readOnly
        />
      </div>

      {/* Search modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setIsOpen(false);
              onOpenChange?.(false);
              setQuery('');
            }}
          />

          {/* Modal */}
          <div className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
            <div className="bg-cream border-2 border-dark-green rounded-lg shadow-[4px_4px_0px_0px_rgba(8,71,52,1)] overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 p-4 border-b-2 border-dark-green">
                <Search className="w-5 h-5 text-dark-green flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  className="flex-1 bg-transparent text-dark-green placeholder:text-dark-green/50 outline-none text-lg"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenChange?.(false);
                    setQuery('');
                  }}
                  className="p-1 hover:bg-dark-green/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-dark-green" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {query.trim() === '' ? (
                  <div className="p-8 text-center text-dark-green/60">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Start typing to search documentation...</p>
                    <p className="text-xs mt-2 opacity-60">
                      Use ↑↓ to navigate, Enter to select, Esc to close
                    </p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-8 text-center text-dark-green/60">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No results found for "{query}"</p>
                    <p className="text-xs mt-2 opacity-60">
                      Try different keywords or browse the sidebar
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <button
                        key={result.href}
                        onClick={() => handleResultClick(result.href)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          index === selectedIndex
                            ? 'bg-dark-green/10'
                            : 'hover:bg-dark-green/5'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-dark-green/60 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-dark-green">
                                {result.title}
                              </span>
                              <span className="text-xs text-dark-green/50 font-medium">
                                {result.group}
                              </span>
                            </div>
                            {result.excerpt && (
                              <p className="text-sm text-dark-green/70 mt-1 line-clamp-1">
                                {result.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              {results.length > 0 && (
                <div className="px-4 py-2 border-t-2 border-dark-green bg-dark-green/5">
                  <div className="flex items-center justify-between text-xs text-dark-green/60">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>Esc Close</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
