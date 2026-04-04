"""Torus invariant helpers for the Orbital simulator."""

from __future__ import annotations

from .constants import PRECISION, ROOT_PRECISION, TOLERANCE
from .fixed_point import div_round, isqrt, mul_div_round, normalized_square, sqrt_n_root_scaled
from .polar import alpha_total, w_norm_sq_from_sums


def _boundary_sum_target(k_bound: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    return mul_div_round(k_bound, sqrt_n_value, ROOT_PRECISION)


def _boundary_residual(
    sum_x: int,
    sum_x_sq: int,
    n: int,
    s_bound: int,
    k_bound: int,
    sqrt_n_value: int | None = None,
) -> int:
    sum_target = _boundary_sum_target(k_bound, n, sqrt_n_value)
    w_total_sq = w_norm_sq_from_sums(sum_x, sum_x_sq, n)
    norm_error = div_round(w_total_sq - (s_bound * s_bound), PRECISION)
    plane_error = sum_x - sum_target
    if abs(plane_error) <= 1:
        return norm_error
    return norm_error + plane_error


def torus_residual(
    sum_x: int,
    sum_x_sq: int,
    n: int,
    r_int: int,
    s_bound: int,
    k_bound: int,
    sqrt_n_value: int | None = None,
) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    if r_int == 0:
        return _boundary_residual(sum_x, sum_x_sq, n, s_bound, k_bound, sqrt_n_value)

    alpha_total_value = alpha_total(sum_x, n)
    alpha_int = alpha_total_value - k_bound
    w_total_norm = isqrt(w_norm_sq_from_sums(sum_x, sum_x_sq, n))
    w_int_norm = w_total_norm - s_bound
    r_int_sqrt_n = mul_div_round(r_int, sqrt_n_value, ROOT_PRECISION)
    diff_alpha = alpha_int - r_int_sqrt_n

    lhs = normalized_square(r_int)
    rhs = normalized_square(diff_alpha) + normalized_square(w_int_norm)
    return lhs - rhs


def verify_torus(
    sum_x: int,
    sum_x_sq: int,
    n: int,
    r_int: int,
    s_bound: int,
    k_bound: int,
    sqrt_n_value: int | None = None,
    tolerance: int = TOLERANCE,
) -> bool:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    if r_int == 0:
        sum_target = _boundary_sum_target(k_bound, n, sqrt_n_value)
        if abs(sum_x - sum_target) > 1:
            return False
    residual = torus_residual(sum_x, sum_x_sq, n, r_int, s_bound, k_bound, sqrt_n_value)
    return abs(residual) <= tolerance
