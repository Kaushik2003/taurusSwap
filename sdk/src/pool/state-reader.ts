import algosdk from "algosdk";
import { PoolState, PositionInfo, Tick } from "../types";
import { AMOUNT_SCALE, PRECISION } from "../constants";
import {
  addressToPublicKey,
  decodeBigUint,
  decodePositionBox,
  decodeReservesBox,
  decodeTickBox,
  encodeBoxMapKey,
  encodeBoxName,
  encodePositionBoxKey,
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
  const sqrtN = gs.sqrt_n;
  const invSqrtN = gs.inv_sqrt_n;
  const numTicks = Number(gs.num_ticks ?? 0n);
  const virtualOffset = gs.virtual_offset ?? 0n; // AMOUNT_SCALE units
  const rInt = gs.r_int;
  const sBound = gs.s_bound;
  const kBound = gs.k_bound;
  const sumX = gs.sum_x;
  const sumXSq = gs.sum_x_sq;
  const totalR = gs.total_r ?? 0n;
  const feeBps = gs.fee_bps ?? 30n;

  // ── Reserves (fix: convert actual raw microunits → AMOUNT_SCALE math units) ──
  // The contract stores actual balances in the reserves box as raw microunits.
  // The invariant math space uses: math_reserve = to_scaled(actual) + virtual_offset
  //   where to_scaled(x) = x / AMOUNT_SCALE (integer floor division)
  const reservesBox = await client
    .getApplicationBoxByName(appId, encodeBoxName("reserves"))
    .do();
  const actualReservesRaw = decodeReservesBox(reservesBox.value as Uint8Array, n);
  const reserves = actualReservesRaw.map((r) => r / AMOUNT_SCALE + virtualOffset);

  // ── Fee growth box ──────────────────────────────────────────────────────────
  const feeGrowthBox = await client
    .getApplicationBoxByName(appId, encodeBoxName("fee_growth"))
    .do();
  const feeGrowth = decodeReservesBox(feeGrowthBox.value as Uint8Array, n);

  // ── Ticks ───────────────────────────────────────────────────────────────────
  // Tick IDs are assigned monotonically 0..numTicks-1.
  // Deleted ticks leave gaps — the box read will throw; skip those IDs.
  const ticks: Tick[] = [];
  for (let i = 0; i < numTicks; i++) {
    try {
      const tickBox = await client
        .getApplicationBoxByName(appId, encodeBoxMapKey("tick:", i))
        .do();
      ticks.push(decodeTickBox(tickBox.value as Uint8Array, i));
    } catch {
      // Tick deleted (fully removed) — gap in the sequence, skip.
      continue;
    }
  }

  // ── Token ASA IDs and decimals ──────────────────────────────────────────────
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
    reserves,
    sumX,
    sumXSq,
    virtualOffset,
    rInt,
    sBound,
    kBound,
    totalR,
    feeBps,
    numTicks,
    ticks,
    tokenAsaIds,
    tokenDecimals,
    feeGrowth,
  };
}

/**
 * Read one LP's position for a specific tick from its pos: box.
 *
 * Returns null if the position box does not exist (LP has no position in this tick).
 *
 * @param client      Algod client
 * @param appId       Pool application ID
 * @param ownerAddress  Algorand address of the LP
 * @param tickId      Tick ID to query
 * @param n           Number of tokens in the pool
 * @param feeGrowth   Current global fee_growth array (from readPoolState)
 * @param tick        The tick object (from poolState.ticks)
 */
export async function readPosition(
  client: algosdk.Algodv2,
  appId: number,
  ownerAddress: string,
  tickId: number,
  n: number,
  feeGrowth: bigint[],
  tick: Tick,
): Promise<PositionInfo | null> {
  const ownerPubKey = addressToPublicKey(ownerAddress);
  const boxKey = encodePositionBoxKey(ownerPubKey, tickId);

  try {
    const box = await client.getApplicationBoxByName(appId, boxKey).do();
    const { shares, feeGrowthCheckpoints } = decodePositionBox(
      box.value as Uint8Array,
      n,
    );

    if (tick.totalShares === 0n) {
      return { tickId, shares, positionR: 0n, claimableFees: new Array(n).fill(0n) };
    }

    // pos_r = tick.r * shares / tick.totalShares  (AMOUNT_SCALE units)
    const positionR = (tick.r * shares) / tick.totalShares;

    // claimable_fee[i] = pos_r * (fee_growth[i] - checkpoint[i]) / PRECISION
    // Result is in raw microunits (the contract sends raw amounts, not scaled).
    const claimableFees = feeGrowth.map((fg, i) => {
      const checkpoint = feeGrowthCheckpoints[i] ?? 0n;
      const delta = fg > checkpoint ? fg - checkpoint : 0n;
      return (positionR * delta) / PRECISION;
    });

    return { tickId, shares, positionR, claimableFees };
  } catch {
    // Box not found — no position for this owner at this tick.
    return null;
  }
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
