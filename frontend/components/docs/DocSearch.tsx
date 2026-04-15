'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, ArrowRight,
  BookOpen, Pi, Layers, Code2, Monitor, FileText,
} from 'lucide-react';
import searchIndex from '@/data/search-index.json';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchEntry {
  title: string;
  slug: string;
  section: string;
  content: string;
}

const INDEX = searchIndex as SearchEntry[];

// ─── Section metadata ─────────────────────────────────────────────────────────

const SECTION_META: Record<string, { icon: ReactNode; color: string }> = {
  Introduction: {
    icon: <BookOpen className="w-3 h-3" />,
    color: '#2563eb',
  },
  Math: {
    icon: <Pi className="w-3 h-3" />,
    color: '#7c3aed',
  },
  Protocol: {
    icon: <Layers className="w-3 h-3" />,
    color: '#0891b2',
  },
  SDK: {
    icon: <Code2 className="w-3 h-3" />,
    color: '#059669',
  },
  Frontend: {
    icon: <Monitor className="w-3 h-3" />,
    color: '#d97706',
  },
  Reference: {
    icon: <FileText className="w-3 h-3" />,
    color: '#dc2626',
  },
};

const SUGGESTIONS = ['sphere', 'swap', 'liquidity', 'torus', 'SDK', 'tick'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wrap every occurrence of query in a <mark>. */
function highlight(text: string, query: string): ReactNode {
  if (!query || !text) return text;
  const q = query.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let lower = text.toLowerCase();
  let idx: number;

  // eslint-disable-next-line no-cond-assign
  while ((idx = lower.indexOf(q, cursor)) !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <mark
        key={idx}
        className="bg-[#fef08a] text-[#713f12] rounded-[2px] px-[1px] not-italic font-[inherit]"
      >
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    cursor = idx + query.length;
    lower = lower.slice(0, cursor) + '\x00'.repeat(lower.length - cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length ? <>{parts}</> : text;
}

/** Pull a readable snippet centred on the first query match. */
function getSnippet(content: string, query: string): string {
  const q = query.toLowerCase();
  const idx = content.toLowerCase().indexOf(q);
  if (idx === -1) return content.slice(0, 88) + (content.length > 88 ? '…' : '');
  const start = Math.max(0, idx - 28);
  const end = Math.min(content.length, idx + query.length + 56);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

/** Case-insensitive search ranked by title > section > content. */
function runSearch(query: string): SearchEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return INDEX
    .filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.section.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const aT = a.title.toLowerCase().includes(q);
      const bT = b.title.toLowerCase().includes(q);
      if (aT !== bT) return aT ? -1 : 1;
      const aS = a.section.toLowerCase().includes(q);
      const bS = b.section.toLowerCase().includes(q);
      if (aS !== bS) return aS ? -1 : 1;
      return 0;
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Debounce input → search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => runSearch(debouncedQuery), [debouncedQuery]);
  useEffect(() => setActiveIndex(0), [debouncedQuery]);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    return () => document.removeEventListener('mousedown', onMouse);
  }, []);

  // Scroll active result into view
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
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
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (open && results.length) setActiveIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (open && results.length) setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (open && results[activeIndex]) navigate(results[activeIndex].slug);
          break;
        case 'Escape':
          e.preventDefault();
          if (query) setQuery('');
          else { setOpen(false); inputRef.current?.blur(); }
          break;
      }
    },
    [open, results, activeIndex, navigate, query],
  );

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative" style={{ marginBottom: '1rem' }}>

      {/* ── Input ── */}
      <div className="relative">
        <Search className="search-icon pointer-events-none" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search docs… (⌘K)"
          className="docs-search-input"
          style={{ paddingRight: query ? '2.25rem' : '3rem', marginBottom: 0 }}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Right affordance */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
          {query ? (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
              tabIndex={-1}
              className="p-1 rounded text-[#163300]/40 hover:text-[#163300]/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center rounded border border-[#163300]/15 bg-[#163300]/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[#163300]/40 leading-none select-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div
          role="presentation"
          className="docs-search-dropdown"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 6px)',
            zIndex: 60,
            background: '#fff',
            border: '1.5px solid rgba(22,51,0,0.14)',
            borderRadius: '10px',
            boxShadow:
              '0 4px 6px -1px rgba(22,51,0,0.06), 0 10px 24px -4px rgba(22,51,0,0.12), 0 0 0 1px rgba(22,51,0,0.04)',
            overflow: 'hidden',
            animation: 'searchDropdownIn 0.14s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {results.length === 0 ? (
            /* ── Empty state ── */
            <div className="px-4 py-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#163300]/[0.06]">
                <Search className="w-4 h-4 text-[#163300]/40" />
              </div>
              <p className="text-sm font-semibold text-[#163300]/70 mb-1">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </p>
              <p className="text-xs text-[#163300]/40 mb-4">
                Try searching for a topic or keyword
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setOpen(true); }}
                    className="rounded-full border border-[#163300]/12 bg-[#163300]/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#163300]/60 hover:bg-[#163300]/[0.08] hover:text-[#163300]/80 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Result count hint */}
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#163300]/35">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* ── Result list ── */}
              <ul
                ref={listRef}
                role="listbox"
                aria-label="Search results"
                style={{ maxHeight: '292px', overflowY: 'auto' }}
              >
                {results.map((entry, i) => {
                  const isActive = i === activeIndex;
                  const meta = SECTION_META[entry.section] ?? SECTION_META.Reference;
                  const snippet = getSnippet(entry.content, debouncedQuery);

                  return (
                    <li
                      key={entry.slug}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => navigate(entry.slug)}
                      className="group relative mx-1.5 mb-0.5 flex cursor-pointer items-start gap-3 rounded-[7px] px-2.5 py-2 transition-colors"
                      style={{
                        background: isActive ? 'rgba(22,51,0,0.05)' : 'transparent',
                        borderLeft: isActive ? `2px solid ${meta.color}` : '2px solid transparent',
                      }}
                    >
                      {/* Section icon pill */}
                      <div
                        className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-md"
                        style={{
                          background: `${meta.color}18`,
                          color: meta.color,
                        }}
                      >
                        {meta.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        {/* Section label */}
                        <span
                          className="block text-[10px] font-bold uppercase tracking-wider leading-none mb-0.5"
                          style={{ color: `${meta.color}99` }}
                        >
                          {entry.section}
                        </span>

                        {/* Title */}
                        <p className="text-[13px] font-semibold text-[#163300] leading-snug truncate">
                          {highlight(entry.title, debouncedQuery)}
                        </p>

                        {/* Preview */}
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#163300]/50 line-clamp-1">
                          {highlight(snippet, debouncedQuery)}
                        </p>
                      </div>

                      {/* Arrow — shows on hover/active */}
                      <ArrowRight
                        className="mt-1.5 w-3 h-3 shrink-0 transition-all duration-100"
                        style={{
                          color: isActive ? meta.color : 'transparent',
                          opacity: isActive ? 1 : 0,
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* ── Footer keyboard hints ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '7px 12px',
              borderTop: '1px solid rgba(22,51,0,0.08)',
              background: 'rgba(22,51,0,0.02)',
            }}
          >
            {[
              { keys: ['↑', '↓'], label: 'navigate' },
              { keys: ['↵'], label: 'open' },
              { keys: ['esc'], label: 'close' },
            ].map(({ keys, label }) => (
              <span key={label} className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '18px',
                      padding: '1px 4px',
                      borderRadius: '4px',
                      border: '1px solid rgba(22,51,0,0.14)',
                      background: '#fff',
                      fontFamily: 'var(--font-geist-mono, monospace)',
                      fontSize: '9px',
                      lineHeight: 1.6,
                      color: 'rgba(22,51,0,0.5)',
                      boxShadow: '0 1px 0 rgba(22,51,0,0.1)',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
                <span style={{ fontSize: '10px', color: 'rgba(22,51,0,0.35)', marginLeft: '2px' }}>
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown open animation */}
      <style>{`
        @keyframes searchDropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
