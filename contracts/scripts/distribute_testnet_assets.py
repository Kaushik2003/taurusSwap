#!/usr/bin/env python3

"""Distribute additional testnet pool ASAs to opted-in trader wallets.

Idempotent: each (trader, asset) pair is only sent tokens if the trader's
current balance is strictly less than the requested amount.  Re-running the
script after a partial failure resumes from where it left off without
double-sending to already-topped-up wallets.

Dry-run mode (--dry-run) validates all preconditions and prints what would
be sent without submitting any transactions.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from algokit_utils import AlgorandClient, AssetTransferParams

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from scripts._deploy_common import configure_deploy_client, load_artifact_text, token_box
except ImportError:  # pragma: no cover - direct script execution path
    from _deploy_common import configure_deploy_client, load_artifact_text, token_box  # type: ignore[no-redef]


DEFAULT_ACCOUNT_NAME = "DEPLOYER"


@dataclass(slots=True)
class DistributionSummary:
    app_id: int
    app_address: str
    creator: str
    token_ids: list[int]
    trader_addresses: list[str]
    amount_per_asset_base_units: int
    tokens_skipped: int   # (trader, asset) pairs skipped because balance already sufficient
    tokens_sent: int      # (trader, asset) pairs where a transfer was submitted
    dry_run: bool


def _parse_csv_env(name: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, "").split(",") if item.strip()]


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send additional pool ASAs from the creator to opted-in trader wallets on testnet."
    )
    parser.add_argument(
        "--app-id",
        type=int,
        default=int(os.getenv("ORBITAL_APP_ID", "0")) or None,
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
        help="Trader wallet to fund. Repeat once per wallet.",
    )
    parser.add_argument(
        "--whole-tokens",
        type=int,
        default=None,
        help="Whole-token amount to send per asset. Converted using each asset's decimals.",
    )
    parser.add_argument(
        "--base-units",
        type=int,
        default=None,
        help="Base-unit amount to send per asset. Use this or --whole-tokens, not both.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be sent without submitting any transactions.",
    )
    parser.add_argument(
        "--max-rounds",
        type=int,
        default=int(os.getenv("ORBITAL_MAX_ROUNDS", "10")),
        help="How many rounds to wait for each transaction confirmation.",
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


def _decode_uint64_box(raw: bytes) -> int:
    if len(raw) != 8:
        raise SystemExit(f"Expected uint64 box payload, got {len(raw)} bytes")
    return int.from_bytes(raw, "big")


def _state_uint(state: dict[str, Any], key: str) -> int:
    value = state[key]
    return int(getattr(value, "value", value))


def _load_token_ids(app_client: Any, n: int) -> list[int]:
    token_ids: list[int] = []
    for token_idx in range(n):
        raw = app_client.get_box_value(token_box(token_idx))
        token_ids.append(_decode_uint64_box(raw))
    return token_ids


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


def _resolve_amount_per_asset(alg: AlgorandClient, asset_ids: list[int], args: argparse.Namespace) -> int:
    """Return the target per-asset amount in base units.

    Exactly one of --whole-tokens or --base-units must be provided.
    """
    if (args.whole_tokens is None) == (args.base_units is None):
        raise SystemExit("Provide exactly one of --whole-tokens or --base-units.")
    if args.base_units is not None:
        if args.base_units <= 0:
            raise SystemExit("--base-units must be positive.")
        return args.base_units

    if args.whole_tokens <= 0:
        raise SystemExit("--whole-tokens must be positive.")
    first_asset = alg.client.algod.asset_info(asset_ids[0])
    decimals = int(first_asset["params"]["decimals"])
    return args.whole_tokens * (10 ** decimals)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if not args.app_id:
        raise SystemExit("Provide --app-id or set ORBITAL_APP_ID.")

    trader_addresses = list(args.trader_addresses) or _parse_csv_env("ORBITAL_TRADER_ADDRESSES")
    trader_addresses = [a for a in trader_addresses if a]
    if not trader_addresses:
        raise SystemExit("Provide at least one --trader-address.")

    alg = AlgorandClient.testnet()
    _ensure_testnet_connectivity(alg)
    configure_deploy_client(alg)
    deployer, _ = _load_deployer(alg, args)

    app_client = alg.client.get_app_client_by_id(
        load_artifact_text(),
        args.app_id,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )

    state = app_client.get_global_state()
    n = _state_uint(state, "n")
    registered_tokens = _state_uint(state, "registered_tokens")
    if registered_tokens != n:
        raise SystemExit(
            f"App {args.app_id} only has {registered_tokens}/{n} tokens registered."
        )

    token_ids = _load_token_ids(app_client, n)

    # Verify all traders have opted into all pool ASAs.
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
            "Trader wallets must opt into all pool ASAs before distribution.\n"
            f"{details}"
        )

    amount_per_asset = _resolve_amount_per_asset(alg, token_ids, args)

    # Check deployer holds enough of every ASA.
    required_total = amount_per_asset * len(trader_addresses)
    insufficient_assets: list[tuple[int, int]] = []
    for asset_id in token_ids:
        owner_balance = _asset_amount(alg, deployer.address, asset_id)
        if owner_balance < required_total:
            insufficient_assets.append((asset_id, owner_balance))
    if insufficient_assets:
        details = "\n".join(
            f"  asset {asset_id}: owner balance {balance}, required {required_total}"
            for asset_id, balance in insufficient_assets
        )
        raise SystemExit(
            "Owner does not hold enough of every ASA to complete this distribution.\n"
            f"{details}"
        )

    if args.dry_run:
        print("Dry-run mode — preconditions passed, no transactions will be sent.")

    tokens_skipped = 0
    tokens_sent = 0

    for trader in trader_addresses:
        for asset_id in token_ids:
            current = _asset_amount(alg, trader, asset_id)
            if current >= amount_per_asset:
                print(
                    f"  Skip  ASA {asset_id} → {trader[:8]}… "
                    f"(has {current} >= target {amount_per_asset})"
                )
                tokens_skipped += 1
                continue

            to_send = amount_per_asset - current
            print(
                f"  Send  {to_send} of ASA {asset_id} → {trader[:8]}… "
                f"(has {current}, topping up to {amount_per_asset})"
            )
            tokens_sent += 1
            if args.dry_run:
                continue
            alg.send.asset_transfer(
                AssetTransferParams(
                    sender=deployer.address,
                    signer=deployer.signer,
                    asset_id=asset_id,
                    amount=to_send,
                    receiver=trader,
                ),
                send_params={"max_rounds_to_wait": args.max_rounds},
            )

    summary = DistributionSummary(
        app_id=args.app_id,
        app_address=app_client.app_address,
        creator=deployer.address,
        token_ids=token_ids,
        trader_addresses=trader_addresses,
        amount_per_asset_base_units=amount_per_asset,
        tokens_skipped=tokens_skipped,
        tokens_sent=tokens_sent,
        dry_run=args.dry_run,
    )
    print()
    print("Testnet asset distribution complete." if not args.dry_run else "Dry-run complete.")
    print()
    for key, value in asdict(summary).items():
        print(f"  {key}: {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
