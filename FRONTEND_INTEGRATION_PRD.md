# Orbital AMM — Frontend Integration PRD

**Last updated:** 2026-04-05  
**Contract version:** OrbitalPool v3 (`_AMOUNT_SCALE = 1_000`, `fee_growth` box, `pos:` position boxes)  
**Testnet app ID:** 758284478 (n=5, feeBps=30, rInt≈500_000_000)  
**SDK status:** ✅ All bugs fixed. TypeScript compiles clean. All 10 tests pass.  
**Frontend status:** ❌ No SDK integration. All data is Ethereum/Uniswap mock.

---

## 0. Current State

### SDK — Fully Fixed
The SDK (`sdk/src/`) is complete and correct. All bugs from the prior audit have been resolved:

| Fix | File | Status |
|---|---|---|
| `decodeTickBox` reads v3 25-byte format | `box-encoding.ts` | ✅ Done |
| `Tick.totalShares` (was `liquidity`) | `types.ts` | ✅ Done |
| `PoolState` has `totalR`, `feeBps`, `feeGrowth`, `numTicks` | `types.ts` | ✅ Done |
| `readPoolState` reads `fee_growth` box, `total_r`, `fee_bps` | `state-reader.ts` | ✅ Done |
| `readPosition` reads `pos:` boxes | `state-reader.ts` | ✅ Done |
| `computeRequiredBudget(crossings, n)` accounts for n | `budget.ts` | ✅ Done |
| All transaction builders use correct box references | `transactions.ts` | ✅ Done |
| `buildClaimFeesGroup` added | `transactions.ts` | ✅ Done |
| `getSwapQuote` deducts fee before Newton solver | `swap.ts` | ✅ Done |
| `encodeTradeRecipe` adds AMOUNT_SCALE remainder to last seg | `transactions.ts` | ✅ Done |
| Newton solver uses sphere-delta residual (not torus) | `newton.ts` | ✅ Done |
| `INV_SQRT_TABLE[5]` = 447_213_596 (matches on-chain) | `constants.ts` | ✅ Done |
| `addLiquidity`, `removeLiquidity`, `claimFees` all exported | `liquidity.ts` | ✅ Done |
| `tickParamsFromDepegPrice` accepts raw microunits | `liquidity.ts` | ✅ Done |

### Frontend — No SDK Integration
The frontend (`frontend/src/`) currently:
- Has **no** `@orbital-amm/sdk` dependency in `package.json`
- `SwapCard.tsx` computes output as `sellAmount * sellToken.price / buyToken.price` (mock)
- `Pool.tsx` renders `demoPositions` from `@/data/mock` — Uniswap-style Ethereum data
- `Portfolio.tsx` renders `demoWalletAssets` from `@/data/mock` — ETH/WBTC mock balances
- Token list is hardcoded Ethereum tokens; no Algorand ASA IDs anywhere

The wallet connection layer (`@txnlab/use-wallet-react`, Pera, Defly) is working. `@tanstack/react-query` is installed and available. The algod config is already handled via `VITE_ALGOD_*` environment variables.

---

## 1. Unit System — Ground Truth

Every developer must internalize this before touching the integration.

| Layer | Unit | Example |
|---|---|---|
| ASA wire transfers | **raw microunits** | 1 USDC = 1_000_000 |
| Contract math (`r`, `k`, `sumX`, reserves) | **AMOUNT_SCALE** = raw / 1_000 | 1 USDC = 1_000 AMOUNT_SCALE units |
| `sqrtN`, `invSqrtN` | **PRECISION** = 10^9 | √5 × 10^9 = 2_236_067_977 |
| SDK public API (`getSwapQuote`, `executeSwap`) | **raw microunits** in, **raw microunits** out | `amountInRaw = 25_000_000n` (25 USDC) |
| Display | **tokens** = raw / 10^decimals | `1_000_000n` → `"1.000000"` |

**Critical:** `getSwapQuote` and `executeSwap` accept and return **raw microunits**. The AMOUNT_SCALE conversion is fully internal to the SDK. The frontend only works in raw microunits and display tokens.

---

## 2. Installation

### Step 1 — Install SDK into frontend

From the repo root, either use a local path reference or workspace:

```bash
# Option A: npm workspace (preferred if moving to monorepo)
# Add to root package.json: { "workspaces": ["sdk", "frontend"] }
# Then in frontend/package.json: "@orbital-amm/sdk": "*"

# Option B: local file reference (quickest for now)
cd frontend
npm install file:../sdk
```

Verify `frontend/package.json` now lists `"@orbital-amm/sdk": "file:../sdk"` (or workspace version) in `dependencies`.

### Step 2 — Environment variables

Ensure `frontend/.env` has:
```
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet
VITE_POOL_APP_ID=758284478
```

---

## 3. Data Layer — Hooks

### 3.1 `useAlgodClient.ts`

```typescript
// frontend/src/hooks/useAlgodClient.ts
import { useMemo } from 'react';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '@/utils/network/getAlgoClientConfigs';

export function useAlgodClient(): algosdk.Algodv2 {
  return useMemo(() => {
    const cfg = getAlgodConfigFromViteEnvironment();
    return new algosdk.Algodv2(cfg.token ?? '', cfg.server, cfg.port);
  }, []);
}
```

### 3.2 `usePoolState.ts`

```typescript
// frontend/src/hooks/usePoolState.ts
import { useQuery } from '@tanstack/react-query';
import { readPoolState, PoolState } from '@orbital-amm/sdk';
import { useAlgodClient } from './useAlgodClient';

const POOL_APP_ID = Number(import.meta.env.VITE_POOL_APP_ID ?? '758284478');

export function usePoolState() {
  const client = useAlgodClient();
  return useQuery<PoolState>({
    queryKey: ['pool', POOL_APP_ID],
    queryFn: () => readPoolState(client, POOL_APP_ID),
    staleTime: 5_000,
    refetchInterval: 15_000,
    retry: 2,
  });
}
```

### 3.3 `usePosition.ts`

```typescript
// frontend/src/hooks/usePosition.ts
import { useQuery } from '@tanstack/react-query';
import { readPosition, PositionInfo } from '@orbital-amm/sdk';
import { useAlgodClient } from './useAlgodClient';
import { usePoolState } from './usePoolState';

export function usePosition(ownerAddress: string | null, tickId: number) {
  const client = useAlgodClient();
  const { data: pool } = usePoolState();

  return useQuery<PositionInfo | null>({
    queryKey: ['position', ownerAddress, tickId],
    queryFn: async () => {
      const tick = pool!.ticks.find(t => t.id === tickId);
      if (!tick) return null;
      return readPosition(
        client,
        Number(import.meta.env.VITE_POOL_APP_ID),
        ownerAddress!,
        tickId,
        pool!.n,
        pool!.feeGrowth,
        tick,
      );
    },
    enabled: !!pool && !!ownerAddress,
    staleTime: 10_000,
  });
}
```

### 3.4 `useSwapQuote.ts`

```typescript
// frontend/src/hooks/useSwapQuote.ts
import { useMemo } from 'react';
import { getSwapQuote, SwapQuote, PoolState } from '@orbital-amm/sdk';

export function useSwapQuote(
  pool: PoolState | undefined,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountInRaw: bigint,   // raw microunits (e.g. 25_000_000n for 25 USDC)
): SwapQuote | null {
  return useMemo(() => {
    if (!pool || amountInRaw <= 0n || tokenInIdx === tokenOutIdx) return null;
    try {
      // getSwapQuote takes and returns raw microunits — no conversion needed
      return getSwapQuote(pool, tokenInIdx, tokenOutIdx, amountInRaw);
    } catch {
      return null;
    }
  }, [pool, tokenInIdx, tokenOutIdx, amountInRaw]);
}
```

**`SwapQuote` fields returned (all amounts in raw microunits):**
- `amountIn: bigint` — same as input
- `amountOut: bigint` — output in raw microunits (convert for display: `Number(amountOut) / 10**decimals`)
- `priceImpact: number` — fraction (e.g. `0.003` = 0.3%)
- `effectivePrice: number` — output/input ratio (fee-inclusive)
- `instantaneousPrice: number` — spot price before this swap
- `ticksCrossed: number` — number of tick boundaries crossed

---

## 4. Display Utilities

Add `frontend/src/lib/tokenDisplay.ts`:

```typescript
// frontend/src/lib/tokenDisplay.ts

/** Format raw microunits as a human-readable token amount */
export function formatRawAmount(raw: bigint, decimals: number, precision = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, precision);
  return `${whole}.${fracStr}`;
}

/** Parse a human-readable token string to raw microunits. Returns null on bad input. */
export function parseTokenAmount(value: string, decimals: number): bigint | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [intPart, fracPart = ''] = trimmed.split('.');
  if (fracPart.length > decimals) return null;
  const padded = fracPart.padEnd(decimals, '0');
  try {
    return BigInt(intPart + padded);
  } catch {
    return null;
  }
}

/** CSS class for price impact coloring */
export function priceImpactClass(impact: number): string {
  if (impact < 0.001) return 'text-green-400';
  if (impact < 0.01)  return 'text-yellow-400';
  return 'text-red-400';
}

/** Format price impact as a percentage string */
export function formatPriceImpact(impact: number): string {
  if (impact < 0.0001) return '<0.01%';
  return `${(impact * 100).toFixed(2)}%`;
}
```

---

## 5. Component Rewrites

### 5.1 `SwapCard.tsx` — Full Rewrite

**Remove:** `tokens` from `@/data/mock`, mock price formula, hardcoded rate/impact/fee, no-op swap button.

**Add:**
1. Pool state from `usePoolState()` — token list comes from `poolState.tokenAsaIds` mapped to metadata
2. Token indices instead of token objects (Orbital swaps by index `0..n-1`)
3. Debounced quote from `useSwapQuote()` on every input change
4. Working swap button that calls `executeSwap`

**Skeleton:**

```typescript
import { useState, useMemo, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { usePoolState } from '@/hooks/usePoolState';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { formatRawAmount, parseTokenAmount, formatPriceImpact, priceImpactClass } from '@/lib/tokenDisplay';
import { executeSwap } from '@orbital-amm/sdk';
import algosdk from 'algosdk';

const TOKEN_SYMBOLS = ['USDC', 'USDT', 'USDC-e', 'FRAX', 'DAI'];
const TOKEN_DECIMALS = 6; // all stablecoins, 6 decimals
const POOL_APP_ID = Number(import.meta.env.VITE_POOL_APP_ID);

export default function SwapCard() {
  const { activeAddress, signTransactions } = useWallet();
  const { data: pool, isLoading } = usePoolState();

  const [tokenInIdx, setTokenInIdx] = useState(0);
  const [tokenOutIdx, setTokenOutIdx] = useState(1);
  const [sellAmountStr, setSellAmountStr] = useState('');
  const [slippage, setSlippage] = useState(0.5); // percent
  const [isPending, setIsPending] = useState(false);

  // Parse input to raw microunits
  const amountInRaw = useMemo(
    () => parseTokenAmount(sellAmountStr, TOKEN_DECIMALS) ?? 0n,
    [sellAmountStr],
  );

  const quote = useSwapQuote(pool, tokenInIdx, tokenOutIdx, amountInRaw);

  // Display output amount (raw → token string)
  const buyAmountStr = quote
    ? formatRawAmount(quote.amountOut, TOKEN_DECIMALS, 6)
    : '';

  // Min received after slippage
  const minAmountOut = quote
    ? (quote.amountOut * BigInt(Math.round(10000 - slippage * 100))) / 10000n
    : 0n;

  const handleSwap = useCallback(async () => {
    if (!activeAddress || !pool || !quote || !signTransactions) return;
    setIsPending(true);
    try {
      const client = new algosdk.Algodv2(
        import.meta.env.VITE_ALGOD_TOKEN ?? '',
        import.meta.env.VITE_ALGOD_SERVER,
        import.meta.env.VITE_ALGOD_PORT,
      );
      const slippageBps = BigInt(Math.round(slippage * 100));
      await executeSwap({
        client,
        poolAppId: POOL_APP_ID,
        sender: activeAddress,
        tokenInIdx,
        tokenOutIdx,
        amountInRaw,
        slippageBps,
        signer: (txns) => signTransactions(txns.map(t => algosdk.encodeUnsignedTransaction(t))),
      });
      setSellAmountStr('');
    } catch (err) {
      console.error('Swap failed:', err);
    } finally {
      setIsPending(false);
    }
  }, [activeAddress, pool, quote, signTransactions, tokenInIdx, tokenOutIdx, amountInRaw, slippage]);

  // Token selector — filter out the already-selected token
  const buyTokenOptions = pool
    ? pool.tokenAsaIds.map((_, i) => i).filter(i => i !== tokenInIdx)
    : [];

  // ... render (keep existing visual design, replace data sources)
  //
  // - Token selector lists TOKEN_SYMBOLS[0..n-1], uses setTokenInIdx/setTokenOutIdx
  // - buyAmount field shows buyAmountStr (read-only)
  // - Rate: `1 ${TOKEN_SYMBOLS[tokenInIdx]} = ${quote.effectivePrice.toFixed(6)} ${TOKEN_SYMBOLS[tokenOutIdx]}`
  // - Price impact: quote.priceImpact formatted with formatPriceImpact()
  // - Fee: `${Number(pool?.feeBps ?? 30n) / 100}% (${formatRawAmount(amountInRaw * (pool?.feeBps ?? 30n) / 10000n, 6)} USDC)`
  // - Min received: formatRawAmount(minAmountOut, 6)
  // - Ticks crossed: show if quote.ticksCrossed > 0
}
```

**Unit conversion summary for SwapCard:**
```
User types: "25"
parseTokenAmount("25", 6) → 25_000_000n  (raw microunits)
getSwapQuote(pool, 0, 1, 25_000_000n) → { amountOut: 24_985_000n, priceImpact: 0.0004, ... }
formatRawAmount(24_985_000n, 6) → "24.985000"  (display)
```

### 5.2 `Pool.tsx` — Full Rewrite

**Remove:** `demoPositions`, `pools` from `@/data/mock`. Uniswap two-token pair display.

**Add:**
1. Real tick list from `poolState.ticks`
2. Per-tick position check for connected wallet
3. "New Position" button opens `AddLiquidityModal`

```typescript
import { usePoolState } from '@/hooks/usePoolState';
import { usePosition } from '@/hooks/usePosition';
import { formatRawAmount } from '@/lib/tokenDisplay';
import { getAllPrices, AMOUNT_SCALE } from '@orbital-amm/sdk';

// Per-tick position row — one per tick the wallet holds
function PositionRow({ tickId, tick, poolState, ownerAddress }) {
  const { data: position } = usePosition(ownerAddress, tickId);
  if (!position) return null;

  // Convert positionR (AMOUNT_SCALE) → per-token value (raw microunits)
  // positionR * poolState.reserves[i] / poolState.totalR = this LP's share of token i
  // Then multiply by AMOUNT_SCALE to get raw microunits
  const tokenValues = poolState.reserves.map(r =>
    (position.positionR * r * AMOUNT_SCALE) / poolState.totalR
  );

  return (
    <div className="glass-panel-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold">Tick #{tickId}</span>
          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
            tick.state === 0 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
          }`}>
            {tick.state === 0 ? 'INTERIOR' : 'BOUNDARY'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleClaimFees(tickId)}>Claim Fees</button>
          <button onClick={() => handleRemove(tickId)}>Remove</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        {poolState.tokenAsaIds.map((_, i) => (
          <div key={i}>
            <p className="text-muted-foreground text-xs">Token {i} value</p>
            <p>{formatRawAmount(tokenValues[i], 6)} {TOKEN_SYMBOLS[i]}</p>
          </div>
        ))}
      </div>

      {position.claimableFees.some(f => f > 0n) && (
        <div className="mt-3 text-xs text-muted-foreground">
          Unclaimed fees: {position.claimableFees.map((f, i) =>
            f > 0n ? `${formatRawAmount(f, 6)} ${TOKEN_SYMBOLS[i]}` : null
          ).filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  );
}
```

**Pool stats sidebar — replace Uniswap mock with:**
```typescript
const { data: pool } = usePoolState();
const prices = pool ? getAllPrices(pool, 0) : [];

// Display:
// - Fee: ${Number(pool.feeBps) / 100}%
// - Tokens: all TOKEN_SYMBOLS[0..n-1]
// - Active ticks: pool.ticks.length
// - Prices: prices[i] for i in 1..n-1 (relative to token 0)
```

### 5.3 `Portfolio.tsx` — Update Orbital Positions Section

The portfolio page can keep its existing structure (overview, tokens, activity tabs) but must replace mock LP position data with real positions.

In the **overview** tab, add an "LP Positions" section:
```typescript
// After the existing token holdings section:
<div>
  <h3 className="text-sm font-semibold text-foreground mb-3">Liquidity positions</h3>
  {pool?.ticks.map(tick => (
    <PositionRow
      key={tick.id}
      tickId={tick.id}
      tick={tick}
      poolState={pool}
      ownerAddress={activeAddress}
    />
  ))}
</div>
```

The mock `demoWalletAssets` / `demoTransactions` can remain until a real Algorand indexer query replaces them — that's out of scope for the initial integration.

---

## 6. New Components

### 6.1 `AddLiquidityModal.tsx`

A dialog/drawer with three steps:

**Step 1 — Set depeg price**
```typescript
// Slider: depegPrice from 0.90 to 0.9999
// On change: call tickParamsFromDepegPrice → { r, k }
// Show: getCapitalEfficiencyForDepegPrice(pool, depegPrice, r)
```

**Step 2 — Deposit amount**
```typescript
// Input: depositPerToken in display tokens (e.g. "1000")
// Convert: depositPerTokenRaw = parseTokenAmount(input, 6)
// Call: computeDepositPerToken(r, poolState) or use tickParamsFromDepegPrice which returns r
// Show: depositPerTokenRaw × n tokens breakdown
```

**Step 3 — Confirm**
```typescript
import { addLiquidity, tickParamsFromDepegPrice, AMOUNT_SCALE } from '@orbital-amm/sdk';

const { r, k } = tickParamsFromDepegPrice(
  depegPrice,
  depositPerTokenRaw,    // raw microunits
  pool.n,
  pool.sqrtN,
  pool.invSqrtN,
);

await addLiquidity({
  client,
  poolAppId: POOL_APP_ID,
  sender: activeAddress,
  r,                      // AMOUNT_SCALE units — SDK handles conversion
  k,                      // AMOUNT_SCALE units
  depositPerTokenRaw,     // raw microunits for ASA transfers
  signer: ...,
});
```

**Note on units in `addLiquidity`:**
- `r` and `k` from `tickParamsFromDepegPrice` are in AMOUNT_SCALE units — pass directly
- `depositPerTokenRaw` is in raw microunits — the SDK multiplies by 1 (it's used as-is for the ASA transfer)

### 6.2 `PositionCard.tsx`

Reusable card component extracted from the Pool page position rows. Props:

```typescript
interface PositionCardProps {
  tickId: number;
  tick: Tick;           // from PoolState.ticks
  position: PositionInfo;
  poolState: PoolState;
  onClaimFees: (tickId: number) => void;
  onRemove: (tickId: number) => void;
}
```

Visual layout:
```
┌─────────────────────────────────────────────────────┐
│ [USDC][USDT][USDC-e][FRAX][DAI]  INTERIOR  ● Active │
│ Tick #3 · Covers depeg to $0.990                    │
├─────────────────────────────────────────────────────┤
│ My value per token    Claimable fees                │
│ USDC: 812.34          USDC: 2.14                    │
│ USDT: 812.34          USDT: 1.89                    │
│ ...                   ...                           │
├─────────────────────────────────────────────────────┤
│           [Claim Fees]    [Remove Liquidity]        │
└─────────────────────────────────────────────────────┘
```

The depeg price can be reverse-computed from `k`:
```typescript
import { kFromDepegPrice } from '@orbital-amm/sdk';
// kFromDepegPrice is not directly invertible, but for display:
// priceAtBoundary ≈ (rInt - k) / rInt displayed as "≈$0.99X"
// Or simply show k in AMOUNT_SCALE units as a technical value for advanced users.
```

---

## 7. Wallet Signing Integration

The SDK's `executeSwap`, `addLiquidity`, `removeLiquidity`, `claimFees` all accept a `signer` callback:

```typescript
type Signer = (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
```

With `@txnlab/use-wallet-react`:

```typescript
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';

const { signTransactions } = useWallet();

const signer: Signer = async (txns) => {
  const encoded = txns.map(t => algosdk.encodeUnsignedTransaction(t));
  return signTransactions(encoded);
};
```

---

## 8. Error Handling Reference

| Scenario | SDK throws | Suggested UI |
|---|---|---|
| `amountIn` too small | `"amountIn too small after fee and scaling"` | "Amount too small (min ~0.001 USDC)" |
| Pool output exhausted | `"Trade too large for available liquidity"` | "Amount exceeds available liquidity" |
| Token indices same | `"tokenInIdx and tokenOutIdx must be different"` | Prevent in UI (disable same-token selection) |
| Slippage exceeded on-chain | Contract rejects txn | "Price moved. Try again or increase slippage" |
| Box not found (position) | `readPosition` returns `null` | "No position for this tick" |
| Bracket not found (extreme trade) | `"could not bracket a valid swap output"` | "Trade too large" |

---

## 9. Implementation Order

1. **Install SDK** (`npm install file:../sdk`) — prerequisite for all steps below
2. **`useAlgodClient.ts`** — 10 lines, unblocks all hooks
3. **`usePoolState.ts`** + **`frontend/src/lib/tokenDisplay.ts`** — data foundation
4. **`useSwapQuote.ts`** — enable live quotes
5. **`SwapCard.tsx` rewrite** — highest user-facing value; swap is the core action
6. **`usePosition.ts`** — needed for Pool page
7. **`Pool.tsx` rewrite** + **`PositionCard.tsx`** — LP position management
8. **`AddLiquidityModal.tsx`** — new position flow
9. **`Portfolio.tsx` update** — add LP positions section to overview tab

---

## 10. Testing Checklist

After each step, verify against the live testnet pool (app ID 758284478):

- [ ] `readPoolState` returns `n=5`, `feeBps=30n`, `ticks.length >= 1`, `feeGrowth.length === 5`
- [ ] `usePoolState` hook in React DevTools shows all 5 tokens' reserves
- [ ] `getSwapQuote(pool, 0, 1, 25_000_000n)` returns `amountOut > 24_000_000n`, `priceImpact < 0.01`
- [ ] Typing "25" in SwapCard sell field shows ~24.9x in buy field (live quote, not mock)
- [ ] Token selector lists 5 tokens (USDC, USDT, USDC-e, FRAX, DAI) from pool state
- [ ] Swap button builds and signs a transaction group (check Pera wallet popup)
- [ ] Pool page shows real tick(s) when wallet is connected, not mock positions
- [ ] `AddLiquidityModal` at depegPrice=0.99 computes sensible r and k values
- [ ] `claimFees` transaction group assembles without box reference errors (simulate before sending)
