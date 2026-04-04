import algosdk from "algosdk";
import { TradeRecipe } from "../types";
import { computeRequiredBudget } from "./budget";
import { encodeBoxMapKey, encodeBoxName } from "./box-encoding";
import { encodeBytesArg, encodeUint64Arg, methodSelector } from "./abi";

// ── Swap: no tick crossing ───────────────────────────────────────────────────

export async function buildSwapGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInAsaId: number,
  tokenOutAsaId: number,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint,
  computedAmountOut: bigint,
  minAmountOut: bigint,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddress = algosdk.getApplicationAddress(poolAppId);
  const txns: algosdk.Transaction[] = [];

  // 1. Token transfer to pool
  txns.push(
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: poolAddress,
      amount: amountIn,
      assetIndex: tokenInAsaId,
      suggestedParams: sp,
    }),
  );

  // 2. Budget padding transactions (before the swap call)
  const numBudget = computeRequiredBudget(0);
  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        suggestedParams: sp,
      }),
    );
  }

  // 3. swap(token_in_idx, token_out_idx, amount_in, claimed_amount_out, min_amount_out)
  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [
        methodSelector("swap"),
        encodeUint64Arg(tokenInIdx),
        encodeUint64Arg(tokenOutIdx),
        encodeUint64Arg(amountIn),
        encodeUint64Arg(computedAmountOut),
        encodeUint64Arg(minAmountOut),
      ],
      foreignAssets: [tokenInAsaId, tokenOutAsaId],
      boxes: [{ appIndex: poolAppId, name: encodeBoxName("reserves") }],
      suggestedParams: sp,
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Swap: with tick crossings ────────────────────────────────────────────────

export async function buildCrossingSwapGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInAsaId: number,
  tokenOutAsaId: number,
  recipe: TradeRecipe,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddress = algosdk.getApplicationAddress(poolAppId);
  const txns: algosdk.Transaction[] = [];

  // 1. Token transfer to pool
  txns.push(
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: poolAddress,
      amount: recipe.totalAmountIn,
      assetIndex: tokenInAsaId,
      suggestedParams: sp,
    }),
  );

  // 2. Budget padding
  const numBudget = computeRequiredBudget(recipe.segments.length);
  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        suggestedParams: sp,
      }),
    );
  }

  // 3. Collect box references: reserves + any crossed tick boxes
  const boxSet = new Set<string>(["reserves"]);
  for (const seg of recipe.segments) {
    if (seg.tickCrossedId !== null) {
      boxSet.add(`tick:${seg.tickCrossedId}`);
    }
  }

  const recipeBytes = encodeTradeRecipe(recipe);

  // 4. swap_with_crossings(token_in_idx, token_out_idx, total_amount_in, trade_recipe, min_amount_out)
  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [
        methodSelector("swapWithCrossings"),
        encodeUint64Arg(recipe.tokenInIdx),
        encodeUint64Arg(recipe.tokenOutIdx),
        encodeUint64Arg(recipe.totalAmountIn),
        encodeBytesArg(recipeBytes),   // byte[] ARC-4 arg: 2-byte length + data
        encodeUint64Arg(recipe.minAmountOut),
      ],
      foreignAssets: [tokenInAsaId, tokenOutAsaId],
      boxes: [...boxSet].map((name) => {
        if (name === "reserves") {
          return { appIndex: poolAppId, name: encodeBoxName("reserves") };
        }
        // "tick:N" → BoxMap key: b"tick:" + itob(N)
        const tickId = parseInt(name.split(":")[1], 10);
        return { appIndex: poolAppId, name: encodeBoxMapKey("tick:", tickId) };
      }),
      suggestedParams: sp,
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Add tick (LP deposit) ────────────────────────────────────────────────────
// Group layout required by the contract:
//   [optional budget txns] [n ASA transfers] [add_tick call]
// The contract reads gtxn[group_index - n + i] for each transfer.

export async function buildAddTickGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  n: number,
  tokenAsaIds: number[],
  depositPerToken: bigint,
  r: bigint,
  k: bigint,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddress = algosdk.getApplicationAddress(poolAppId);
  const txns: algosdk.Transaction[] = [];

  // Budget transactions come first (before the transfers)
  const numBudget = computeRequiredBudget(0);
  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        suggestedParams: sp,
      }),
    );
  }

  // n ASA transfers — must immediately precede the add_tick call
  for (let i = 0; i < n; i++) {
    txns.push(
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender,
        receiver: poolAddress,
        amount: depositPerToken,
        assetIndex: tokenAsaIds[i],
        suggestedParams: sp,
      }),
    );
  }

  // add_tick(r, k)
  const tokenBoxes = tokenAsaIds.map((_, i) => ({
    appIndex: poolAppId,
    name: encodeBoxMapKey("token:", i),
  }));

  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [methodSelector("addTick"), encodeUint64Arg(r), encodeUint64Arg(k)],
      foreignAssets: tokenAsaIds,
      boxes: [
        { appIndex: poolAppId, name: encodeBoxName("reserves") },
        ...tokenBoxes,
      ],
      suggestedParams: sp,
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Remove liquidity (LP withdrawal) ────────────────────────────────────────

export async function buildRemoveLiquidityGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenAsaIds: number[],
  tickId: number,
  shares: bigint,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const txns: algosdk.Transaction[] = [];

  const numBudget = computeRequiredBudget(0);
  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        suggestedParams: sp,
      }),
    );
  }

  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [
        methodSelector("removeLiquidity"),
        encodeUint64Arg(tickId),
        encodeUint64Arg(shares),
      ],
      foreignAssets: tokenAsaIds,
      boxes: [
        { appIndex: poolAppId, name: encodeBoxName("reserves") },
        { appIndex: poolAppId, name: encodeBoxName("fees") },
        { appIndex: poolAppId, name: encodeBoxMapKey("tick:", tickId) },
      ],
      suggestedParams: sp,
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Encode the trade recipe as a flat byte array.
 *
 * Layout per segment (25 bytes total, matching _SEGMENT_SIZE = 25 in contract):
 *   bytes  0-7:  amount_in  (uint64 big-endian)
 *   bytes  8-15: amount_out (uint64 big-endian)
 *   bytes 16-23: tick_crossed_id (uint64 big-endian; 0xffffffffffffffff = no crossing)
 *   byte  24:    new_state  (uint8; 0xff = no crossing)
 */
function encodeTradeRecipe(recipe: TradeRecipe): Uint8Array {
  const SEGMENT_SIZE = 25;
  const buffer = new Uint8Array(recipe.segments.length * SEGMENT_SIZE);
  const view = new DataView(buffer.buffer);

  recipe.segments.forEach((seg, idx) => {
    const off = idx * SEGMENT_SIZE;
    view.setBigUint64(off, seg.amountIn);
    view.setBigUint64(off + 8, seg.amountOut);
    view.setBigUint64(off + 16, seg.tickCrossedId !== null ? BigInt(seg.tickCrossedId) : 0xffffffffffffffffn);
    buffer[off + 24] = seg.newTickState ?? 0xff;
  });

  return buffer;
}
