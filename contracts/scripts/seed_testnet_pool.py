#!/usr/bin/env python3
"""Distribute testnet pool ASAs and seed initial liquidity after trader opt-ins.

This script is intentionally a post-deploy step.
It assumes:
  1. OrbitalPool is already deployed and all token boxes are registered.
  2. The deployer still holds the full ASA supply from creation.
  3. External trader wallets have already opted into the pool ASAs.

It then:
  - Validates all preconditions (bootstrap, registration, opt-ins, balances).
  - Optionally tops up trader wallets with ALGO for fees (idempotent: skips if enough).
  - Distributes swap balances to trader wallets (idempotent: skips if they already hold enough).
  - Seeds the first pool tick from the deployer account.

Idempotency notes:
  - ALGO top-up is skipped per-trader when their balance already meets the target.
  - ASA distribution is skipped per-trader per-token when they already hold >= requested amount.
  - Tick seeding is blocked by default if the pool already has ticks (--allow-nonempty-pool to override).
  - Dry-run mode (--dry-run) validates everything without sending any transactions.

v2 changes:
  - Uses FEE_GROWTH_BOX (b"fee_growth") not FEES_BOX (b"fees").
  - _seed_initial_tick box_references now includes the LP position box
    (pos:{deployer_32}{tick_id_8}) required by the v2 add_tick method.
  - ASA distribution is now idempotent: no tokens sent if trader already has >= target.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from algokit_utils import (
    AlgoAmount,
    AlgorandClient,
    AppCallMethodCallParams,
    AssetTransferParams,
    PaymentParams,
)
from algosdk import abi

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from orbital_math import k_from_depeg_price

try:
    from scripts._deploy_common import (
        AMOUNT_SCALE,
        DEFAULT_MAX_ROUNDS,
        FEE_GROWTH_BOX,
        PRECISION,
        RESERVES_BOX,
        configure_deploy_client,
        load_artifact_text,
        pos_box,
        tick_box,
        token_box,
    )
except ImportError:  # pragma: no cover - direct script execution path
    from _deploy_common import (  # type: ignore[no-redef]
        AMOUNT_SCALE,
        DEFAULT_MAX_ROUNDS,
        FEE_GROWTH_BOX,
        PRECISION,
        RESERVES_BOX,
        configure_deploy_client,
        load_artifact_text,
        pos_box,
        tick_box,
        token_box,
    )


DEFAULT_ACCOUNT_NAME = "DEPLOYER"
DEFAULT_TRADER_TOKEN_AMOUNT = 1_000_000_000
DEFAULT_TRADER_FUND_MICROALGOS = 500_000
# v3: r and k are in scaled units (microunits // AMOUNT_SCALE).
# r = 18_000_000 scaled = 18_000 tokens radius.
# At depeg 0.998 this seeds ~9,950 tokens per asset, ~49,750 total.
# Slippage: ~0.01% on 1T swaps, ~0.12% on 10T swaps.
DEFAULT_SEED_R = 18_000_000          # scaled units
DEFAULT_DEPEG_PRICE_SCALED = 998_000_000  # 0.998 — tolerates 0.2% depeg


@dataclass(slots=True)
class SeedSummary:
    network: str
    app_id: int
    app_address: str
    creator: str
    token_ids: list[int]
    trader_addresses: list[str]
    trader_token_amount: int
    trader_fund_microalgos: int
    seeded_tick_id: int
    seed_r: int
    seed_k: int
    seed_deposit_per_token: int
    max_rounds: int
    dry_run: bool


def _parse_csv_env(name: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, "").split(",") if item.strip()]


def _parse_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if not raw:
        return default
    return int(raw)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Distribute trader balances and seed initial OrbitalPool liquidity on testnet."
    )
    parser.add_argument(
        "--app-id",
        type=int,
        default=_parse_int_env("ORBITAL_APP_ID", 0) or None,
        help="Deployed OrbitalPool app id. Defaults to ORBITAL_APP_ID.",
    )
    parser.add_argument(
        "--account-name",
        type=str,
        default=os.getenv("ORBITAL_ACCOUNT_NAME", DEFAULT_ACCOUNT_NAME),
        help="Logical AlgoKit account name. For example DEPLOYER loads DEPLOYER_MNEMONIC.",
    )
    parser.add_argument(
        "--mnemonic",
        type=str,
        default=os.getenv("ORBITAL_MNEMONIC") or None,
        help="25-word mnemonic instead of loading {ACCOUNT_NAME}_MNEMONIC.",
    )
    parser.add_argument(
        "--sender",
        type=str,
        default=os.getenv("ORBITAL_SENDER") or None,
        help="Optional sender override for rekeyed accounts when using --mnemonic.",
    )
    parser.add_argument(
        "--trader-address",
        dest="trader_addresses",
        action="append",
        default=[],
        help="Trader wallet to fund for swap testing. Repeat once per wallet.",
    )
    parser.add_argument(
        "--trader-token-amount",
        type=int,
        default=_parse_int_env("ORBITAL_TRADER_TOKEN_AMOUNT", DEFAULT_TRADER_TOKEN_AMOUNT),
        help="Amount of each ASA to distribute to each trader wallet.",
    )
    parser.add_argument(
        "--trader-fund-microalgos",
        type=int,
        default=_parse_int_env("ORBITAL_TRADER_FUND_MICROALGOS", DEFAULT_TRADER_FUND_MICROALGOS),
        help="Target microAlgos to top each trader wallet up to for network fees.",
    )
    parser.add_argument(
        "--r",
        type=int,
        default=_parse_int_env("ORBITAL_SEED_R", DEFAULT_SEED_R),
        help="Tick radius r for the initial seed position.",
    )
    parser.add_argument(
        "--k",
        type=int,
        default=None,
        help="Explicit tick k. If omitted, derived from --depeg-price-scaled.",
    )
    parser.add_argument(
        "--depeg-price-scaled",
        type=int,
        default=_parse_int_env("ORBITAL_DEPEG_PRICE_SCALED", DEFAULT_DEPEG_PRICE_SCALED),
        help="PRECISION-scaled depeg price used to derive k when --k is omitted.",
    )
    parser.add_argument(
        "--allow-nonempty-pool",
        action="store_true",
        help=(
            "Allow seeding even if the pool already has ticks. "
            "Default is fail-closed to prevent accidental double-seeding."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate all preconditions and print what would happen, without sending any transactions.",
    )
    parser.add_argument(
        "--max-rounds",
        type=int,
        default=_parse_int_env("ORBITAL_MAX_ROUNDS", DEFAULT_MAX_ROUNDS),
        help="How many rounds to wait for each transaction confirmation.",
    )
    parser.add_argument("--json", action="store_true", help="Print the seeding summary as JSON.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(os.getenv("ORBITAL_SEED_OUTPUT")) if os.getenv("ORBITAL_SEED_OUTPUT") else None,
        help="Optional file path to write the seeding summary JSON to.",
    )
    return parser.parse_args(argv)


def _load_deployer(alg: AlgorandClient, args: argparse.Namespace):
    if args.mnemonic:
        return alg.account.from_mnemonic(mnemonic=args.mnemonic, sender=args.sender), "mnemonic"
    try:
        return alg.account.from_environment(args.account_name), f"env:{args.account_name}"
    except Exception as exc:
        expected = f"{args.account_name.upper()}_MNEMONIC"
        raise SystemExit(
            "No deployer account could be loaded for testnet.\n"
            f"Provide --mnemonic directly or export {expected}."
        ) from exc


def _ensure_testnet_connectivity(alg: AlgorandClient) -> None:
    try:
        status = alg.client.algod.status()
    except Exception as exc:  # pragma: no cover
        raise SystemExit(f"Unable to reach Algorand testnet via AlgoNode: {exc}") from exc
    if not status:
        raise SystemExit("Connected to testnet, but algod status response was empty.")


def _state_uint(state: dict[str, Any], key: str) -> int:
    value = state[key]
    return int(getattr(value, "value", value))


def _decode_uint64_box(raw: bytes) -> int:
    if len(raw) != 8:
        raise SystemExit(f"Expected uint64 box payload, got {len(raw)} bytes")
    return int.from_bytes(raw, "big")


def _load_token_ids(app_client: Any, n: int) -> list[int]:
    asset_ids: list[int] = []
    for token_idx in range(n):
        raw = app_client.get_box_value(token_box(token_idx))
        asset_ids.append(_decode_uint64_box(raw))
    return asset_ids


def _missing_optins(alg: AlgorandClient, address: str, asset_ids: list[int]) -> list[int]:
    missing: list[int] = []
    for asset_id in asset_ids:
        try:
            alg.client.algod.account_asset_info(address, asset_id)
        except Exception:
            missing.append(asset_id)
    return missing


def _asset_amount(alg: AlgorandClient, address: str, asset_id: int) -> int:
    holding = alg.client.algod.account_asset_info(address, asset_id)
    return int(holding["asset-holding"]["amount"])


def _algo_amount(alg: AlgorandClient, address: str) -> int:
    info = alg.client.algod.account_info(address)
    return int(info["amount"])


def _on_chain_deposit(r: int, k: int, n: int, sqrt_n_scaled: int) -> int:
    """Replicate on-chain floor-division deposit arithmetic exactly.

    r, k, sqrt_n_scaled are in scaled units (microunits // AMOUNT_SCALE).
    Returns deposit_per_token in raw microunits (scaled result × AMOUNT_SCALE).
    """
    q = r - (r * PRECISION) // sqrt_n_scaled
    c = n * r - (k * sqrt_n_scaled) // PRECISION
    discriminant = (n - 1) * ((n * r * r) - (c * c))
    if discriminant < 0:
        raise SystemExit("Computed negative discriminant for initial seed tick")
    x_min = r - (c + math.isqrt(discriminant)) // n
    deposit_scaled = q - x_min
    return deposit_scaled * AMOUNT_SCALE


def _fund_trader_wallets(
    alg: AlgorandClient,
    deployer: Any,
    trader_addresses: list[str],
    trader_fund_microalgos: int,
    max_rounds: int,
    dry_run: bool,
) -> None:
    """Top up each trader's ALGO balance to at least trader_fund_microalgos.

    Idempotent: skips wallets that already hold enough ALGO.
    """
    if trader_fund_microalgos <= 0:
        return

    for trader in trader_addresses:
        current = _algo_amount(alg, trader)
        if current >= trader_fund_microalgos:
            print(f"  ALGO top-up skipped for {trader} (has {current}, target {trader_fund_microalgos})")
            continue
        top_up = trader_fund_microalgos - current
        print(f"  Sending {top_up} microAlgo to {trader} (has {current})")
        if dry_run:
            continue
        alg.send.payment(
            PaymentParams(
                sender=deployer.address,
                signer=deployer.signer,
                receiver=trader,
                amount=AlgoAmount(micro_algo=top_up),
            ),
            send_params={"max_rounds_to_wait": max_rounds},
        )


def _distribute_assets(
    alg: AlgorandClient,
    deployer: Any,
    trader_addresses: list[str],
    asset_ids: list[int],
    trader_token_amount: int,
    max_rounds: int,
    dry_run: bool,
) -> None:
    """Send trader_token_amount of each ASA to each trader wallet.

    Idempotent: skips (trader, asset) pairs where the trader already holds
    >= trader_token_amount.  This prevents double-distribution on re-runs.
    """
    if trader_token_amount <= 0:
        return

    for trader in trader_addresses:
        for asset_id in asset_ids:
            current = _asset_amount(alg, trader, asset_id)
            if current >= trader_token_amount:
                print(
                    f"  ASA {asset_id} distribution skipped for {trader} "
                    f"(has {current}, target {trader_token_amount})"
                )
                continue
            amount_to_send = trader_token_amount - current
            print(f"  Sending {amount_to_send} of ASA {asset_id} to {trader}")
            if dry_run:
                continue
            alg.send.asset_transfer(
                AssetTransferParams(
                    sender=deployer.address,
                    signer=deployer.signer,
                    asset_id=asset_id,
                    amount=amount_to_send,
                    receiver=trader,
                ),
                send_params={"max_rounds_to_wait": max_rounds},
            )


def _seed_initial_tick(
    alg: AlgorandClient,
    deployer: Any,
    app_client: Any,
    n: int,
    token_ids: list[int],
    r: int,
    k: int,
    tick_id: int,
    deposit_per_token: int,
    max_rounds: int,
    dry_run: bool,
) -> None:
    """Submit the atomic group that calls add_tick for the initial seed position.

    Box references (v2):
      - reserves: updated by add_tick
      - tick:{tick_id}: created by add_tick
      - pos:{deployer_32}{tick_id_8}: CREATED by v2 add_tick (position box)
      - token:{i} for i in range(n): read by add_tick to validate ASA IDs

    The position box was missing in the v1 seed script.  Without it, the v2
    add_tick call fails on-chain with an access-violation on the box opcode.
    """
    deployer_pos_box = pos_box(deployer.address, tick_id)

    print(f"  Seeding tick_id={tick_id} r={r} k={k} deposit_per_token={deposit_per_token}")
    if dry_run:
        print(f"    [dry-run] would submit atomic group of {n+1} transactions")
        return

    group = alg.send.new_group()
    for asset_id in token_ids:
        group.add_asset_transfer(
            AssetTransferParams(
                sender=deployer.address,
                signer=deployer.signer,
                asset_id=asset_id,
                amount=deposit_per_token,
                receiver=app_client.app_address,
            )
        )

    group.add_app_call_method_call(
        AppCallMethodCallParams(
            sender=deployer.address,
            signer=deployer.signer,
            app_id=app_client.app_id,
            method=abi.Method.from_signature("add_tick(uint64,uint64)void"),
            args=[r, k],
            box_references=[
                RESERVES_BOX,
                tick_box(tick_id),
                deployer_pos_box,          # v2: LP position box created by add_tick
                *[token_box(i) for i in range(n)],
            ],
            static_fee=AlgoAmount(micro_algo=2_000),
        )
    )
    group.send({"max_rounds_to_wait": max_rounds})


def _print_human_summary(summary: SeedSummary, account_source: str) -> None:
    print()
    print("OrbitalPool testnet seeding complete.")
    print()
    print(f"app_id:                {summary.app_id}")
    print(f"app_address:           {summary.app_address}")
    print(f"creator:               {summary.creator}")
    print(f"account_source:        {account_source}")
    print(f"tokens:                {summary.token_ids}")
    print(f"traders:               {summary.trader_addresses}")
    print(f"trader_token_amount:   {summary.trader_token_amount}")
    print(f"trader_fund_microalgos:{summary.trader_fund_microalgos}")
    print(f"seed_tick_id:          {summary.seeded_tick_id}")
    print(f"seed_r:                {summary.seed_r}")
    print(f"seed_k:                {summary.seed_k}")
    print(f"seed_deposit_per_token:{summary.seed_deposit_per_token}")
    if summary.dry_run:
        print()
        print("*** DRY-RUN: no transactions were sent ***")
    else:
        print()
        print("What this script did:")
        print("- Verified trader opt-ins before any token distribution.")
        print("- Topped trader wallets with ALGO where needed (skipped those already funded).")
        print("- Distributed test ASAs to traders (skipped those already holding enough).")
        print("- Added the first liquidity tick from the creator account.")
        print("- Created LP position box for the deployer at the seeded tick.")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if not args.app_id:
        raise SystemExit("Provide --app-id or set ORBITAL_APP_ID.")
    if args.r <= 0:
        raise SystemExit("--r must be positive")
    if args.trader_token_amount < 0:
        raise SystemExit("--trader-token-amount must be non-negative")
    if args.trader_fund_microalgos < 0:
        raise SystemExit("--trader-fund-microalgos must be non-negative")

    trader_addresses = list(args.trader_addresses) or _parse_csv_env("ORBITAL_TRADER_ADDRESSES")
    trader_addresses = [a for a in trader_addresses if a]

    alg = AlgorandClient.testnet()
    _ensure_testnet_connectivity(alg)
    configure_deploy_client(alg)
    deployer, account_source = _load_deployer(alg, args)

    app_client = alg.client.get_app_client_by_id(
        load_artifact_text(),
        args.app_id,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )

    state = app_client.get_global_state()
    n = _state_uint(state, "n")
    bootstrapped = _state_uint(state, "bootstrapped")
    registered_tokens = _state_uint(state, "registered_tokens")
    num_ticks = _state_uint(state, "num_ticks")
    sqrt_n_scaled = _state_uint(state, "sqrt_n")

    if bootstrapped != 1:
        raise SystemExit(f"App {args.app_id} is not bootstrapped. Run deploy first.")
    if registered_tokens != n:
        raise SystemExit(
            f"App {args.app_id} only has {registered_tokens}/{n} tokens registered. "
            "Complete token registration before seeding."
        )
    if not args.allow_nonempty_pool and num_ticks != 0:
        raise SystemExit(
            f"App {args.app_id} already has {num_ticks} tick(s). "
            "This script is fail-closed for initial seeding. "
            "Pass --allow-nonempty-pool to seed additional ticks."
        )

    # Compute tick parameters.
    if args.k is None:
        k = k_from_depeg_price(args.depeg_price_scaled, args.r, n)
    else:
        k = args.k
    deposit_per_token = _on_chain_deposit(args.r, k, n, sqrt_n_scaled)
    if deposit_per_token <= 0:
        raise SystemExit(
            f"Computed non-positive deposit_per_token ({deposit_per_token}). "
            "Adjust --r, --k, or --depeg-price-scaled."
        )

    token_ids = _load_token_ids(app_client, n)

    # Validate trader opt-ins before any transfers.
    if trader_addresses:
        missing_by_trader = {
            trader: _missing_optins(alg, trader, token_ids)
            for trader in trader_addresses
        }
        missing_by_trader = {t: m for t, m in missing_by_trader.items() if m}
        if missing_by_trader:
            details = "\n".join(
                f"  {trader}: missing opt-in for assets {missing}"
                for trader, missing in missing_by_trader.items()
            )
            raise SystemExit(
                "Trader wallets must opt into all pool ASAs before seeding.\n"
                f"{details}"
            )

    # Check deployer has enough of every ASA.
    per_asset_required = (len(trader_addresses) * args.trader_token_amount) + deposit_per_token
    insufficient_assets: list[tuple[int, int]] = []
    for asset_id in token_ids:
        owner_balance = _asset_amount(alg, deployer.address, asset_id)
        if owner_balance < per_asset_required:
            insufficient_assets.append((asset_id, owner_balance))
    if insufficient_assets:
        details = "\n".join(
            f"  asset {asset_id}: owner balance {balance}, required at least {per_asset_required}"
            for asset_id, balance in insufficient_assets
        )
        raise SystemExit(
            "Owner does not hold enough of every ASA to distribute traders and seed liquidity.\n"
            f"{details}"
        )

    if args.dry_run:
        print("Dry-run mode — preconditions passed, no transactions will be sent.")

    print("Funding trader wallets...")
    _fund_trader_wallets(
        alg=alg,
        deployer=deployer,
        trader_addresses=trader_addresses,
        trader_fund_microalgos=args.trader_fund_microalgos,
        max_rounds=args.max_rounds,
        dry_run=args.dry_run,
    )

    print("Distributing ASAs to trader wallets...")
    _distribute_assets(
        alg=alg,
        deployer=deployer,
        trader_addresses=trader_addresses,
        asset_ids=token_ids,
        trader_token_amount=args.trader_token_amount,
        max_rounds=args.max_rounds,
        dry_run=args.dry_run,
    )

    print("Seeding initial liquidity tick...")
    _seed_initial_tick(
        alg=alg,
        deployer=deployer,
        app_client=app_client,
        n=n,
        token_ids=token_ids,
        r=args.r,
        k=k,
        tick_id=num_ticks,
        deposit_per_token=deposit_per_token,
        max_rounds=args.max_rounds,
        dry_run=args.dry_run,
    )

    summary = SeedSummary(
        network="testnet",
        app_id=app_client.app_id,
        app_address=app_client.app_address,
        creator=deployer.address,
        token_ids=token_ids,
        trader_addresses=trader_addresses,
        trader_token_amount=args.trader_token_amount,
        trader_fund_microalgos=args.trader_fund_microalgos,
        seeded_tick_id=num_ticks,
        seed_r=args.r,
        seed_k=k,
        seed_deposit_per_token=deposit_per_token,
        max_rounds=args.max_rounds,
        dry_run=args.dry_run,
    )
    payload = json.dumps(asdict(summary), indent=2)

    if args.output is not None and not args.dry_run:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n")

    if args.json:
        print(payload)
    else:
        _print_human_summary(summary, account_source)
        if args.output is not None and not args.dry_run:
            print()
            print(f"Seeding summary written to {args.output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
