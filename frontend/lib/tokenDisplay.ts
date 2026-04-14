import type { PoolState } from '@/lib/orbital-sdk';

// Token metadata for the 5 testnet stablecoins registered in the pool.
// Symbols are matched by ASA ID order (index 0..4 as registered on-chain).
// Decimals are all 6 (standard ASA stablecoin).
export const POOL_TOKEN_SYMBOLS = ['USDC', 'USDT', 'USDD', 'BUSD', 'TUSD'];
export const POOL_TOKEN_COLORS = ['#2775CA', '#26A17B', '#00E5FF', '#F0B90B', '#1A88FF'];
export const POOL_TOKEN_DECIMALS = 6;

/** Raw microunits → human-readable string (e.g. 1_000_000n → "1.000000") */
export function rawToDisplay(raw: bigint, decimals = POOL_TOKEN_DECIMALS): string {
  const factor = 10 ** decimals;
  const whole = raw / BigInt(factor);
  const frac = raw % BigInt(factor);
  return `${whole}.${frac.toString().padStart(decimals, '0')}`;
}

/** Human string → raw microunits (e.g. "1.5" → 1_500_000n). Returns null on invalid input. */
export function displayToRaw(display: string, decimals = POOL_TOKEN_DECIMALS): bigint | null {
  if (!display || isNaN(Number(display))) return null;
  const [wholePart, fracPart = ''] = display.split('.');
  const frac = fracPart.slice(0, decimals).padEnd(decimals, '0');
  try {
    return BigInt(wholePart) * BigInt(10 ** decimals) + BigInt(frac);
  } catch {
    return null;
  }
}

/** Get symbol for token index i from live pool state (falls back to POOL_TOKEN_SYMBOLS). */
export function getTokenSymbol(pool: PoolState, i: number): string {
  return POOL_TOKEN_SYMBOLS[i] ?? `Token${i}`;
}

export function getTokenColor(i: number): string {
  return POOL_TOKEN_COLORS[i] ?? '#888888';
}

/** Format a raw microunit amount as "$X.XX" (stablecoins ≈ $1 each). */
export function formatRawAsUSD(raw: bigint, decimals = POOL_TOKEN_DECIMALS): string {
  const n = Number(raw) / 10 ** decimals;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(n);
}
