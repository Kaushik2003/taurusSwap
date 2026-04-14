import algosdk from "algosdk";
import { AMOUNT_SCALE, PRECISION } from "../constants";
import {
  buildAddTickGroup,
  buildClaimFeesGroup,
  buildRemoveLiquidityGroup,
} from "../algorand/transactions";
import { equalPricePoint } from "../math/sphere";
import { kFromDepegPrice, xMin } from "../math/ticks";
import { readPoolState } from "./state-reader";

// ── Add liquidity (add_tick) ─────────────────────────────────────────────────

export interface AddLiquidityParams {
  client: algosdk.Algodv2;
  poolAppId: number;
  sender: string;
  /**
   * Tick radius r in AMOUNT_SCALE units (raw_microunits / 1_000).
   * Use tickParamsFromDepegPrice() to compute this from a human depeg price.
   */
  r: bigint;
  /**
   * Tick plane constant k in AMOUNT_SCALE units.
   * Use tickParamsFromDepegPrice() to compute this from a human depeg price.
   */
  k: bigint;
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}

export interface AddLiquidityResult {
  txId: string;
  /** Tick ID assigned by the contract (= numTicks before the call). */
  tickId: number;
  /** Amount deposited per token, in raw microunits. */
  depositPerTokenRaw: bigint;
}

/**
 * Add a new concentrated-liquidity tick (position) to the pool.
 *
 * Unit flow:
 *   1. Compute deposit in AMOUNT_SCALE units: deposit_scaled = q - xMin(r, k)
 *   2. Convert to raw microunits for ASA transfer: deposit_raw = deposit_scaled × AMOUNT_SCALE
 *   3. Pass r, k (AMOUNT_SCALE) as ABI args to add_tick
 *   4. Pass deposit_raw as each token ASA transfer amount
 *
 * Transaction group layout (required by the contract):
 *   [optional budget txns]  [n ASA transfers of depositPerTokenRaw]  [add_tick call]
 */
export async function addLiquidity({
  client,
  poolAppId,
  sender,
  r,
  k,
  signer,
}: AddLiquidityParams): Promise<AddLiquidityResult> {
  const poolState = await readPoolState(client, poolAppId);
  const { n, sqrtN, invSqrtN, tokenAsaIds, numTicks } = poolState;

  // Compute deposit per token in AMOUNT_SCALE units
  const q = equalPricePoint(r, invSqrtN);         // AMOUNT_SCALE units
  const xMinVal = xMin(r, k, n, sqrtN);            // AMOUNT_SCALE units
  if (xMinVal >= q) {
    throw new Error(
      "Invalid tick parameters: xMin >= equalPricePoint (deposit would be zero or negative)",
    );
  }
  const depositPerTokenScaled = q - xMinVal;       // AMOUNT_SCALE units

  // Convert to raw microunits for the actual ASA transfers
  const depositPerTokenRaw = depositPerTokenScaled * AMOUNT_SCALE;

  // The next tick ID is the current monotonic counter (never reused, even after deletions)
  const tickId = numTicks;

  const txns = await buildAddTickGroup(
    client,
    poolAppId,
    sender,
    n,
    tokenAsaIds,
    depositPerTokenRaw, // raw microunits — used as ASA transfer amount
    r,                  // AMOUNT_SCALE units — add_tick ABI arg
    k,                  // AMOUNT_SCALE units — add_tick ABI arg
    tickId,
  );

  const signedTxns = await signer(txns);
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid, tickId, depositPerTokenRaw };
}

// ── Remove liquidity ─────────────────────────────────────────────────────────

export interface RemoveLiquidityParams {
  client: algosdk.Algodv2;
  poolAppId: number;
  sender: string;
  tickId: number;
  /**
   * Shares to remove.  Pass the tick's full totalShares value to fully exit.
   * Partial removal is supported.
   */
  shares: bigint;
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}

export interface RemoveLiquidityResult {
  txId: string;
}

/**
 * Remove liquidity from an existing tick position.
 *
 * The contract atomically:
 *   1. Settles outstanding fees (via fee_growth checkpoints)
 *   2. Distributes the pro-rata share of reserves to the caller
 *   3. Updates or deletes the tick and position boxes
 */
export async function removeLiquidity({
  client,
  poolAppId,
  sender,
  tickId,
  shares,
  signer,
}: RemoveLiquidityParams): Promise<RemoveLiquidityResult> {
  if (shares <= 0n) throw new Error("shares must be positive");

  const poolState = await readPoolState(client, poolAppId);
  const tick = poolState.ticks.find((t) => t.id === tickId);
  if (!tick) throw new Error(`Tick ${tickId} not found in pool state`);
  if (shares > tick.totalShares) {
    throw new Error(
      `Requested ${shares} shares but tick only has ${tick.totalShares} total shares`,
    );
  }

  const txns = await buildRemoveLiquidityGroup(
    client,
    poolAppId,
    sender,
    poolState.tokenAsaIds,
    tickId,
    shares,
  );

  const signedTxns = await signer(txns);
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid };
}

// ── Claim fees ───────────────────────────────────────────────────────────────

export interface ClaimFeesParams {
  client: algosdk.Algodv2;
  poolAppId: number;
  sender: string;
  tickId: number;
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}

export interface ClaimFeesResult {
  txId: string;
}

/**
 * Claim accrued swap fees for position (sender, tickId) without removing principal.
 *
 * The contract sends each token's claimable fee to the caller and resets
 * the position's fee_growth checkpoints to prevent double-claiming.
 */
export async function claimFees({
  client,
  poolAppId,
  sender,
  tickId,
  signer,
}: ClaimFeesParams): Promise<ClaimFeesResult> {
  const poolState = await readPoolState(client, poolAppId);

  const txns = await buildClaimFeesGroup(
    client,
    poolAppId,
    sender,
    poolState.tokenAsaIds,
    tickId,
  );

  const signedTxns = await signer(txns);
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid };
}

// ── Utility: compute deposit amount without executing ────────────────────────

/**
 * Returns the deposit amount per token for a given (r, k) tick, in raw microunits.
 * Useful for showing the user how much they'd need to deposit before asking them to sign.
 *
 * @param r  Tick radius in AMOUNT_SCALE units
 * @param k  Tick plane constant in AMOUNT_SCALE units
 */
export function computeDepositPerToken(
  r: bigint,
  k: bigint,
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint,
): bigint {
  const q = equalPricePoint(r, invSqrtN);
  const xMinVal = xMin(r, k, n, sqrtN);
  if (xMinVal >= q) return 0n;
  return (q - xMinVal) * AMOUNT_SCALE; // convert to raw microunits
}

/**
 * Convert a human-readable depeg price (e.g. 0.99) and desired deposit per token
 * into (r, k) parameters suitable for addLiquidity().
 *
 * Both r and k are returned in AMOUNT_SCALE units.
 *
 * @param depegPrice             Price at which the tick boundary sits (e.g. 0.99)
 * @param totalDepositPerTokenRaw  How much the user wants to deposit per token, in raw microunits
 */
export function tickParamsFromDepegPrice(
  depegPrice: number,
  totalDepositPerTokenRaw: bigint,
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint,
): { r: bigint; k: bigint } {
  // Work entirely in AMOUNT_SCALE units throughout the binary search.
  // The user's deposit is in raw microunits — convert first.
  const totalDepositScaled = totalDepositPerTokenRaw / AMOUNT_SCALE;
  if (totalDepositScaled === 0n) {
    throw new Error("Deposit too small (must be ≥ 1000 microunits)");
  }

  // Binary search for r (AMOUNT_SCALE units) such that
  // computeDepositPerToken(r, k) ≈ totalDepositScaled.
  let lo = totalDepositScaled;
  let hi = totalDepositScaled * BigInt(n) * 1000n; // generous upper bound

  for (let i = 0; i < 64; i++) {
    const r = (lo + hi) / 2n;
    const k = kFromDepegPrice(depegPrice, r, n, sqrtN, invSqrtN);

    const q = equalPricePoint(r, invSqrtN);
    const xMinVal = xMin(r, k, n, sqrtN);
    const deposit = xMinVal >= q ? 0n : q - xMinVal; // AMOUNT_SCALE units

    if (deposit < totalDepositScaled) {
      lo = r;
    } else {
      hi = r;
    }

    if (hi - lo <= 1n) break;
  }

  const r = (lo + hi) / 2n;
  const k = kFromDepegPrice(depegPrice, r, n, sqrtN, invSqrtN);
  return { r, k };
}

