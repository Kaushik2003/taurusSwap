# Taurus Protocol Frontend Integration Guide

This document explains how to integrate a Taurus Protocol frontend against the current `sdk/` and `contracts/` packages, with special attention to swap and liquidity flows.

It is written for a Uniswap-style app experience: simple primary actions, advanced controls hidden until needed, fast quote refreshes, clear price impact/slippage feedback, and a focused card-based trading layout. For product inspiration, see Uniswap’s official docs and support guides:

- https://docs.uniswap.org/
- https://support.uniswap.org/hc/en-us

---

## 1. Product Goal

Build a frontend that feels familiar to Uniswap users while respecting Taurus Protocol’s Algorand-specific mechanics:

- **Simple surface area** for traders: connect wallet, choose tokens, enter amount, review quote, sign grouped transactions.
- **Clear LP flow**: choose depeg coverage, preview required deposit per token, create a position, monitor it, then remove liquidity by shares.
- **Safe defaults**: auto-refresh quotes, default slippage, network checks, error states, and explicit review before signature.
- **Math off-chain, verification on-chain**: the frontend should trust the SDK for quote construction and transaction grouping, not rebuild contract logic itself.

---

## 2. Architecture Overview

The cleanest frontend architecture is:

```text
UI Components
    ↓
Frontend State Layer (wallet, network, tokens, forms, async status)
    ↓
Taurus SDK (`sdk/src`)
    ↓
Algorand wallet signer + algod client
    ↓
OrbitalPool contract + app boxes (`contracts/`)
```

### Responsibilities

**Frontend**
- Owns forms, validation, loading states, wallet state, and transaction review UX.
- Converts user input into Taurus fixed-point values.
- Polls or refreshes pool state before quoting and before submission.

**SDK**
- Reads pool state via `readPoolState`.
- Computes quotes via `getSwapQuote`, `estimateOutput`, `getAllPrices`.
- Computes LP params via `computeDepositPerToken`, `tickParamsFromDepegPrice`.
- Builds Algorand transaction groups via `buildSwapGroup`, `buildCrossingSwapGroup`, `buildAddTickGroup`, and `buildRemoveLiquidityGroup`.
- Provides high-level executors via `executeSwap`, `addLiquidity`, and `removeLiquidity`.

**Contracts**
- Store pool reserves and ticks.
- Verify swap validity on-chain.
- Execute token transfers and tick state updates.
- Expose ABI/artifacts at `contracts/smart_contracts/artifacts/OrbitalPool.arc56.json`.

---

## 3. Files the Frontend Should Rely On

### SDK entry points

Use these exports from `sdk/src/index.ts`:

- `createAlgodClient`
- `readPoolState`
- `getSwapQuote`
- `executeSwap`
- `getAllPrices`
- `estimateOutput`
- `addLiquidity`
- `removeLiquidity`
- `computeDepositPerToken`
- `tickParamsFromDepegPrice`
- `PRECISION`
- `TickState`

### Contract-facing sources

The frontend team should understand these contract assets:

- `contracts/smart_contracts/artifacts/OrbitalPool.arc56.json` — ABI/app spec
- `contracts/smart_contracts/orbital_pool.py` — contract behavior
- `contracts/orbital_math/` — reference math mirrored by the SDK
- `contracts/README.md` — contract architecture and storage layout

---

## 4. Core Integration Rules

### 4.1 Always treat the SDK as the source of truth for quotes

Do not manually reproduce swap math in the UI. The SDK already mirrors the contract math:

- `sdk/src/math/newton.ts`
- `sdk/src/math/sphere.ts`
- `sdk/src/math/tick-crossing.ts`
- `sdk/src/math/consolidation.ts`

Frontend code should:

1. fetch pool state,
2. compute a quote with the SDK,
3. display the result,
4. submit using the SDK executor or group builder.

### 4.2 Keep display formatting separate from protocol math

Taurus math uses `PRECISION = 1e9` fixed-point integers.

- Use `bigint` internally for protocol values.
- Keep a small formatting module in the frontend for:
  - `parseDisplayAmount(string) -> bigint`
  - `formatProtocolAmount(bigint) -> string`
  - token decimal presentation
- Never do protocol math in floating point.

### 4.3 Refresh pool state before submit

Quotes can go stale if reserves or ticks change. The submit flow should:

1. re-read pool state,
2. re-quote,
3. compare against user-entered intent,
4. then request the signature.

### 4.4 Let the SDK build Algorand groups

Taurus relies on Algorand grouped transactions, budget-padding no-ops, and box references. The frontend should not handcraft these details unless absolutely necessary.

---

## 5. Recommended Frontend Module Structure

```text
frontend/
  src/
    lib/taurus/
      client.ts
      amounts.ts
      pools.ts
      swaps.ts
      liquidity.ts
      wallet-signer.ts
    hooks/
      usePoolState.ts
      useSwapQuote.ts
      useExecuteSwap.ts
      useAddLiquidity.ts
      useRemoveLiquidity.ts
    components/
      swap/
      liquidity/
      positions/
      common/
```

### Suggested responsibilities

- `client.ts` — wraps `createAlgodClient`
- `amounts.ts` — parse/format helpers around `PRECISION`
- `pools.ts` — calls `readPoolState`
- `swaps.ts` — quote + execute helpers
- `liquidity.ts` — LP preview + add/remove helpers
- `wallet-signer.ts` — adapter that converts wallet-provider signing into the SDK signer shape

---

## 6. Swap Integration

### 6.1 Quote flow

Use:

- `readPoolState(client, appId)`
- `getSwapQuote(poolState, tokenInIdx, tokenOutIdx, amountIn)`

The quote already returns:

- `amountOut`
- `priceImpact`
- `instantaneousPrice`
- `effectivePrice`
- `ticksCrossed`
- `route`

### 6.2 Execute flow

Use:

- `executeSwap(client, poolAppId, sender, tokenInIdx, tokenOutIdx, amountIn, slippageBps, signer)`

The SDK automatically:

- reloads pool state,
- calculates `minAmountOut`,
- decides between `buildSwapGroup` and `buildCrossingSwapGroup`,
- signs/sends grouped transactions,
- waits for confirmation.

### 6.3 Swap UI fields

Your swap card should show:

- sell token + amount
- buy token + quoted amount
- price impact
- minimum received
- slippage setting
- route summary (`ticksCrossed`)
- network / pool status
- submit state: idle, quoting, review, signing, submitted, confirmed, failed

### 6.4 Swap integration example

```ts
import {
  createAlgodClient,
  readPoolState,
  getSwapQuote,
  executeSwap,
} from "@orbital-amm/sdk";

const client = createAlgodClient({
  algodUrl: process.env.NEXT_PUBLIC_ALGOD_URL!,
  algodToken: process.env.NEXT_PUBLIC_ALGOD_TOKEN!,
  poolAppId: Number(process.env.NEXT_PUBLIC_POOL_APP_ID!),
});

const poolAppId = Number(process.env.NEXT_PUBLIC_POOL_APP_ID!);
const pool = await readPoolState(client, poolAppId);
const quote = getSwapQuote(pool, tokenInIdx, tokenOutIdx, amountIn);

const result = await executeSwap(
  client,
  poolAppId,
  walletAddress,
  tokenInIdx,
  tokenOutIdx,
  amountIn,
  50,
  signer,
);
```

---

## 7. Liquidity Integration

### 7.1 LP creation flow

Use these helpers:

- `tickParamsFromDepegPrice(...)`
- `computeDepositPerToken(...)`
- `addLiquidity(...)`

The LP UX should ask the user for:

- tokens/pool
- depeg coverage target (example: `0.99`)
- desired deposit per token or total deposit

Then the frontend should derive:

- `r`
- `k`
- `depositPerToken`
- capital-efficiency preview

### 7.2 LP removal flow

Use:

- `removeLiquidity(...)`

The UI should display:

- tick ID
- shares owned
- estimated underlying withdrawal
- earned fees, if you expose them
- partial remove controls (25%, 50%, Max)

### 7.3 LP transaction behavior

For adds, the SDK constructs:

- budget transactions,
- `n` ASA transfers,
- `add_tick` app call.

For removes, the SDK constructs:

- budget transactions,
- `remove_liquidity` app call with reserves/fees/tick boxes.

This is why the frontend should call the SDK instead of building raw transactions itself.

---

## 8. Contract Integration Details the Frontend Must Respect

### 8.1 Box-backed state

Pool state is not only global state. The frontend must account for:

- global state values
- `reserves` box
- `tick:*` boxes
- `token:*` boxes

`readPoolState` already handles this.

### 8.2 Virtual reserve offset

The SDK reads actual reserves from the box and converts them into math reserves using `virtualOffset`. Frontend code should use `poolState.reserves` from the SDK, not raw box values.

### 8.3 Tick crossings are first-class

Some swaps cross ticks. The SDK encodes this as a `TradeRecipe` and submits `swap_with_crossings`. The UI should surface this as a route detail, not as an error.

### 8.4 Algorand-specific signer abstraction

Your wallet layer should provide:

```ts
(txns: algosdk.Transaction[]) => Promise<Uint8Array[]>
```

That adapter is the boundary between UI wallet code and Taurus SDK execution.

---

## 9. Uniswap-Inspired UI/UX Guidance

This section follows the product patterns users already expect from Uniswap, while adapting them to Taurus on Algorand.

### 9.1 Layout

Use a **single primary card** per major action:

- **Swap card** for traders
- **Add liquidity card** for LP entry
- **Position card/list** for LP management

Keep the interface focused:

- strong visual hierarchy
- one primary CTA per card
- advanced settings hidden behind an icon/drawer
- route and technical details below the main quote, not above it

### 9.2 Navigation

Top-level navigation should be minimal:

- Swap
- Pool / Liquidity
- Positions
- Analytics (optional)

Avoid putting protocol internals in the primary nav.

### 9.3 Swap UX

Follow these interaction rules:

- auto-focus the sell amount field
- let users reverse token direction with one click
- debounce quote refreshes
- keep output field read-only
- show skeleton/loading state while quoting
- disable submit when wallet, amount, or liquidity state is invalid
- show a review screen/modal before signature

### 9.4 LP UX

LP is more complex than swap, so progressively disclose detail:

- start with depeg target + deposit input
- show derived values (`r`, `k`, deposit per token) in an expandable section
- show capital efficiency and risk copy in plain language
- explain that positions are tick-based and may change state as swaps cross them

### 9.5 Status and trust

Users should always know what the app is doing:

- `Fetching pool`
- `Calculating quote`
- `Preparing transactions`
- `Awaiting wallet signature`
- `Submitting to Algorand`
- `Confirmed`

Every failure state should offer a next step:

- retry quote
- increase slippage
- reconnect wallet
- switch network

### 9.6 Mobile behavior

For mobile:

- keep the main swap card above the fold
- use bottom sheets for token selection and settings
- keep the review screen concise
- avoid showing raw `bigint` or internal parameter names by default

### 9.7 Design system recommendations

To stay close to the feel of Uniswap’s app without copying it directly:

- use a clean dark theme with high-contrast action colors
- use rounded cards and large input surfaces
- prioritize readable number typography
- keep token rows compact and scan-friendly
- reserve dense technical details for expandable sections

---

## 10. Recommended Screens

### Swap screen

- wallet connect
- token in / token out selectors
- amount input
- quote panel
- settings drawer
- review modal
- success toast / activity row

### Add liquidity screen

- pool token set
- depeg target input
- deposit input
- capital efficiency preview
- advanced details (`r`, `k`, deposit per token)
- wallet review + confirm

### Positions screen

- connected wallet positions
- tick state badge
- shares
- current reserve exposure
- remove action

---

## 11. Error Handling Checklist

- invalid amount
- same input/output token
- no wallet connected
- wrong Algorand network
- stale quote on submit
- insufficient balance
- insufficient output liquidity
- trade too large / solver failure
- wallet rejection
- submission timeout

Map these errors to short, human-readable copy. Do not expose raw contract or SDK messages unless the user expands technical details.

---

## 12. Recommended Implementation Sequence

1. Build wallet + algod client wiring.
2. Implement `readPoolState` loading for one pool.
3. Build swap quote UX with `getSwapQuote`.
4. Add swap execution with `executeSwap`.
5. Add LP preview with `tickParamsFromDepegPrice` and `computeDepositPerToken`.
6. Add LP create/remove flows.
7. Add positions page and transaction history states.

---

## 13. Practical Notes for This Repository

- `sdk/src/pool/swap.ts` is the main swap integration surface.
- `sdk/src/pool/liquidity.ts` is the main LP integration surface.
- `sdk/src/pool/state-reader.ts` is the canonical on-chain state loader.
- `sdk/src/algorand/transactions.ts` contains the exact grouped transaction construction rules.
- `contracts/orbital_math/` is the reference implementation for math parity.
- `contracts/README.md` should be read by frontend engineers before they build custom pool analytics or admin tooling.

---

## 14. Suggested Frontend Definition of Done

A frontend integration is ready when it can:

- connect an Algorand wallet,
- fetch and display pool state,
- quote swaps with price impact and route info,
- execute swaps through grouped transactions,
- preview LP parameters from user inputs,
- add liquidity,
- remove liquidity,
- handle loading/error/success states cleanly on desktop and mobile.

---

## 15. Final Recommendation

For this protocol, the best frontend is **Uniswap-like in usability, but Taurus-native in data flow**:

- keep the visual experience simple,
- keep protocol math in the SDK,
- keep Algorand transaction complexity hidden from users,
- and make every trade or LP action feel reviewable, transparent, and safe.
