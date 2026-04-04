export interface Network {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change1d: number;
  change7d: number;
  fdv: number;
  volume24h: number;
  sparkline: number[];
  network: string;
  color: string;
  balance?: number;
}

export interface Pool {
  id: string;
  token0: Token;
  token1: Token;
  tvl: number;
  volume24h: number;
  volume7d: number;
  apr: number;
  feeTier: number;
  version: string;
  network: string;
}

export interface Position {
  id: string;
  pool: Pool;
  liquidity: number;
  uncollectedFees: number;
  minPrice: number;
  maxPrice: number;
  inRange: boolean;
  apr: number;
}

export interface WalletAsset {
  token: Token;
  balance: number;
  value: number;
}

export interface Transaction {
  id: string;
  type: 'swap' | 'add' | 'remove' | 'send' | 'receive';
  token0: Token;
  token1?: Token;
  amount0: number;
  amount1?: number;
  value: number;
  timestamp: Date;
  hash: string;
  network: string;
}

export interface SwapQuote {
  inputToken: Token;
  outputToken: Token;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  networkFee: number;
  route: string[];
  minimumReceived: number;
  exchangeRate: number;
  maxSlippage: number;
}
