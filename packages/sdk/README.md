# @taurusswap/sdk

TypeScript SDK for **TaurusSwap** — a concentrated-liquidity stablecoin AMM on Algorand.

Built on the Orbital AMM protocol, TaurusSwap uses n-dimensional torus geometry to enable capital-efficient stablecoin swaps with customisable depeg boundaries.

---

## Installation

```bash
npm install @taurusswap/sdk algosdk
# or
yarn add @taurusswap/sdk algosdk
```

`algosdk` is a peer dependency — install it alongside this package.

---

## Quick start

```typescript
import { TaurusClient } from "@taurusswap/sdk";

// Connects to testnet by default (pool app ID 758284478)
const client = new TaurusClient();

// Get a swap quote
const quote = await client.quote({
  fromIndex: 0,   // USDC
  toIndex: 1,     // USDT
  amountIn: 100_000_000n,  // 100 USDC (6 decimals)
});

console.log(`You receive: ${Number(quote.amountOut) / 1e6} USDT`);
console.log(`Price impact: ${(quote.priceImpact * 100).toFixed(4)}%`);

// Build unsigned transactions — your wallet signs these
const txns = await client.buildSwapTxns({
  sender: "YOUR_ADDRESS",
  fromIndex: 0,
  toIndex: 1,
  amountIn: 100_000_000n,
  slippageBps: 50,  // 0.5% slippage tolerance
});

// Sign with your wallet (Pera, Defly, etc.) and submit
const signedTxns = await wallet.signTransactions(txns);
await algod.sendRawTransaction(signedTxns).do();
```

---

## Configuration

```typescript
const client = new TaurusClient({
  // Optional: override the Algod node (defaults to AlgoNode testnet)
  algodUrl: "https://testnet-api.algonode.cloud",
  algodToken: "",

  // Optional: connect to a different pool deployment
  poolAppId: 758284478,
});
```

---

## API Reference

### `TaurusClient`

#### State

```typescript
// Full on-chain pool snapshot
const pool = await client.getPoolState();
// { n, ticks, reserves, rInt, feeBps, tokenAsaIds, ... }

// LP position for a specific address and tick
const position = await client.getPosition("ADDR...", tickId);
// { shares, positionR, claimableFees } | null
```

#### Quotes

```typescript
// Swap quote (no transactions built)
const quote = await client.quote({ fromIndex, toIndex, amountIn });
// { amountOut, priceImpact, instantaneousPrice, effectivePrice, ticksCrossed }

// All token spot prices relative to baseTokenIdx
const prices = await client.getAllPrices(0);
// [1.0, 0.9997, 1.0002, ...]
```

#### Transaction builders

All builders return `algosdk.Transaction[]` — unsigned, group-ID-assigned, ready for signing.

```typescript
// Swap
const txns = await client.buildSwapTxns({
  sender,
  fromIndex,
  toIndex,
  amountIn,
  slippageBps,  // optional, default 50 (0.5%)
});

// Add liquidity
const { r, k } = await client.tickParamsFromDepegPrice(0.99, 100_000_000n);
const { txns, depositPerTokenRaw, tickId } = await client.buildAddLiquidityTxns({
  sender,
  r,
  k,
});

// Remove liquidity
const txns = await client.buildRemoveLiquidityTxns({
  sender,
  tickId,
  shares,  // from getPosition().shares
});

// Claim fees
const txns = await client.buildClaimFeesTxns({ sender, tickId });
```

#### Helpers

```typescript
// Compute (r, k) tick parameters from a human-readable depeg price
const { r, k } = await client.tickParamsFromDepegPrice(
  0.99,          // boundary: activates when any token drops below $0.99
  100_000_000n,  // deposit per token in raw microunits
);

// Capital efficiency for a given depeg price
const { efficiency, depositPerToken } = await client.getCapitalEfficiency(0.99, r);
// efficiency: e.g. 50× means 50× more trading volume per dollar locked vs. Uniswap v2
```

---

## Low-level API

For advanced use cases you can use standalone functions directly:

```typescript
import {
  readPoolState,
  getSwapQuote,
  buildSwapTxns,
  addLiquidity,
  removeLiquidity,
  claimFees,
  tickParamsFromDepegPrice,
  computeDepositPerToken,
  getAllPrices,
  getCapitalEfficiencyForDepegPrice,
  // Math
  xMin, xMax, kMin, kMax, kFromDepegPrice, capitalEfficiency,
  // Types
  TickState,
} from "@taurusswap/sdk";
import algosdk from "algosdk";

const algod = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud");
const POOL_APP_ID = 758284478;

const pool = await readPoolState(algod, POOL_APP_ID);
const quote = getSwapQuote(pool, 0, 1, 100_000_000n);
```

---

## Deployed contracts (Testnet)

| Resource | ID |
|---|---|
| Pool App | `758284478` |
| USDC (ASA) | `758284451` |
| USDT (ASA) | `758284464` |
| USDD (ASA) | `758284465` |

---

## Token indices

The pool is a 5-token (`n=5`) stablecoin pool. Token indices map to:

| Index | Symbol | ASA ID |
|---|---|---|
| 0 | USDC | 758284451 |
| 1 | USDT | 758284464 |
| 2 | USDD | 758284465 |
| 3 | DAI  | (see pool state) |
| 4 | FRAX | (see pool state) |

Query the live mapping: `const { tokenAsaIds } = await client.getPoolState()`

---

## Unit conventions

| Value | Unit |
|---|---|
| `amountIn`, `amountOut` | raw microunits (1 USDC = 1_000_000n) |
| `r`, `k` | AMOUNT_SCALE units (raw / 1_000) |
| `sqrtN`, `invSqrtN` | PRECISION-scaled (× 10^9) |
| `priceImpact` | 0.01 = 1% |
| `feeBps` | basis points (30 = 0.30%) |

---

## License

MIT
