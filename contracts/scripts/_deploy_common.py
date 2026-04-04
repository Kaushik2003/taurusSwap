"""Shared helpers for OrbitalPool deploy and seed scripts.

v2 changes vs testnet demo:
  - FEES_BOX renamed to FEE_GROWTH_BOX (b"fee_growth") to match v2 contract.
  - bootstrap() call now references fee_growth instead of fees.
  - DEFAULT_APP_FUNDING_MICROALGOS raised to 10 ALGO to cover v2 position boxes.
  - pos_box(owner_address, tick_id) helper added for seed/add_tick box references.
  - REQUIRED_METHODS expanded with v2 ABI surface.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from algokit_utils import (
    AlgoAmount,
    AlgorandClient,
    AppClientMethodCallParams,
    AppFactoryCreateMethodCallParams,
    AssetCreateParams,
    PaymentParams,
)
from algosdk import encoding


PRECISION = 1_000_000_000
AMOUNT_SCALE = 1_000  # raw microunits // AMOUNT_SCALE = scaled invariant-math unit
DEFAULT_N = 5
# Raised from 5 ALGO (v1) to 10 ALGO for v2.
# v2 creates one position box per add_tick call:
#   MBR = 2500 + 400 × (44-byte key + (1+n)×8-byte value) microAlgo per position.
# For n=5, one position ≈ 0.04 ALGO; 10 ALGO covers ~200 positions comfortably.
DEFAULT_APP_FUNDING_MICROALGOS = 10_000_000
DEFAULT_MAX_ROUNDS = 10
DEFAULT_VALIDITY_WINDOW = 1_000
ARTIFACT = (
    Path(__file__).resolve().parents[1]
    / "smart_contracts"
    / "artifacts"
    / "orbital_pool"
    / "OrbitalPool.arc56.json"
)
# v2 required ABI methods (subset used during deployment).
REQUIRED_METHODS = {"create", "bootstrap", "register_token"}
# Methods checked only for informational validation, not hard failure.
EXPECTED_V2_METHODS = {"add_tick", "claim_fees", "remove_liquidity", "get_pool_info", "get_position"}

RESERVES_BOX = b"reserves"
# v2: fee_growth replaces the v1 fees box.  The box name changed intentionally
# to prevent accidentally bootstrapping a v1 contract with v2 tooling.
FEE_GROWTH_BOX = b"fee_growth"
# Keep the old name as a constant so grep can find it and so any accidental
# reference to the v1 name produces a NameError rather than silently wrong behaviour.
# Do NOT use FEES_BOX anywhere in v2 code.
_FEES_BOX_V1_TOMBSTONE = b"fees"  # noqa: E501 — deliberately unused


@dataclass(slots=True)
class DeploySummary:
    network: str
    creator: str
    app_id: int
    app_address: str
    n: int
    sqrt_n_scaled: int
    inv_sqrt_n_scaled: int
    asset_ids: list[int]
    created_mock_assets: bool
    fund_microalgos: int
    fee_bps: int
    artifact: str
    account_source: str | None = None


def scaled_roots(n: int) -> tuple[int, int]:
    """Return (sqrt_n_scaled, inv_sqrt_n_scaled) for a given n using integer math."""
    sqrt_n_scaled = math.isqrt(n * PRECISION * PRECISION)
    inv_sqrt_n_scaled = (PRECISION * PRECISION + (sqrt_n_scaled // 2)) // sqrt_n_scaled
    return sqrt_n_scaled, inv_sqrt_n_scaled


def token_box(token_idx: int) -> bytes:
    """AVM key for the token BoxMap entry at index token_idx."""
    return b"token:" + token_idx.to_bytes(8, "big")


def tick_box(tick_id: int) -> bytes:
    """AVM key for the tick BoxMap entry with the given tick_id."""
    return b"tick:" + tick_id.to_bytes(8, "big")


def pos_box(owner_address: str, tick_id: int) -> bytes:
    """AVM key for the LP position box: b"pos:" + owner_32bytes + tick_id_8bytes.

    This must be included in box_references whenever add_tick, remove_liquidity,
    or claim_fees is called, because those methods read/write the position box.

    Args:
        owner_address: Algorand account address string (the LP's address).
        tick_id: Integer tick ID being operated on.
    """
    owner_pk = encoding.decode_address(owner_address)  # 32 bytes
    return b"pos:" + owner_pk + tick_id.to_bytes(8, "big")


def load_artifact_text() -> str:
    """Load and validate the compiled ARC-56 artifact.

    Raises SystemExit with a clear message if the artifact is missing or
    does not expose the required ABI methods.
    """
    if not ARTIFACT.exists():
        raise SystemExit(
            f"Compiled ARC-56 artifact not found at {ARTIFACT}.\n"
            "Compile the contract first: `algokit project run build` from contracts/."
        )

    payload = ARTIFACT.read_text()
    try:
        spec = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Artifact at {ARTIFACT} is not valid JSON: {exc}") from exc

    method_names = {method["name"] for method in spec.get("methods", [])}

    missing_required = sorted(REQUIRED_METHODS - method_names)
    if missing_required:
        raise SystemExit(
            "Compiled OrbitalPool ARC-56 artifact is missing required ABI methods: "
            + ", ".join(missing_required)
            + "\nDid you forget to rebuild after v2 changes?"
        )

    missing_v2 = sorted(EXPECTED_V2_METHODS - method_names)
    if missing_v2:
        import warnings
        warnings.warn(
            "Artifact appears to be a v1 build (missing v2 methods: "
            + ", ".join(missing_v2)
            + "). Run `algokit project run build` to compile v2.",
            stacklevel=2,
        )

    return payload


def create_mock_assets(
    alg: AlgorandClient,
    creator_address: str,
    creator_signer: Any,
    n: int,
    asset_name_prefix: str,
    unit_name_prefix: str,
    total: int,
    decimals: int,
    max_rounds: int,
) -> list[int]:
    """Create n mock ASAs and return their IDs in order."""
    asset_ids: list[int] = []
    for token_idx in range(n):
        result = alg.send.asset_create(
            AssetCreateParams(
                sender=creator_address,
                signer=creator_signer,
                total=total,
                decimals=decimals,
                asset_name=f"{asset_name_prefix} {token_idx}",
                unit_name=f"{unit_name_prefix}{token_idx}"[:8],
            ),
            send_params={"max_rounds_to_wait": max_rounds},
        )
        asset_ids.append(result.confirmation["asset-index"])
    return asset_ids


def configure_deploy_client(alg: AlgorandClient) -> None:
    """Disable suggested-params caching and widen validity window for deploy flows.

    AlgoKit caches suggested params by default, which can cause later transactions
    in a multi-step deploy to reference stale/expired rounds on remote networks.
    """
    alg.set_suggested_params_cache_timeout(0)
    alg.set_default_validity_window(DEFAULT_VALIDITY_WINDOW)


def deploy_orbital_pool(
    *,
    alg: AlgorandClient,
    deployer: Any,
    network: str,
    n: int,
    sqrt_n_scaled: int,
    inv_sqrt_n_scaled: int,
    asset_ids: list[int],
    create_assets: bool,
    asset_name_prefix: str,
    unit_name_prefix: str,
    mock_asset_total: int,
    mock_asset_decimals: int,
    fund_microalgos: int,
    fee_bps: int | None,
    max_rounds: int,
    account_source: str | None = None,
) -> DeploySummary:
    """Deploy, fund, bootstrap, and register tokens for one OrbitalPool instance.

    This function is intentionally fail-fast: any step failure raises an exception
    that the calling script should surface to the operator without retrying
    automatically (re-running a failed mid-deploy is unsafe — use idempotent
    bootstrapping instead).

    Does NOT seed liquidity.  That is a separate operational step.
    """
    if n < 2:
        raise SystemExit("--n must be at least 2")
    if asset_ids and len(asset_ids) != n:
        raise SystemExit(f"Expected {n} asset ids, got {len(asset_ids)}")
    if asset_ids and create_assets:
        raise SystemExit("Choose either existing asset ids or create mock assets, not both.")
    if fund_microalgos < 2_000_000:
        raise SystemExit(
            f"--fund-microalgos {fund_microalgos} is too low. "
            "Pool needs at least 2 ALGO for base MBR and box allocations. "
            f"Recommended minimum for n={n}: {DEFAULT_APP_FUNDING_MICROALGOS} microAlgo."
        )

    configure_deploy_client(alg)

    artifact_text = load_artifact_text()
    factory = alg.client.get_app_factory(
        artifact_text,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )

    created_mock_assets = create_assets
    resolved_asset_ids = list(asset_ids)
    if created_mock_assets:
        resolved_asset_ids = create_mock_assets(
            alg=alg,
            creator_address=deployer.address,
            creator_signer=deployer.signer,
            n=n,
            asset_name_prefix=asset_name_prefix,
            unit_name_prefix=unit_name_prefix,
            total=mock_asset_total,
            decimals=mock_asset_decimals,
            max_rounds=max_rounds,
        )

    app_client, _ = factory.send.create(
        AppFactoryCreateMethodCallParams(
            method="create",
            args=[n, sqrt_n_scaled, inv_sqrt_n_scaled],
        ),
        send_params={"max_rounds_to_wait": max_rounds},
    )

    # Fund the app account before bootstrap so it can pay box MBR.
    alg.send.payment(
        PaymentParams(
            sender=deployer.address,
            signer=deployer.signer,
            receiver=app_client.app_address,
            amount=AlgoAmount(micro_algo=fund_microalgos),
        ),
        send_params={"max_rounds_to_wait": max_rounds},
    )

    # Bootstrap: allocates reserves (n×8 bytes) and fee_growth (n×8 bytes) boxes.
    # v2: uses FEE_GROWTH_BOX, not the v1 fees box.
    app_client.send.call(
        AppClientMethodCallParams(
            method="bootstrap",
            args=[],
            box_references=[RESERVES_BOX, FEE_GROWTH_BOX],
            static_fee=AlgoAmount(micro_algo=2_000),
        ),
        send_params={"max_rounds_to_wait": max_rounds},
    )

    # Register each token (one inner opt-in per token).
    for token_idx, asset_id in enumerate(resolved_asset_ids):
        app_client.send.call(
            AppClientMethodCallParams(
                method="register_token",
                args=[token_idx, asset_id],
                asset_references=[asset_id],
                box_references=[token_box(token_idx)],
                static_fee=AlgoAmount(micro_algo=2_000),
            ),
            send_params={
                "cover_app_call_inner_transaction_fees": True,
                "max_rounds_to_wait": max_rounds,
            },
        )

    effective_fee_bps = 30  # contract default
    if fee_bps is not None:
        app_client.send.call(
            AppClientMethodCallParams(method="set_fee", args=[fee_bps]),
            send_params={"max_rounds_to_wait": max_rounds},
        )
        effective_fee_bps = fee_bps

    return DeploySummary(
        network=network,
        creator=deployer.address,
        app_id=app_client.app_id,
        app_address=app_client.app_address,
        n=n,
        sqrt_n_scaled=sqrt_n_scaled,
        inv_sqrt_n_scaled=inv_sqrt_n_scaled,
        asset_ids=resolved_asset_ids,
        created_mock_assets=created_mock_assets,
        fund_microalgos=fund_microalgos,
        fee_bps=effective_fee_bps,
        artifact=str(ARTIFACT),
        account_source=account_source,
    )
