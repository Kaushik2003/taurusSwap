import { Token, Pool, Position, WalletAsset, Transaction, Network } from './types';

const genSparkline = (base: number, vol: number, up: boolean): number[] => {
  const pts: number[] = [];
  let v = base;
  for (let i = 0; i < 24; i++) {
    v += (Math.random() - (up ? 0.4 : 0.6)) * vol;
    v = Math.max(v * 0.8, v);
    pts.push(v);
  }
  return pts;
};

export const networks: Network[] = [
  { id: 'ethereum', name: 'Ethereum', color: '#627EEA', icon: 'Ξ' },
  { id: 'base', name: 'Base', color: '#0052FF', icon: 'B' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28A0F0', icon: 'A' },
  { id: 'optimism', name: 'Optimism', color: '#FF0420', icon: 'O' },
  { id: 'polygon', name: 'Polygon', color: '#8247E5', icon: 'P' },
  { id: 'flux', name: 'FluxChain', color: '#FF1493', icon: 'F' },
];

export const tokens: Token[] = [
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 3847.21, change1h: 0.34, change1d: 2.18, change7d: 5.42, fdv: 462_800_000_000, volume24h: 18_940_000_000, sparkline: genSparkline(3800, 50, true), network: 'ethereum', color: '#627EEA' },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin', price: 1.00, change1h: 0.01, change1d: 0.02, change7d: 0.01, fdv: 34_200_000_000, volume24h: 8_120_000_000, sparkline: genSparkline(1, 0.001, true), network: 'ethereum', color: '#2775CA' },
  { id: 'wbtc', symbol: 'WBTC', name: 'Wrapped Bitcoin', price: 97_241.50, change1h: -0.12, change1d: 1.87, change7d: 8.34, fdv: 19_100_000_000, volume24h: 520_000_000, sparkline: genSparkline(97000, 500, true), network: 'ethereum', color: '#F09242' },
  { id: 'usdt', symbol: 'USDT', name: 'Tether', price: 1.00, change1h: 0.00, change1d: -0.01, change7d: 0.00, fdv: 119_000_000_000, volume24h: 52_000_000_000, sparkline: genSparkline(1, 0.001, true), network: 'ethereum', color: '#26A17B' },
  { id: 'sol', symbol: 'SOL', name: 'Solana', price: 189.42, change1h: 1.23, change1d: 4.56, change7d: 12.34, fdv: 89_700_000_000, volume24h: 4_320_000_000, sparkline: genSparkline(185, 5, true), network: 'ethereum', color: '#9945FF' },
  { id: 'arb', symbol: 'ARB', name: 'Arbitrum', price: 1.12, change1h: -0.45, change1d: -2.31, change7d: -5.12, fdv: 11_200_000_000, volume24h: 890_000_000, sparkline: genSparkline(1.15, 0.05, false), network: 'arbitrum', color: '#28A0F0' },
  { id: 'op', symbol: 'OP', name: 'Optimism', price: 2.34, change1h: 0.78, change1d: 3.45, change7d: 7.89, fdv: 10_100_000_000, volume24h: 420_000_000, sparkline: genSparkline(2.3, 0.08, true), network: 'optimism', color: '#FF0420' },
  { id: 'matic', symbol: 'POL', name: 'Polygon', price: 0.58, change1h: -0.23, change1d: -1.45, change7d: -3.67, fdv: 5_800_000_000, volume24h: 310_000_000, sparkline: genSparkline(0.59, 0.02, false), network: 'polygon', color: '#8247E5' },
  { id: 'link', symbol: 'LINK', name: 'Chainlink', price: 18.92, change1h: 0.56, change1d: 1.23, change7d: 4.56, fdv: 11_400_000_000, volume24h: 780_000_000, sparkline: genSparkline(18.5, 0.5, true), network: 'ethereum', color: '#2A5ADA' },
  { id: 'aave', symbol: 'AAVE', name: 'Aave', price: 312.45, change1h: -0.34, change1d: 2.89, change7d: 9.12, fdv: 4_700_000_000, volume24h: 230_000_000, sparkline: genSparkline(308, 5, true), network: 'ethereum', color: '#B6509E' },
  { id: 'mkr', symbol: 'MKR', name: 'Maker', price: 1842.30, change1h: 0.12, change1d: -0.89, change7d: 2.34, fdv: 1_660_000_000, volume24h: 89_000_000, sparkline: genSparkline(1840, 20, true), network: 'ethereum', color: '#1AAB9B' },
  { id: 'crv', symbol: 'CRV', name: 'Curve', price: 0.72, change1h: -1.23, change1d: -4.56, change7d: -8.91, fdv: 960_000_000, volume24h: 180_000_000, sparkline: genSparkline(0.76, 0.03, false), network: 'ethereum', color: '#FF6B6B' },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', price: 0.0000142, change1h: 3.45, change1d: 12.34, change7d: 45.67, fdv: 5_970_000_000, volume24h: 1_900_000_000, sparkline: genSparkline(0.000013, 0.000001, true), network: 'ethereum', color: '#00B84D' },
  { id: 'dai', symbol: 'DAI', name: 'Dai', price: 1.00, change1h: 0.00, change1d: 0.01, change7d: -0.01, fdv: 5_340_000_000, volume24h: 320_000_000, sparkline: genSparkline(1, 0.001, true), network: 'ethereum', color: '#F5AC37' },
  { id: 'uni', symbol: 'UNI', name: 'Universal Protocol', price: 12.45, change1h: 0.89, change1d: 3.21, change7d: 7.65, fdv: 7_470_000_000, volume24h: 290_000_000, sparkline: genSparkline(12.2, 0.3, true), network: 'ethereum', color: '#FF007A' },
];

export const pools: Pool[] = [
  { id: 'p1', token0: tokens[0], token1: tokens[1], tvl: 482_000_000, volume24h: 128_000_000, volume7d: 890_000_000, apr: 4.23, feeTier: 0.05, version: 'v3', network: 'ethereum' },
  { id: 'p2', token0: tokens[2], token1: tokens[0], tvl: 312_000_000, volume24h: 45_000_000, volume7d: 310_000_000, apr: 2.87, feeTier: 0.3, version: 'v3', network: 'ethereum' },
  { id: 'p3', token0: tokens[0], token1: tokens[3], tvl: 256_000_000, volume24h: 89_000_000, volume7d: 620_000_000, apr: 5.12, feeTier: 0.05, version: 'v3', network: 'ethereum' },
  { id: 'p4', token0: tokens[1], token1: tokens[3], tvl: 198_000_000, volume24h: 34_000_000, volume7d: 240_000_000, apr: 1.45, feeTier: 0.01, version: 'v3', network: 'ethereum' },
  { id: 'p5', token0: tokens[0], token1: tokens[4], tvl: 145_000_000, volume24h: 67_000_000, volume7d: 465_000_000, apr: 8.34, feeTier: 0.3, version: 'v3', network: 'arbitrum' },
  { id: 'p6', token0: tokens[0], token1: tokens[8], tvl: 89_000_000, volume24h: 23_000_000, volume7d: 160_000_000, apr: 6.12, feeTier: 0.3, version: 'v3', network: 'ethereum' },
  { id: 'p7', token0: tokens[0], token1: tokens[12], tvl: 67_000_000, volume24h: 89_000_000, volume7d: 620_000_000, apr: 34.56, feeTier: 1, version: 'v3', network: 'ethereum' },
  { id: 'p8', token0: tokens[0], token1: tokens[9], tvl: 52_000_000, volume24h: 12_000_000, volume7d: 84_000_000, apr: 5.67, feeTier: 0.3, version: 'v3', network: 'ethereum' },
];

export const demoPositions: Position[] = [
  { id: 'pos1', pool: pools[0], liquidity: 24_500, uncollectedFees: 342.18, minPrice: 3200, maxPrice: 4200, inRange: true, apr: 5.67 },
  { id: 'pos2', pool: pools[2], liquidity: 12_800, uncollectedFees: 89.42, minPrice: 3500, maxPrice: 4500, inRange: true, apr: 6.23 },
  { id: 'pos3', pool: pools[4], liquidity: 8_200, uncollectedFees: 156.30, minPrice: 150, maxPrice: 250, inRange: true, apr: 9.45 },
];

export const demoWalletAssets: WalletAsset[] = [
  { token: tokens[0], balance: 4.2847, value: 16_484.82 },
  { token: tokens[1], balance: 12_450.00, value: 12_450.00 },
  { token: tokens[2], balance: 0.1234, value: 12_000.00 },
  { token: tokens[3], balance: 5_000, value: 5_000 },
  { token: tokens[4], balance: 23.45, value: 4_441.40 },
  { token: tokens[8], balance: 120, value: 2_270.40 },
  { token: tokens[14], balance: 85.3, value: 1_061.89 },
];

export const demoTransactions: Transaction[] = [
  { id: 'tx1', type: 'swap', token0: tokens[0], token1: tokens[1], amount0: 1.5, amount1: 5770.82, value: 5770.82, timestamp: new Date(Date.now() - 3600000), hash: '0x1a2b...3c4d', network: 'ethereum' },
  { id: 'tx2', type: 'swap', token0: tokens[1], token1: tokens[4], amount0: 2000, amount1: 10.56, value: 2000, timestamp: new Date(Date.now() - 7200000), hash: '0x5e6f...7g8h', network: 'ethereum' },
  { id: 'tx3', type: 'add', token0: tokens[0], token1: tokens[1], amount0: 2.5, amount1: 9618.03, value: 19236.06, timestamp: new Date(Date.now() - 86400000), hash: '0x9i0j...1k2l', network: 'ethereum' },
  { id: 'tx4', type: 'swap', token0: tokens[0], token1: tokens[2], amount0: 0.5, amount1: 0.0198, value: 1923.61, timestamp: new Date(Date.now() - 172800000), hash: '0x3m4n...5o6p', network: 'ethereum' },
  { id: 'tx5', type: 'receive', token0: tokens[0], amount0: 1.0, value: 3847.21, timestamp: new Date(Date.now() - 259200000), hash: '0x7q8r...9s0t', network: 'ethereum' },
  { id: 'tx6', type: 'swap', token0: tokens[3], token1: tokens[0], amount0: 3000, amount1: 0.78, value: 3000, timestamp: new Date(Date.now() - 345600000), hash: '0xab12...cd34', network: 'arbitrum' },
];

export const portfolioChartData = (() => {
  const data: { time: string; value: number }[] = [];
  let val = 48000;
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    val += (Math.random() - 0.45) * 1200;
    val = Math.max(35000, val);
    const d = new Date(now - i * 86400000);
    data.push({ time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: Math.round(val * 100) / 100 });
  }
  return data;
})();
