import random

import pytest

from orbital_math import PRECISION, TOLERANCE, Tick, TickState, consolidate_ticks, equal_price_point, k_from_depeg_price, solve_single_segment_swap, verify_torus


def test_single_segment_swap_converges_and_updates_aggregates_in_o1() -> None:
    n = 5
    r = 100 * PRECISION
    tick = Tick(tick_id=0, r=r, k=k_from_depeg_price((995 * PRECISION) // 1000, r, n), state=TickState.INTERIOR)
    reserves = [equal_price_point(r, n)] * n
    amount_in = 2 * PRECISION

    result = solve_single_segment_swap(amount_in, 0, 1, reserves, [tick])
    consolidated = consolidate_ticks([tick], n)

    assert result.amount_out > 0
    assert result.new_reserves[0] == reserves[0] + amount_in
    assert result.new_reserves[1] == reserves[1] - result.amount_out
    assert abs(result.residual) <= TOLERANCE
    assert verify_torus(
        result.new_sum_x,
        result.new_sum_x_sq,
        n,
        consolidated.r_int,
        consolidated.s_bound,
        consolidated.k_bound,
    )

    recomputed_sum = sum(result.new_reserves)
    recomputed_sum_sq = sum(value * value for value in result.new_reserves)
    assert recomputed_sum == result.new_sum_x
    assert recomputed_sum_sq == result.new_sum_x_sq


def test_randomized_interior_swaps_stay_within_package_tolerance() -> None:
    n = 5
    rng = random.Random(7)

    for tick_id in range(20):
        r = rng.randint(50, 150) * PRECISION
        tick = Tick(
            tick_id=tick_id,
            r=r,
            k=k_from_depeg_price((995 * PRECISION) // 1000, r, n),
            state=TickState.INTERIOR,
        )
        reserves = [equal_price_point(r, n)] * n
        amount_in = rng.randint(1, 4) * PRECISION + rng.randint(0, PRECISION - 1)
        result = solve_single_segment_swap(amount_in, 0, 1, reserves, [tick])
        consolidated = consolidate_ticks([tick], n)

        assert abs(result.residual) <= TOLERANCE
        assert verify_torus(
            result.new_sum_x,
            result.new_sum_x_sq,
            n,
            consolidated.r_int,
            consolidated.s_bound,
            consolidated.k_bound,
        )
        assert sum(result.new_reserves) == result.new_sum_x
        assert sum(value * value for value in result.new_reserves) == result.new_sum_x_sq


def test_invalid_start_state_raises_instead_of_returning_a_near_root() -> None:
    n = 5
    r = 100 * PRECISION
    tick = Tick(tick_id=0, r=r, k=k_from_depeg_price((995 * PRECISION) // 1000, r, n), state=TickState.INTERIOR)
    reserves = [equal_price_point(r, n)] * n
    reserves[0] += PRECISION

    with pytest.raises(ValueError, match="starting state"):
        solve_single_segment_swap(PRECISION, 0, 1, reserves, [tick])


def test_boundary_only_solver_preserves_the_plane_and_invariant() -> None:
    n = 5
    r = 100 * PRECISION
    tick = Tick(tick_id=0, r=r, k=k_from_depeg_price((99 * PRECISION) // 100, r, n), state=TickState.BOUNDARY)
    reserves = [55_637_484_649, 55_189_378_403, 55_189_378_403, 55_189_378_403, 55_189_378_403]
    consolidated = consolidate_ticks([tick], n)

    assert verify_torus(
        sum(reserves),
        sum(value * value for value in reserves),
        n,
        consolidated.r_int,
        consolidated.s_bound,
        consolidated.k_bound,
    )

    result = solve_single_segment_swap(1_000, 0, 1, reserves, [tick])

    assert abs(result.residual) <= TOLERANCE
    assert abs(result.new_sum_x - sum(reserves)) <= 1
    assert verify_torus(
        result.new_sum_x,
        result.new_sum_x_sq,
        n,
        consolidated.r_int,
        consolidated.s_bound,
        consolidated.k_bound,
    )
