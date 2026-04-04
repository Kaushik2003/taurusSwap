from orbital_math import PRECISION, TOLERANCE, equal_price_point, sphere_residual, spot_price


def test_equal_price_point_satisfies_sphere_invariant() -> None:
    n = 5
    r = 100 * PRECISION
    q = equal_price_point(r, n)
    reserves = [q] * n
    assert abs(sphere_residual(reserves, r)) <= TOLERANCE


def test_max_single_token_reserve_state_satisfies_sphere_invariant() -> None:
    n = 5
    r = 100 * PRECISION
    reserves = [0] + ([r] * (n - 1))
    assert sphere_residual(reserves, r) == 0


def test_equal_point_pairwise_pricing_is_one() -> None:
    n = 5
    r = 100 * PRECISION
    q = equal_price_point(r, n)
    reserves = [q] * n
    assert spot_price(reserves, r, 0, 1) == PRECISION
    assert spot_price(reserves, r, 3, 2) == PRECISION


def test_price_asymmetry_and_reciprocity() -> None:
    r = 100 * PRECISION
    reserves = [80 * PRECISION, 40 * PRECISION, 70 * PRECISION]
    low_to_high = spot_price(reserves, r, 1, 0)
    high_to_low = spot_price(reserves, r, 0, 1)

    assert low_to_high > PRECISION
    assert high_to_low < PRECISION
    assert abs(((low_to_high * high_to_low) // PRECISION) - PRECISION) <= 1
