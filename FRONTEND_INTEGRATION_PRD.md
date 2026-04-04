# TaurusProtocol Frontend Integration PRD

**Date:** 2026-04-04  
**Scope:** Wire the deployed OrbitalPool Algorand contract to the React frontend via the Orbital SDK.

---

## Current State Diagnosis

| Layer | Status | Problem |
|-------|--------|---------|
| Smart contract | Deployed on Algorand | ✅ Done |
| ABI binding | Generated (`src/contract/OrbitalPool.ts`) | ✅ Done |
| SDK | Specified in `ORBITAL_SDK_PRD.md` | ❌ Not implemented |
| Frontend UI | Built (Uniswap-like) | ❌ All mock data, wrong chain |
| Wallet | Zustand stub (`connectWallet` = `set({isWalletConnected: true})`) | ❌ Fake |
| Token data | EVM tokens (ETH, USDC, WBTC...) | ❌ Wrong network entirely |
| Swap logic | `price = sellToken.price / buyToken.price` | ❌ No AMM math |
| Pool/tick display | Static `demoPositions` | ❌ No on-chain reads |

---

## Integration Architecture

```
Frontend (React)
    │
    ├── @txnlab/use-wallet  ← Algorand wallet adapter (Pera, Defly, etc.)
    │
    └── orbital-sdk/        ← Build this from ORBITAL_SDK_PRD.md
            │
            ├── math/       ← BigInt sphere/torus/tick math (off-chain compute)
            ├── pool/       ← quote(), swap(), addLiquidity(), removeLiquidity()
            └── algorand/   ← algosdk client, ABI encoding, atomic groups
                    │
                    └── OrbitalPool contract on Algorand (app ID from deploy)
```

---

## Phase 1: SDK Implementation

**Goal:** Build `orbital-sdk/` as a local package inside the repo per `ORBITAL_SDK_PRD.md`.  
**Location:** `/TaurusProtocol/orbital-sdk/`

### Files to build (in dependency order):

**1. `src/constants.ts`** — PRECISION = 1_000_000_000n, SQRT_TABLE, INV_SQRT_TABLE. Already fully specced.

**2. `src/types.ts`** — `Tick`, `PoolState`, `SwapQuote`, `TradeSegment`, `TradeRecipe`, `OrbitalConfig`. Already fully specced.

**3. `src/math/bigint-math.ts`** — `sqrt(n: bigint)`, `abs`, `min`, `max`. Newton's method.

**4. `src/math/sphere.ts`** — Invariant check: `Σ(r - xᵢ)² = r²`. Price: `(r - xᵢ) / (r - xⱼ)`.

**5. `src/math/ticks.ts`** — `scaledKMin`, `scaledKMax`, `equalPriceReserve`, `xMinForTick`, `depositPerToken`.

**6. `src/math/torus.ts`** — `verifyInvariant(sumX, sumXSq, n, rInt, sBound, kBound, sqrtN, invSqrtN)` — mirrors on-chain `verify_invariant` exactly.

**7. `src/math/newton.ts`** — Solve `new_out` given `amount_in` within a single tick using Newton's method on the sphere invariant.

**8. `src/math/tick-crossing.ts`** — Detect which ticks are crossed during a trade; segment the trade recipe into `TradeSegment[]`.

**9. `src/algorand/client.ts`** — Wrap `algosdk.Algodv2`. Expose `simulate()` for readonly calls (used by `get_pool_info`, `get_price`, `get_tick_info`).

**10. `src/algorand/box-encoding.ts`** — Read reserves box (8 bytes per token), fees box, decode `TickData` ABI struct.

**11. `src/algorand/transactions.ts`** — Build atomic groups:
  - `swap`: `[AssetTransfer(token_in → contract), AppCall(swap)]`
  - `swap_with_crossings`: `[AssetTransfer, AppCall(swap_with_crossings)]` with budget padding calls prepended
  - `add_tick`: `[AssetTransfer × n, AppCall(add_tick)]` (n = pool token count)
  - `remove_liquidity`: `[AppCall(remove_liquidity)]`

**12. `src/pool/state-reader.ts`** — Call `get_pool_info()` and `get_tick_info(tickId)` via simulate. Return `PoolState`.

**13. `src/pool/quote.ts`** — `quote(poolState, tokenInIdx, tokenOutIdx, amountIn)` → `SwapQuote`. Pure off-chain computation — no network calls.

**14. `src/pool/swap.ts`** — `executeSwap(config, signer, quote)` → submits the atomic group.

**15. `src/pool/liquidity.ts`** — `addTick(config, signer, r, k)` and `removeLiquidity(config, signer, tickId, shares)`.

**16. `src/index.ts`** — Re-export public API: `quote`, `executeSwap`, `addTick`, `removeLiquidity`, `getPoolState`.

**SDK package.json setup:**
```json
{
  "name": "@taurus/orbital-sdk",
  "dependencies": { "algosdk": "^3.0.0" }
}
```
Reference from frontend: `"@taurus/orbital-sdk": "file:../orbital-sdk"` in `taurusprotocol-frontend/package.json`.

---

## Phase 2: Algorand Wallet Integration

**Goal:** Replace the fake Zustand wallet stub with a real Algorand wallet connection.

**Library:** `@txnlab/use-wallet-react` (supports Pera Wallet, Defly, WalletConnect).

### Changes to `src/store/useAppStore.ts`:
- Remove: `walletAddress: '0x1234...abcd'`, `selectedNetwork: 'ethereum'`
- Add: `walletAddress: string` (Algorand address, base32 format)
- Add: `activeAccount`, `signTransactions` (from use-wallet)
- Remove: fake `networks` array from `src/data/mock.ts` (there is only one network: Algorand)

### Changes to `src/components/layout/Navbar.tsx`:
- Replace fake "Connect Wallet" with `<WalletButton />` that opens Pera/Defly picker
- Display truncated Algorand address (e.g., `AABB...XXYY`) when connected
- Show ALGO balance next to address

### `src/main.tsx`:
Wrap app in `<WalletProvider>` with configured providers (Pera, Defly).

---

## Phase 3: Replace Mock Data with On-Chain State

### 3A. Pool Configuration (`src/config/pool.ts` — new file)

```typescript
export const POOL_APP_ID = <deployed_app_id>;
export const POOL_TOKENS: { asaId: number; symbol: string; decimals: number; color: string }[] = [
  // Fill in the actual registered ASA IDs from register_token calls
  { asaId: <id>, symbol: 'USDC', decimals: 6, color: '#2775CA' },
  { asaId: <id>, symbol: 'USDT', decimals: 6, color: '#26A17B' },
  // ... etc for all n tokens
];
export const ALGOD_URL = 'https://mainnet-api.algonode.cloud'; // or testnet
export const ALGOD_TOKEN = '';
```

### 3B. Replace `src/data/mock.ts` tokens

- The `Token` type in `src/data/types.ts` needs two additions: `asaId: number` and `tokenIdx: number` (index in pool's token array).
- All other EVM-specific tokens (ETH, WBTC, SOL, ARB...) are removed.
- Real prices come from `get_price(tokenInIdx, tokenOutIdx)` via SDK simulate call.

### 3C. Pool state hook (`src/hooks/usePoolState.ts` — new file)

```typescript
// Polls get_pool_info() every 5 seconds
// Returns: PoolState | null, isLoading, error
```

### 3D. Token balances hook (`src/hooks/useTokenBalances.ts` — new file)

```typescript
// Reads ASA balances for connected Algorand address via algod
// Returns: Map<asaId, bigint>
```

---

## Phase 4: Wire SwapCard to Real AMM

**File:** `src/components/swap/SwapCard.tsx`

### Current (mock):
```typescript
const buyAmount = sellAmount ? (parseFloat(sellAmount) * sellToken.price / buyToken.price).toFixed(6) : '';
```

### Target flow:
1. User enters `sellAmount` → debounce 300ms
2. Call `quote(poolState, tokenInIdx, tokenOutIdx, amountIn_bigint)` (SDK, off-chain, instant)
3. Display returned `SwapQuote`: `amountOut`, `priceImpact`, `ticksCrossed`, `effectivePrice`
4. On "Swap" button click:
   - Call `executeSwap(config, signer, quote)` from SDK
   - SDK builds atomic group: `[AssetTransfer → pool, AppCall(swap or swap_with_crossings)]`
   - SDK adds budget-pooling `AppCall(budget)` txns if needed (crossing swaps)
   - User signs via use-wallet, submit to algod
5. Show toast: "Swap submitted" → polling until confirmed → "Swap confirmed"
6. Refresh pool state and token balances

### Quote display updates:
- "Rate": use `SwapQuote.effectivePrice` (from SDK, reflects AMM math)
- "Price impact": use `SwapQuote.priceImpact` (real, not `<0.01%`)
- "Network fee": compute from algod suggested params (base + opcode budget txns × 1000 µALGO)
- "Ticks crossed": add new row showing `SwapQuote.ticksCrossed` (unique to Orbital)

---

## Phase 5: Wire Pool Page (LP Operations)

**File:** `src/pages/Pool.tsx`

### Current: displays `demoPositions` (hardcoded)

### Target:

**"Your positions" section:**
- Read all tick IDs from `poolState.ticks` (from `get_pool_info`)
- For each tick where `tick.lp_address === walletAddress`, call `get_tick_info(tickId)`
- Display: tick `r` and `k` (LP's chosen sphere radius and plane), `liquidity` shares, state (interior/boundary)
- Replace `minPrice`/`maxPrice` with **depeg coverage** (compute from `k` using `scaledKMin`/`scaledKMax`)
- "In range" → "INTERIOR" (tick actively earning) vs "BOUNDARY" (tick at depeg boundary)

**"New position" button:**
Opens a new `AddTickModal` component with:
- Slider or input for `r` (radius — larger = wider coverage, more liquidity)
- Slider for `k` (plane constant — controls concentration, bounded by `[scaledKMin(r), scaledKMax(r)]`)
- Display: capital efficiency multiplier (from SDK `capitalEfficiency(r, k, n)`)
- Display: deposit per token required = `equalPriceReserve(r) - xMinForTick(r, k, n)`
- On confirm: SDK builds `[AssetTransfer × n, AppCall(add_tick)]`, user signs

**"Remove liquidity" on position card:**
- Input: shares to remove (0 to tick.liquidity)
- SDK calls `remove_liquidity(tickId, shares)`

**"Top pools by TVL" sidebar:**
- Replace static `pools` array with: TVL computed from `poolState.reserves` sum × token prices
- Show all n tokens in the pool (not just 2), truncate if n > 4 with "+N more"

---

## Phase 6: Wire Explore Page

**File:** `src/pages/Explore.tsx`

### Tokens tab:
- Replace EVM token list with the pool's n registered ASAs
- Price comes from `get_price(idx, referenceIdx)` — PRECISION-scaled, convert to float
- Volume/FDV: fetch from Algorand indexer (ASA info endpoint) or show "—" initially
- Sparkline: keep as computed from price history (can use indexer block scraping later)

### Pools tab:
- Only one pool (the deployed OrbitalPool)
- Show: all n tokens, TVL, fee tier from `poolState.fee_bps` (convert bps → percentage), num ticks
- Volume: aggregate from indexer (app txn history) — Phase 2 concern, show "—" for now

### Stats cards (hardcoded metrics):
Replace with live values from `poolState`:
- "Pool TVL" = sum of reserves × prices
- "Fee tier" = `poolState.fee_bps / 100`%
- "Active ticks" = `poolState.num_ticks`
- "Transactions": from indexer (can be deferred)

---

## Phase 7: Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Wallet not opted into ASA | Detect from account info; show "Opt in to [TOKEN]" button that submits opt-in txn |
| Insufficient ASA balance | Disable swap button, show balance shortfall |
| Swap would fail invariant | SDK quote returns `null`; show "Insufficient liquidity" |
| Pool paused (`paused=1`) | Read from `poolState.paused`; gray out swap with "Pool paused" banner |
| Tick crossing > budget | SDK auto-adds budget txns; if still insufficient, show "Trade too large, split it" |
| Transaction rejected by user | Toast "Transaction cancelled" |
| algod timeout | Toast "Network error, retry" |

---

## Implementation Order

| Step | What | Depends on |
|------|------|------------|
| 1 | Build `orbital-sdk/` math layer (Phases 1.1–1.8) | Nothing |
| 2 | Build `orbital-sdk/` algorand layer + state reader (1.9–1.13) | Step 1, deployed app ID |
| 3 | Integrate `@txnlab/use-wallet-react`, replace wallet stub (Phase 2) | Nothing |
| 4 | Add pool config file, update `types.ts`, add pool hooks (Phase 3) | Steps 2 + 3 |
| 5 | Wire SwapCard quote flow (Phase 4, quote only) | Steps 1 + 4 |
| 6 | Wire SwapCard execution (Phase 4, submit) | Steps 2 + 3 + 5 |
| 7 | Wire Pool page positions + add tick (Phase 5) | Step 4 |
| 8 | Wire Explore page (Phase 6) | Step 4 |
| 9 | Error handling pass (Phase 7) | Steps 5–8 |

---

## Key Constants to Fill In Before Starting

These come from your deploy:

```
POOL_APP_ID = ???           # from `algokit deploy` output
TOKEN_0_ASA_ID = ???        # from register_token(0, asaId)
TOKEN_1_ASA_ID = ???        # ...
# (repeat for all n tokens)
ALGOD_URL = ???             # testnet or mainnet
N = ???                     # number of tokens in pool
```

---

## What Does NOT Change

- All UI components (`shadcn/ui`, Tailwind, glass-panel styles)
- Routing (`App.tsx`, React Router)
- Layout (`Navbar.tsx` shell, `Layout.tsx`)
- `MiniSparkline`, `TokenIcon` — keep but feed real data
- `formatCurrency`, `formatNumber` in `src/lib/format.ts` — still valid

The visual design stays Uniswap-like. Only data sources and action handlers change.
