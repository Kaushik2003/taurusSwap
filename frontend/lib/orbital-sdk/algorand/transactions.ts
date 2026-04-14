import algosdk from "algosdk";
import { TradeRecipe } from "../types";
import { AMOUNT_SCALE, MIN_TXN_FEE } from "../constants";
import { computeRequiredBudget } from "./budget";
import {
  addressToPublicKey,
  encodeBoxMapKey,
  encodeBoxName,
  encodePositionBoxKey,
} from "./box-encoding";
import { encodeBytesArg, encodeUint64Arg, methodSelector } from "./abi";

const BASE_FEE = MIN_TXN_FEE;
const SWAP_APP_CALL_FEE = MIN_TXN_FEE * 2n; // app call + one expected inner send

function withFlatFee(
  sp: algosdk.SuggestedParams,
  fee: bigint = BASE_FEE,
): algosdk.SuggestedParams {
  return {
    ...sp,
    flatFee: true,
    fee,
  };
}

// ── Swap: no tick crossing ───────────────────────────────────────────────────
//
// Group layout:
//   [budget txns]  [asset transfer of amountIn]  [swap call]
//
// All amount arguments are in raw microunits (same as the ASA transfer).

export async function buildSwapGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInAsaId: number,
  tokenOutAsaId: number,
  tokenInIdx: number,
  tokenOutIdx: number,
  amountIn: bigint,         // raw microunits
  computedAmountOut: bigint, // raw microunits
  minAmountOut: bigint,     // raw microunits
  n = 2,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddress = algosdk.getApplicationAddress(poolAppId);
  const txns: algosdk.Transaction[] = [];

  // Budget padding
  const numBudget = computeRequiredBudget(0, n);
  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        suggestedParams: withFlatFee(sp),
      }),
    );
  }

  // Asset transfer to pool (immediately before the swap call)
  txns.push(
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: poolAddress,
      amount: amountIn,
      assetIndex: tokenInAsaId,
      suggestedParams: withFlatFee(sp),
    }),
  );

  // swap(token_in_idx, token_out_idx, amount_in, claimed_amount_out, min_amount_out)
  // All uint64 args are raw microunits — the contract converts internally with to_scaled().
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
      boxes: [
        { appIndex: poolAppId, name: encodeBoxName("reserves") },
        { appIndex: poolAppId, name: encodeBoxName("fee_growth") },
        { appIndex: poolAppId, name: encodeBoxMapKey("token:", tokenInIdx) },
        { appIndex: poolAppId, name: encodeBoxMapKey("token:", tokenOutIdx) },
      ],
      suggestedParams: withFlatFee(sp, SWAP_APP_CALL_FEE),
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Swap: with tick crossings ────────────────────────────────────────────────
//
// All amounts in the recipe segments must be raw microunits when passed to the
// contract.  The encodeTradeRecipe function converts from AMOUNT_SCALE units.

export async function buildCrossingSwapGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenInAsaId: number,
  tokenOutAsaId: number,
  recipe: TradeRecipe,
  n = 2,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddress = algosdk.getApplicationAddress(poolAppId);
  const txns: algosdk.Transaction[] = [];

  // Budget padding
  const numBudget = computeRequiredBudget(recipe.segments.length, n);
  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        suggestedParams: withFlatFee(sp),
      }),
    );
  }

  // Asset transfer to pool
  txns.push(
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: poolAddress,
      amount: recipe.totalAmountIn,
      assetIndex: tokenInAsaId,
      suggestedParams: withFlatFee(sp),
    }),
  );

  // Collect box references: reserves + fee_growth + token boxes + any crossed tick boxes
  const tokenInBoxKey = encodeBoxMapKey("token:", recipe.tokenInIdx);
  const tokenOutBoxKey = encodeBoxMapKey("token:", recipe.tokenOutIdx);

  const boxes: algosdk.BoxReference[] = [
    { appIndex: poolAppId, name: encodeBoxName("reserves") },
    { appIndex: poolAppId, name: encodeBoxName("fee_growth") },
    { appIndex: poolAppId, name: tokenInBoxKey },
    { appIndex: poolAppId, name: tokenOutBoxKey },
  ];

  for (const seg of recipe.segments) {
    if (seg.tickCrossedId !== null) {
      boxes.push({
        appIndex: poolAppId,
        name: encodeBoxMapKey("tick:", seg.tickCrossedId),
      });
    }
  }

  // swap_with_crossings encodes segment amounts in raw microunits
  const recipeBytes = encodeTradeRecipe(recipe);

  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [
        methodSelector("swapWithCrossings"),
        encodeUint64Arg(recipe.tokenInIdx),
        encodeUint64Arg(recipe.tokenOutIdx),
        encodeUint64Arg(recipe.totalAmountIn),
        encodeBytesArg(recipeBytes),
        encodeUint64Arg(recipe.minAmountOut),
      ],
      foreignAssets: [tokenInAsaId, tokenOutAsaId],
      boxes,
      suggestedParams: withFlatFee(sp, SWAP_APP_CALL_FEE),
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Add tick (LP deposit) ────────────────────────────────────────────────────
//
// Group layout required by the contract:
//   [budget txns]  [n ASA transfers of depositPerTokenRaw]  [add_tick call]
//
// The contract reads gtxn[group_index - n + i] for each token transfer.
// r and k are in AMOUNT_SCALE units.
// depositPerTokenRaw is in raw microunits.

export async function buildAddTickGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  n: number,
  tokenAsaIds: number[],
  depositPerTokenRaw: bigint, // raw microunits (= deposit_per_token_scaled * AMOUNT_SCALE)
  r: bigint,                  // AMOUNT_SCALE units — passed directly to add_tick
  k: bigint,                  // AMOUNT_SCALE units — passed directly to add_tick
  nextTickId: number,         // the tick ID that will be created (= current numTicks)
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const poolAddress = algosdk.getApplicationAddress(poolAppId);
  const senderPubKey = addressToPublicKey(sender);
  const txns: algosdk.Transaction[] = [];

  // Required box refs for add_tick at n=5 can exceed the per-txn max(8):
  // reserves + fee_growth + tick + pos + token[0..4] = 9.
  // Distribute refs across budget() + add_tick app calls using resource sharing.
  const tokenBoxes = tokenAsaIds.map((_, i) => ({
    appIndex: poolAppId,
    name: encodeBoxMapKey("token:", i),
  }));
  const addTickBoxes: algosdk.BoxReference[] = [
    { appIndex: poolAppId, name: encodeBoxName("reserves") },
    { appIndex: poolAppId, name: encodeBoxName("fee_growth") },
    { appIndex: poolAppId, name: encodeBoxMapKey("tick:", nextTickId) },
    {
      appIndex: poolAppId,
      name: encodePositionBoxKey(senderPubKey, nextTickId),
    },
    ...tokenBoxes,
  ];

  const minBudgetForBoxRefs = Math.max(0, Math.ceil(addTickBoxes.length / 8) - 1);
  // Budget transactions come first (before the transfers).
  const numBudget = Math.max(computeRequiredBudget(0, n), minBudgetForBoxRefs);

  const boxChunks: algosdk.BoxReference[][] = [];
  for (let i = 0; i < numBudget + 1; i++) {
    boxChunks.push(addTickBoxes.slice(i * 8, (i + 1) * 8));
  }

  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        boxes: boxChunks[i] ?? [],
        suggestedParams: withFlatFee(sp),
      }),
    );
  }

  // n ASA transfers — must immediately precede the add_tick call
  for (let i = 0; i < n; i++) {
    txns.push(
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender,
        receiver: poolAddress,
        amount: depositPerTokenRaw,
        assetIndex: tokenAsaIds[i],
        suggestedParams: withFlatFee(sp),
      }),
    );
  }

  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [methodSelector("addTick"), encodeUint64Arg(r), encodeUint64Arg(k)],
      boxes: boxChunks[numBudget] ?? [],
      suggestedParams: withFlatFee(sp),
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Remove liquidity (LP withdrawal) ────────────────────────────────────────
//
// Group layout:
//   [budget txns]  [remove_liquidity call]
//
// The contract sends reserves + fees back to the caller via inner transactions.
//
// For n >= 3 the combined asset + box reference count can exceed the per-txn
// limit of MaxAppTotalTxnReferences = 8.  References are distributed across
// budget() + remove_liquidity app calls using Algorand's group resource sharing.

export async function buildRemoveLiquidityGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenAsaIds: number[],
  tickId: number,
  shares: bigint,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const senderPubKey = addressToPublicKey(sender);
  const n = tokenAsaIds.length;
  const txns: algosdk.Transaction[] = [];

  const tokenBoxes = tokenAsaIds.map((_, i) => ({
    appIndex: poolAppId,
    name: encodeBoxMapKey("token:", i),
  }));

  const allBoxes: algosdk.BoxReference[] = [
    { appIndex: poolAppId, name: encodeBoxName("reserves") },
    { appIndex: poolAppId, name: encodeBoxName("fee_growth") },
    { appIndex: poolAppId, name: encodeBoxMapKey("tick:", tickId) },
    { appIndex: poolAppId, name: encodePositionBoxKey(senderPubKey, tickId) },
    ...tokenBoxes,
  ]; // length = 4 + n

  // Total references = n (assets) + (4 + n) (boxes) = 2n + 4.
  // MaxAppTotalTxnReferences = 8, so we may need extra budget txns to hold the overflow.
  const totalRefs = n + allBoxes.length;
  const minSlotsForRefs = Math.ceil(totalRefs / 8);
  const numBudget = Math.max(computeRequiredBudget(0, n), minSlotsForRefs - 1);
  const numSlots = numBudget + 1;

  // Chunk boxes across (numBudget + 1) slots (max 8 per slot), then fill
  // remaining capacity in each slot with assets.  Algorand group resource
  // sharing makes every referenced asset/box accessible to all txns in the group.
  const boxChunks: algosdk.BoxReference[][] = [];
  const assetChunks: number[][] = [];
  const assetPool = [...tokenAsaIds];

  for (let i = 0; i < numSlots; i++) {
    const boxSlice = allBoxes.slice(i * 8, (i + 1) * 8);
    const remainingCapacity = 8 - boxSlice.length;
    assetChunks.push(assetPool.splice(0, remainingCapacity));
    boxChunks.push(boxSlice);
  }

  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        foreignAssets: assetChunks[i].length > 0 ? assetChunks[i] : undefined,
        boxes: boxChunks[i] ?? [],
        suggestedParams: withFlatFee(sp),
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
      foreignAssets: assetChunks[numBudget].length > 0 ? assetChunks[numBudget] : undefined,
      boxes: boxChunks[numBudget] ?? [],
      // Contract sends n inner ASA transfers (fee=0 each); outer txn must cover them via fee pooling.
      suggestedParams: withFlatFee(sp, MIN_TXN_FEE * (1n + BigInt(n))),
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Claim fees ────────────────────────────────────────────────────────────────
//
// Settle accrued swap fees for (sender, tickId) without withdrawing principal.
// Group layout: [budget txns]  [claim_fees call]
//
// For n >= 3 the combined asset + box reference count can exceed the per-txn
// limit of MaxAppTotalTxnReferences = 8.  References are distributed across
// budget() + claim_fees app calls using Algorand's group resource sharing.

export async function buildClaimFeesGroup(
  client: algosdk.Algodv2,
  poolAppId: number,
  sender: string,
  tokenAsaIds: number[],
  tickId: number,
): Promise<algosdk.Transaction[]> {
  const sp = await client.getTransactionParams().do();
  const senderPubKey = addressToPublicKey(sender);
  const n = tokenAsaIds.length;
  const txns: algosdk.Transaction[] = [];

  const tokenBoxes = tokenAsaIds.map((_, i) => ({
    appIndex: poolAppId,
    name: encodeBoxMapKey("token:", i),
  }));

  const allBoxes: algosdk.BoxReference[] = [
    { appIndex: poolAppId, name: encodeBoxName("fee_growth") },
    { appIndex: poolAppId, name: encodeBoxMapKey("tick:", tickId) },
    { appIndex: poolAppId, name: encodePositionBoxKey(senderPubKey, tickId) },
    ...tokenBoxes,
  ]; // length = 3 + n

  // Total references = n (assets) + (3 + n) (boxes) = 2n + 3.
  // MaxAppTotalTxnReferences = 8, so we may need extra budget txns to hold the overflow.
  const totalRefs = n + allBoxes.length;
  const minSlotsForRefs = Math.ceil(totalRefs / 8);
  // claim_fees iterates n times for fee computation + n inner sends
  const numBudget = Math.max(computeRequiredBudget(0, n), minSlotsForRefs - 1);
  const numSlots = numBudget + 1;

  // Chunk boxes across (numBudget + 1) slots (max 8 per slot), then fill
  // remaining capacity in each slot with assets.  Algorand group resource
  // sharing makes every referenced asset/box accessible to all txns in the group.
  const boxChunks: algosdk.BoxReference[][] = [];
  const assetChunks: number[][] = [];
  const assetPool = [...tokenAsaIds];

  for (let i = 0; i < numSlots; i++) {
    const boxSlice = allBoxes.slice(i * 8, (i + 1) * 8);
    const remainingCapacity = 8 - boxSlice.length;
    assetChunks.push(assetPool.splice(0, remainingCapacity));
    boxChunks.push(boxSlice);
  }

  for (let i = 0; i < numBudget; i++) {
    txns.push(
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: poolAppId,
        appArgs: [methodSelector("budget")],
        foreignAssets: assetChunks[i].length > 0 ? assetChunks[i] : undefined,
        boxes: boxChunks[i] ?? [],
        suggestedParams: withFlatFee(sp),
      }),
    );
  }

  txns.push(
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: poolAppId,
      appArgs: [methodSelector("claimFees"), encodeUint64Arg(tickId)],
      foreignAssets: assetChunks[numBudget].length > 0 ? assetChunks[numBudget] : undefined,
      boxes: boxChunks[numBudget] ?? [],
      // Contract sends n inner ASA transfers (fee=0 each); outer txn must cover them via fee pooling.
      suggestedParams: withFlatFee(sp, MIN_TXN_FEE * (1n + BigInt(n))),
    }),
  );

  algosdk.assignGroupID(txns);
  return txns;
}

// ── Resource distribution helper ─────────────────────────────────────────────
//
// Algorand AVM v10+: MaxAppTotalTxnReferences = 8 applies to the combined total
// of (foreign accounts + foreign apps + foreign assets + box references) per txn.
// Resources referenced in ANY transaction in an atomic group are accessible to ALL
// app calls in the group, so we spread them across budget dummy transactions.
//
// Returns one slot per transaction (indices 0..numBudget-1 = budget, numBudget = main call).
// Each slot has at most 8 total refs.

function distributeRefs(
  assets: number[],
  boxes: algosdk.BoxReference[],
  numBudget: number,
): Array<{ assets: number[]; boxes: algosdk.BoxReference[] }> {
  type Item =
    | { kind: "asset"; value: number }
    | { kind: "box"; value: algosdk.BoxReference };

  const items: Item[] = [
    ...assets.map((v) => ({ kind: "asset" as const, value: v })),
    ...boxes.map((v) => ({ kind: "box" as const, value: v })),
  ];

  const slots = numBudget + 1;
  const result: Array<{ assets: number[]; boxes: algosdk.BoxReference[] }> =
    Array.from({ length: slots }, () => ({ assets: [], boxes: [] }));

  items.forEach((item, i) => {
    // Fill budget slots first (8 refs each), remainder goes to the last slot (main call).
    const slot = Math.min(Math.floor(i / 8), slots - 1);
    if (item.kind === "asset") result[slot].assets.push(item.value);
    else result[slot].boxes.push(item.value);
  });

  return result;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Encode the trade recipe as a flat byte array for swap_with_crossings.
 *
 * Layout per segment (25 bytes total, matching _SEGMENT_SIZE = 25 in contract):
 *   bytes  0-7:  amount_in  (uint64 big-endian) — raw microunits
 *   bytes  8-15: amount_out (uint64 big-endian) — raw microunits
 *   bytes 16-23: tick_crossed_id (uint64 big-endian; 0xffffffffffffffff = no crossing)
 *   byte  24:    new_state  (uint8; 0xff = no crossing)
 *
 * The segments inside the recipe are in AMOUNT_SCALE units.
 * This function converts each amount to raw microunits (× AMOUNT_SCALE) before encoding.
 *
 * AMOUNT_SCALE remainder fix:
 *   The solver works in AMOUNT_SCALE units so Σseg.amountIn = effectiveInScaled.
 *   Converting back: Σ(seg.amountIn × AMOUNT_SCALE) = effectiveInScaled × AMOUNT_SCALE.
 *   But effectiveInRaw = effectiveInScaled × AMOUNT_SCALE + remainder (0..999).
 *   The contract checks Σseg_in_raw == effectiveInRaw, so we add the remainder to the
 *   last segment to guarantee the sum is exact.
 */
function encodeTradeRecipe(recipe: TradeRecipe): Uint8Array {
  const SEGMENT_SIZE = 25;
  const buffer = new Uint8Array(recipe.segments.length * SEGMENT_SIZE);
  const view = new DataView(buffer.buffer);

  let encodedInSum = 0n;

  recipe.segments.forEach((seg, idx) => {
    const off = idx * SEGMENT_SIZE;
    // Convert AMOUNT_SCALE units → raw microunits for the contract
    const amountInRaw = seg.amountIn * AMOUNT_SCALE;
    encodedInSum += amountInRaw;
    view.setBigUint64(off, amountInRaw);
    view.setBigUint64(off + 8, seg.amountOut * AMOUNT_SCALE);
    view.setBigUint64(
      off + 16,
      seg.tickCrossedId !== null
        ? BigInt(seg.tickCrossedId)
        : 0xffffffffffffffffn,
    );
    buffer[off + 24] = seg.newTickState ?? 0xff;
  });

  // Add any AMOUNT_SCALE truncation remainder to the last segment so that
  // Σseg_in_raw == recipe.effectiveAmountIn exactly.
  if (recipe.segments.length > 0) {
    const remainder = recipe.effectiveAmountIn - encodedInSum;
    if (remainder > 0n) {
      const lastOff = (recipe.segments.length - 1) * SEGMENT_SIZE;
      const lastIn = view.getBigUint64(lastOff);
      view.setBigUint64(lastOff, lastIn + remainder);
    }
  }

  return buffer;
}
