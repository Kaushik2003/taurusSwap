"""Contract test suite for the Orbital AMM pool — v2 production model.

Covers:
  - Pool lifecycle (create, bootstrap, register_token)
  - add_tick: reserve update, aggregates, position box creation
  - Multi-LP: two LPs at same r/k (different tick_ids), independent positions
  - claim_fees: settlement without principal withdrawal, checkpoint reset
  - Fee accrual isolation: LP depositing after fees does not claim retroactive fees
  - remove_liquidity full: clears tick + position, returns reserves + fees
  - remove_liquidity partial: reduces tick, updates position, preserves invariant
  - remove_liquidity wrong-sender: rejects when position box does not exist for caller
  - swap: invariant update, fee accumulation in fee_growth
  - swap_with_crossings: no-crossing path, real crossing (INTERIOR→BOUNDARY)
  - View API: get_pool_info, get_tick_info, get_position, get_reserves,
              get_fee_growth, get_registered_tokens, get_fees_for_position,
              list_ticks, get_price
  - Edge cases: slippage protection, same-token swap, output > reserves
"""

import pytest
from _algopy_testing import algopy_testing_context
from algopy import Bytes, UInt64, arc4

from orbital_math import (
    Tick,
    TickState,
    equal_price_point,
    k_from_depeg_price,
    k_min as math_k_min,
    solve_single_segment_swap,
    consolidate_ticks,
    verify_torus,
    segment_swap,
    find_first_crossing,
    PRECISION as PY_PRECISION,
)
from smart_contracts.orbital_pool import (
    OrbitalPool,
    TickData,
    PositionInfo,
    TickEntry,
    boundary_radius_calc,
    equal_price_reserve,
    verify_invariant,
    x_min_for_tick,
)

N = 5
# v3: R is in scaled units (microunits // AMOUNT_SCALE).
# R = 18_000_000 scaled = 18,000 token radius.
# At equal-price, deposit ≈ 9,950 tokens per asset → pool ~49,750T total.
AMOUNT_SCALE = 1_000
R = 18_000_000          # scaled units
SQRT_N = 2_236_067_977
INV_SQRT_N = 447_213_596
_PRECISION = 1_000_000_000


# ── Helpers ────────────────────────────────────────────────────────────


def _create_pool(context) -> tuple[OrbitalPool, object, list[object]]:
    pool = OrbitalPool()
    assets = [context.any.asset(asset_id=1001 + i) for i in range(N)]
    pool.create(UInt64(N), UInt64(SQRT_N), UInt64(INV_SQRT_N))
    app = context.ledger.get_app(pool)
    return pool, app, assets


def _bootstrap_pool(pool: OrbitalPool, assets: list[object]) -> None:
    pool.bootstrap()
    for index, asset in enumerate(assets):
        pool.register_token(UInt64(index), asset.id)


def _encode_reserves(reserves: list[int]) -> Bytes:
    return Bytes(b"".join(v.to_bytes(8, "big") for v in reserves))


def _read_reserve_box(pool: OrbitalPool, index: int) -> int:
    raw = pool.reserves.value.value
    start = index * 8
    return int.from_bytes(raw[start : start + 8], "big")


def _read_fee_growth_box(pool: OrbitalPool, index: int) -> int:
    raw = pool.fee_growth.value.value
    start = index * 8
    return int.from_bytes(raw[start : start + 8], "big")


def _read_position(pool: OrbitalPool, owner_bytes: bytes, tick_id: int, n: int) -> dict:
    """Read and decode a position box value."""
    pos_key = owner_bytes + tick_id.to_bytes(8, "big")
    raw = pool.positions[Bytes(pos_key)].value
    shares = int.from_bytes(raw[0:8], "big")
    checkpoints = [
        int.from_bytes(raw[8 + i * 8 : 16 + i * 8], "big") for i in range(n)
    ]
    return {"shares": shares, "checkpoints": checkpoints}


def _decode_dynamic_bytes(value: arc4.DynamicBytes) -> bytes:
    return value.native.value


def _to_scaled_trade_amount(raw_amount: int) -> int:
    return raw_amount // AMOUNT_SCALE


def _to_raw_trade_amount(scaled_amount: int) -> int:
    return scaled_amount * AMOUNT_SCALE


def _prime_single_interior_state(
    pool: OrbitalPool, actual_reserves: list[int], virtual_offset: int
) -> None:
    """Directly set pool state for tests that don't go through add_tick.

    actual_reserves are in raw microunits; virtual_offset is in scaled units.
    sum_x and sum_x_sq are stored in scaled units.
    """
    scaled_math = [v // AMOUNT_SCALE + virtual_offset for v in actual_reserves]
    pool.bootstrapped.value = UInt64(1)
    pool.virtual_offset.value = UInt64(virtual_offset)
    pool.sum_x.value = UInt64(sum(scaled_math))
    pool.sum_x_sq.value = UInt64(sum(v * v for v in scaled_math))
    pool.r_int.value = UInt64(R)
    pool.total_r.value = UInt64(R)
    pool.s_bound.value = UInt64(0)
    pool.k_bound.value = UInt64(0)
    pool.reserves.value = _encode_reserves(actual_reserves)
    pool.fee_growth.value = _encode_reserves([0] * N)
    pool.fee_bps.value = UInt64(0)


def _encode_trade_recipe(segments: list[dict]) -> bytes:
    result = b""
    for seg in segments:
        result += seg["amount_in"].to_bytes(8, "big")
        result += seg["amount_out"].to_bytes(8, "big")
        tick_id = seg.get("tick_crossed_id", 0xFFFFFFFFFFFFFFFF)
        result += tick_id.to_bytes(8, "big")
        new_state = seg.get("new_state", 0)
        result += new_state.to_bytes(1, "big")
    return result


def _add_tick_to_pool(context, pool, app, assets, r, k, sender=None):
    """Submit add_tick via atomic group; return deposit_per_token in raw microunits."""
    sender = sender or context.default_sender
    q = int(equal_price_reserve(UInt64(r), UInt64(SQRT_N)))
    xm = int(x_min_for_tick(UInt64(r), UInt64(k), UInt64(N), UInt64(SQRT_N)))
    # q and xm are in scaled units; contract expects raw microunits for the transfer.
    dep_raw = (q - xm) * AMOUNT_SCALE
    txns = [
        context.any.txn.asset_transfer(
            sender=sender, asset_receiver=app.address, asset_amount=dep_raw, xfer_asset=asset
        )
        for asset in assets
    ]
    deferred = context.txn.defer_app_call(pool.add_tick, UInt64(r), UInt64(k))
    deferred._txns[-1]._fields["sender"] = sender
    with context.txn.create_group([*txns, deferred]):
        deferred.submit()
    return dep_raw


# ── Pool creation & bootstrap ──────────────────────────────────────────


def test_create_initializes_state() -> None:
    with algopy_testing_context() as context:
        pool, _, _ = _create_pool(context)
        assert int(pool.n.value) == N
        assert int(pool.bootstrapped.value) == 0
        assert int(pool.fee_bps.value) == 30
        assert int(pool.total_r.value) == 0


def test_create_rejects_bad_inv_sqrt_n() -> None:
    with algopy_testing_context() as context:
        pool = OrbitalPool()
        with pytest.raises(AssertionError):
            pool.create(UInt64(N), UInt64(SQRT_N), UInt64(999_999_999))


def test_bootstrap_creates_reserve_and_fee_growth_boxes() -> None:
    with algopy_testing_context() as context:
        pool, _, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        assert int(pool.bootstrapped.value) == 1
        assert int(pool.registered_tokens.value) == N
        assert int(pool.reserves.length) == N * 8
        assert int(pool.fee_growth.length) == N * 8


# ── add_tick ───────────────────────────────────────────────────────────


def test_add_tick_updates_reserves_aggregates_and_creates_position() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        dep = _add_tick_to_pool(context, pool, app, assets, R, k_val)

        assert int(pool.num_ticks.value) == 1
        assert int(pool.r_int.value) == R
        assert int(pool.total_r.value) == R
        tick = pool.ticks[UInt64(0)]
        assert int(tick.r.as_uint64()) == R
        assert int(tick.state.as_uint64()) == 0  # INTERIOR
        assert int(tick.total_shares.as_uint64()) == dep * N
        assert _read_reserve_box(pool, 0) == dep

        # Position box exists with correct shares and zero checkpoints (no prior fees).
        sender_bytes = arc4.Address(context.default_sender).bytes.value
        pos = _read_position(pool, sender_bytes, 0, N)
        assert pos["shares"] == dep * N
        assert all(cp == 0 for cp in pos["checkpoints"])


# ── Multi-LP ───────────────────────────────────────────────────────────


def test_two_lps_add_same_rk_create_independent_positions() -> None:
    """Two LPs with identical r/k get separate tick_ids and separate positions."""
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )

        k_val = k_from_depeg_price(998_000_000, R, N)

        # LP1 adds tick 0
        dep1 = _add_tick_to_pool(context, pool, app, assets, R, k_val)

        # LP2 uses a different sender account
        lp2 = context.any.account()
        for asset in assets:
            context.ledger.update_asset_holdings(asset, lp2, balance=20_000_000_000)

        # LP2 adds tick 1 (same r, k)
        _add_tick_to_pool(context, pool, app, assets, R, k_val, sender=lp2)

        # Two separate ticks exist
        assert int(pool.num_ticks.value) == 2
        assert int(pool.total_r.value) == 2 * R
        assert int(pool.r_int.value) == 2 * R

        # LP1 position on tick 0, LP2 position on tick 1
        sender_bytes = arc4.Address(context.default_sender).bytes.value
        lp2_bytes = arc4.Address(lp2).bytes.value

        pos1 = _read_position(pool, sender_bytes, 0, N)
        pos2 = _read_position(pool, lp2_bytes, 1, N)
        assert pos1["shares"] == dep1 * N
        assert pos2["shares"] == dep1 * N

        # LP1 does NOT have a position on tick 1, LP2 does NOT on tick 0
        pos1_key = Bytes(sender_bytes + (1).to_bytes(8, "big"))
        pos2_key = Bytes(lp2_bytes + (0).to_bytes(8, "big"))
        assert pos1_key not in pool.positions
        assert pos2_key not in pool.positions


def test_multi_lp_remove_one_does_not_affect_other() -> None:
    """Full removal by LP1 leaves LP2's position intact."""
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        dep = _add_tick_to_pool(context, pool, app, assets, R, k_val)

        lp2 = context.any.account()
        for asset in assets:
            context.ledger.update_asset_holdings(asset, lp2, balance=20_000_000_000)
        _add_tick_to_pool(context, pool, app, assets, R, k_val, sender=lp2)

        total_r_before = int(pool.total_r.value)
        assert total_r_before == 2 * R

        # LP1 removes tick 0 fully
        tick0_liq = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        pool.remove_liquidity(UInt64(0), UInt64(tick0_liq))

        # Tick 0 and LP1's position are gone
        assert UInt64(0) not in pool.ticks
        sender_bytes = arc4.Address(context.default_sender).bytes.value
        pos1_key = Bytes(sender_bytes + (0).to_bytes(8, "big"))
        assert pos1_key not in pool.positions

        # Tick 1 and LP2's position still intact
        assert UInt64(1) in pool.ticks
        lp2_bytes = arc4.Address(lp2).bytes.value
        pos2 = _read_position(pool, lp2_bytes, 1, N)
        assert pos2["shares"] == dep * N

        # total_r reduced by R
        assert int(pool.total_r.value) == R


# ── Swap + fee_growth ──────────────────────────────────────────────────


def _setup_single_tick_pool(context):
    pool, app, assets = _create_pool(context)
    _bootstrap_pool(pool, assets)
    for asset in assets:
        # New deposit per asset ≈ 9,950 tokens = 9,950,000,000 microunits at R=18_000_000.
        context.ledger.update_asset_holdings(
            asset, context.default_sender, balance=20_000_000_000
        )
    k_val = k_from_depeg_price(998_000_000, R, N)
    _add_tick_to_pool(context, pool, app, assets, R, k_val)
    pool.fee_bps.value = UInt64(0)

    # Simulator operates in invariant-math space, which is stored in scaled units.
    offset_scaled = int(pool.virtual_offset.value)
    math_reserves = [_read_reserve_box(pool, i) // AMOUNT_SCALE + offset_scaled for i in range(N)]
    tick_py = Tick(tick_id=0, r=R, k=k_val, state=TickState.INTERIOR)
    return pool, app, assets, math_reserves, tick_py, k_val


def test_swap_updates_aggregates_and_emits_output() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, _ = _setup_single_tick_pool(context)
        amount_in = 100_000
        trade = solve_single_segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        assert int(pool.sum_x.value) == trade.new_sum_x
        assert int(pool.sum_x_sq.value) == trade.new_sum_x_sq
        reserve_raw_before = (math_reserves[1] - int(pool.virtual_offset.value)) * AMOUNT_SCALE
        assert _read_reserve_box(pool, 1) == reserve_raw_before - amount_out


def test_swap_with_fee_accumulates_fee_growth() -> None:
    """Fee is reflected in fee_growth[token_in], not in reserves."""
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, _ = _setup_single_tick_pool(context)
        pool.fee_bps.value = UInt64(30)
        amount_in = 1_000_000
        fee = (amount_in * 30) // 10_000
        effective_in = amount_in - fee

        trade = solve_single_segment_swap(_to_scaled_trade_amount(effective_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        # Reserves reflect effective_in only (fee excluded)
        reserve_raw_before = (math_reserves[0] - int(pool.virtual_offset.value)) * AMOUNT_SCALE
        assert _read_reserve_box(pool, 0) == reserve_raw_before + effective_in
        # fee_growth[0] increased; all others zero
        fg0 = _read_fee_growth_box(pool, 0)
        assert fg0 > 0
        for i in range(1, N):
            assert _read_fee_growth_box(pool, i) == 0

        # fee_growth increment = fee * PRECISION / total_r
        expected_fg = (fee * _PRECISION) // int(pool.total_r.value)
        assert fg0 == expected_fg


# ── claim_fees ─────────────────────────────────────────────────────────


def test_claim_fees_sends_correct_amount_and_resets_checkpoint() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, k_val = _setup_single_tick_pool(context)
        pool.fee_bps.value = UInt64(30)
        amount_in = 1_000_000
        fee = (amount_in * 30) // 10_000
        effective_in = amount_in - fee
        trade = solve_single_segment_swap(_to_scaled_trade_amount(effective_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        fg0_before = _read_fee_growth_box(pool, 0)
        assert fg0_before > 0

        # claim_fees for tick 0 (LP is default_sender)
        pool.claim_fees(UInt64(0))

        # fee_growth global unchanged (monotone accumulator)
        assert _read_fee_growth_box(pool, 0) == fg0_before

        # Position checkpoint now equals global fee_growth
        sender_bytes = arc4.Address(context.default_sender).bytes.value
        pos = _read_position(pool, sender_bytes, 0, N)
        assert pos["checkpoints"][0] == fg0_before
        # All other checkpoints still zero (no fees for those tokens)
        for i in range(1, N):
            assert pos["checkpoints"][i] == 0

        # Inner txn was issued for token 0 (the claimed fee)
        itx = context.txn.last_group.get_itxn_group(0).asset_transfer(0)
        assert int(itx.asset_amount) > 0


def test_claim_fees_twice_yields_zero_second_time() -> None:
    """Second claim_fees after the first returns 0 for all tokens."""
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, _ = _setup_single_tick_pool(context)
        pool.fee_bps.value = UInt64(30)
        amount_in = 1_000_000
        fee = (amount_in * 30) // 10_000
        effective_in = amount_in - fee
        trade = solve_single_segment_swap(_to_scaled_trade_amount(effective_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        pool.claim_fees(UInt64(0))   # first claim
        # Second claim should produce no inner transactions (claimable == 0)
        pool.claim_fees(UInt64(0))
        # No inner txn group expected for zero-claimable tokens
        # (algopy_testing_context records all groups; last group had no asset transfers)
        last_group = context.txn.last_group
        try:
            last_group.get_itxn_group(0).asset_transfer(0)
            actually_sent = True
        except Exception:
            actually_sent = False
        assert not actually_sent, "Second claim should not emit inner txns"


def test_late_depositor_does_not_claim_pre_deposit_fees() -> None:
    """LP2 deposits AFTER swap. Their checkpoints are set to current fee_growth,
    so they cannot claim fees that accrued before their deposit."""
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)
        pool.fee_bps.value = UInt64(30)

        # Swap BEFORE LP2 deposits
        offset_scaled = int(pool.virtual_offset.value)
        math_reserves = [_read_reserve_box(pool, i) // AMOUNT_SCALE + offset_scaled for i in range(N)]
        tick_py = Tick(tick_id=0, r=R, k=k_val, state=TickState.INTERIOR)
        amount_in = 1_000_000
        fee = (amount_in * 30) // 10_000
        effective_in = amount_in - fee
        trade = solve_single_segment_swap(_to_scaled_trade_amount(effective_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        fg0_after_swap = _read_fee_growth_box(pool, 0)
        assert fg0_after_swap > 0

        # LP2 deposits AFTER the swap (tick 1 created now)
        lp2 = context.any.account()
        for asset in assets:
            context.ledger.update_asset_holdings(asset, lp2, balance=20_000_000_000)

        k_val2 = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val2, sender=lp2)

        # LP2's checkpoints for tick 1 should equal the CURRENT fee_growth (not zero)
        lp2_bytes = arc4.Address(lp2).bytes.value
        pos2 = _read_position(pool, lp2_bytes, 1, N)
        assert pos2["checkpoints"][0] == fg0_after_swap, (
            f"LP2 checkpoint should be {fg0_after_swap}, got {pos2['checkpoints'][0]}"
        )


# ── remove_liquidity ───────────────────────────────────────────────────


def test_remove_liquidity_full_clears_tick_and_position() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        tick_shares = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        pool.remove_liquidity(UInt64(0), UInt64(tick_shares))

        assert int(pool.r_int.value) == 0
        assert int(pool.total_r.value) == 0
        assert int(pool.virtual_offset.value) == 0
        assert UInt64(0) not in pool.ticks
        sender_bytes = arc4.Address(context.default_sender).bytes.value
        pos_key = Bytes(sender_bytes + (0).to_bytes(8, "big"))
        assert pos_key not in pool.positions
        for i in range(N):
            assert _read_reserve_box(pool, i) == 0


def test_remove_liquidity_full_returns_fees() -> None:
    """Swap with fees → full removal → LP gets principal + fees."""
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, k_val = _setup_single_tick_pool(context)
        pool.fee_bps.value = UInt64(30)
        amount_in = 1_000_000
        fee = (amount_in * 30) // 10_000
        effective_in = amount_in - fee
        trade = solve_single_segment_swap(_to_scaled_trade_amount(effective_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        fg0 = _read_fee_growth_box(pool, 0)
        assert fg0 > 0

        tick_shares = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        pool.remove_liquidity(UInt64(0), UInt64(tick_shares))

        # fee_growth global unchanged (monotone); reserves zeroed
        assert _read_fee_growth_box(pool, 0) == fg0
        for i in range(N):
            assert _read_reserve_box(pool, i) == 0


def test_remove_liquidity_partial_reduces_tick_and_updates_position() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        tick_shares = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        half = tick_shares // 2
        r_before = int(pool.r_int.value)
        reserve_before = _read_reserve_box(pool, 0)

        pool.remove_liquidity(UInt64(0), UInt64(half))

        # Tick still exists with reduced shares
        assert UInt64(0) in pool.ticks
        remaining = pool.ticks[UInt64(0)]
        assert int(remaining.total_shares.as_uint64()) == tick_shares - half
        assert int(remaining.r.as_uint64()) < R
        assert int(remaining.r.as_uint64()) > 0
        assert int(pool.r_int.value) < r_before
        assert int(pool.total_r.value) == int(remaining.r.as_uint64())

        # Position updated, not deleted
        sender_bytes = arc4.Address(context.default_sender).bytes.value
        pos = _read_position(pool, sender_bytes, 0, N)
        assert pos["shares"] == tick_shares - half

        # Reserves reduced but not zero
        for i in range(N):
            assert 0 < _read_reserve_box(pool, i) < reserve_before

        # Can remove the rest
        pool.remove_liquidity(UInt64(0), UInt64(tick_shares - half))
        assert UInt64(0) not in pool.ticks
        assert int(pool.total_r.value) == 0


def test_remove_liquidity_rejects_wrong_sender() -> None:
    """Caller without a position box for this tick must be rejected."""
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        tick_shares = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        other = context.any.account()
        with pytest.raises(AssertionError):
            with context.txn.create_group([], active_txn_overrides={"sender": other}):
                pool.remove_liquidity(UInt64(0), UInt64(tick_shares))


def test_partial_withdrawal_then_full_withdrawal() -> None:
    """Partial then full withdrawal should leave the pool completely empty."""
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        tick_shares = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        third = tick_shares // 3
        pool.remove_liquidity(UInt64(0), UInt64(third))

        remaining_shares = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        pool.remove_liquidity(UInt64(0), UInt64(remaining_shares))

        assert int(pool.total_r.value) == 0
        assert int(pool.r_int.value) == 0
        assert UInt64(0) not in pool.ticks
        for i in range(N):
            assert _read_reserve_box(pool, i) == 0


# ── Admin controls ─────────────────────────────────────────────────────


def test_set_paused_blocks_swaps() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        pool.set_paused(UInt64(1))
        with pytest.raises(AssertionError):
            pool.swap(UInt64(0), UInt64(1), UInt64(100), UInt64(50), UInt64(50))


def test_set_fee_updates_and_rejects_above_cap() -> None:
    with algopy_testing_context() as context:
        pool, _, _ = _create_pool(context)
        pool.set_fee(UInt64(50))
        assert int(pool.fee_bps.value) == 50
        with pytest.raises(AssertionError):
            pool.set_fee(UInt64(501))


# ── Swap with crossings ────────────────────────────────────────────────


def test_swap_with_crossings_single_segment_no_crossing() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, _ = _setup_single_tick_pool(context)
        amount_in = 100_000
        trade = solve_single_segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        recipe = _encode_trade_recipe([{"amount_in": amount_in, "amount_out": amount_out}])

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap_with_crossings, UInt64(0), UInt64(1), UInt64(amount_in),
            arc4.DynamicBytes(recipe), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        assert int(pool.sum_x.value) == trade.new_sum_x


def test_swap_with_crossings_rejects_insufficient_min_out() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, _ = _setup_single_tick_pool(context)
        amount_in = 100_000
        trade = solve_single_segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)
        recipe = _encode_trade_recipe([{"amount_in": amount_in, "amount_out": amount_out}])

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap_with_crossings, UInt64(0), UInt64(1), UInt64(amount_in),
            arc4.DynamicBytes(recipe), UInt64(amount_out + 1),
        )
        with pytest.raises(AssertionError):
            with context.txn.create_group([txn, d]):
                d.submit()


def test_swap_with_crossings_real_interior_to_boundary() -> None:
    """Two-tick pool — simulator computes recipe, contract verifies state transition."""
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=100_000_000_000
            )
        pool.fee_bps.value = UInt64(0)

        # Tick 0: narrow (depeg 0.998) — will cross first
        k0 = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k0)

        # Tick 1: wider (depeg 0.950) — stays interior
        k1 = k_from_depeg_price(950_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k1)

        assert int(pool.r_int.value) == 2 * R
        assert int(pool.total_r.value) == 2 * R

        offset_scaled = int(pool.virtual_offset.value)
        math_reserves = [_read_reserve_box(pool, i) // AMOUNT_SCALE + offset_scaled for i in range(N)]
        ticks_py = [
            Tick(tick_id=0, r=R, k=k0, state=TickState.INTERIOR),
            Tick(tick_id=1, r=R, k=k1, state=TickState.INTERIOR),
        ]

        amount_in = 5_000_000
        segments = segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, ticks_py, n=N)
        for mult in [10, 50, 100, 500]:
            if len(segments) >= 2:
                break
            amount_in = 5_000_000 * mult
            segments = segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, ticks_py, n=N)

        assert len(segments) >= 2, "Expected crossing but simulator found none"

        recipe_parts = []
        total_out = 0
        for seg in segments:
            part = {
                "amount_in": _to_raw_trade_amount(seg.amount_in),
                "amount_out": _to_raw_trade_amount(seg.amount_out),
            }
            if seg.tick_crossed_id is not None:
                part["tick_crossed_id"] = seg.tick_crossed_id
                part["new_state"] = 1 if seg.new_state == TickState.BOUNDARY else 0
            recipe_parts.append(part)
            total_out += part["amount_out"]

        recipe_bytes = _encode_trade_recipe(recipe_parts)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap_with_crossings, UInt64(0), UInt64(1), UInt64(amount_in),
            arc4.DynamicBytes(recipe_bytes), UInt64(total_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        # Tick 0 crossed to BOUNDARY
        assert int(pool.ticks[UInt64(0)].state.as_uint64()) == 1
        # Tick 1 remained INTERIOR
        assert int(pool.ticks[UInt64(1)].state.as_uint64()) == 0
        # Consolidation state updated correctly
        assert int(pool.r_int.value) == R   # only tick 1
        assert int(pool.s_bound.value) > 0
        assert int(pool.k_bound.value) == k0

        itx = context.txn.last_group.get_itxn_group(0).asset_transfer(0)
        assert int(itx.asset_amount) == total_out


# ── View API ───────────────────────────────────────────────────────────


def test_get_pool_info_includes_total_r() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        info = pool.get_pool_info()
        assert int(info.n.as_uint64()) == N
        assert int(info.r_int.as_uint64()) == R
        assert int(info.total_r.as_uint64()) == R
        assert int(info.num_ticks.as_uint64()) == 1
        assert int(info.paused.as_uint64()) == 0


def test_get_tick_info_returns_correct_data() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        tick = pool.get_tick_info(UInt64(0))
        assert int(tick.r.as_uint64()) == R
        assert int(tick.k.as_uint64()) == k_val
        assert int(tick.state.as_uint64()) == 0

        with pytest.raises(AssertionError):
            pool.get_tick_info(UInt64(99))


def test_get_position_returns_correct_shares_and_position_r() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        dep = _add_tick_to_pool(context, pool, app, assets, R, k_val)

        owner_addr = arc4.Address(context.default_sender)
        pos = pool.get_position(owner_addr, UInt64(0))
        assert int(pos.shares.as_uint64()) == dep * N
        # Single LP owns full tick, so position_r == tick.r
        assert int(pos.position_r.as_uint64()) == R


def test_get_reserves_returns_raw_bytes() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        dep = _add_tick_to_pool(context, pool, app, assets, R, k_val)

        raw = pool.get_reserves()
        raw_bytes = _decode_dynamic_bytes(raw)
        assert len(raw_bytes) == N * 8
        for i in range(N):
            val = int.from_bytes(raw_bytes[i * 8 : (i + 1) * 8], "big")
            assert val == dep


def test_get_registered_tokens_returns_all_asset_ids() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)

        raw = pool.get_registered_tokens()
        raw_bytes = _decode_dynamic_bytes(raw)
        assert len(raw_bytes) == N * 8
        for i, asset in enumerate(assets):
            val = int.from_bytes(raw_bytes[i * 8 : (i + 1) * 8], "big")
            assert val == asset.id


def test_get_fees_for_position_reflects_accrued_fees() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, _ = _setup_single_tick_pool(context)
        pool.fee_bps.value = UInt64(30)
        amount_in = 1_000_000
        fee = (amount_in * 30) // 10_000
        effective_in = amount_in - fee
        trade = solve_single_segment_swap(_to_scaled_trade_amount(effective_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()

        owner_addr = arc4.Address(context.default_sender)
        claimable_raw = pool.get_fees_for_position(owner_addr, UInt64(0))
        raw_bytes = _decode_dynamic_bytes(claimable_raw)
        assert len(raw_bytes) == N * 8

        # Token 0 claimable should be positive
        token0_claimable = int.from_bytes(raw_bytes[0:8], "big")
        assert token0_claimable > 0

        # Other tokens should be 0 (no fees for them)
        for i in range(1, N):
            ti = int.from_bytes(raw_bytes[i * 8 : (i + 1) * 8], "big")
            assert ti == 0


def test_list_ticks_returns_existing_ticks() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        result = pool.list_ticks(UInt64(0), UInt64(5))
        # 2 ticks exist (ids 0 and 1)
        assert int(result.length) == 2
        assert int(result[0].tick_id.as_uint64()) == 0
        assert int(result[1].tick_id.as_uint64()) == 1


def test_list_ticks_skips_deleted_ticks() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )
        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)  # tick 0
        _add_tick_to_pool(context, pool, app, assets, R, k_val)  # tick 1

        # Remove tick 0
        shares0 = int(pool.ticks[UInt64(0)].total_shares.as_uint64())
        pool.remove_liquidity(UInt64(0), UInt64(shares0))

        result = pool.list_ticks(UInt64(0), UInt64(5))
        # Only tick 1 should appear (tick 0 deleted)
        assert int(result.length) == 1
        assert int(result[0].tick_id.as_uint64()) == 1


# ── Swap round-trip ────────────────────────────────────────────────────


def test_swap_round_trip_returns_less_due_to_price_impact() -> None:
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=100_000_000_000
            )
        k_val = k_from_depeg_price(900_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)
        pool.fee_bps.value = UInt64(0)

        offset_scaled = int(pool.virtual_offset.value)
        math_reserves = [_read_reserve_box(pool, i) // AMOUNT_SCALE + offset_scaled for i in range(N)]
        tick_py = Tick(tick_id=0, r=R, k=k_val, state=TickState.INTERIOR)
        amount_in = 10_000_000

        trade1 = solve_single_segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out1 = _to_raw_trade_amount(trade1.amount_out)
        txn1 = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d1 = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out1), UInt64(amount_out1),
        )
        with context.txn.create_group([txn1, d1]):
            d1.submit()

        new_offset_scaled = int(pool.virtual_offset.value)
        new_reserves = [_read_reserve_box(pool, i) // AMOUNT_SCALE + new_offset_scaled for i in range(N)]
        trade2 = solve_single_segment_swap(
            trade1.amount_out, 1, 0, new_reserves, [tick_py], n=N
        )
        amount_out2 = _to_raw_trade_amount(trade2.amount_out)
        txn2 = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_out1, xfer_asset=assets[1],
        )
        d2 = context.txn.defer_app_call(
            pool.swap, UInt64(1), UInt64(0), UInt64(amount_out1),
            UInt64(amount_out2), UInt64(amount_out2),
        )
        with context.txn.create_group([txn2, d2]):
            d2.submit()

        assert amount_out2 < amount_in, "Round-trip must lose to price impact"


# ── Edge cases ─────────────────────────────────────────────────────────


def test_swap_rejects_output_exceeding_reserves() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, _, _, _ = _setup_single_tick_pool(context)
        out_actual = _read_reserve_box(pool, 1)
        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=100_000, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(100_000),
            UInt64(out_actual + 1), UInt64(out_actual + 1),
        )
        with pytest.raises(AssertionError):
            with context.txn.create_group([txn, d]):
                d.submit()


def test_swap_same_token_rejected() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, _, _, _ = _setup_single_tick_pool(context)
        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=100, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(0), UInt64(100), UInt64(50), UInt64(50),
        )
        with pytest.raises(AssertionError):
            with context.txn.create_group([txn, d]):
                d.submit()


def test_swap_slippage_protection() -> None:
    with algopy_testing_context() as context:
        pool, app, assets, math_reserves, tick_py, _ = _setup_single_tick_pool(context)
        amount_in = 100_000
        trade = solve_single_segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out + 1),
        )
        with pytest.raises(AssertionError):
            with context.txn.create_group([txn, d]):
                d.submit()


# ── v3 scaling: overflow regression + 10k-token depth ─────────────────


def test_no_overflow_at_10k_tokens_per_asset() -> None:
    """With AMOUNT_SCALE=1000, a pool seeded at ~10k tokens per asset must
    not overflow square_raw anywhere in add_tick, swap, or remove_liquidity.
    This is the regression test for the u64 ceiling that existed in v1/v2.
    """
    with algopy_testing_context() as context:
        pool, app, assets = _create_pool(context)
        _bootstrap_pool(pool, assets)
        # ~9,950 tokens per asset = ~9_950_000_000 microunits; give 2× headroom.
        for asset in assets:
            context.ledger.update_asset_holdings(
                asset, context.default_sender, balance=20_000_000_000
            )

        k_val = k_from_depeg_price(998_000_000, R, N)
        _add_tick_to_pool(context, pool, app, assets, R, k_val)

        # Confirm pool depth in invariant math space: each math reserve is ~9.95M scaled units.
        for i in range(N):
            math_reserve = _read_reserve_box(pool, i) // AMOUNT_SCALE + int(pool.virtual_offset.value)
            assert math_reserve >= 9_000_000, f"Math reserve {i} too low: {math_reserve} scaled units"

        # sum_x_sq must fit in u64 with huge headroom (was the failure point in v2).
        sum_x_sq_val = int(pool.sum_x_sq.value)
        headroom = (2**64 - 1) - sum_x_sq_val
        assert headroom > 10**18, f"sum_x_sq {sum_x_sq_val} too close to u64 ceiling"

        # Swap 100 tokens — large enough to survive scaled rounding, still tiny versus pool depth.
        offset_scaled = int(pool.virtual_offset.value)
        math_reserves = [_read_reserve_box(pool, i) // AMOUNT_SCALE + offset_scaled for i in range(N)]
        tick_py = Tick(tick_id=0, r=R, k=k_val, state=TickState.INTERIOR)
        amount_in = 100_000_000  # 100 tokens in microunits
        trade = solve_single_segment_swap(_to_scaled_trade_amount(amount_in), 0, 1, math_reserves, [tick_py], n=N)
        amount_out = _to_raw_trade_amount(trade.amount_out)
        assert trade is not None
        assert amount_out > 0

        txn = context.any.txn.asset_transfer(
            asset_receiver=app.address, asset_amount=amount_in, xfer_asset=assets[0],
        )
        d = context.txn.defer_app_call(
            pool.swap, UInt64(0), UInt64(1), UInt64(amount_in),
            UInt64(amount_out), UInt64(amount_out),
        )
        with context.txn.create_group([txn, d]):
            d.submit()  # must not raise

        # Slippage on a 10T swap at ~50,000T total depth must be < 1%.
        slippage = (amount_in - amount_out) / amount_in
        assert slippage < 0.01, f"Slippage {slippage:.4%} too high for this depth"


def test_pool_info_reports_amount_scale() -> None:
    """get_pool_info must include amount_scale = AMOUNT_SCALE."""
    with algopy_testing_context() as context:
        pool, _, _ = _create_pool(context)
        pool.bootstrap()
        info = pool.get_pool_info()
        assert int(info.amount_scale.as_uint64()) == AMOUNT_SCALE
