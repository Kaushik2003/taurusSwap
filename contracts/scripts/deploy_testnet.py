#!/usr/bin/env python3
"""Deploy the compiled OrbitalPool app to Algorand testnet."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict
from pathlib import Path

from algokit_utils import AlgoAmount, AlgorandClient

try:
    from scripts._deploy_common import (
        DEFAULT_APP_FUNDING_MICROALGOS,
        DEFAULT_MAX_ROUNDS,
        DEFAULT_N,
        DeploySummary,
        deploy_orbital_pool,
        scaled_roots,
    )
except ImportError:  # pragma: no cover - direct script execution path
    from _deploy_common import (  # type: ignore[no-redef]
        DEFAULT_APP_FUNDING_MICROALGOS,
        DEFAULT_MAX_ROUNDS,
        DEFAULT_N,
        DeploySummary,
        deploy_orbital_pool,
        scaled_roots,
    )


DEFAULT_ACCOUNT_NAME = "DEPLOYER"
DEFAULT_DISPENSER_TOKEN_ENV = "TESTNET_DISPENSER_AUTH_TOKEN"


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deploy OrbitalPool to Algorand testnet and bootstrap base state."
    )
    parser.add_argument("--n", type=int, default=DEFAULT_N, help="Number of pool tokens to register.")
    parser.add_argument(
        "--account-name",
        type=str,
        default=DEFAULT_ACCOUNT_NAME,
        help=(
            "Logical account name for AlgoKit environment loading. "
            "For example DEPLOYER loads DEPLOYER_MNEMONIC."
        ),
    )
    parser.add_argument(
        "--mnemonic",
        type=str,
        default=None,
        help="25-word mnemonic to use directly instead of loading {ACCOUNT_NAME}_MNEMONIC.",
    )
    parser.add_argument(
        "--sender",
        type=str,
        default=None,
        help="Optional sender override for rekeyed accounts when using --mnemonic.",
    )
    parser.add_argument(
        "--asset-id",
        dest="asset_ids",
        action="append",
        type=int,
        default=[],
        help="Existing ASA id to register. Repeat once per token.",
    )
    parser.add_argument(
        "--create-mock-assets",
        action="store_true",
        help="Create mock ASAs on testnet instead of supplying existing --asset-id values.",
    )
    parser.add_argument("--sqrt-n-scaled", type=int, default=None, help="Optional precomputed sqrt(n) scaling.")
    parser.add_argument(
        "--inv-sqrt-n-scaled",
        type=int,
        default=None,
        help="Optional precomputed 1/sqrt(n) scaling.",
    )
    parser.add_argument(
        "--fund-microalgos",
        type=int,
        default=DEFAULT_APP_FUNDING_MICROALGOS,
        help="Amount of ALGO, in microalgos, to fund the app account with.",
    )
    parser.add_argument(
        "--fee-bps",
        type=int,
        default=None,
        help="Optional pool fee in basis points to set immediately after deployment.",
    )
    parser.add_argument(
        "--asset-name-prefix",
        type=str,
        default="Orbital USD",
        help="Prefix used when creating mock testnet assets.",
    )
    parser.add_argument(
        "--unit-name-prefix",
        type=str,
        default="OUSD",
        help="Unit name prefix used when creating mock testnet assets.",
    )
    parser.add_argument(
        "--mock-asset-total",
        type=int,
        default=10**15,
        help="Total supply for each created mock testnet asset.",
    )
    parser.add_argument(
        "--mock-asset-decimals",
        type=int,
        default=6,
        help="Decimals for each created mock testnet asset.",
    )
    parser.add_argument(
        "--ensure-funding",
        action="store_true",
        help="Attempt to top up the deployer account from the testnet dispenser API before deployment.",
    )
    parser.add_argument(
        "--min-spending-microalgos",
        type=int,
        default=10_000_000,
        help="Minimum deployer spending balance target when using --ensure-funding.",
    )
    parser.add_argument(
        "--dispenser-token",
        type=str,
        default=None,
        help="Auth token for the testnet dispenser API.",
    )
    parser.add_argument(
        "--dispenser-token-env",
        type=str,
        default=DEFAULT_DISPENSER_TOKEN_ENV,
        help="Environment variable name to read the dispenser auth token from.",
    )
    parser.add_argument(
        "--max-rounds",
        type=int,
        default=DEFAULT_MAX_ROUNDS,
        help="How many rounds to wait for each transaction confirmation.",
    )
    parser.add_argument("--json", action="store_true", help="Print the deployment summary as JSON.")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional file path to write the deployment summary JSON to.",
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
    except Exception as exc:  # pragma: no cover - depends on remote connectivity
        raise SystemExit(f"Unable to reach Algorand testnet via AlgoNode: {exc}") from exc
    if not status:
        raise SystemExit("Connected to testnet, but algod status response was empty.")


def _maybe_fund_from_testnet_dispenser(alg: AlgorandClient, deployer, args: argparse.Namespace) -> None:
    if not args.ensure_funding:
        return
    dispenser_token = args.dispenser_token or os.getenv(args.dispenser_token_env)
    if not dispenser_token:
        raise SystemExit(
            "--ensure-funding was requested, but no dispenser auth token was provided.\n"
            f"Pass --dispenser-token or set {args.dispenser_token_env}."
        )
    dispenser = alg.client.get_testnet_dispenser(auth_token=dispenser_token)
    alg.account.ensure_funded_from_testnet_dispenser_api(
        deployer,
        dispenser,
        AlgoAmount.from_micro_algo(args.min_spending_microalgos),
    )


def _print_human_summary(summary: DeploySummary) -> None:
    print("OrbitalPool testnet deployment complete.")
    print()
    print(f"app_id: {summary.app_id}")
    print(f"app_address: {summary.app_address}")
    print(f"creator: {summary.creator}")
    print(f"account_source: {summary.account_source}")
    print(f"tokens: {summary.asset_ids}")
    print(f"n: {summary.n}")
    print(f"sqrt_n_scaled: {summary.sqrt_n_scaled}")
    print(f"inv_sqrt_n_scaled: {summary.inv_sqrt_n_scaled}")
    print(f"fee_bps: {summary.fee_bps}")
    print()
    print("What this script did:")
    print("- Deployed OrbitalPool to testnet using AlgoNode via AlgoKit.")
    print("- Funded the app account for minimum balance and inner transactions.")
    print("- Bootstrapped the reserves and fee_growth boxes.")
    print("- Registered the pool tokens.")
    if summary.created_mock_assets:
        print("- Created mock testnet ASAs because --create-mock-assets was requested.")
    print("- Left the full ASA supply in the creator wallet; no liquidity was seeded yet.")
    print()
    print("What this script did not do:")
    print("- It did not opt external trader wallets into the ASAs.")
    print("- It did not distribute trader balances.")
    print("- It did not add liquidity.")
    print("- It did not run swaps.")
    print("- It did not verify protocol readiness beyond successful deployment and setup.")
    print()
    print("Next step after trader opt-ins:")
    print("  algokit project run seed-testnet")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if args.n < 2:
        raise SystemExit("--n must be at least 2")
    if args.asset_ids and len(args.asset_ids) != args.n:
        raise SystemExit(f"Expected {args.n} --asset-id values, got {len(args.asset_ids)}")
    if args.asset_ids and args.create_mock_assets:
        raise SystemExit("Choose either --asset-id values or --create-mock-assets, not both.")
    if not args.asset_ids and not args.create_mock_assets:
        raise SystemExit(
            "Testnet deployment needs explicit assets.\n"
            "Pass --asset-id once per token, or use --create-mock-assets if you intentionally want to mint fresh testnet ASAs."
        )

    sqrt_n_scaled, inv_sqrt_n_scaled = scaled_roots(args.n)
    if args.sqrt_n_scaled is not None:
        sqrt_n_scaled = args.sqrt_n_scaled
    if args.inv_sqrt_n_scaled is not None:
        inv_sqrt_n_scaled = args.inv_sqrt_n_scaled

    alg = AlgorandClient.testnet()
    _ensure_testnet_connectivity(alg)
    deployer, account_source = _load_deployer(alg, args)
    _maybe_fund_from_testnet_dispenser(alg, deployer, args)

    summary = deploy_orbital_pool(
        alg=alg,
        deployer=deployer,
        network="testnet",
        n=args.n,
        sqrt_n_scaled=sqrt_n_scaled,
        inv_sqrt_n_scaled=inv_sqrt_n_scaled,
        asset_ids=list(args.asset_ids),
        create_assets=args.create_mock_assets,
        asset_name_prefix=args.asset_name_prefix,
        unit_name_prefix=args.unit_name_prefix,
        mock_asset_total=args.mock_asset_total,
        mock_asset_decimals=args.mock_asset_decimals,
        fund_microalgos=args.fund_microalgos,
        fee_bps=args.fee_bps,
        max_rounds=args.max_rounds,
        account_source=account_source,
    )
    payload = json.dumps(asdict(summary), indent=2)

    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n")

    if args.json:
        print(payload)
    else:
        _print_human_summary(summary)
        if args.output is not None:
            print()
            print(f"Deployment summary written to {args.output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
