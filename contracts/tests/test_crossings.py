from dataclasses import replace

from orbital_math import PRECISION, Tick, TickState, consolidate_ticks, equal_price_point, find_first_crossing, k_min, segment_swap, solve_single_segment_swap, verify_torus
from orbital_math.crossings import alpha_int_norm


def _narrow_interior_tick(tick_id: int, r: int, n: int, extra: int) -> Tick:
    current_alpha_norm = (k_min(r, n) * PRECISION) // r
    k = ((current_alpha_norm + extra) * r) // PRECISION
    return Tick(tick_id=tick_id, r=r, k=k, state=TickState.INTERIOR)


def _apply_segment(
    segment,
    reserves: tuple[int, ...],
    ticks: list[Tick],
    n: int,
) -> tuple[tuple[int, ...], list[Tick]]:
    result = solve_single_segment_swap(segment.amount_in, 0, 1, reserves, ticks, n=n)
    updated_ticks = [
        replace(tick, state=segment.new_state)
        if segment.tick_crossed_id is not None and tick.tick_id == segment.tick_crossed_id
        else tick
        for tick in ticks
    ]
    return result.new_reserves, updated_ticks


def test_find_first_crossing_detects_first_narrow_interior_tick() -> None:
    n = 5
    ticks = [
        _narrow_interior_tick(0, 100 * PRECISION, n, 10_000),
        _narrow_interior_tick(1, 80 * PRECISION, n, 2_000_000),
    ]
    reserves = [equal_price_point(sum(tick.r for tick in ticks), n)] * n

    crossing = find_first_crossing(PRECISION, 0, 1, reserves, ticks)

    assert crossing is not None
    assert crossing.tick_crossed_id == 0
    assert crossing.new_state == TickState.BOUNDARY
    assert crossing.amount_in > 0
    assert crossing.amount_out > 0


def test_segment_swap_splits_trade_when_single_tick_crosses() -> None:
    n = 5
    ticks = [
        _narrow_interior_tick(0, 100 * PRECISION, n, 10_000),
        _narrow_interior_tick(1, 80 * PRECISION, n, 4_000_000),
    ]
    reserves = [equal_price_point(sum(tick.r for tick in ticks), n)] * n

    segments = segment_swap(PRECISION, 0, 1, reserves, ticks)

    assert len(segments) == 2
    assert segments[0].tick_crossed_id == 0
    assert segments[0].new_state == TickState.BOUNDARY
    assert segments[1].tick_crossed_id is None


def test_segment_swap_handles_multiple_tick_crossings() -> None:
    n = 5
    ticks = [
        _narrow_interior_tick(0, 100 * PRECISION, n, 10_000),
        _narrow_interior_tick(1, 80 * PRECISION, n, 20_000),
        _narrow_interior_tick(2, 60 * PRECISION, n, 3_000_000),
    ]
    reserves = [equal_price_point(sum(tick.r for tick in ticks), n)] * n

    segments = segment_swap(PRECISION, 0, 1, reserves, ticks)

    crossed_ids = [segment.tick_crossed_id for segment in segments if segment.tick_crossed_id is not None]
    assert crossed_ids == [0, 1]
    assert all(segment.amount_in > 0 and segment.amount_out >= 0 for segment in segments)

    current_reserves = tuple(reserves)
    current_ticks = list(ticks)
    for segment in segments:
        current_reserves, current_ticks = _apply_segment(segment, current_reserves, current_ticks, n)

    consolidated = consolidate_ticks(current_ticks, n)
    assert verify_torus(
        sum(current_reserves),
        sum(value * value for value in current_reserves),
        n,
        consolidated.r_int,
        consolidated.s_bound,
        consolidated.k_bound,
    )
    assert alpha_int_norm(current_reserves, current_ticks) >= alpha_int_norm(reserves, ticks)


def test_last_interior_crossing_can_continue_in_boundary_mode() -> None:
    n = 5
    ticks = [
        _narrow_interior_tick(0, 100 * PRECISION, n, 10_000),
        _narrow_interior_tick(1, 80 * PRECISION, n, 20_000),
        _narrow_interior_tick(2, 60 * PRECISION, n, 3_000_000),
    ]
    reserves = [equal_price_point(sum(tick.r for tick in ticks), n)] * n
    initial_segments = segment_swap(PRECISION, 0, 1, reserves, ticks)

    current_reserves = tuple(reserves)
    current_ticks = list(ticks)
    for segment in initial_segments[:2]:
        current_reserves, current_ticks = _apply_segment(segment, current_reserves, current_ticks, n)

    crossing = find_first_crossing(4 * PRECISION, 0, 1, current_reserves, current_ticks)
    assert crossing is not None
    assert crossing.tick_crossed_id == 2
    assert crossing.new_state == TickState.BOUNDARY

    total_amount_in = crossing.amount_in + 10
    segments = segment_swap(total_amount_in, 0, 1, current_reserves, current_ticks)

    assert len(segments) == 2
    assert segments[0].tick_crossed_id == 2
    assert segments[0].new_state == TickState.BOUNDARY
    assert segments[1].tick_crossed_id is None
    assert segments[1].amount_in == 10

    final_reserves = current_reserves
    final_ticks = current_ticks
    for segment in segments:
        final_reserves, final_ticks = _apply_segment(segment, final_reserves, final_ticks, n)

    consolidated = consolidate_ticks(final_ticks, n)
    assert consolidated.r_int == 0
    assert verify_torus(
        sum(final_reserves),
        sum(value * value for value in final_reserves),
        n,
        consolidated.r_int,
        consolidated.s_bound,
        consolidated.k_bound,
    )
