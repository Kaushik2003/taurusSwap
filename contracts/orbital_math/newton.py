"""Single-segment trade solving for the Orbital simulator."""

from __future__ import annotations

from collections.abc import Sequence

from .constants import DERIVATIVE_EPS, MAX_BISECTION_STEPS, MAX_BRACKET_SAMPLES, MAX_NEWTON_ITERS, TOLERANCE
from .consolidation import consolidate_ticks
from .fixed_point import clamp, div_round, sum_x as total_reserves, sum_x_sq as total_reserve_squares
from .models import Tick, TradeResult
from .torus import _boundary_sum_target, torus_residual, verify_torus


def _sign(value: int) -> int:
    if value > 0:
        return 1
    if value < 0:
        return -1
    return 0


def _build_trade_result(
    reserve_list: tuple[int, ...],
    amount_in: int,
    amount_out: int,
    token_in_idx: int,
    token_out_idx: int,
    sum_before: int,
    sum_sq_before: int,
    n: int,
    r_int: int,
    s_bound: int,
    k_bound: int,
) -> TradeResult:
    old_in = reserve_list[token_in_idx]
    old_out = reserve_list[token_out_idx]
    if amount_out < 0 or amount_out > old_out:
        raise ValueError("amount_out must stay within the available reserves")

    new_out = old_out - amount_out
    new_reserves = list(reserve_list)
    new_reserves[token_in_idx] = old_in + amount_in
    new_reserves[token_out_idx] = new_out
    new_sum = sum_before + amount_in - amount_out
    new_sum_sq = (
        sum_sq_before
        + (new_reserves[token_in_idx] * new_reserves[token_in_idx])
        - (old_in * old_in)
        + (new_out * new_out)
        - (old_out * old_out)
    )
    residual = torus_residual(new_sum, new_sum_sq, n, r_int, s_bound, k_bound)
    return TradeResult(
        amount_out=amount_out,
        new_reserves=tuple(new_reserves),
        new_sum_x=new_sum,
        new_sum_x_sq=new_sum_sq,
        residual=residual,
    )


def _validate_start_state(
    reserve_list: tuple[int, ...],
    n: int,
    r_int: int,
    s_bound: int,
    k_bound: int,
) -> None:
    if not verify_torus(total_reserves(reserve_list), total_reserve_squares(reserve_list), n, r_int, s_bound, k_bound):
        raise ValueError("starting state does not satisfy the active invariant")


def _boundary_only_swap(
    reserve_list: tuple[int, ...],
    amount_in: int,
    token_in_idx: int,
    token_out_idx: int,
    n: int,
    s_bound: int,
    k_bound: int,
) -> TradeResult:
    sum_before = total_reserves(reserve_list)
    sum_sq_before = total_reserve_squares(reserve_list)
    old_out = reserve_list[token_out_idx]
    best_result: TradeResult | None = None
    best_score: tuple[int, int, int, int] | None = None
    seen: set[int] = set()

    base_amount_out = amount_in + sum_before - _boundary_sum_target(k_bound, n)
    sum_target = _boundary_sum_target(k_bound, n)
    for candidate in (base_amount_out - 1, base_amount_out, base_amount_out + 1):
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate < 0 or candidate > old_out:
            continue
        result = _build_trade_result(
            reserve_list,
            amount_in,
            candidate,
            token_in_idx,
            token_out_idx,
            sum_before,
            sum_sq_before,
            n,
            0,
            s_bound,
            k_bound,
        )
        if verify_torus(result.new_sum_x, result.new_sum_x_sq, n, 0, s_bound, k_bound):
            plane_error = abs(result.new_sum_x - sum_target)
            score = (plane_error, abs(result.residual), abs(candidate - base_amount_out), candidate)
            if best_score is None or score < best_score:
                best_score = score
                best_result = result

    if best_result is None:
        raise ValueError("boundary-only solver could not identify a verifier-valid output")
    return best_result


def _find_bracket(
    build_result: callable,
    old_out: int,
    guess: int,
) -> tuple[TradeResult, TradeResult] | None:
    sample_points = {0, old_out, clamp(guess, 0, old_out)}
    if old_out > 0:
        step = max(1, old_out // MAX_BRACKET_SAMPLES)
        for index in range(MAX_BRACKET_SAMPLES + 1):
            sample_points.add(min(old_out, index * step))

    sample_results = sorted((build_result(amount_out) for amount_out in sample_points), key=lambda result: result.amount_out)
    for result in sample_results:
        if abs(result.residual) <= TOLERANCE:
            return result, result

    for left, right in zip(sample_results, sample_results[1:]):
        if _sign(left.residual) != _sign(right.residual):
            return left, right
    return None


def _numerical_derivative(build_result: callable, current: TradeResult, old_out: int) -> int:
    forward_amount = min(old_out, current.amount_out + DERIVATIVE_EPS)
    backward_amount = max(0, current.amount_out - DERIVATIVE_EPS)

    if forward_amount != current.amount_out and backward_amount != current.amount_out:
        forward = build_result(forward_amount)
        backward = build_result(backward_amount)
        return div_round(forward.residual - backward.residual, forward_amount - backward_amount)
    if forward_amount != current.amount_out:
        forward = build_result(forward_amount)
        return div_round(forward.residual - current.residual, forward_amount - current.amount_out)
    if backward_amount != current.amount_out:
        backward = build_result(backward_amount)
        return div_round(current.residual - backward.residual, current.amount_out - backward_amount)
    return 0


def solve_single_segment_swap(
    amount_in: int,
    token_in_idx: int,
    token_out_idx: int,
    reserves: Sequence[int],
    ticks: Sequence[Tick],
    *,
    n: int | None = None,
) -> TradeResult:
    if amount_in < 0:
        raise ValueError("amount_in must be non-negative")
    if token_in_idx == token_out_idx:
        raise ValueError("token indices must be different")

    reserve_list = tuple(reserves)
    n = n or len(reserve_list)
    consolidated = consolidate_ticks(ticks, n)
    sum_before = total_reserves(reserve_list)
    sum_sq_before = total_reserve_squares(reserve_list)
    old_in = reserve_list[token_in_idx]
    old_out = reserve_list[token_out_idx]

    _validate_start_state(reserve_list, n, consolidated.r_int, consolidated.s_bound, consolidated.k_bound)

    def build_result(amount_out: int) -> TradeResult:
        return _build_trade_result(
            reserve_list,
            amount_in,
            amount_out,
            token_in_idx,
            token_out_idx,
            sum_before,
            sum_sq_before,
            n,
            consolidated.r_int,
            consolidated.s_bound,
            consolidated.k_bound,
        )

    if amount_in == 0:
        result = build_result(0)
        if abs(result.residual) > TOLERANCE:
            raise ValueError("zero-input trade does not preserve the active invariant")
        return result

    if consolidated.r_int == 0:
        return _boundary_only_swap(
            reserve_list,
            amount_in,
            token_in_idx,
            token_out_idx,
            n,
            consolidated.s_bound,
            consolidated.k_bound,
        )

    price_numerator = max(1, consolidated.r_int - old_in)
    price_denominator = max(1, consolidated.r_int - old_out)
    guess = clamp(div_round(amount_in * price_numerator, price_denominator), 0, old_out)
    bracket = _find_bracket(build_result, old_out, guess)
    if bracket is None:
        raise ValueError("could not bracket an invariant-preserving output amount")

    low_result, high_result = bracket
    if low_result.amount_out == high_result.amount_out:
        return low_result

    current_amount = clamp(guess, low_result.amount_out, high_result.amount_out)
    if current_amount in (low_result.amount_out, high_result.amount_out):
        current_amount = (low_result.amount_out + high_result.amount_out) // 2
    current = build_result(current_amount)

    for _ in range(MAX_NEWTON_ITERS + MAX_BISECTION_STEPS):
        if abs(current.residual) <= TOLERANCE:
            return current
        if _sign(current.residual) == _sign(low_result.residual):
            low_result = current
        else:
            high_result = current

        if high_result.amount_out - low_result.amount_out <= 1:
            break

        derivative = _numerical_derivative(build_result, current, old_out)
        if derivative == 0:
            candidate = (low_result.amount_out + high_result.amount_out) // 2
        else:
            candidate = current.amount_out - div_round(current.residual, derivative)
            if candidate <= low_result.amount_out or candidate >= high_result.amount_out:
                candidate = (low_result.amount_out + high_result.amount_out) // 2

        if candidate == current.amount_out:
            candidate = (low_result.amount_out + high_result.amount_out) // 2
        current = build_result(candidate)

    for candidate in (low_result, high_result):
        if abs(candidate.residual) <= TOLERANCE:
            return candidate

    while high_result.amount_out - low_result.amount_out > 1:
        mid = (low_result.amount_out + high_result.amount_out) // 2
        mid_result = build_result(mid)
        if abs(mid_result.residual) <= TOLERANCE:
            return mid_result
        if _sign(mid_result.residual) == _sign(low_result.residual):
            low_result = mid_result
        else:
            high_result = mid_result

    for candidate in (low_result, high_result):
        if abs(candidate.residual) <= TOLERANCE:
            return candidate
    raise ValueError("solver did not converge to a verifier-valid output within tolerance")
