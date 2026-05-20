import algosdk from "algosdk";
import { Tick, TickState } from "../types";
import { bytesToBigInt } from "../utils/encoding";

/**
 * Encode a plain box name (e.g. "reserves", "fee_growth") as bytes.
 * Used for Box(Bytes, key=b"...") storage — the key is the literal string.
 */
export function encodeBoxName(name: string): Uint8Array {
  return new TextEncoder().encode(name);
}

/**
 * Encode a BoxMap key: prefix bytes + uint64 index as 8-byte big-endian.
 *
 * In algopy, BoxMap(UInt64, ..., key_prefix=b"token:") stores entries with
 * key = b"token:" + itob(index). The TEAL confirms this with:
 *   bytec "token:"  →  itob(index)  →  concat
 *
 * @param prefix  e.g. "token:" or "tick:"
 * @param index   the map key (uint64)
 */
export function encodeBoxMapKey(prefix: string, index: number): Uint8Array {
  const prefixBytes = new TextEncoder().encode(prefix);
  const result = new Uint8Array(prefixBytes.length + 8);
  result.set(prefixBytes, 0);
  new DataView(result.buffer).setBigUint64(prefixBytes.length, BigInt(index));
  return result;
}

export function decodeBigUint(bytes: Uint8Array): bigint {
  return bytesToBigInt(bytes);
}

/**
 * Decode the reserves box (or fee_growth box): n sequential uint64 values (8 bytes each).
 */
export function decodeReservesBox(data: Uint8Array, n: number): bigint[] {
  const values: bigint[] = [];
  for (let i = 0; i < n; i++) {
    values.push(decodeBigUint(data.slice(i * 8, i * 8 + 8)));
  }
  return values;
}

/**
 * Decode a tick BoxMap entry.
 *
 * v2/v3 ARC-4 TickData struct layout (25 bytes):
 *   bytes  0-7:   r            (arc4.UInt64) — AMOUNT_SCALE units
 *   bytes  8-15:  k            (arc4.UInt64) — AMOUNT_SCALE units
 *   byte   16:    state        (arc4.UInt8)  — 0=INTERIOR, 1=BOUNDARY
 *   bytes 17-24:  total_shares (arc4.UInt64)
 *
 * NOTE: v1 had a 57-byte layout that included lp_address (32 bytes).
 * That field was removed in v2.  Never read bytes beyond index 24.
 */
export function decodeTickBox(data: Uint8Array, id: number): Tick {
  return {
    id,
    r: decodeBigUint(data.slice(0, 8)),
    k: decodeBigUint(data.slice(8, 16)),
    state: data[16] === 0 ? TickState.INTERIOR : TickState.BOUNDARY,
    totalShares: decodeBigUint(data.slice(17, 25)),
  };
}

// ── Position box helpers ─────────────────────────────────────────────────────
//
// Position box key layout: b"pos:" + owner_pubkey(32 bytes) + tick_id_be8(8 bytes)
// Position box value layout: shares(8) + [fee_growth_checkpoint_i(8) for i in 0..n-1]
// Total value size: (1 + n) × 8 bytes

/**
 * Build the raw 40-byte body of a position box key (without the "pos:" prefix).
 * owner_pubkey is the 32-byte Ed25519 public key (NOT the base32 address string).
 */
export function encodePositionKeyBody(
  ownerPublicKey: Uint8Array,
  tickId: number,
): Uint8Array {
  const result = new Uint8Array(40); // 32 + 8
  result.set(ownerPublicKey, 0);
  new DataView(result.buffer).setBigUint64(32, BigInt(tickId));
  return result;
}

/**
 * Build the full position box key: b"pos:" + owner_pubkey(32) + tick_id_be8(8).
 * This is what the Algorand SDK needs as the box name.
 */
export function encodePositionBoxKey(
  ownerPublicKey: Uint8Array,
  tickId: number,
): Uint8Array {
  const prefix = new TextEncoder().encode("pos:");
  const body = encodePositionKeyBody(ownerPublicKey, tickId);
  const result = new Uint8Array(prefix.length + body.length);
  result.set(prefix, 0);
  result.set(body, prefix.length);
  return result;
}

/**
 * Decode a position box value.
 *
 * Layout: shares(8) + fee_growth_checkpoint_0(8) + ... + fee_growth_checkpoint_{n-1}(8)
 *
 * @param data  raw bytes from the box
 * @param n     number of tokens in the pool
 */
export function decodePositionBox(
  data: Uint8Array,
  n: number,
): { shares: bigint; feeGrowthCheckpoints: bigint[] } {
  const shares = decodeBigUint(data.slice(0, 8));
  const feeGrowthCheckpoints: bigint[] = [];
  for (let i = 0; i < n; i++) {
    feeGrowthCheckpoints.push(decodeBigUint(data.slice(8 + i * 8, 16 + i * 8)));
  }
  return { shares, feeGrowthCheckpoints };
}

/**
 * Helper: decode an Algorand address string to its 32-byte public key.
 */
export function addressToPublicKey(address: string): Uint8Array {
  return algosdk.decodeAddress(address).publicKey;
}
