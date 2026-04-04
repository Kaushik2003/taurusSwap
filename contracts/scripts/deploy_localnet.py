#!/usr/bin/env python3
"""Deploy the compiled OrbitalPool app to AlgoKit localnet."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from algokit_utils import AlgorandClient

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


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deploy OrbitalPool to AlgoKit localnet and bootstrap base state."
    )
    parser.add_argument("--n", type=int, default=DEFAULT_N, help="Number of pool tokens to register.")
    parser.add_argument(
        "--asset-id",
        dest="asset_ids",
        action="append",
        type=int,
        default=[],
        help="Existing ASA id to register. Repeat once per token. If omitted, mock ASAs are created.",
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
        help="Prefix used when creating mock localnet assets.",
    )
    parser.add_argument(
        "--unit-name-prefix",
        type=str,
        default="OUSD",
        help="Unit name prefix used when creating mock localnet assets.",
    )
    parser.add_argument(
        "--mock-asset-total",
        type=int,
        default=10**15,
        help="Total supply for each created mock localnet asset.",
    )
    parser.add_argument(
        "--mock-asset-decimals",
        type=int,
        default=6,
        help="Decimals for each created mock localnet asset.",
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


def _ensure_localnet(alg: AlgorandClient) -> None:
    try:
        alg.client.algod.status()
    except Exception as exc:  # pragma: no cover - depends on external docker state
        raise SystemExit(
            "Localnet is not reachable. Start Docker and run `algokit localnet start` first.\n"
            f"Original error: {exc}"
        ) from exc


def _print_human_summary(summary: DeploySummary) -> None:
    print("OrbitalPool localnet deployment complete.")
    print()
    print(f"app_id: {summary.app_id}")
    print(f"app_address: {summary.app_address}")
    print(f"creator: {summary.creator}")
    print(f"tokens: {summary.asset_ids}")
    print(f"n: {summary.n}")
    print(f"sqrt_n_scaled: {summary.sqrt_n_scaled}")
    print(f"inv_sqrt_n_scaled: {summary.inv_sqrt_n_scaled}")
    print(f"fee_bps: {summary.fee_bps}")
    print()
    print("What this script did:")
    print("- Deployed OrbitalPool from the compiled ARC-56 artifact.")
    print("- Funded the app account for minimum balance and inner transactions.")
    print("- Bootstrapped the reserves and fee_growth boxes.")
    print("- Registered the pool tokens.")
    if summary.created_mock_assets:
        print("- Created mock localnet ASAs for those pool tokens.")
    print()
    print("What this script did not do:")
    print("- It did not add liquidity.")
    print("- It did not run swaps.")
    print("- It did not prove end-to-end protocol correctness.")
    print()
    print("Next real check:")
    print("RUN_LOCALNET=1 python -m pytest tests/test_orbital_pool_localnet.py -v")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if args.n < 2:
        raise SystemExit("--n must be at least 2")
    if args.asset_ids and len(args.asset_ids) != args.n:
        raise SystemExit(f"Expected {args.n} --asset-id values, got {len(args.asset_ids)}")

    sqrt_n_scaled, inv_sqrt_n_scaled = scaled_roots(args.n)
    if args.sqrt_n_scaled is not None:
        sqrt_n_scaled = args.sqrt_n_scaled
    if args.inv_sqrt_n_scaled is not None:
        inv_sqrt_n_scaled = args.inv_sqrt_n_scaled

    alg = AlgorandClient.default_localnet()
    _ensure_localnet(alg)
    deployer = alg.account.localnet_dispenser()

    summary = deploy_orbital_pool(
        alg=alg,
        deployer=deployer,
        network="localnet",
        n=args.n,
        sqrt_n_scaled=sqrt_n_scaled,
        inv_sqrt_n_scaled=inv_sqrt_n_scaled,
        asset_ids=list(args.asset_ids),
        create_assets=not args.asset_ids,
        asset_name_prefix=args.asset_name_prefix,
        unit_name_prefix=args.unit_name_prefix,
        mock_asset_total=args.mock_asset_total,
        mock_asset_decimals=args.mock_asset_decimals,
        fund_microalgos=args.fund_microalgos,
        fee_bps=args.fee_bps,
        max_rounds=args.max_rounds,
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
