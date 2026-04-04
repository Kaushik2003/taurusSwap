from orbital_math import PRECISION, polar_decompose, w_norm_sq


def test_polar_decomposition_keeps_integer_orthogonal_component_exact() -> None:
    reserves = [90 * PRECISION, 70 * PRECISION, 40 * PRECISION, 60 * PRECISION]
    alpha, w_components, norm_sq = polar_decompose(reserves)

    assert alpha > 0
    assert sum(w_components) == 0
    assert sum(component * component for component in w_components) == (len(reserves) ** 2) * norm_sq


def test_variance_form_matches_explicit_decomposition_norm() -> None:
    reserves = [84 * PRECISION, 72 * PRECISION, 61 * PRECISION, 39 * PRECISION, 55 * PRECISION]
    _, w_components, norm_sq = polar_decompose(reserves)

    explicit = sum(component * component for component in w_components) // (len(reserves) ** 2)
    assert norm_sq == w_norm_sq(reserves)
    assert explicit == norm_sq
