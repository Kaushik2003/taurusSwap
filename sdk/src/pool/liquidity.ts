import algosdk from "algosdk";
import { PRECISION } from "../constants";
import { buildAddTickGroup, buildRemoveLiquidityGroup } from "../algorand/transactions";
import { equalPricePoint } from "../math/sphere";
import { xMin } from "../math/ticks";
import { readPoolState } from "./state-reader";

// ── Add liquidity (add_tick) ─────────────────────────────────────────────────

export interface AddLiquidityParams {
  client: algosdk.Algodv2;
  poolAppId: number;
  sender: string;
  /** Tick radius r (PRECISION-scaled). Controls total liquidity depth. */
  r: bigint;
  /** Tick plane constant k (PRECISION-scaled). Controls depeg coverage. */
  k: bigint;
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}

export interface AddLiquidityResult {
  txId: string;
  /** Tick ID assigned by the contract (= num_ticks before the call). */
  tickId: number;
  /** Amount of each token deposited (PRECISION-scaled). */
  depositPerToken: bigint;
}

/**
 * Add a new tick (liquidity position) to the pool.
 *
 * The deposit amount per token is determined by the tick geometry:
 *   depositPerToken = q - xMin(r, k)
 * where q = r*(1 - 1/√n) is the equal-price reserve.
 *
 * Transaction group layout (required by the contract):
 *   [optional budget txns]  [n ASA transfers of depositPerToken]  [add_tick call]
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
  const { n, sqrtN, invSqrtN, tokenAsaIds, ticks } = poolState;

  // Compute deposit amount from tick geometry (off-chain, no contract call needed)
  const q = equalPricePoint(r, invSqrtN);
  const xMinVal = xMin(r, k, n, sqrtN);
  if (xMinVal >= q) {
    throw new Error("Invalid tick parameters: xMin >= equalPricePoint (no deposit needed)");
  }
  const depositPerToken = q - xMinVal;

  // The next tick ID will be the current count of non-deleted ticks
  // (contract increments num_ticks monotonically; deleted ticks leave gaps)
  const tickId = ticks.reduce((maxId, t) => Math.max(maxId, t.id + 1), 0);

  const txns = await buildAddTickGroup(
    client,
    poolAppId,
    sender,
    n,
    tokenAsaIds,
    depositPerToken,
    r,
    k,
  );

  const signedTxns = await signer(txns);
  const { txid } = await client.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client, txid, 4);

  return { txId: txid, tickId, depositPerToken };
}

// ── Remove liquidity ─────────────────────────────────────────────────────────

export interface RemoveLiquidityParams {
  client: algosdk.Algodv2;
  poolAppId: number;
  sender: string;
  tickId: number;
  /** Shares to remove. Pass the tick's full liquidity value to fully exit. */
  shares: bigint;
  signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}

export interface RemoveLiquidityResult {
  txId: string;
}

/**
 * Remove liquidity from an existing tick position.
 * The contract distributes the pro-rata share of reserves + accumulated fees
 * back to the sender via inner transactions.
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
  if (shares > tick.liquidity) {
    throw new Error(
      `Requested ${shares} shares but tick only has ${tick.liquidity}`,
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

// ── Utility: compute deposit amount without executing ────────────────────────

/**
 * Returns the deposit amount per token for a given (r, k) tick without
 * sending any transactions. Useful for showing the user how much they'd need
 * to deposit before asking them to sign.
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
  return q - xMinVal;
}

/**
 * Convert a human-readable depeg price (e.g. 0.99) and desired total deposit
 * into r and k parameters.  This is a convenience wrapper for the frontend
 * "I want to provide liquidity down to $0.99 depeg" use-case.
 *
 * Returns (r, k) both PRECISION-scaled.
 */
export function tickParamsFromDepegPrice(
  depegPrice: number,
  totalDepositPerToken: bigint,
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint,
): { r: bigint; k: bigint } {
  // Binary search for r such that depositPerToken ≈ totalDepositPerToken
  // at the given depeg price. Start with a reasonable r estimate.

  // kFromDepegPrice gives us k for a given r at the depeg price.
  // Import lazily to avoid circular deps.
  const { kFromDepegPrice } = require("../math/ticks") as typeof import("../math/ticks");

  let lo = totalDepositPerToken;
  let hi = totalDepositPerToken * BigInt(n) * 1000n; // generous upper bound

  for (let i = 0; i < 64; i++) {
    const r = (lo + hi) / 2n;
    const k = kFromDepegPrice(depegPrice, r, n, sqrtN, invSqrtN);
    const deposit = computeDepositPerToken(r, k, n, sqrtN, invSqrtN);

    if (deposit < totalDepositPerToken) {
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
