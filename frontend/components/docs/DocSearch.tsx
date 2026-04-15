'use client';

import {
  useState, useEffect, useCallback, useMemo,
  useRef, type SetStateAction, type Dispatch,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import searchIndex from '@/data/search-index.json';
import SearchOverlay, { type SearchEntry } from './SearchOverlay';

// ─── Search index ─────────────────────────────────────────────────────────────

const INDEX = searchIndex as SearchEntry[];

// ─── Search logic ─────────────────────────────────────────────────────────────

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
  const router      = useRouter();
  const [query, setQuery]               = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen]                 = useState(false);
  const [activeIndex, setActiveIndex]   = useState(0);
  const [mounted, setMounted]           = useState(false);

  // Portal mount guard (SSR safety)
  useEffect(() => setMounted(true), []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => runSearch(debouncedQuery), [debouncedQuery]);
  useEffect(() => setActiveIndex(0), [debouncedQuery]);

  // Open overlay
  const openOverlay = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setOpen(true);
  }, []);

  // Close overlay
  const closeOverlay = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  }, []);

  // Navigate to result
  const navigate = useCallback(
    (slug: string) => {
      router.push(slug);
      closeOverlay();
      onNavigate?.();
    },
    [router, closeOverlay, onNavigate],
  );

  // ⌘K / Ctrl+K — works anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) closeOverlay();
        else openOverlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openOverlay, closeOverlay]);

  return (
    <>
      {/* ── Sidebar trigger ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={openOverlay}
        aria-label="Open search"
        aria-keyshortcuts="Meta+K Control+K"
        style={{ marginBottom: '1rem', width: '100%' }}
        className="
          group flex w-full items-center gap-2.5
          rounded-lg border-2 border-[rgba(22,51,0,0.14)]
          bg-white px-3 py-2.5
          text-left text-sm text-[rgba(22,51,0,0.4)]
          transition-all duration-150
          hover:border-[rgba(22,51,0,0.28)] hover:bg-[rgba(22,51,0,0.02)]
          hover:text-[rgba(22,51,0,0.55)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9FE870]/60
        "
      >
        <Search
          className="w-3.5 h-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-80"
          aria-hidden
        />
        <span className="flex-1 select-none font-normal">Search docs…</span>
        <kbd
          className="
            hidden sm:inline-flex shrink-0 items-center
            rounded border border-[rgba(22,51,0,0.14)] bg-[rgba(22,51,0,0.04)]
            px-1.5 py-0.5 font-mono text-[10px] leading-none
            text-[rgba(22,51,0,0.38)] select-none
          "
        >
          ⌘K
        </kbd>
      </button>

      {/* ── Overlay portal ───────────────────────────────────────────────── */}
      {mounted && open && createPortal(
        <SearchOverlay
          query={query}
          setQuery={setQuery as Dispatch<SetStateAction<string>>}
          debouncedQuery={debouncedQuery}
          results={results}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onClose={closeOverlay}
          onNavigate={navigate}
        />,
        document.body,
      )}
    </>
  );
}
