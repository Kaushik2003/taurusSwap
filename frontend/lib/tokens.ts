/** Metadata for every asset supported by the faucet. */
export interface TokenMeta {
  assetId: number;
  symbol: string;
  name: string;
  decimals: number;
  color: string;
  /** Maximum tokens a single wallet may claim per asset per day. */
  dailyLimit: number;
}

export const FAUCET_TOKENS: TokenMeta[] = [
  {
    assetId: 758284451,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    color: '#2775CA',
    dailyLimit: 100,
  },
  {
    assetId: 758284464,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    color: '#26A17B',
    dailyLimit: 100,
  },
  {
    assetId: 758284465,
    symbol: 'USDD',
    name: 'Decentralized USD',
    decimals: 6,
    color: '#00E5FF',
    dailyLimit: 100,
  },
  {
    assetId: 758284466,
    symbol: 'BUSD',
    name: 'Binance USD',
    decimals: 6,
    color: '#F0B90B',
    dailyLimit: 100,
  },
  {
    assetId: 758284467,
    symbol: 'TUSD',
    name: 'TrueUSD',
    decimals: 6,
    color: '#1A88FF',
    dailyLimit: 100,
  },
];

export const VALID_ASSET_IDS = new Set(FAUCET_TOKENS.map((t) => t.assetId));

export function getToken(assetId: number): TokenMeta | undefined {
  return FAUCET_TOKENS.find((t) => t.assetId === assetId);
}

/** Convert whole tokens → base units (microunits). */
export function toBaseUnits(wholeAmount: number, decimals: number): bigint {
  return BigInt(Math.round(wholeAmount * 10 ** decimals));
}
