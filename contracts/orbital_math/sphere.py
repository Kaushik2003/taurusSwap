"""Sphere AMM formulas for the Orbital simulator."""

from __future__ import annotations

from collections.abc import Sequence

from .constants import PRECISION, ROOT_PRECISION
from .fixed_point import mul_div_round, normalized_square, sqrt_n_root_scaled


def _equal_point_residual(candidate: int, r: int, n: int) -> int:
    return (n * normalized_square(r - candidate)) - normalized_square(r)


def _equal_point_torus_residual(candidate: int, r: int, n: int, sqrt_n_value: int) -> int:
    alpha_value = mul_div_round(n * candidate, ROOT_PRECISION, sqrt_n_value)
    center_projection = mul_div_round(r, sqrt_n_value, ROOT_PRECISION)
    return normalized_square(r) - normalized_square(alpha_value - center_projection)


def equal_price_point(r: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    base = r - mul_div_round(r, ROOT_PRECISION, sqrt_n_value)
    best = base
    best_key = (
        abs(_equal_point_torus_residual(base, r, n, sqrt_n_value)),
        abs(_equal_point_residual(base, r, n)),
    )
    for candidate in range(base - 3, base + 4):
        if candidate < 0 or candidate > r:
            continue
        candidate_key = (
            abs(_equal_point_torus_residual(candidate, r, n, sqrt_n_value)),
            abs(_equal_point_residual(candidate, r, n)),
        )
        if candidate_key < best_key:
            best = candidate
            best_key = candidate_key
    return best


def sphere_residual(reserves: Sequence[int], r: int) -> int:
    return sum(normalized_square(r - reserve) for reserve in reserves) - normalized_square(r)


def spot_price(reserves: Sequence[int], r: int, token_in_idx: int, token_out_idx: int) -> int:
    numerator = r - reserves[token_in_idx]
    denominator = r - reserves[token_out_idx]
    if denominator <= 0:
        raise ValueError("spot price denominator must be positive")
    return mul_div_round(numerator, PRECISION, denominator)
