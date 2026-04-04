export const formatCurrency = (v: number, compact = false): string => {
  if (compact) {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  }
  if (v < 0.01 && v > 0) return `$${v.toFixed(8)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

export const formatPercent = (v: number): string => {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
};

export const formatNumber = (v: number, decimals = 2): string => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(decimals)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(decimals)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(decimals)}K`;
  return v.toFixed(decimals);
};

export const formatTokenBalance = (v: number): string => {
  if (v >= 1e6) return formatNumber(v);
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.0001) return v.toFixed(6);
  return v.toFixed(8);
};

export const timeAgo = (d: Date): string => {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
