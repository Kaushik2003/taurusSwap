"""Tick crossing detection and segmentation for the Orbital simulator."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import replace

from .constants import MAX_BISECTION_STEPS, PRECISION
from .consolidation import consolidate_ticks
from .fixed_point import div_round
from .models import Tick, TickState, TradeSegment
from .newton import solve_single_segment_swap
from .polar import alpha_total
from .torus import verify_torus


def alpha_int_norm(reserves: Sequence[int], ticks: Sequence[Tick], *, n: int | None = None) -> int:
    reserve_list = tuple(reserves)
    n = n or len(reserve_list)
    consolidated = consolidate_ticks(ticks, n)
    if consolidated.r_int <= 0:
        return 0
    sum_x = sum(reserve_list)
    alpha_int = alpha_total(sum_x, n) - consolidated.k_bound
    return div_round(alpha_int * PRECISION, consolidated.r_int)


def _k_norm(tick: Tick) -> int:
    return div_round(tick.k * PRECISION, tick.r)


def _has_crossed(alpha_value: int, threshold: int, increasing: bool) -> bool:
    if increasing:
        return alpha_value >= threshold
    return alpha_value <= threshold


def find_first_crossing(
    amount_in: int,
    token_in_idx: int,
    token_out_idx: int,
    reserves: Sequence[int],
    ticks: Sequence[Tick],
    *,
    n: int | None = None,
) -> TradeSegment | None:
    reserve_list = tuple(reserves)
    n = n or len(reserve_list)
    if amount_in <= 0:
        return None

    consolidated = consolidate_ticks(ticks, n)
    if consolidated.r_int <= 0:
        return None

    start_alpha = alpha_int_norm(reserve_list, ticks, n=n)
    end_result = solve_single_segment_swap(amount_in, token_in_idx, token_out_idx, reserve_list, ticks, n=n)
    end_alpha = alpha_int_norm(end_result.new_reserves, ticks, n=n)

    candidate_tick: Tick | None = None
    new_state: TickState | None = None
    crossing_threshold = 0
    increasing = end_alpha > start_alpha

    if increasing:
        interior_candidates = [
            tick for tick in ticks if tick.state == TickState.INTERIOR and start_alpha < _k_norm(tick) <= end_alpha
        ]
        if not interior_candidates:
            return None
        candidate_tick = min(interior_candidates, key=_k_norm)
        new_state = TickState.BOUNDARY
        crossing_threshold = _k_norm(candidate_tick)
    elif end_alpha < start_alpha:
        boundary_candidates = [
            tick for tick in ticks if tick.state == TickState.BOUNDARY and end_alpha <= _k_norm(tick) < start_alpha
        ]
        if not boundary_candidates:
            return None
        candidate_tick = max(boundary_candidates, key=_k_norm)
        new_state = TickState.INTERIOR
        crossing_threshold = _k_norm(candidate_tick)
    else:
        return None

    low = 0
    high = amount_in

    for _ in range(MAX_BISECTION_STEPS):
        if high - low <= 1:
            break
        mid = (low + high) // 2
        mid_result = solve_single_segment_swap(mid, token_in_idx, token_out_idx, reserve_list, ticks, n=n)
        mid_alpha = alpha_int_norm(mid_result.new_reserves, ticks, n=n)
        crossed = _has_crossed(mid_alpha, crossing_threshold, increasing)
        if crossed:
            high = mid
        else:
            low = mid

    best_segment: TradeSegment | None = None
    best_distance: int | None = None
    updated_ticks = [
        replace(tick, state=new_state) if tick.tick_id == candidate_tick.tick_id else tick
        for tick in ticks
    ]
    updated_consolidated = consolidate_ticks(updated_ticks, n)
    for window in (1, 4, 16, 64, 256, 1024, 4096, 16384):
        start = max(1, high - window)
        end = min(amount_in, high + window)
        for candidate in range(start, end + 1):
            candidate_result = solve_single_segment_swap(candidate, token_in_idx, token_out_idx, reserve_list, ticks, n=n)
            candidate_alpha = alpha_int_norm(candidate_result.new_reserves, ticks, n=n)
            if not _has_crossed(candidate_alpha, crossing_threshold, increasing):
                continue
            if not verify_torus(
                candidate_result.new_sum_x,
                candidate_result.new_sum_x_sq,
                n,
                updated_consolidated.r_int,
                updated_consolidated.s_bound,
                updated_consolidated.k_bound,
            ):
                continue
            distance = abs(candidate_alpha - crossing_threshold)
            if best_distance is None or distance < best_distance or (
                distance == best_distance and candidate < (best_segment.amount_in if best_segment else candidate + 1)
            ):
                best_distance = distance
                best_segment = TradeSegment(
                    amount_in=candidate,
                    amount_out=candidate_result.amount_out,
                    tick_crossed_id=candidate_tick.tick_id,
                    new_state=new_state,
                )
        if best_segment is not None:
            break

    if best_segment is None:
        raise ValueError("trade crossed a tick but the solver could not land on the boundary")
    if best_distance is None or best_distance > 1:
        raise ValueError("trade crossing did not resolve to the claimed boundary within one normalized unit")

    return best_segment


def segment_swap(
    amount_in: int,
    token_in_idx: int,
    token_out_idx: int,
    reserves: Sequence[int],
    ticks: Sequence[Tick],
    *,
    n: int | None = None,
) -> list[TradeSegment]:
    reserve_list = tuple(reserves)
    n = n or len(reserve_list)
    remaining_input = amount_in
    current_reserves = reserve_list
    current_ticks = list(ticks)
    segments: list[TradeSegment] = []

    for _ in range((2 * len(current_ticks)) + 2):
        if remaining_input <= 0:
            break

        crossing = find_first_crossing(
            remaining_input,
            token_in_idx,
            token_out_idx,
            current_reserves,
            current_ticks,
            n=n,
        )
        if crossing is None:
            final_result = solve_single_segment_swap(
                remaining_input,
                token_in_idx,
                token_out_idx,
                current_reserves,
                current_ticks,
                n=n,
            )
            segments.append(TradeSegment(amount_in=remaining_input, amount_out=final_result.amount_out))
            return segments

        if crossing.amount_in <= 0 or crossing.amount_in > remaining_input:
            raise ValueError("crossing search returned an invalid partial segment")

        partial_result = solve_single_segment_swap(
            crossing.amount_in,
            token_in_idx,
            token_out_idx,
            current_reserves,
            current_ticks,
            n=n,
        )
        segments.append(
            TradeSegment(
                amount_in=crossing.amount_in,
                amount_out=partial_result.amount_out,
                tick_crossed_id=crossing.tick_crossed_id,
                new_state=crossing.new_state,
            )
        )
        current_reserves = partial_result.new_reserves
        remaining_input -= crossing.amount_in

        current_ticks = [
            replace(tick, state=crossing.new_state)
            if tick.tick_id == crossing.tick_crossed_id
            else tick
            for tick in current_ticks
        ]

    raise ValueError("trade segmentation exceeded the expected number of segments")
