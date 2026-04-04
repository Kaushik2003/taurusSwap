from __future__ import annotations

import logging
import os

from scripts import deploy_localnet, deploy_testnet


logger = logging.getLogger(__name__)


def _detect_network() -> str:
    server = os.getenv("ALGOD_SERVER", "").lower()
    port = os.getenv("ALGOD_PORT", "")

    if "localhost" in server or "127.0.0.1" in server or port == "4001":
        return "localnet"
    if "testnet" in server or "algonode" in server:
        return "testnet"
    if os.getenv("DEPLOYER_MNEMONIC"):
        return "testnet"

    raise RuntimeError(
        "Could not infer deployment target from AlgoKit environment. "
        "Use `algokit project deploy localnet` or `algokit project deploy testnet`."
    )


def _bool_env(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _append_optional(args: list[str], flag: str, env_name: str) -> None:
    value = os.getenv(env_name)
    if value:
        args.extend([flag, value])


def _append_repeated_csv(args: list[str], flag: str, env_name: str) -> None:
    raw = os.getenv(env_name, "")
    values = [item.strip() for item in raw.split(",") if item.strip()]
    for value in values:
        args.extend([flag, value])


def _deploy_args_from_environment(network: str) -> list[str]:
    args: list[str] = []

    _append_optional(args, "--n", "ORBITAL_N")
    _append_optional(args, "--sqrt-n-scaled", "ORBITAL_SQRT_N_SCALED")
    _append_optional(args, "--inv-sqrt-n-scaled", "ORBITAL_INV_SQRT_N_SCALED")
    _append_optional(args, "--fund-microalgos", "ORBITAL_FUND_MICROALGOS")
    _append_optional(args, "--fee-bps", "ORBITAL_FEE_BPS")
    _append_optional(args, "--asset-name-prefix", "ORBITAL_ASSET_NAME_PREFIX")
    _append_optional(args, "--unit-name-prefix", "ORBITAL_UNIT_NAME_PREFIX")
    _append_optional(args, "--mock-asset-total", "ORBITAL_MOCK_ASSET_TOTAL")
    _append_optional(args, "--mock-asset-decimals", "ORBITAL_MOCK_ASSET_DECIMALS")
    _append_optional(args, "--max-rounds", "ORBITAL_MAX_ROUNDS")
    _append_optional(args, "--output", "ORBITAL_DEPLOY_OUTPUT")
    _append_repeated_csv(args, "--asset-id", "ORBITAL_ASSET_IDS")

    if network == "testnet" and _bool_env("ORBITAL_CREATE_MOCK_ASSETS"):
        args.append("--create-mock-assets")
    if network == "testnet" and _bool_env("ORBITAL_ENSURE_FUNDING"):
        args.append("--ensure-funding")
    if _bool_env("ORBITAL_DEPLOY_JSON"):
        args.append("--json")

    if network == "testnet":
        _append_optional(args, "--account-name", "ORBITAL_ACCOUNT_NAME")
        _append_optional(args, "--mnemonic", "ORBITAL_MNEMONIC")
        _append_optional(args, "--sender", "ORBITAL_SENDER")
        _append_optional(args, "--min-spending-microalgos", "ORBITAL_MIN_SPENDING_MICROALGOS")
        _append_optional(args, "--dispenser-token", "ORBITAL_DISPENSER_TOKEN")
        _append_optional(args, "--dispenser-token-env", "ORBITAL_DISPENSER_TOKEN_ENV")

    return args


def deploy() -> None:
    network = _detect_network()
    deploy_args = _deploy_args_from_environment(network)
    logger.info("Deploying orbital_pool using AlgoKit %s environment", network)

    if network == "localnet":
        deploy_localnet.main(deploy_args)
        return

    deploy_testnet.main(deploy_args)
