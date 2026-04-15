'use client';

import { useEffect, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { Search, X, ArrowRight, BookOpen, Pi, Layers, Code2, Monitor, FileText } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchEntry {
  title: string;
  slug: string;
  section: string;
  content: string;
}

// ─── Section metadata ─────────────────────────────────────────────────────────

export const SECTION_META: Record<string, { icon: ReactNode; color: string }> = {
  Introduction: { icon: <BookOpen className="w-3.5 h-3.5" />, color: '#2563eb' },
  Math:         { icon: <Pi      className="w-3.5 h-3.5" />, color: '#7c3aed' },
  Protocol:     { icon: <Layers  className="w-3.5 h-3.5" />, color: '#0891b2' },
  SDK:          { icon: <Code2   className="w-3.5 h-3.5" />, color: '#059669' },
  Frontend:     { icon: <Monitor className="w-3.5 h-3.5" />, color: '#d97706' },
  Reference:    { icon: <FileText className="w-3.5 h-3.5" />, color: '#dc2626' },
};

export const SUGGESTIONS = ['sphere', 'swap', 'liquidity', 'torus', 'SDK', 'tick'];

// ─── Highlight helper ─────────────────────────────────────────────────────────

export function highlight(text: string, query: string): ReactNode {
  if (!query || !text) return text;
  const q = query.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  const lower = text.toLowerCase();
  let searchFrom = 0;
  let idx: number;

  while ((idx = lower.indexOf(q, searchFrom)) !== -1) {
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
    searchFrom = cursor;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length ? <>{parts}</> : text;
}

// ─── Snippet helper ───────────────────────────────────────────────────────────

export function getSnippet(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 100) + (content.length > 100 ? '…' : '');
  const start = Math.max(0, idx - 30);
  const end   = Math.min(content.length, idx + query.length + 70);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

// ─── Kbd component ────────────────────────────────────────────────────────────

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '20px',
        padding: '2px 5px',
        borderRadius: '5px',
        border: '1px solid rgba(22,51,0,0.16)',
        background: '#fff',
        fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
        fontSize: '10px',
        lineHeight: 1.5,
        color: 'rgba(22,51,0,0.55)',
        boxShadow: '0 1px 0 rgba(22,51,0,0.12)',
      }}
    >
      {children}
    </kbd>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  debouncedQuery: string;
  results: SearchEntry[];
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  onClose: () => void;
  onNavigate: (slug: string) => void;
}

// ─── Overlay ─────────────────────────────────────────────────────────────────

export default function SearchOverlay({
  query,
  setQuery,
  debouncedQuery,
  results,
  activeIndex,
  setActiveIndex,
  onClose,
  onNavigate,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Scroll active item into view
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (results.length) setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (results.length) setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[activeIndex]) onNavigate(results[activeIndex].slug);
        break;
      case 'Escape':
        e.preventDefault();
        if (query) setQuery('');
        else onClose();
        break;
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <>
      {/* ── Animations ── */}
      <style>{`
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes paletteFadeIn {
          from { opacity: 0; transform: scale(0.97) translateY(-10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .palette-result-list::-webkit-scrollbar { width: 4px; }
        .palette-result-list::-webkit-scrollbar-track { background: transparent; }
        .palette-result-list::-webkit-scrollbar-thumb {
          background: rgba(22,51,0,0.12);
          border-radius: 99px;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'overlayFadeIn 0.15s ease both',
        }}
      />

      {/* ── Panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        style={{
          position: 'fixed',
          top: '16vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 2rem)',
          maxWidth: '640px',
          zIndex: 201,
          background: '#fff',
          border: '1.5px solid rgba(22,51,0,0.12)',
          borderRadius: '14px',
          boxShadow:
            '0 0 0 1px rgba(22,51,0,0.04), 0 8px 16px -4px rgba(22,51,0,0.08), 0 24px 64px -8px rgba(22,51,0,0.18)',
          overflow: 'hidden',
          animation: 'paletteFadeIn 0.16s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >

        {/* ── Input bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 16px',
            borderBottom: hasQuery || results.length
              ? '1px solid rgba(22,51,0,0.08)'
              : 'none',
          }}
        >
          <Search
            style={{ width: '18px', height: '18px', flexShrink: 0, color: 'rgba(22,51,0,0.4)' }}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documentation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={hasQuery}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '16px',
              fontWeight: 500,
              color: '#163300',
              lineHeight: 1.5,
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear"
              tabIndex={-1}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                flexShrink: 0,
                borderRadius: '6px',
                border: '1px solid rgba(22,51,0,0.12)',
                background: 'rgba(22,51,0,0.04)',
                color: 'rgba(22,51,0,0.45)',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '12px', height: '12px' }} />
            </button>
          ) : (
            <kbd
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 7px',
                borderRadius: '6px',
                border: '1px solid rgba(22,51,0,0.14)',
                background: 'rgba(22,51,0,0.03)',
                fontFamily: 'var(--font-geist-mono, monospace)',
                fontSize: '12px',
                color: 'rgba(22,51,0,0.4)',
                flexShrink: 0,
                userSelect: 'none',
              }}
            >
              esc
            </kbd>
          )}
        </div>

        {/* ── Body ── */}
        {hasQuery && (
          <>
            {results.length === 0 ? (
              /* ── Empty state ── */
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(22,51,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}
                >
                  <Search style={{ width: '18px', height: '18px', color: 'rgba(22,51,0,0.3)' }} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(22,51,0,0.7)', marginBottom: '4px' }}>
                  No results for &ldquo;{debouncedQuery}&rdquo;
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(22,51,0,0.4)', marginBottom: '20px' }}>
                  Try a different term or explore a topic below
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        border: '1px solid rgba(22,51,0,0.12)',
                        background: 'rgba(22,51,0,0.03)',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(22,51,0,0.6)',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Count label */}
                <div
                  style={{
                    padding: '8px 16px 4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'rgba(22,51,0,0.35)',
                  }}
                >
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </div>

                {/* Result list */}
                <ul
                  ref={listRef}
                  role="listbox"
                  aria-label="Search results"
                  className="palette-result-list"
                  style={{ maxHeight: '360px', overflowY: 'auto', padding: '4px 8px 8px' }}
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
                        onClick={() => onNavigate(entry.slug)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '10px 10px 10px 8px',
                          marginBottom: '2px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderLeft: isActive
                            ? `3px solid ${meta.color}`
                            : '3px solid transparent',
                          background: isActive ? `${meta.color}0d` : 'transparent',
                          transition: 'background 80ms, border-color 80ms',
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            marginTop: '1px',
                            flexShrink: 0,
                            width: '28px',
                            height: '28px',
                            borderRadius: '7px',
                            background: `${meta.color}15`,
                            color: meta.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {meta.icon}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.07em',
                              color: `${meta.color}aa`,
                              marginBottom: '2px',
                              lineHeight: 1,
                            }}
                          >
                            {entry.section}
                          </div>
                          <p
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#163300',
                              lineHeight: 1.35,
                              marginBottom: '3px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {highlight(entry.title, debouncedQuery)}
                          </p>
                          <p
                            style={{
                              fontSize: '12px',
                              color: 'rgba(22,51,0,0.48)',
                              lineHeight: 1.5,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {highlight(snippet, debouncedQuery)}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ArrowRight
                          style={{
                            marginTop: '5px',
                            width: '14px',
                            height: '14px',
                            flexShrink: 0,
                            color: isActive ? meta.color : 'transparent',
                            transition: 'color 80ms',
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}

        {/* ── Footer ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '9px 16px',
            borderTop: '1px solid rgba(22,51,0,0.07)',
            background: 'rgba(22,51,0,0.015)',
          }}
        >
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'],       label: 'open'     },
            { keys: ['esc'],     label: 'close'    },
          ].map(({ keys, label }) => (
            <span
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
              <span style={{ fontSize: '11px', color: 'rgba(22,51,0,0.38)', marginLeft: '2px' }}>
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
