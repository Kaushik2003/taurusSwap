import { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { tokens, pools } from '@/data/mock';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format';
import MiniSparkline from '@/components/shared/MiniSparkline';
import TokenIcon from '@/components/shared/TokenIcon';

type Tab = 'tokens' | 'pools' | 'transactions';
type SortKey = 'price' | 'change1h' | 'change1d' | 'fdv' | 'volume24h';

export default function Explore() {
  const [tab, setTab] = useState<Tab>('tokens');
  const [sortKey, setSortKey] = useState<SortKey>('volume24h');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedTokens = useMemo(() => {
    let list = [...tokens];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const m = sortDir === 'desc' ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * m;
    });
    return list;
  }, [sortKey, sortDir, search]);

  const metrics = [
    { label: '24H Volume', value: '$18.9B', change: '+12.4%', up: true },
    { label: 'Total TVL', value: '$4.82B', change: '+3.2%', up: true },
    { label: 'v3 TVL', value: '$3.1B', change: '+2.8%', up: true },
    { label: 'Transactions', value: '1.2M', change: '-5.1%', up: false },
  ];

  const SortHeader = ({ label, sortId }: { label: string; sortId: SortKey }) => (
    <button
      onClick={() => handleSort(sortId)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Explore</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="glass-panel p-4">
            <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{m.value}</span>
              <span className={`text-xs flex items-center gap-0.5 ${m.up ? 'percentage-up' : 'percentage-down'}`}>
                {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-4 border-b border-border/50">
        {(['tokens', 'pools', 'transactions'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto pb-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground outline-none border border-border/50 focus:border-primary/50 w-40 placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Tokens Table */}
      {tab === 'tokens' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-3 text-xs text-muted-foreground font-medium w-10">#</th>
                <th className="pb-3 text-xs text-muted-foreground font-medium">Token</th>
                <th className="pb-3 text-right"><SortHeader label="Price" sortId="price" /></th>
                <th className="pb-3 text-right hidden sm:table-cell"><SortHeader label="1H" sortId="change1h" /></th>
                <th className="pb-3 text-right"><SortHeader label="1D" sortId="change1d" /></th>
                <th className="pb-3 text-right hidden md:table-cell"><SortHeader label="FDV" sortId="fdv" /></th>
                <th className="pb-3 text-right hidden lg:table-cell"><SortHeader label="Volume" sortId="volume24h" /></th>
                <th className="pb-3 text-right hidden lg:table-cell w-[120px]">Last 24H</th>
              </tr>
            </thead>
            <tbody>
              {sortedTokens.map((t, i) => (
                <tr key={t.id} className="data-table-row border-t border-border/30 cursor-pointer">
                  <td className="py-3 text-sm text-muted-foreground">{i + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <TokenIcon token={t} size={28} />
                      <div>
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{t.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-foreground text-right">{formatCurrency(t.price)}</td>
                  <td className={`py-3 text-sm text-right hidden sm:table-cell ${t.change1h >= 0 ? 'percentage-up' : 'percentage-down'}`}>{formatPercent(t.change1h)}</td>
                  <td className={`py-3 text-sm text-right ${t.change1d >= 0 ? 'percentage-up' : 'percentage-down'}`}>{formatPercent(t.change1d)}</td>
                  <td className="py-3 text-sm text-muted-foreground text-right hidden md:table-cell">{formatCurrency(t.fdv, true)}</td>
                  <td className="py-3 text-sm text-muted-foreground text-right hidden lg:table-cell">{formatCurrency(t.volume24h, true)}</td>
                  <td className="py-3 text-right hidden lg:table-cell">
                    <div className="flex justify-end">
                      <MiniSparkline data={t.sparkline} positive={t.change1d >= 0} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pools tab */}
      {tab === 'pools' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-3 text-xs text-muted-foreground font-medium w-10">#</th>
                <th className="pb-3 text-xs text-muted-foreground font-medium">Pool</th>
                <th className="pb-3 text-xs text-muted-foreground font-medium text-right">TVL</th>
                <th className="pb-3 text-xs text-muted-foreground font-medium text-right hidden sm:table-cell">24H Volume</th>
                <th className="pb-3 text-xs text-muted-foreground font-medium text-right">APR</th>
                <th className="pb-3 text-xs text-muted-foreground font-medium text-right hidden md:table-cell">Fee Tier</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p, i) => (
                <tr key={p.id} className="data-table-row border-t border-border/30 cursor-pointer">
                  <td className="py-3 text-sm text-muted-foreground">{i + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <TokenIcon token={p.token0} size={24} />
                        <TokenIcon token={p.token1} size={24} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{p.token0.symbol}/{p.token1.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.version}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-foreground text-right">{formatCurrency(p.tvl, true)}</td>
                  <td className="py-3 text-sm text-muted-foreground text-right hidden sm:table-cell">{formatCurrency(p.volume24h, true)}</td>
                  <td className="py-3 text-sm text-right percentage-up">{p.apr.toFixed(2)}%</td>
                  <td className="py-3 text-sm text-muted-foreground text-right hidden md:table-cell">{p.feeTier}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Connect wallet to view transaction history</p>
        </div>
      )}
    </div>
  );
}
