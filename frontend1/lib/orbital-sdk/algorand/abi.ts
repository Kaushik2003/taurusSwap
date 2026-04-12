import algosdk from "algosdk";

// ── ARC-4 method definitions ─────────────────────────────────────────────────
// Each ABIMethod instance computes the correct 4-byte selector via
// SHA-512(method_signature)[0:4], matching what algopy's ARC-4 router expects.
const METHODS = {
  create: new algosdk.ABIMethod({
    name: "create",
    desc: "",
    args: [
      { name: "n", type: "uint64", desc: "" },
      { name: "sqrt_n_scaled", type: "uint64", desc: "" },
      { name: "inv_sqrt_n_scaled", type: "uint64", desc: "" },
    ],
    returns: { type: "void", desc: "" },
  }),

  bootstrap: new algosdk.ABIMethod({
    name: "bootstrap",
    desc: "",
    args: [],
    returns: { type: "void", desc: "" },
  }),

  budget: new algosdk.ABIMethod({
    name: "budget",
    desc: "Opcode-budget pooling dummy.",
    args: [],
    returns: { type: "void", desc: "" },
  }),

  registerToken: new algosdk.ABIMethod({
    name: "register_token",
    desc: "",
    args: [
      { name: "token_idx", type: "uint64", desc: "" },
      { name: "asset_id", type: "uint64", desc: "" },
    ],
    returns: { type: "void", desc: "" },
  }),

  setPaused: new algosdk.ABIMethod({
    name: "set_paused",
    desc: "",
    args: [{ name: "flag", type: "uint64", desc: "" }],
    returns: { type: "void", desc: "" },
  }),

  setFee: new algosdk.ABIMethod({
    name: "set_fee",
    desc: "",
    args: [{ name: "new_fee_bps", type: "uint64", desc: "" }],
    returns: { type: "void", desc: "" },
  }),

  // LP operations ─────────────────────────────────────────────────────────────
  // Note: on-chain method is "add_tick", NOT "add_liquidity"
  addTick: new algosdk.ABIMethod({
    name: "add_tick",
    desc: "",
    args: [
      { name: "r", type: "uint64", desc: "" },
      { name: "k", type: "uint64", desc: "" },
    ],
    returns: { type: "void", desc: "" },
  }),

  claimFees: new algosdk.ABIMethod({
    name: "claim_fees",
    desc: "Claim accrued swap fees for a position without withdrawing principal.",
    args: [{ name: "tick_id", type: "uint64", desc: "" }],
    returns: { type: "void", desc: "" },
  }),

  removeLiquidity: new algosdk.ABIMethod({
    name: "remove_liquidity",
    desc: "",
    args: [
      { name: "tick_id", type: "uint64", desc: "" },
      { name: "shares", type: "uint64", desc: "" },
    ],
    returns: { type: "void", desc: "" },
  }),

  // Swap operations ───────────────────────────────────────────────────────────
  swap: new algosdk.ABIMethod({
    name: "swap",
    desc: "",
    args: [
      { name: "token_in_idx", type: "uint64", desc: "" },
      { name: "token_out_idx", type: "uint64", desc: "" },
      { name: "amount_in", type: "uint64", desc: "" },
      { name: "claimed_amount_out", type: "uint64", desc: "" },
      { name: "min_amount_out", type: "uint64", desc: "" },
    ],
    returns: { type: "void", desc: "" },
  }),

  // trade_recipe is arc4.DynamicBytes → ARC-4 type "byte[]"
  swapWithCrossings: new algosdk.ABIMethod({
    name: "swap_with_crossings",
    desc: "",
    args: [
      { name: "token_in_idx", type: "uint64", desc: "" },
      { name: "token_out_idx", type: "uint64", desc: "" },
      { name: "total_amount_in", type: "uint64", desc: "" },
      { name: "trade_recipe", type: "byte[]", desc: "" },
      { name: "min_amount_out", type: "uint64", desc: "" },
    ],
    returns: { type: "void", desc: "" },
  }),

  // View methods ──────────────────────────────────────────────────────────────
  getPrice: new algosdk.ABIMethod({
    name: "get_price",
    desc: "",
    args: [
      { name: "token_in_idx", type: "uint64", desc: "" },
      { name: "token_out_idx", type: "uint64", desc: "" },
    ],
    returns: { type: "uint64", desc: "" },
  }),

  getPoolInfo: new algosdk.ABIMethod({
    name: "get_pool_info",
    desc: "",
    args: [],
    returns: { type: "(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64)", desc: "" },
  }),
} as const;

export type MethodKey = keyof typeof METHODS;

/**
 * Returns the 4-byte ARC-4 method selector for the given method name.
 * This is what appArgs[0] must be for the contract's ABI router to dispatch
 * to the correct handler.
 */
export function methodSelector(method: MethodKey): Uint8Array {
  return METHODS[method].getSelector();
}

/**
 * Encode a uint64 as 8-byte big-endian (standard ARC-4 uint64 arg).
 */
export function encodeUint64Arg(value: number | bigint): Uint8Array {
  return algosdk.encodeUint64(value);
}

/**
 * Encode a byte[] ARC-4 argument: 2-byte big-endian length prefix + data.
 * Used for arc4.DynamicBytes method parameters (e.g., trade_recipe).
 */
export function encodeBytesArg(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(2 + data.length);
  new DataView(result.buffer).setUint16(0, data.length);
  result.set(data, 2);
  return result;
}
