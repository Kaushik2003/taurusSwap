import algosdk from "algosdk";
import { Tick, TickState } from "../types";
import { bytesToBigInt } from "../utils/encoding";

/**
 * Encode a plain box name (e.g. "reserves", "fees") as bytes.
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
 * Decode the reserves box: n sequential uint64 values (8 bytes each).
 */
export function decodeReservesBox(data: Uint8Array, n: number): bigint[] {
  const reserves: bigint[] = [];
  for (let i = 0; i < n; i++) {
    reserves.push(decodeBigUint(data.slice(i * 8, i * 8 + 8)));
  }
  return reserves;
}

/**
 * Decode a tick BoxMap entry.
 *
 * ARC-4 TickData struct layout (57 bytes):
 *   bytes  0-7:   r         (arc4.UInt64)
 *   bytes  8-15:  k         (arc4.UInt64)
 *   byte   16:    state     (arc4.UInt8)
 *   bytes 17-24:  liquidity (arc4.UInt64)
 *   bytes 25-56:  lp_address (arc4.Address, 32 bytes)
 */
export function decodeTickBox(data: Uint8Array, id: number): Tick {
  return {
    id,
    r: decodeBigUint(data.slice(0, 8)),
    k: decodeBigUint(data.slice(8, 16)),
    state: data[16] === 0 ? TickState.INTERIOR : TickState.BOUNDARY,
    liquidity: decodeBigUint(data.slice(17, 25)),
    lpAddress: algosdk.encodeAddress(data.slice(25, 57)),
  };
}
