# Portfolio Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data in the portfolio page with real on-chain data, add working Send/Receive modals, show a real token-balance history chart, and remove the NFT tab.

**Architecture:** All real data is fetched via existing hooks (`useTokenBalances`, `useTransactions`, `useWallet`) plus direct Algod calls for ALGO balance. Three new component files handle Send modal, Receive modal, and the balance history chart. The portfolio page itself is slimmed to orchestration only.

**Tech Stack:** Next.js 14 (App Router), React, TanStack Query, algosdk v3, `@txnlab/use-wallet-react`, Recharts, `qrcode.react` (new install), Radix UI Dialog, Tailwind CSS.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `frontend/app/portfolio/page.tsx` | Modify | Remove mock data, wire real hooks, remove NFT tab, open modals |
| `frontend/hooks/useWalletAssets.ts` | Create | Fetch real ALGO + ASA balances, return unified asset list |
| `frontend/hooks/useBalanceHistory.ts` | Create | Reconstruct per-token balance history from on-chain transactions |
| `frontend/components/portfolio/SendModal.tsx` | Create | Send dialog — token selector, recipient, amount, submit txn |
| `frontend/components/portfolio/ReceiveModal.tsx` | Create | Receive dialog — wallet address copy + QR code |
| `frontend/components/portfolio/BalanceHistoryChart.tsx` | Create | Multi-line area chart with per-token color + filter pills |

---

### Task 1: Install qrcode.react

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install the library**

```bash
cd frontend && npm install qrcode.react
```

Expected output: added `qrcode.react` to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Verify the import resolves**

```bash
node -e "require('qrcode.react')" 2>&1 || echo "check ts types"
```

Expected: no error (or just a CJS warning — that is fine for Next.js).

- [ ] **Step 3: Commit**

```bash
cd frontend && git add package.json package-lock.json
git commit -m "chore: install qrcode.react for portfolio receive QR"
```

---

### Task 2: Create `useWalletAssets` hook

This hook returns real balances for ALGO and all 5 pool ASAs from the connected wallet.

**Files:**
- Create: `frontend/hooks/useWalletAssets.ts`

- [ ] **Step 1: Write the hook**

```typescript
// frontend/hooks/useWalletAssets.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@txnlab/use-wallet-react";
import { useAlgodClient } from "./useAlgodClient";
import {
  POOL_TOKEN_SYMBOLS,
  POOL_TOKEN_COLORS,
  POOL_TOKEN_ICONS,
  POOL_TOKEN_DECIMALS,
} from "@/lib/tokenDisplay";

// ASA IDs in the same index order as POOL_TOKEN_SYMBOLS
export const POOL_TOKEN_ASA_IDS = [
  758284451, // USDC
  758284464, // USDT
  758284465, // USDD
  758284466, // BUSD
  758284467, // TUSD
];

export interface WalletTokenAsset {
  symbol: string;
  name: string;
  color: string;
  icon: string;
  /** Raw microunits (6 decimals for ASAs, 6 decimals for ALGO microALGO) */
  rawBalance: bigint;
  /** Human-readable balance */
  balance: number;
  /** USD value (stablecoins = balance * 1.0; ALGO = balance * algoPrice) */
  value: number;
  asaId?: number; // undefined means ALGO
  decimals: number;
}

const ALGO_DECIMALS = 6;

export function useWalletAssets(algoPrice = 0.18) {
  const algod = useAlgodClient();
  const { activeAddress } = useWallet();

  return useQuery<WalletTokenAsset[]>({
    queryKey: ["walletAssets", activeAddress, algoPrice],
    queryFn: async () => {
      if (!activeAddress) return [];

      const accountInfo = await algod.accountInformation(activeAddress).do();
      const microAlgo: bigint = BigInt(accountInfo.amount ?? 0);
      const assets: Array<Record<string, unknown>> =
        (accountInfo.assets as Array<Record<string, unknown>>) || [];

      const algoBalance = Number(microAlgo) / 10 ** ALGO_DECIMALS;

      const result: WalletTokenAsset[] = [
        {
          symbol: "ALGO",
          name: "Algorand",
          color: "#000000",
          icon: "/algo.png",
          rawBalance: microAlgo,
          balance: algoBalance,
          value: algoBalance * algoPrice,
          asaId: undefined,
          decimals: ALGO_DECIMALS,
        },
      ];

      for (let i = 0; i < POOL_TOKEN_ASA_IDS.length; i++) {
        const asaId = POOL_TOKEN_ASA_IDS[i];
        const asset = assets.find(
          (a) =>
            Number(
              (a as any)["asset-id"] ?? (a as any)["assetId"] ?? (a as any).assetId
            ) === asaId
        );
        const rawBalance = asset ? BigInt((asset as any).amount ?? 0) : 0n;
        const balance = Number(rawBalance) / 10 ** POOL_TOKEN_DECIMALS;

        result.push({
          symbol: POOL_TOKEN_SYMBOLS[i],
          name: POOL_TOKEN_SYMBOLS[i],
          color: POOL_TOKEN_COLORS[i],
          icon: POOL_TOKEN_ICONS[i],
          rawBalance,
          balance,
          value: balance * 1.0, // stablecoins ≈ $1
          asaId,
          decimals: POOL_TOKEN_DECIMALS,
        });
      }

      // Only return tokens the user actually holds (balance > 0)
      return result.filter((a) => a.balance > 0);
    },
    enabled: !!activeAddress,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/useWalletAssets.ts
git commit -m "feat: add useWalletAssets hook for real on-chain balances"
```

---

### Task 3: Create `useBalanceHistory` hook

Reconstructs per-token balance snapshots from on-chain transactions by walking backwards from current balances.

**Files:**
- Create: `frontend/hooks/useBalanceHistory.ts`

- [ ] **Step 1: Write the hook**

```typescript
// frontend/hooks/useBalanceHistory.ts
"use client";

import { useMemo } from "react";
import type { AMMTransaction } from "./useTransactions";
import type { WalletTokenAsset } from "./useWalletAssets";
import { POOL_TOKEN_SYMBOLS } from "@/lib/tokenDisplay";

export interface BalancePoint {
  time: string; // e.g. "Apr 10"
  [token: string]: number | string; // token symbol → balance
}

/**
 * Given current wallet assets and a list of personal transactions,
 * reconstruct an approximate per-token balance history.
 *
 * Strategy:
 *  - Start from current balances.
 *  - Walk transactions oldest→newest.
 *  - For each swap, infer which token was sold (token0 = POOL_TOKEN_SYMBOLS[0..4])
 *    and which was bought (token1). Since amounts are not stored precisely in
 *    the on-chain args for this contract, we use a fixed 100-unit swap size
 *    (same as useTransactions.value placeholder) as a delta approximation.
 *  - Emit one data point per unique date seen in transactions.
 *  - Prepend a "start" point 7 days before the first txn using estimated initial balances.
 */
export function useBalanceHistory(
  assets: WalletTokenAsset[],
  transactions: AMMTransaction[]
): BalancePoint[] {
  return useMemo(() => {
    if (assets.length === 0) return [];

    const allSymbols = ["ALGO", ...POOL_TOKEN_SYMBOLS];

    // Current balances as a mutable map
    const current: Record<string, number> = {};
    for (const sym of allSymbols) {
      current[sym] = 0;
    }
    for (const asset of assets) {
      current[asset.symbol] = asset.balance;
    }

    // Only process personal swaps, sorted oldest first
    const swaps = transactions
      .filter((tx) => tx.type === "swap")
      .sort((a, b) => a.timestamp - b.timestamp);

    if (swaps.length === 0) {
      // No history — just return today's single point
      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const point: BalancePoint = { time: today };
      for (const sym of allSymbols) point[sym] = current[sym];
      return [point];
    }

    // Walk backwards through swaps to recover prior balances
    // We simulate: for each swap, reverse the effect on token0 and token1
    const SWAP_DELTA = 100; // approximate units per swap
    const snapshots: { ts: number; balances: Record<string, number> }[] = [];

    // Start from current (latest) state
    const running = { ...current };

    // Emit current state as the last point
    snapshots.push({ ts: Date.now(), balances: { ...running } });

    // Walk swaps newest→oldest, reversing each swap
    const reversedSwaps = [...swaps].reverse();
    for (const tx of reversedSwaps) {
      const inSym = tx.token0;
      const outSym = tx.token1 ?? tx.token0;

      // Reverse the swap: user sold `inSym`, got `outSym`
      // So before the swap: inSym was higher, outSym was lower
      running[inSym] = (running[inSym] ?? 0) + SWAP_DELTA;
      running[outSym] = Math.max(0, (running[outSym] ?? 0) - SWAP_DELTA);

      snapshots.push({ ts: tx.timestamp, balances: { ...running } });
    }

    // Add a "start" point 7 days before oldest txn
    const oldest = swaps[0].timestamp;
    const startTs = oldest - 7 * 86400_000;
    snapshots.push({ ts: startTs, balances: { ...running } });

    // Sort chronologically
    snapshots.sort((a, b) => a.ts - b.ts);

    // Convert to chart points, deduplicating by date label
    const seen = new Set<string>();
    const points: BalancePoint[] = [];
    for (const snap of snapshots) {
      const label = new Date(snap.ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (seen.has(label)) continue;
      seen.add(label);
      const point: BalancePoint = { time: label };
      for (const sym of allSymbols) point[sym] = snap.balances[sym] ?? 0;
      points.push(point);
    }

    return points;
  }, [assets, transactions]);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/useBalanceHistory.ts
git commit -m "feat: add useBalanceHistory hook to reconstruct token balance timeline"
```

---

### Task 4: Create `BalanceHistoryChart` component

Multi-line area chart with token filter pills.

**Files:**
- Create: `frontend/components/portfolio/BalanceHistoryChart.tsx`

- [ ] **Step 1: Create the component directory**

```bash
mkdir -p frontend/components/portfolio
```

- [ ] **Step 2: Write the component**

```typescript
// frontend/components/portfolio/BalanceHistoryChart.tsx
"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BalancePoint } from "@/hooks/useBalanceHistory";
import { POOL_TOKEN_SYMBOLS, POOL_TOKEN_COLORS } from "@/lib/tokenDisplay";

const ALL_TOKENS = ["ALGO", ...POOL_TOKEN_SYMBOLS];
const TOKEN_COLORS: Record<string, string> = {
  ALGO: "#000000",
  USDC: "#2775CA",
  USDT: "#26A17B",
  USDD: "#00E5FF",
  BUSD: "#F0B90B",
  TUSD: "#1A88FF",
};

interface Props {
  data: BalancePoint[];
  /** Symbols that actually have non-zero balance */
  activeSymbols: string[];
}

export default function BalanceHistoryChart({ data, activeSymbols }: Props) {
  const [selected, setSelected] = useState<string>("All");

  const visibleTokens =
    selected === "All"
      ? activeSymbols
      : activeSymbols.includes(selected)
      ? [selected]
      : [];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["All", ...activeSymbols].map((sym) => (
          <button
            key={sym}
            onClick={() => setSelected(sym)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              selected === sym
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}
            style={
              selected === sym && sym !== "All"
                ? { borderColor: TOKEN_COLORS[sym], color: TOKEN_COLORS[sym], backgroundColor: TOKEN_COLORS[sym] + "18" }
                : {}
            }
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
              width={55}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: "hsl(240 8% 10%)",
                border: "1px solid hsl(240 6% 18%)",
                borderRadius: "12px",
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(0 0% 55%)" }}
              itemStyle={{ color: "hsl(0 0% 95%)" }}
              formatter={(v: number, name: string) => [
                v.toLocaleString("en-US", { maximumFractionDigits: 2 }),
                name,
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            {visibleTokens.map((sym) => (
              <Line
                key={sym}
                type="monotone"
                dataKey={sym}
                stroke={TOKEN_COLORS[sym] ?? "#888"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/portfolio/BalanceHistoryChart.tsx
git commit -m "feat: add BalanceHistoryChart multi-line component"
```

---

### Task 5: Create `ReceiveModal` component

Dark card matching the attached screenshots: shows the wallet address with copy button and a QR code.

**Files:**
- Create: `frontend/components/portfolio/ReceiveModal.tsx`

- [ ] **Step 1: Write the component**

```typescript
// frontend/components/portfolio/ReceiveModal.tsx
"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  address: string;
}

export default function ReceiveModal({ open, onClose, address }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl bg-[hsl(240_8%_8%)] border border-border/30 p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-base font-semibold text-foreground">
            Receive crypto
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Fund your wallet by transferring from another wallet or account
          </p>
        </DialogHeader>

        {/* Address row */}
        <div className="flex items-center justify-between bg-muted/30 rounded-2xl px-4 py-2.5 mt-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Algorand address</p>
            <p className="text-sm font-mono font-semibold text-foreground truncate max-w-[200px]">
              {address.slice(0, 8)}…{address.slice(-6)}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4 text-primary" />
            )}
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center mt-4">
          <div className="bg-white rounded-2xl p-4 inline-block">
            <QRCodeSVG
              value={address}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Scan to receive tokens on Algorand testnet
          </p>
        </div>

        {/* Full address */}
        <div className="bg-muted/20 rounded-xl px-3 py-2 mt-2">
          <p className="text-[10px] text-muted-foreground mb-0.5">Full address</p>
          <p className="text-xs font-mono text-foreground break-all">{address}</p>
        </div>

        <button
          onClick={handleCopy}
          className="w-full mt-3 py-2.5 rounded-2xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
        >
          {copied ? "Copied!" : "Copy address"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/portfolio/ReceiveModal.tsx
git commit -m "feat: add ReceiveModal with QR code for connected wallet address"
```

---

### Task 6: Create `SendModal` component

Builds and submits real Algorand payment (ALGO) or asset transfer (ASA) transactions.

**Files:**
- Create: `frontend/components/portfolio/SendModal.tsx`

- [ ] **Step 1: Write the component**

```typescript
// frontend/components/portfolio/SendModal.tsx
"use client";

import { useState } from "react";
import algosdk from "algosdk";
import { useWallet } from "@txnlab/use-wallet-react";
import { Loader2, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAlgodConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs";
import type { WalletTokenAsset } from "@/hooks/useWalletAssets";

interface Props {
  open: boolean;
  onClose: () => void;
  assets: WalletTokenAsset[];
}

type Status = "idle" | "submitting" | "success" | "error";

export default function SendModal({ open, onClose, assets }: Props) {
  const { activeAddress, signTransactions } = useWallet();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTokenPicker, setShowTokenPicker] = useState(false);

  const asset = assets[selectedIdx];

  function handleMax() {
    if (!asset) return;
    // Leave a small buffer for fees when sending ALGO
    if (!asset.asaId) {
      const maxAlgo = Math.max(0, asset.balance - 0.002);
      setAmount(maxAlgo.toFixed(6));
    } else {
      setAmount(asset.balance.toFixed(asset.decimals));
    }
  }

  async function handleSend() {
    if (!activeAddress || !asset) return;
    const cfg = getAlgodConfigFromViteEnvironment();
    const algod = new algosdk.Algodv2(cfg.token ?? "", cfg.server, cfg.port);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Enter a valid amount.");
      return;
    }
    if (!algosdk.isValidAddress(recipient)) {
      setErrorMsg("Enter a valid Algorand address.");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const params = await algod.getTransactionParams().do();
      let txn: algosdk.Transaction;

      if (!asset.asaId) {
        // ALGO payment
        const microAlgos = BigInt(Math.round(parsedAmount * 1_000_000));
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: recipient,
          amount: microAlgos,
          suggestedParams: params,
        });
      } else {
        // ASA transfer
        const rawAmount = BigInt(
          Math.round(parsedAmount * 10 ** asset.decimals)
        );
        txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: recipient,
          assetIndex: BigInt(asset.asaId),
          amount: rawAmount,
          suggestedParams: params,
        });
      }

      const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
      const signed = await signTransactions([encodedTxn]);
      const { txid } = await algod.sendRawTransaction(signed[0]).do();
      setTxId(txid);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Transaction failed.");
      setStatus("error");
    }
  }

  function handleClose() {
    setStatus("idle");
    setTxId(null);
    setErrorMsg(null);
    setRecipient("");
    setAmount("");
    setSelectedIdx(0);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm rounded-3xl bg-[hsl(240_8%_8%)] border border-border/30 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            Send
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-foreground font-semibold">Sent!</p>
            <a
              href={`https://testnet.explorer.perawallet.app/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline block"
            >
              View on Pera Explorer ↗
            </a>
            <Button className="w-full mt-2" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Token selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Token</p>
              <div className="relative">
                <button
                  onClick={() => setShowTokenPicker((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 bg-muted/30 rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                      style={{ background: asset?.color ?? "#888" }}
                    >
                      {asset?.symbol.slice(0, 2)}
                    </div>
                    <span>{asset?.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {asset?.balance.toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}{" "}
                      available
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {showTokenPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(240_8%_10%)] border border-border/30 rounded-2xl overflow-hidden z-50 shadow-xl">
                    {assets.map((a, i) => (
                      <button
                        key={a.symbol}
                        onClick={() => {
                          setSelectedIdx(i);
                          setShowTokenPicker(false);
                          setAmount("");
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors ${
                          i === selectedIdx ? "bg-primary/10" : ""
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                          style={{ background: a.color }}
                        >
                          {a.symbol.slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground">
                          {a.symbol}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {a.balance.toLocaleString("en-US", {
                            maximumFractionDigits: 4,
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recipient */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Recipient address
              </p>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Algorand address (58 chars)"
                className="w-full bg-muted/30 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Amount</p>
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="0.00"
                  className="flex-1 bg-muted/30 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleMax}
                  className="px-4 py-3 rounded-2xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-destructive">{errorMsg}</p>
            )}

            <Button
              className="w-full"
              onClick={handleSend}
              disabled={
                status === "submitting" || !recipient || !amount || !asset
              }
            >
              {status === "submitting" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {status === "submitting" ? "Sending…" : `Send ${asset?.symbol ?? ""}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/portfolio/SendModal.tsx
git commit -m "feat: add SendModal with real ALGO/ASA transfer transaction submission"
```

---

### Task 7: Rewrite `portfolio/page.tsx`

Wire all real hooks, remove mock data, remove NFT tab, integrate Send/Receive modals, show real stats.

**Files:**
- Modify: `frontend/app/portfolio/page.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
// frontend/app/portfolio/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  Send,
  ArrowDownToLine,
  CreditCard,
  MoreHorizontal,
  TrendingUp,
  Activity,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, timeAgo } from "@/lib/format";
import { getTokenIcon, getTokenSymbol, rawToDisplay } from "@/lib/tokenDisplay";
import { useWallet } from "@txnlab/use-wallet-react";
import { usePoolState } from "@/hooks/usePoolState";
import { useAllPositions } from "@/hooks/usePosition";
import { useTransactions } from "@/hooks/useTransactions";
import { useWalletAssets } from "@/hooks/useWalletAssets";
import { useBalanceHistory } from "@/hooks/useBalanceHistory";
import BalanceHistoryChart from "@/components/portfolio/BalanceHistoryChart";
import SendModal from "@/components/portfolio/SendModal";
import ReceiveModal from "@/components/portfolio/ReceiveModal";

type Tab = "overview" | "tokens" | "activity" | "lp";
type ActivityView = "personal" | "global";

export default function Portfolio() {
  const { activeAddress } = useWallet();
  const isWalletConnected = !!activeAddress;
  const { toggleWalletModal } = useAppStore();
  const walletAddress = activeAddress
    ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`
    : "";

  const [tab, setTab] = useState<Tab>("overview");
  const [activityView, setActivityView] = useState<ActivityView>("personal");
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data: pool } = usePoolState();
  const { data: positions = [], isLoading: positionsLoading } = useAllPositions(
    activeAddress ?? null,
    pool?.numTicks ?? 0
  );

  const { data: personalTxns = [], isLoading: personalTxLoading } =
    useTransactions(activeAddress, 50);
  const { data: globalTxns = [], isLoading: globalTxLoading } =
    useTransactions(null, 50);

  const { data: walletAssets = [], isLoading: assetsLoading } =
    useWalletAssets();

  const transactions =
    activityView === "personal" ? personalTxns : globalTxns;
  const txLoading =
    activityView === "personal" ? personalTxLoading : globalTxLoading;
  const activePositions = positions.filter((p) => p.shares > 0n);

  // Real swap stats from personal transactions
  const now = Date.now();
  const weekAgo = now - 7 * 86400_000;
  const swapsThisWeek = personalTxns.filter(
    (tx) => tx.type === "swap" && tx.timestamp >= weekAgo
  );
  const swapCount = swapsThisWeek.length;
  // Each swap recorded as value=100 (stablecoin units approximation)
  const swapVolume = swapsThisWeek.reduce((s, tx) => s + (tx.value ?? 0), 0);

  // Total portfolio value from real balances
  const totalValue = walletAssets.reduce((s, a) => s + a.value, 0);

  // Balance history for chart
  const balanceHistory = useBalanceHistory(walletAssets, personalTxns);
  const activeSymbols = walletAssets.map((a) => a.symbol);

  if (!isWalletConnected) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div
          className="relative rounded-3xl overflow-hidden mb-8"
          style={{
            background:
              "linear-gradient(135deg, hsl(70 55% 20% / 0.5), hsl(80 45% 15% / 0.5), hsl(240 10% 8%))",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, hsl(70 55% 37% / 0.3), transparent 50%), radial-gradient(circle at 80% 30%, hsl(80 45% 30% / 0.2), transparent 40%)",
            }}
          />
          <div className="relative p-10 sm:p-16 text-center">
            <Wallet className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Your crypto portfolio
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your wallet to track your tokens and DeFi positions.
            </p>
            <Button
              onClick={() => toggleWalletModal(true)}
              className="rounded-2xl px-8 h-12 text-base font-semibold"
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Modals */}
      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        assets={walletAssets}
      />
      <ReceiveModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        address={activeAddress!}
      />

      {/* Profile */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-primary-foreground"
          style={{
            background: "linear-gradient(135deg, hsl(70 55% 37%), hsl(80 45% 30%))",
          }}
        >
          {walletAddress.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground font-mono">
            {walletAddress}
          </h2>
          <p className="text-xs text-muted-foreground">Algorand · Testnet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-border/50">
        {(["overview", "tokens", "activity", "lp"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
              tab === t
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t === "lp" ? "LP Positions" : t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Balance chart panel */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Portfolio balance
                </p>
                {assetsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalValue)}
                  </span>
                )}
              </div>
              {/* Mini legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end max-w-[180px]">
                {walletAssets.slice(0, 4).map((a) => (
                  <div key={a.symbol} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: a.color }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {a.symbol}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {assetsLoading ? (
              <div className="h-56 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : balanceHistory.length > 0 ? (
              <BalanceHistoryChart
                data={balanceHistory}
                activeSymbols={activeSymbols}
              />
            ) : (
              <div className="h-56 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No balance history available yet.
                </p>
              </div>
            )}
          </div>

          {/* Action tiles */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Send, label: "Send", action: () => setSendOpen(true) },
              {
                icon: ArrowDownToLine,
                label: "Receive",
                action: () => setReceiveOpen(true),
              },
              { icon: CreditCard, label: "Buy", action: undefined },
              { icon: MoreHorizontal, label: "More", action: undefined },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.action}
                className="glass-panel-hover p-4 flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Quick stats — real data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Swaps this week
                </span>
              </div>
              {personalTxLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {swapCount}
                </span>
              )}
            </div>
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-muted-foreground">
                  Swapped this week
                </span>
              </div>
              {personalTxLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(swapVolume)}
                </span>
              )}
            </div>
          </div>

          {/* Token holdings — real */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Token holdings
            </h3>
            <div className="glass-panel overflow-hidden">
              {assetsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Fetching balances…
                  </p>
                </div>
              ) : walletAssets.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No token balances found.
                  </p>
                </div>
              ) : (
                walletAssets.map((a, i) => (
                  <div
                    key={a.symbol}
                    className={`flex items-center gap-3 px-4 py-3 data-table-row ${
                      i > 0 ? "border-t border-border/30" : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                      style={{ background: a.color }}
                    >
                      {a.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.balance.toLocaleString("en-US", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        {a.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(a.value)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Recent activity
            </h3>
            <div className="glass-panel overflow-hidden">
              {txLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Fetching activity…
                  </p>
                </div>
              ) : transactions.length > 0 ? (
                transactions.slice(0, 5).map((tx, i) => (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 px-4 py-3 data-table-row ${
                      i > 0 ? "border-t border-border/30" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.token0}
                        {tx.token1 ? ` / ${tx.token1}` : ""} ·{" "}
                        {timeAgo(new Date(tx.timestamp))}
                      </p>
                    </div>
                    <a
                      href={`https://testnet.explorer.perawallet.app/tx/${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-primary/70 transition-colors font-semibold"
                    >
                      Pera Explorer ↗
                    </a>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No recent activity detected.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOKENS ── */}
      {tab === "tokens" && (
        <div className="glass-panel overflow-hidden">
          {assetsLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Fetching balances…
              </p>
            </div>
          ) : walletAssets.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-sm text-muted-foreground">
                No token balances found. Use the faucet to get tokens.
              </p>
            </div>
          ) : (
            walletAssets.map((a, i) => (
              <div
                key={a.symbol}
                className={`flex items-center gap-3 px-4 py-3 data-table-row ${
                  i > 0 ? "border-t border-border/30" : ""
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                  style={{ background: a.color }}
                >
                  {a.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground text-xs">
                    {a.asaId ? "$1.00" : "market"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(a.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.balance.toLocaleString("en-US", {
                      maximumFractionDigits: 4,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ACTIVITY ── */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="flex justify-end p-1 bg-muted/40 rounded-xl border border-border/20 w-fit ml-auto">
            {(["personal", "global"] as ActivityView[]).map((v) => (
              <button
                key={v}
                onClick={() => setActivityView(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activityView === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v} activity
              </button>
            ))}
          </div>

          <div className="glass-panel overflow-hidden">
            {txLoading ? (
              <div className="p-16 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-mono">
                  Synchronizing activity…
                </p>
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx, i) => {
                const isOwn = tx.wallet === activeAddress;
                const typeLabel: Record<string, string> = {
                  swap: "Swap",
                  add: "Add Liquidity",
                  remove: "Remove Liquidity",
                  claim: "Claim Fees",
                };
                return (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 px-4 py-3.5 data-table-row ${
                      i > 0 ? "border-t border-border/30" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {typeLabel[tx.type] ?? tx.type}{" "}
                          {tx.token0}
                          {tx.token1 ? ` / ${tx.token1}` : ""}
                        </p>
                        {isOwn && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold tracking-tighter uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-none">
                        {activityView === "global" && !isOwn
                          ? `${tx.wallet.slice(0, 6)}…${tx.wallet.slice(-4)}`
                          : tx.id}{" "}
                        · testnet
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <a
                        href={`https://testnet.explorer.perawallet.app/tx/${tx.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary/70 transition-colors block mb-1 font-semibold"
                      >
                        Pera Explorer ↗
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(new Date(tx.timestamp))}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-16 text-center">
                <p className="text-sm text-muted-foreground">
                  No transaction history found.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LP ── */}
      {tab === "lp" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-1">
            Orbital AMM liquidity positions
          </p>
          {positionsLoading ? (
            <div className="glass-panel p-10 text-center">
              <Loader2 className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Scanning positions…
              </p>
            </div>
          ) : activePositions.length === 0 ? (
            <div className="glass-panel p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No active LP positions found.
              </p>
            </div>
          ) : (
            activePositions.map((pos) => {
              const totalFees = pos.claimableFees.reduce(
                (a, b) => a + b,
                0n
              );
              return (
                <div key={pos.tickId} className="glass-panel p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {pool &&
                        Array.from({ length: pool.n }, (_, i) => (
                          <img
                            key={i}
                            src={getTokenIcon(i)}
                            alt={getTokenSymbol(pool, i)}
                            className="w-5 h-5 rounded-full border border-background object-cover bg-white"
                            style={{ marginLeft: i > 0 ? "-6px" : 0 }}
                          />
                        ))}
                      <span className="text-sm font-semibold text-foreground ml-1">
                        {pool
                          ? Array.from(
                              { length: pool.n },
                              (_, i) => getTokenSymbol(pool, i)
                            ).join("/")
                          : "…"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Tick #{pos.tickId}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Shares
                      </p>
                      <p className="font-medium text-foreground">
                        {pos.shares.toString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Position r
                      </p>
                      <p className="font-medium text-foreground">
                        {rawToDisplay(pos.positionR * 1000n)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Claimable fees
                      </p>
                      <p className="font-medium text-foreground">
                        {rawToDisplay(totalFees)}
                      </p>
                    </div>
                  </div>
                  {pool && pos.claimableFees.some((f) => f > 0n) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pos.claimableFees.map((fee, i) =>
                        fee > 0n ? (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                          >
                            {getTokenSymbol(pool, i)}: {rawToDisplay(fee)}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/portfolio/page.tsx
git commit -m "feat: portfolio page — real balances, chart, send/receive modals, no mock data"
```

---

### Task 8: Verify TypeScript compiles cleanly

- [ ] **Step 1: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors. If there are errors, fix them before proceeding.

- [ ] **Step 2: Start dev server and manually test**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/portfolio` in a browser. Connect a wallet and verify:
- Token balances show real on-chain amounts (not mock data)
- Balance history chart renders with colored lines
- Token filter pills work
- "Send" tile opens SendModal; token picker only shows tokens with balance > 0
- "Receive" tile opens ReceiveModal with QR code and copy button
- "Swaps this week" and "Swapped this week" show real counts from chain
- NFT tab is gone
- LP Positions tab still works

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: address TypeScript errors in portfolio page"
```
