"""Localnet integration tests — deploy the compiled contract on AlgoKit
localnet and verify that on-chain state exactly matches the off-chain
math simulator after each operation.

Run with:  RUN_LOCALNET=1 python -m pytest tests/test_orbital_pool_localnet.py -v
"""

import os
from pathlib import Path

import pytest
from algokit_utils import (
    AlgoAmount,
    AlgorandClient,
    AppCallMethodCallParams,
    AppClientMethodCallParams,
    AppFactoryCreateMethodCallParams,
    AssetCreateParams,
    AssetTransferParams,
    PaymentParams,
)
from algosdk import abi

from orbital_math import (
    Tick,
    TickState,
    equal_price_point,
    k_from_depeg_price,
    solve_single_segment_swap,
    segment_swap,
    x_min,
)


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LOCALNET") != "1",
    reason="Set RUN_LOCALNET=1 to run live localnet integration checks",
)

N = 5
R = 1_000_000_000
SQRT_N = 2_236_067_977
INV_SQRT_N = 447_213_596
AMOUNT_IN = 100_000
K = k_from_depeg_price(990_000_000, R, N)
Q = equal_price_point(R, N)
X_MIN = x_min(R, K, N)
TOKEN_BOXES = [b"token:" + i.to_bytes(8, "big") for i in range(N)]
ARTIFACT = (
    Path(__file__).resolve().parents[1]
    / "smart_contracts"
    / "artifacts"
    / "orbital_pool"
    / "OrbitalPool.arc56.json"
)


# ── Helpers ────────────────────────────────────────────────────────────


def _setup_pool(alg, acct):
    """Deploy contract, create ASAs, bootstrap, register tokens, fund."""
    factory = alg.client.get_app_factory(
        ARTIFACT.read_text(),
        default_sender=acct.address,
        default_signer=acct.signer,
    )

    asset_ids = []
    for i in range(N):
        result = alg.send.asset_create(
            AssetCreateParams(
                sender=acct.address,
                signer=acct.signer,
                total=10**15,
                decimals=6,
                asset_name=f"Orbital USD {i}",
                unit_name=f"OUSD{i}",
            )
        )
        asset_ids.append(result.confirmation["asset-index"])

    app_client, _ = factory.send.create(
        AppFactoryCreateMethodCallParams(method="create", args=[N, SQRT_N, INV_SQRT_N]),
        send_params={"max_rounds_to_wait": 10},
    )

    alg.send.payment(
        PaymentParams(
            sender=acct.address,
            signer=acct.signer,
            receiver=app_client.app_address,
            amount=AlgoAmount(micro_algo=5_000_000),
        )
    )

    app_client.send.call(
        AppClientMethodCallParams(
            method="bootstrap",
            args=[],
            box_references=[b"reserves", b"fees"],
            static_fee=AlgoAmount(micro_algo=2_000),
        ),
        send_params={"max_rounds_to_wait": 10},
    )

    for idx, asset_id in enumerate(asset_ids):
        app_client.send.call(
            AppClientMethodCallParams(
                method="register_token",
                args=[idx, asset_id],
                asset_references=[asset_id],
                box_references=[TOKEN_BOXES[idx]],
                static_fee=AlgoAmount(micro_algo=2_000),
            ),
            send_params={"cover_app_call_inner_transaction_fees": True, "max_rounds_to_wait": 10},
        )

    return app_client, asset_ids


def _on_chain_deposit(r, k, n=N, sqrt_n=SQRT_N, precision=1_000_000_000):
    """Compute deposit matching on-chain floor-division arithmetic exactly."""
    import math
    q = r - (r * precision) // sqrt_n
    c = n * r - (k * sqrt_n) // precision
    disc = (n - 1) * (n * r * r - c * c)
    xm = r - (c + math.isqrt(disc)) // n
    return q - xm


def _add_tick(alg, acct, app_client, asset_ids, r, k, tick_id=0):
    """Add a tick via proper atomic group and return deposit_per_token."""
    dep = _on_chain_deposit(r, k)

    group = alg.send.new_group()
    for asset_id in asset_ids:
        group.add_asset_transfer(
            AssetTransferParams(
                sender=acct.address,
                signer=acct.signer,
                asset_id=asset_id,
                amount=dep,
                receiver=app_client.app_address,
            )
        )
    tick_box = b"tick:" + tick_id.to_bytes(8, "big")
    group.add_app_call_method_call(
        AppCallMethodCallParams(
            sender=acct.address,
            signer=acct.signer,
            app_id=app_client.app_id,
            method=abi.Method.from_signature("add_tick(uint64,uint64)void"),
            args=[r, k],
            box_references=[b"reserves", tick_box, *TOKEN_BOXES],
            static_fee=AlgoAmount(micro_algo=2_000),
        )
    )
    group.send({"max_rounds_to_wait": 10})
    return dep


def _read_on_chain_state(alg, app_client, asset_ids):
    """Read all relevant on-chain state."""
    state = app_client.get_global_state()
    reserves_raw = app_client.get_box_value(b"reserves")
    reserves = [int.from_bytes(reserves_raw[i : i + 8], "big") for i in range(0, len(reserves_raw), 8)]

    fees_raw = app_client.get_box_value(b"fees")
    fees = [int.from_bytes(fees_raw[i : i + 8], "big") for i in range(0, len(fees_raw), 8)]

    balances = []
    for asset_id in asset_ids:
        info = alg.client.algod.account_asset_info(app_client.app_address, asset_id)
        balances.append(info["asset-holding"]["amount"])

    return state, reserves, fees, balances


# ── Test 1: Single-tick swap ──────────────────────────────────────────


def test_localnet_single_tick_swap_matches_math_simulator() -> None:
    alg = AlgorandClient.default_localnet()
    acct = alg.account.localnet_dispenser()
    app_client, asset_ids = _setup_pool(alg, acct)

    # Set fee to 0 for clean invariant testing
    app_client.send.call(
        AppClientMethodCallParams(method="set_fee", args=[0]),
        send_params={"max_rounds_to_wait": 10},
    )

    dep = _add_tick(alg, acct, app_client, asset_ids, R, K)

    trade = solve_single_segment_swap(
        AMOUNT_IN, 0, 1, [Q] * N,
        [Tick(tick_id=0, r=R, k=K, state=TickState.INTERIOR)], n=N,
    )

    swap_group = alg.send.new_group()
    swap_group.add_asset_transfer(
        AssetTransferParams(
            sender=acct.address, signer=acct.signer,
            asset_id=asset_ids[0], amount=AMOUNT_IN,
            receiver=app_client.app_address,
        )
    )
    swap_group.add_app_call_method_call(
        AppCallMethodCallParams(
            sender=acct.address, signer=acct.signer,
            app_id=app_client.app_id,
            method=abi.Method.from_signature("swap(uint64,uint64,uint64,uint64,uint64)void"),
            args=[0, 1, AMOUNT_IN, trade.amount_out, trade.amount_out],
            box_references=[b"reserves", b"fees", TOKEN_BOXES[0], TOKEN_BOXES[1]],
            asset_references=[asset_ids[1]],
            static_fee=AlgoAmount(micro_algo=2_000),
        )
    )
    swap_group.send({"cover_app_call_inner_transaction_fees": True, "max_rounds_to_wait": 10})

    state, reserves, fees, balances = _read_on_chain_state(alg, app_client, asset_ids)

    # ▸ On-chain aggregates match off-chain simulator exactly
    assert state["sum_x"].value == trade.new_sum_x
    assert state["sum_x_sq"].value == trade.new_sum_x_sq
    assert state["virtual_offset"].value == X_MIN
    assert state["registered_tokens"].value == N

    # ▸ Reserves box matches expected
    assert reserves[0] == dep + AMOUNT_IN
    assert reserves[1] == dep - trade.amount_out

    # ▸ ASA balances match reserves (no extra tokens leaked)
    assert balances[0] == reserves[0]
    assert balances[1] == reserves[1]


# ── Test 2: Swap with fees ────────────────────────────────────────────


def test_localnet_fee_accounting_matches_simulator() -> None:
    alg = AlgorandClient.default_localnet()
    acct = alg.account.localnet_dispenser()
    app_client, asset_ids = _setup_pool(alg, acct)

    # Set fee to 30 bps (0.30%)
    app_client.send.call(
        AppClientMethodCallParams(method="set_fee", args=[30]),
        send_params={"max_rounds_to_wait": 10},
    )

    dep = _add_tick(alg, acct, app_client, asset_ids, R, K)

    amount_in = 500_000
    fee = (amount_in * 30) // 10_000
    effective_in = amount_in - fee

    trade = solve_single_segment_swap(
        effective_in, 0, 1, [Q] * N,
        [Tick(tick_id=0, r=R, k=K, state=TickState.INTERIOR)], n=N,
    )

    swap_group = alg.send.new_group()
    swap_group.add_asset_transfer(
        AssetTransferParams(
            sender=acct.address, signer=acct.signer,
            asset_id=asset_ids[0], amount=amount_in,
            receiver=app_client.app_address,
        )
    )
    swap_group.add_app_call_method_call(
        AppCallMethodCallParams(
            sender=acct.address, signer=acct.signer,
            app_id=app_client.app_id,
            method=abi.Method.from_signature("swap(uint64,uint64,uint64,uint64,uint64)void"),
            args=[0, 1, amount_in, trade.amount_out, trade.amount_out],
            box_references=[b"reserves", b"fees", TOKEN_BOXES[0], TOKEN_BOXES[1]],
            asset_references=[asset_ids[1]],
            static_fee=AlgoAmount(micro_algo=2_000),
        )
    )
    swap_group.send({"cover_app_call_inner_transaction_fees": True, "max_rounds_to_wait": 10})

    state, reserves, fees, balances = _read_on_chain_state(alg, app_client, asset_ids)

    # ▸ Reserves reflect effective_in (fee excluded from pool reserves)
    assert reserves[0] == dep + effective_in
    assert reserves[1] == dep - trade.amount_out

    # ▸ Fee box accumulated the fee for token 0
    assert fees[0] == fee
    assert fees[1] == 0

    # ▸ ASA balance = reserves + fees (fee stays in contract)
    assert balances[0] == reserves[0] + fees[0]
    assert balances[1] == reserves[1]


# ── Test 3: Swap round-trip on-chain ──────────────────────────────────


def test_localnet_round_trip_swap() -> None:
    alg = AlgorandClient.default_localnet()
    acct = alg.account.localnet_dispenser()
    app_client, asset_ids = _setup_pool(alg, acct)

    # Use wider tick for larger reserves
    k_wide = k_from_depeg_price(500_000_000, R, N)

    app_client.send.call(
        AppClientMethodCallParams(method="set_fee", args=[0]),
        send_params={"max_rounds_to_wait": 10},
    )

    dep_wide = _add_tick(alg, acct, app_client, asset_ids, R, k_wide)

    # Math reserves = actual + virtual_offset; for single tick at equal price:
    # actual = dep_wide, offset = x_min, so math = dep_wide + x_min = q
    import math as pymath
    precision = 1_000_000_000
    q_chain = R - (R * precision) // SQRT_N
    math_reserves = [q_chain] * N

    tick_py = Tick(tick_id=0, r=R, k=k_wide, state=TickState.INTERIOR)
    amount_in = 100_000_000  # 20% of reserves — enough for measurable price impact

    # A → B
    trade1 = solve_single_segment_swap(amount_in, 0, 1, math_reserves, [tick_py], n=N)

    g1 = alg.send.new_group()
    g1.add_asset_transfer(
        AssetTransferParams(
            sender=acct.address, signer=acct.signer,
            asset_id=asset_ids[0], amount=amount_in,
            receiver=app_client.app_address,
        )
    )
    g1.add_app_call_method_call(
        AppCallMethodCallParams(
            sender=acct.address, signer=acct.signer,
            app_id=app_client.app_id,
            method=abi.Method.from_signature("swap(uint64,uint64,uint64,uint64,uint64)void"),
            args=[0, 1, amount_in, trade1.amount_out, trade1.amount_out],
            box_references=[b"reserves", b"fees", TOKEN_BOXES[0], TOKEN_BOXES[1]],
            asset_references=[asset_ids[1]],
            static_fee=AlgoAmount(micro_algo=2_000),
        )
    )
    g1.send({"cover_app_call_inner_transaction_fees": True, "max_rounds_to_wait": 10})

    # B → A
    trade2 = solve_single_segment_swap(
        trade1.amount_out, 1, 0, list(trade1.new_reserves), [tick_py], n=N
    )

    g2 = alg.send.new_group()
    g2.add_asset_transfer(
        AssetTransferParams(
            sender=acct.address, signer=acct.signer,
            asset_id=asset_ids[1], amount=trade1.amount_out,
            receiver=app_client.app_address,
        )
    )
    g2.add_app_call_method_call(
        AppCallMethodCallParams(
            sender=acct.address, signer=acct.signer,
            app_id=app_client.app_id,
            method=abi.Method.from_signature("swap(uint64,uint64,uint64,uint64,uint64)void"),
            args=[1, 0, trade1.amount_out, trade2.amount_out, trade2.amount_out],
            box_references=[b"reserves", b"fees", TOKEN_BOXES[0], TOKEN_BOXES[1]],
            asset_references=[asset_ids[0]],
            static_fee=AlgoAmount(micro_algo=2_000),
        )
    )
    g2.send({"cover_app_call_inner_transaction_fees": True, "max_rounds_to_wait": 10})

    state, reserves, _, _ = _read_on_chain_state(alg, app_client, asset_ids)

    # ▸ On-chain state matches simulator after round-trip
    assert state["sum_x"].value == trade2.new_sum_x
    assert state["sum_x_sq"].value == trade2.new_sum_x_sq

    # ▸ Round-trip loses to price impact
    assert trade2.amount_out < amount_in
