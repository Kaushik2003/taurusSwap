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
      <div className="absolute inset-0 bg-[#084734]/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-[#CEF17B]/10 p-0 animate-scale-in overflow-hidden max-h-[75vh] flex flex-col shadow-2xl" style={{ background: '#084734' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#CEF17B]/5">
          <h3 className="text-lg font-black text-[#CEF17B] tracking-tight">Select a token</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-[#CEF17B]/40 hover:text-[#CEF17B] transition-colors bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/20 border border-white/5 focus-within:border-[#CEF17B]/20 transition-all">
            <Search className="w-4 h-4 text-[#CEF17B]/40" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or ticker..."
              className="flex-1 bg-transparent text-sm font-bold text-[#CEF17B] outline-none placeholder:text-[#CEF17B]/20"
            />
          </div>
        </div>

        {/* Popular */}
        {!search && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {popular.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold transition-all ${t.id === selectedToken.id ? 'border-[#CEF17B] bg-[#CEF17B] text-[#084734]' : 'border-white/5 bg-white/5 text-[#CEF17B]/80 hover:bg-white/10 hover:border-white/10'}`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: t.color, color: 'white' }}>{t.symbol[0]}</div>
                  <span>{t.symbol}</span>
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
              className={`flex items-center gap-4 w-full px-5 py-4 transition-all border-b border-white/[0.02] ${t.id === selectedToken.id ? 'bg-[#CEF17B]/10' : 'hover:bg-white/[0.04]'}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-lg" style={{ background: t.color }}>
                {t.symbol.slice(0, 2)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#CEF17B]">{t.name}</span>
                </div>
                <span className="text-xs font-bold text-[#CEF17B]/40 uppercase tracking-wider">{t.symbol}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-[#CEF17B]">{formatCurrency(t.price)}</p>
                <p className={`text-xs font-bold ${t.change1d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.change1d >= 0 ? '+' : ''}{t.change1d.toFixed(2)}%
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
