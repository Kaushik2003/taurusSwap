#!/usr/bin/env python3
"""Execute a single swap on the deployed OrbitalPool on Algorand TestNet.

Builds the correct 2-transaction atomic group:
  Txn 0: AssetTransfer  (token_in -> pool)
  Txn 1: App call swap  (with all required box references)

Computes claimed_amount_out off-chain using the exact same verify_invariant
logic as the contract, then submits and confirms on-chain.

Usage:
  python scripts/swap_testnet.py --app-id 758284478
  python scripts/swap_testnet.py --app-id 758284478 --token-in-idx 0 --token-out-idx 1 --amount-in 100000000
  python scripts/swap_testnet.py --app-id 758284478 --dry-run

Environment:
  ORBITAL_MNEMONIC  25-word mnemonic of the swapping account (must hold token_in ASA)
"""

from __future__ import annotations

import argparse
import base64
import math
import os
import struct
import sys
from pathlib import Path

from algokit_utils import (
    AlgoAmount,
    AlgorandClient,
    AppCallMethodCallParams,
    AssetTransferParams,
)
from algosdk import abi

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from scripts._deploy_common import (
        RESERVES_BOX,
        FEE_GROWTH_BOX,
        DEFAULT_MAX_ROUNDS,
        configure_deploy_client,
        load_artifact_text,
        token_box,
    )
except ImportError:
    from _deploy_common import (  # type: ignore[no-redef]
        RESERVES_BOX,
        FEE_GROWTH_BOX,
        DEFAULT_MAX_ROUNDS,
        configure_deploy_client,
        load_artifact_text,
        token_box,
    )

# ── Invariant math (mirrors contract exactly) ────────────────────────────────

PRECISION    = 1_000_000_000
AMOUNT_SCALE = 1_000
TOLERANCE    = 1_000
FEE_DENOM    = 10_000


def _mul_div_floor(a: int, b: int, c: int) -> int:
    return (a * b) // c


def _square_raw(x: int) -> int:
    return x * x


def _square_scaled(x: int) -> int:
    return (x * x) // PRECISION


def _to_scaled(raw: int) -> int:
    return raw // AMOUNT_SCALE


def _abs_diff(a: int, b: int) -> int:
    return abs(a - b)


def _verify_invariant(
    sum_x: int,
    sum_x_sq: int,
    n: int,
    r_int: int,
    s_bound: int,
    k_bound: int,
    sqrt_n_sc: int,
    inv_sqrt_n_sc: int,
) -> tuple[bool, int]:
    """Mirror of contract verify_invariant. Returns (valid, abs_diff)."""
    alpha_total = _mul_div_floor(sum_x, inv_sqrt_n_sc, PRECISION)
    if alpha_total < k_bound:
        return False, -1
    alpha_int = alpha_total - k_bound
    r_int_sqrt_n = _mul_div_floor(r_int, sqrt_n_sc, PRECISION)

    variance = _mul_div_floor(sum_x, sum_x, n)
    if sum_x_sq < variance:
        return False, -1
    w_total_sq = sum_x_sq - variance
    w_total_norm = math.isqrt(w_total_sq)
    if w_total_norm < s_bound:
        return False, -1
    w_int_norm = w_total_norm - s_bound

    diff_alpha = _abs_diff(alpha_int, r_int_sqrt_n)
    lhs = _square_scaled(r_int)
    rhs = _square_scaled(diff_alpha) + _square_scaled(w_int_norm)
    d = _abs_diff(lhs, rhs)
    return d <= TOLERANCE, d


def compute_swap_output(
    amount_in: int,
    token_in_idx: int,
    token_out_idx: int,
    reserves: list[int],
    sum_x: int,
    sum_x_sq: int,
    virtual_offset: int,
    n: int,
    r_int: int,
    s_bound: int,
    k_bound: int,
    sqrt_n_sc: int,
    inv_sqrt_n_sc: int,
    fee_bps: int,
) -> int:
    """Binary-search the maximum claimed_amount_out that passes verify_invariant.

    Returns claimed_amount_out in raw microunits.
    """
    fee          = _mul_div_floor(amount_in, fee_bps, FEE_DENOM)
    effective_in = amount_in - fee

    old_in_raw  = reserves[token_in_idx]
    old_out_raw = reserves[token_out_idx]
    old_in_math  = _to_scaled(old_in_raw)  + virtual_offset
    old_out_math = _to_scaled(old_out_raw) + virtual_offset

    lo, hi = 1, old_out_raw
    best   = 0

    for _ in range(200):
        mid = (lo + hi) // 2
        new_in_math  = _to_scaled(old_in_raw  + effective_in) + virtual_offset
        new_out_math = _to_scaled(old_out_raw - mid)           + virtual_offset
        new_sum      = sum_x    + _to_scaled(effective_in) - _to_scaled(mid)
        new_sum_sq   = (sum_x_sq
                        + _square_raw(new_in_math)  - _square_raw(old_in_math)
                        + _square_raw(new_out_math) - _square_raw(old_out_math))

        ok, _ = _verify_invariant(
            new_sum, new_sum_sq, n, r_int, s_bound, k_bound, sqrt_n_sc, inv_sqrt_n_sc
        )
        if ok:
            best = mid
            lo   = mid + 1
        else:
            hi   = mid - 1

    if best == 0:
        raise SystemExit("No valid claimed_amount_out found — check pool state.")
    return best


# ── On-chain state helpers ───────────────────────────────────────────────────

def _load_reserves(alg: AlgorandClient, app_id: int, n: int) -> list[int]:
    raw  = alg.client.algod.application_box_by_name(app_id, b"reserves")
    data = base64.b64decode(raw["value"])
    return [struct.unpack(">Q", data[i * 8: i * 8 + 8])[0] for i in range(n)]


def _load_token_ids(alg: AlgorandClient, app_id: int, n: int) -> list[int]:
    ids = []
    for i in range(n):
        box_name = b"token:" + i.to_bytes(8, "big")
        raw = alg.client.algod.application_box_by_name(app_id, box_name)
        ids.append(struct.unpack(">Q", base64.b64decode(raw["value"]))[0])
    return ids


# ── CLI ──────────────────────────────────────────────────────────────────────

def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Execute a swap on OrbitalPool (TestNet).")
    p.add_argument("--app-id",        type=int, required=True)
    p.add_argument("--token-in-idx",  type=int, default=0,
                   help="Index of token to send (default: 0).")
    p.add_argument("--token-out-idx", type=int, default=1,
                   help="Index of token to receive (default: 1).")
    p.add_argument("--amount-in",     type=int, default=100_000_000,
                   help="Raw microunits of token_in (default: 100_000_000 = 100 tokens at 6 dec).")
    p.add_argument("--slippage-bps",  type=int, default=50,
                   help="Slippage tolerance in bps for min_amount_out (default: 50 = 0.5%%).")
    p.add_argument("--mnemonic",      type=str, default=os.getenv("ORBITAL_MNEMONIC"),
                   help="25-word mnemonic. Defaults to ORBITAL_MNEMONIC env var.")
    p.add_argument("--max-rounds",    type=int, default=DEFAULT_MAX_ROUNDS)
    p.add_argument("--dry-run",       action="store_true",
                   help="Compute and print values without sending any transactions.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    if not args.mnemonic:
        raise SystemExit("Provide --mnemonic or set ORBITAL_MNEMONIC.")
    if args.token_in_idx == args.token_out_idx:
        raise SystemExit("--token-in-idx and --token-out-idx must differ.")
    if args.amount_in <= 0:
        raise SystemExit("--amount-in must be positive.")

    alg = AlgorandClient.testnet()
    configure_deploy_client(alg)

    alg.client.algod.status()  # connectivity check

    swapper    = alg.account.from_mnemonic(mnemonic=args.mnemonic)
    app_client = alg.client.get_app_client_by_id(
        load_artifact_text(),
        args.app_id,
        default_sender=swapper.address,
        default_signer=swapper.signer,
    )

    # ── Load on-chain state ──────────────────────────────────────────────
    gs = app_client.get_global_state()

    def g(key: str) -> int:
        v = gs[key]
        return int(v.value if hasattr(v, "value") else v)

    n              = g("n")
    bootstrapped   = g("bootstrapped")
    reg_tokens     = g("registered_tokens")
    r_int          = g("r_int")
    s_bound        = g("s_bound")
    k_bound        = g("k_bound")
    sqrt_n_sc      = g("sqrt_n")
    inv_sqrt_n_sc  = g("inv_sqrt_n")
    virtual_offset = g("virtual_offset")
    sum_x          = g("sum_x")
    sum_x_sq       = g("sum_x_sq")
    fee_bps        = g("fee_bps")

    if bootstrapped != 1:
        raise SystemExit("Pool is not bootstrapped.")
    if reg_tokens != n:
        raise SystemExit(f"Only {reg_tokens}/{n} tokens registered.")
    if args.token_in_idx >= n or args.token_out_idx >= n:
        raise SystemExit(f"Token index out of range — pool has n={n}.")

    token_ids     = _load_token_ids(alg, args.app_id, n)
    reserves      = _load_reserves(alg, args.app_id, n)
    token_in_asa  = token_ids[args.token_in_idx]
    token_out_asa = token_ids[args.token_out_idx]

    # ── Compute output off-chain ─────────────────────────────────────────
    claimed_out = compute_swap_output(
        amount_in      = args.amount_in,
        token_in_idx   = args.token_in_idx,
        token_out_idx  = args.token_out_idx,
        reserves       = reserves,
        sum_x          = sum_x,
        sum_x_sq       = sum_x_sq,
        virtual_offset = virtual_offset,
        n              = n,
        r_int          = r_int,
        s_bound        = s_bound,
        k_bound        = k_bound,
        sqrt_n_sc      = sqrt_n_sc,
        inv_sqrt_n_sc  = inv_sqrt_n_sc,
        fee_bps        = fee_bps,
    )
    min_out = claimed_out * (FEE_DENOM - args.slippage_bps) // FEE_DENOM
    fee     = _mul_div_floor(args.amount_in, fee_bps, FEE_DENOM)

    print(f"Pool app:           {args.app_id}")
    print(f"Swapper:            {swapper.address}")
    print(f"token_in:           ASA {token_in_asa}  (idx {args.token_in_idx})")
    print(f"token_out:          ASA {token_out_asa}  (idx {args.token_out_idx})")
    print(f"amount_in:          {args.amount_in:>15,}  ({args.amount_in / 1_000_000:.6f} tokens)")
    print(f"fee ({fee_bps}bps):        {fee:>15,}")
    print(f"effective_in:       {args.amount_in - fee:>15,}")
    print(f"claimed_amount_out: {claimed_out:>15,}  ({claimed_out / 1_000_000:.6f} tokens)")
    print(f"min_amount_out:     {min_out:>15,}  ({args.slippage_bps}bps slippage guard)")
    print(f"slippage:           {(1 - claimed_out / (args.amount_in - fee)) * 100:+.4f}%")

    if args.dry_run:
        print("\n[dry-run] No transaction sent.")
        return 0

    # ── Build 2-txn atomic group ─────────────────────────────────────────
    # Box references required by swap():
    #   reserves         — read/write per-token reserves
    #   fee_growth       — update fee accumulator
    #   token:<in_idx>   — validate token_in ASA ID
    #   token:<out_idx>  — validate token_out ASA ID
    box_refs = [
        RESERVES_BOX,
        FEE_GROWTH_BOX,
        token_box(args.token_in_idx),
        token_box(args.token_out_idx),
    ]

    group = alg.send.new_group()
    group.add_asset_transfer(
        AssetTransferParams(
            sender=swapper.address,
            signer=swapper.signer,
            asset_id=token_in_asa,
            amount=args.amount_in,
            receiver=app_client.app_address,
        )
    )
    group.add_app_call_method_call(
        AppCallMethodCallParams(
            sender=swapper.address,
            signer=swapper.signer,
            app_id=args.app_id,
            method=abi.Method.from_signature("swap(uint64,uint64,uint64,uint64,uint64)void"),
            args=[args.token_in_idx, args.token_out_idx, args.amount_in, claimed_out, min_out],
            asset_references=[token_out_asa],
            box_references=box_refs,
            static_fee=AlgoAmount(micro_algo=2_000),
        )
    )

    print("\nSubmitting swap...")
    result = group.send({"max_rounds_to_wait": args.max_rounds})
    txids  = result.tx_ids if hasattr(result, "tx_ids") else []
    last   = str(txids[-1]) if txids else ""
    print(f"Confirmed!  TxIDs: {[str(t) for t in txids]}")
    if last:
        print(f"Explorer: https://lora.algokit.io/testnet/transaction/{last}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
