"""Polar reserve decomposition helpers."""

from __future__ import annotations

from collections.abc import Sequence

from .constants import ROOT_PRECISION
from .fixed_point import div_round, mul_div_round, sqrt_n_root_scaled


def alpha_total(sum_of_reserves: int, n: int, inv_sqrt_n_value: int | None = None) -> int:
    if inv_sqrt_n_value is not None:
        return mul_div_round(sum_of_reserves, inv_sqrt_n_value, ROOT_PRECISION)
    return mul_div_round(sum_of_reserves, ROOT_PRECISION, sqrt_n_root_scaled(n))


def w_norm_sq_from_sums(sum_of_reserves: int, sum_of_squares: int, n: int) -> int:
    variance_term = div_round(sum_of_reserves * sum_of_reserves, n)
    return max(0, sum_of_squares - variance_term)


def w_norm_sq(reserves: Sequence[int]) -> int:
    return w_norm_sq_from_sums(sum(reserves), sum(value * value for value in reserves), len(reserves))


def polar_decompose(reserves: Sequence[int]) -> tuple[int, tuple[int, ...], int]:
    n = len(reserves)
    sum_of_reserves = sum(reserves)
    alpha = alpha_total(sum_of_reserves, n)
    # Keep the orthogonal component exact by storing it in n-scaled units.
    w_components = tuple((n * reserve) - sum_of_reserves for reserve in reserves)
    return alpha, w_components, w_norm_sq(reserves)
