import pytest

from orbital_math import PRECISION, TOLERANCE, capital_efficiency, depeg_price_for_k, equal_price_point, k_from_depeg_price, k_max, k_min, x_max, x_min


def test_tick_bounds_match_manual_formulas() -> None:
    n = 5
    r = 100 * PRECISION
    k_lo = k_min(r, n)
    k_hi = k_max(r, n)

    assert k_lo < k_hi
    assert k_lo > 0


def test_reserve_bounds_stay_inside_valid_range() -> None:
    n = 5
    r = 100 * PRECISION
    k = (k_min(r, n) + k_max(r, n)) // 2
    q = equal_price_point(r, n)
    minimum = x_min(r, k, n)
    maximum = x_max(r, k, n)

    assert 0 <= minimum < q < maximum <= r


def test_k_min_collapses_to_equal_point_and_has_no_finite_efficiency() -> None:
    n = 5
    r = 100 * PRECISION
    q = equal_price_point(r, n)
    k = k_min(r, n)

    assert abs(x_min(r, k, n) - q) <= TOLERANCE
    assert abs(x_max(r, k, n) - q) <= TOLERANCE
    with pytest.raises(ValueError, match="zero-width"):
        capital_efficiency(r, k, n)


def test_k_max_reaches_the_full_range_extreme() -> None:
    n = 5
    r = 100 * PRECISION
    k = k_max(r, n)

    assert x_min(r, k, n) <= TOLERANCE
    assert abs(x_max(r, k, n) - r) <= TOLERANCE


def test_capital_efficiency_is_near_manual_number_for_099_depeg() -> None:
    n = 5
    r = 100 * PRECISION
    p_target = (99 * PRECISION) // 100
    k = k_from_depeg_price(p_target, r, n)
    efficiency = capital_efficiency(r, k, n)
    p_actual = depeg_price_for_k(r, k, n)

    assert abs(p_actual - p_target) <= 10
    assert 120 * PRECISION <= efficiency <= 180 * PRECISION


def test_k_from_depeg_price_round_trips_through_depeg_formula() -> None:
    n = 5
    r = 100 * PRECISION
    p_target = (99 * PRECISION) // 100
    k = k_from_depeg_price(p_target, r, n)

    assert abs(depeg_price_for_k(r, k, n) - p_target) <= 10
