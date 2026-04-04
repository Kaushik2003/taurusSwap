import { useState, useMemo } from 'react';
import { X, Search, Star } from 'lucide-react';
import { tokens } from '@/data/mock';
import { Token } from '@/data/types';
import { formatCurrency } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedToken: Token;
}

const popularIds = ['eth', 'usdc', 'wbtc', 'usdt', 'sol', 'dai'];

export default function TokenSelectorModal({ open, onClose, onSelect, selectedToken }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return tokens;
    const q = search.toLowerCase();
    return tokens.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [search]);

  const popular = tokens.filter(t => popularIds.includes(t.id));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-panel border border-border p-0 animate-scale-in overflow-hidden max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="text-base font-semibold text-foreground">Select a token</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border/50">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or paste address"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Popular */}
        {!search && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {popular.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-sm transition-colors ${t.id === selectedToken.id ? 'border-primary/50 bg-primary/10' : 'border-border/50 hover:border-border hover:bg-muted/50'}`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-primary-foreground" style={{ background: t.color }}>{t.symbol[0]}</div>
                  <span className="text-foreground font-medium">{t.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`flex items-center gap-3 w-full px-4 py-3 transition-colors ${t.id === selectedToken.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0" style={{ background: t.color }}>
                {t.symbol.slice(0, 2)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{t.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t.symbol}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-foreground">{formatCurrency(t.price)}</p>
                <p className={`text-xs ${t.change1d >= 0 ? 'percentage-up' : 'percentage-down'}`}>
                  {t.change1d >= 0 ? '+' : ''}{t.change1d.toFixed(2)}%
                </p>
              </div>
              <Star className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
