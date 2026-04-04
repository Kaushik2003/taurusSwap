import algosdk from "algosdk";
import { PoolState, Tick } from "../types";
import {
  decodeBigUint,
  decodeReservesBox,
  decodeTickBox,
  encodeBoxMapKey,
  encodeBoxName,
} from "../algorand/box-encoding";

type GlobalStateEntry = {
  key: Uint8Array | string;
  value: { bytes?: Uint8Array | string; type: number; uint?: number | bigint };
};

export async function readPoolState(
  client: algosdk.Algodv2,
  appId: number,
): Promise<PoolState> {
  const appInfo = await client.getApplicationByID(appId).do();
  const gs = parseGlobalState(appInfo.params.globalState ?? []);

  const n = Number(gs.n);
  const sumX = gs.sum_x;
  const sumXSq = gs.sum_x_sq;
  const rInt = gs.r_int;
  const sBound = gs.s_bound;
  const kBound = gs.k_bound;
  const sqrtN = gs.sqrt_n;
  const invSqrtN = gs.inv_sqrt_n;
  const numTicks = Number(gs.num_ticks ?? 0n);
  // Bug 3 fix: read virtual_offset so we can convert actual reserves → math reserves
  const virtualOffset = gs.virtual_offset ?? 0n;

  // Decode actual reserves from box, then convert to math reserves.
  // The contract stores actual reserves in the box but runs all invariant
  // math on (actual + virtualOffset). sum_x / sum_x_sq in global state
  // already use math reserves, so the SDK must too.
  const reservesBox = await client
    .getApplicationBoxByName(appId, encodeBoxName("reserves"))
    .do();
  const actualReserves = decodeReservesBox(reservesBox.value as Uint8Array, n);
  const reserves = actualReserves.map((r) => r + virtualOffset);

  // Read ticks — BoxMap key = b"tick:" + itob(index) (not "tick:0" as a string)
  const ticks: Tick[] = [];
  for (let i = 0; i < numTicks; i++) {
    try {
      const tickBox = await client
        .getApplicationBoxByName(appId, encodeBoxMapKey("tick:", i))
        .do();
      ticks.push(decodeTickBox(tickBox.value as Uint8Array, i));
    } catch {
      // Tick deleted (fully withdrawn) — skip
      continue;
    }
  }

  // Read token ASA IDs — BoxMap key = b"token:" + itob(index)
  const tokenAsaIds: number[] = [];
  const tokenDecimals: number[] = [];
  for (let i = 0; i < n; i++) {
    const tokenBox = await client
      .getApplicationBoxByName(appId, encodeBoxMapKey("token:", i))
      .do();
    const asaId = Number(decodeBigUint(tokenBox.value as Uint8Array));
    tokenAsaIds.push(asaId);

    const asaInfo = await client.getAssetByID(asaId).do();
    tokenDecimals.push(asaInfo.params.decimals);
  }

  return {
    appId,
    n,
    sqrtN,
    invSqrtN,
    reserves,      // math reserves (actual + virtualOffset)
    sumX,
    sumXSq,
    virtualOffset,
    rInt,
    sBound,
    kBound,
    ticks,
    tokenAsaIds,
    tokenDecimals,
  };
}

function parseGlobalState(state: GlobalStateEntry[]): Record<string, bigint> {
  const result: Record<string, bigint> = {};
  for (const entry of state) {
    const key =
      typeof entry.key === "string"
        ? Buffer.from(entry.key, "base64").toString()
        : Buffer.from(entry.key).toString();
    result[key] = BigInt(entry.value.uint ?? 0);
  }
  return result;
}
