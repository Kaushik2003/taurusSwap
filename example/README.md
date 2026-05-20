# TaurusSwap SDK — Example App

A full-featured Next.js reference app that shows how to integrate `@taurusswap/sdk` into a real frontend. Every SDK call is visible in the UI alongside the code that triggered it.

## What's Inside

| Component | SDK calls used |
|---|---|
| **Swap** | `client.quote()`, `client.buildSwapTxns()` |
| **Liquidity** | `client.tickParamsFromDepegPrice()`, `client.getCapitalEfficiency()`, `client.buildAddLiquidityTxns()` |
| **Positions** | `client.getPosition()`, `client.estimateRemoval()`, `client.buildRemoveLiquidityTxns()`, `client.buildClaimFeesTxns()` |
| **Pool Explorer** | `client.getPoolState()`, `client.getAllPrices()` |
| **SDK Log** | Live log of every SDK call with method name, duration, and status |

## Running Locally

```bash
cd example
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (port may differ — check terminal output).

> **Note:** The app connects to Algorand **Testnet** by default (pool app ID `758284478`).  
> You'll need testnet ALGO and testnet stablecoin ASAs to execute transactions.  
> Get testnet ALGO from the [Algorand Testnet Dispenser](https://bank.testnet.algorand.network/).

## Pool Tokens (Testnet)

| Token | ASA ID | Decimals |
|---|---|---|
| USDC | 758284451 | 6 |
| USDT | 758284464 | 6 |
| USDD | 758284465 | 6 |
| DAI  | 758284466 | 6 |
| FRAX | 758284467 | 6 |

## Wallet Support

- [Pera Wallet](https://perawallet.app/) — via `@perawallet/connect`
- [Defly Wallet](https://defly.app/) — via `@blockshake/defly-connect`

Session is persisted in `localStorage` so you stay connected across page reloads.

## SDK Usage Pattern

The entire SDK lifecycle lives in [`hooks/useTaurus.ts`](./hooks/useTaurus.ts).  
It creates one `TaurusClient` instance, polls pool state every 15 seconds, and exposes typed execute functions to the UI components.

```ts
import { TaurusClient } from '@taurusswap/sdk';

const client = new TaurusClient({
  poolAppId: 758284478, // testnet
});

// Quote
const quote = await client.quote({ fromIndex: 0, toIndex: 1, amountIn: 10_000_000n });

// Build unsigned swap txns
const txns = await client.buildSwapTxns({
  sender: address,
  fromIndex: 0,
  toIndex: 1,
  amountIn: 10_000_000n,
  slippageBps: 50,
});

// Sign with Pera and submit
const signedTxns = await pera.signTransaction([txns.map(t => ({ txn: t }))]);
const { txid } = await client.algod.sendRawTransaction(signedTxns).do();
await algosdk.waitForConfirmation(client.algod, txid, 4);
```

Every component also renders a collapsible **SDK Call Panel** (`components/SdkCallPanel.tsx`) that shows the exact code being run, the call duration, and success/error status — useful for understanding what the SDK is doing under the hood.

## Project Structure

```
example/
├── app/
│   ├── layout.tsx        # Root layout, fonts, metadata
│   └── page.tsx          # Main dashboard — tabs + positions
├── components/
│   ├── Header.tsx        # Wallet connection, token balances
│   ├── SwapCard.tsx      # Swap UI with quote + slippage controls
│   ├── LiquidityCard.tsx # Add liquidity with depeg slider
│   ├── PoolExplorer.tsx  # TVL, reserves, tick table, curve chart
│   ├── PositionsList.tsx # LP positions, claim fees, remove liquidity
│   ├── SdkActivityLog.tsx # Real-time log of all SDK calls
│   └── SdkCallPanel.tsx  # Collapsible code + status panel
└── hooks/
    └── useTaurus.ts      # All SDK state, wallet, and execute logic
```

## Related

- [SDK docs](https://taurusswap.xyz/docs/sdk/overview)
- [SDK source](../packages/sdk/)
- [`@taurusswap/sdk` on npm](https://www.npmjs.com/package/@taurusswap/sdk)
