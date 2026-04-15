'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Hash } from 'lucide-react';
import searchIndex from '@/data/search-index.json';

interface SearchEntry {
  title: string;
  slug: string;
  section: string;
  content: string;
}

const INDEX = searchIndex as SearchEntry[];

// Highlight matching text — wraps matched span in <mark>
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#9FE870]/40 text-inherit rounded-[2px] px-[1px]">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// Extract a short snippet around the first match in content
function getSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 90) + '…';
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + query.length + 60);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

function search(query: string): SearchEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return INDEX.filter((entry) => {
    const inTitle = entry.title.toLowerCase().includes(q);
    const inSection = entry.section.toLowerCase().includes(q);
    const inContent = entry.content.toLowerCase().includes(q);
    return inTitle || inSection || inContent;
  }).sort((a, b) => {
    // Title matches rank first, then section, then content
    const aTitle = a.title.toLowerCase().includes(q);
    const bTitle = b.title.toLowerCase().includes(q);
    if (aTitle && !bTitle) return -1;
    if (!aTitle && bTitle) return 1;
    return 0;
  });
}

interface DocSearchProps {
  onNavigate?: () => void;
}

export default function DocSearch({ onNavigate }: DocSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  // Reset active index when results change
  const results = useMemo(() => search(debouncedQuery), [debouncedQuery]);
  useEffect(() => setActiveIndex(0), [debouncedQuery]);

  // Cmd/Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const navigate = useCallback(
    (slug: string) => {
      router.push(slug);
      setQuery('');
      setDebouncedQuery('');
      setOpen(false);
      inputRef.current?.blur();
      onNavigate?.();
    },
    [router, onNavigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || results.length === 0) {
        if (e.key === 'Escape') {
          setQuery('');
          setOpen(false);
          inputRef.current?.blur();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[activeIndex]) navigate(results[activeIndex].slug);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (query) {
          setQuery('');
          setOpen(false);
        } else {
          setOpen(false);
          inputRef.current?.blur();
        }
      }
    },
    [open, results, activeIndex, navigate, query],
  );

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative mb-4">
      {/* Input */}
      <div className="relative">
        <Search
          className="search-icon pointer-events-none"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search docs… (⌘K)"
          className="docs-search-input pr-16"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Right-side affordances */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {query ? (
            <button
              className="pointer-events-auto p-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
              aria-label="Clear"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground leading-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-lg border-2 border-dark-green bg-white shadow-[0_8px_24px_rgba(22,51,0,0.12)] overflow-hidden"
          style={{ maxHeight: '360px', overflowY: 'auto' }}
          role="presentation"
        >
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Search className="w-5 h-5 opacity-40" />
              <p className="text-sm font-medium">No results for &ldquo;{debouncedQuery}&rdquo;</p>
              <p className="text-xs opacity-60">Try a different keyword</p>
            </div>
          ) : (
            <ul ref={listRef} role="listbox" aria-label="Search results">
              {results.map((entry, i) => {
                const isActive = i === activeIndex;
                const snippet = getSnippet(entry.content, debouncedQuery);
                return (
                  <li
                    key={entry.slug}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    className={`group flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/30 last:border-b-0 ${
                      isActive ? 'bg-[#163300] text-white' : 'hover:bg-[#f0faea] text-foreground'
                    }`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigate(entry.slug)}
                  >
                    <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                      isActive ? 'bg-white/15' : 'bg-dark-green/8'
                    }`}>
                      <Hash className={`w-3 h-3 ${isActive ? 'text-[#9FE870]' : 'text-dark-green/50'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          isActive ? 'text-[#9FE870]/80' : 'text-dark-green/40'
                        }`}>
                          {entry.section}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold truncate leading-snug mt-0.5 ${
                        isActive ? 'text-white' : 'text-foreground'
                      }`}>
                        {highlight(entry.title, debouncedQuery)}
                      </p>
                      <p className={`text-xs mt-0.5 leading-relaxed line-clamp-1 ${
                        isActive ? 'text-white/60' : 'text-muted-foreground'
                      }`}>
                        {highlight(snippet, debouncedQuery)}
                      </p>
                    </div>

                    <ArrowRight className={`mt-1 w-3.5 h-3.5 shrink-0 transition-opacity ${
                      isActive ? 'opacity-100 text-[#9FE870]' : 'opacity-0 group-hover:opacity-40'
                    }`} />
                  </li>
                );
              })}
            </ul>
          )}

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t-2 border-border px-3 py-2 bg-muted/30">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">↵</kbd>
              open
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">esc</kbd>
              close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
