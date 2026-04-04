from orbital_math import PRECISION, TOLERANCE, Tick, TickState, consolidate_ticks, equal_price_point, k_from_depeg_price, torus_residual, verify_torus


def test_torus_residual_is_near_zero_for_valid_consolidated_equal_state() -> None:
    n = 5
    ticks = [
        Tick(tick_id=0, r=100 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 100 * PRECISION, n), state=TickState.INTERIOR),
        Tick(tick_id=1, r=60 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 60 * PRECISION, n), state=TickState.INTERIOR),
    ]
    consolidated = consolidate_ticks(ticks, n)
    reserves = [equal_price_point(consolidated.r_int, n)] * n
    sum_x = sum(reserves)
    sum_x_sq = sum(value * value for value in reserves)

    residual = torus_residual(sum_x, sum_x_sq, n, consolidated.r_int, consolidated.s_bound, consolidated.k_bound)
    assert abs(residual) <= TOLERANCE
    assert verify_torus(sum_x, sum_x_sq, n, consolidated.r_int, consolidated.s_bound, consolidated.k_bound)


def test_perturbed_state_is_rejected_by_torus_verifier() -> None:
    n = 5
    ticks = [
        Tick(tick_id=0, r=100 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 100 * PRECISION, n), state=TickState.INTERIOR),
        Tick(tick_id=1, r=60 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 60 * PRECISION, n), state=TickState.INTERIOR),
    ]
    consolidated = consolidate_ticks(ticks, n)
    reserves = [equal_price_point(consolidated.r_int, n)] * n
    reserves[0] += PRECISION
    sum_x = sum(reserves)
    sum_x_sq = sum(value * value for value in reserves)

    assert abs(torus_residual(sum_x, sum_x_sq, n, consolidated.r_int, consolidated.s_bound, consolidated.k_bound)) > TOLERANCE
    assert not verify_torus(sum_x, sum_x_sq, n, consolidated.r_int, consolidated.s_bound, consolidated.k_bound)


def test_default_verifier_accepts_the_equal_state_that_regressed_before() -> None:
    n = 5
    ticks = [
        Tick(tick_id=0, r=100 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 100 * PRECISION, n), state=TickState.INTERIOR),
        Tick(tick_id=1, r=60 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 60 * PRECISION, n), state=TickState.INTERIOR),
    ]
    consolidated = consolidate_ticks(ticks, n)
    reserves = [equal_price_point(consolidated.r_int, n)] * n

    assert verify_torus(
        sum(reserves),
        sum(value * value for value in reserves),
        n,
        consolidated.r_int,
        consolidated.s_bound,
        consolidated.k_bound,
    )
