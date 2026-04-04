"""Tick geometry helpers for the Orbital simulator."""

from __future__ import annotations

from .constants import MAX_BISECTION_STEPS, PRECISION, ROOT_PRECISION
from .fixed_point import clamp, div_round, isqrt, mul_div_round, sqrt_n_root_scaled
from .sphere import equal_price_point


def k_min(r: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    return mul_div_round(equal_price_point(r, n, sqrt_n_value), sqrt_n_value, ROOT_PRECISION)


def k_max(r: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    return mul_div_round(r * (n - 1), ROOT_PRECISION, sqrt_n_value)


def _tick_discriminant(r: int, k: int, n: int, sqrt_n_value: int | None = None) -> tuple[int, int]:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    c = (n * r) - mul_div_round(k, sqrt_n_value, ROOT_PRECISION)
    discriminant = (n - 1) * ((n * r * r) - (c * c))
    if discriminant < 0:
        discriminant = 0
    return c, discriminant


def x_min(r: int, k: int, n: int, sqrt_n_value: int | None = None) -> int:
    c, discriminant = _tick_discriminant(r, k, n, sqrt_n_value)
    return clamp(r - div_round(c + isqrt(discriminant), n), 0, r)


def x_max(r: int, k: int, n: int, sqrt_n_value: int | None = None) -> int:
    c, discriminant = _tick_discriminant(r, k, n, sqrt_n_value)
    return clamp(r - div_round(c - isqrt(discriminant), n), 0, r)


def virtual_reserve(r: int, k: int, n: int, sqrt_n_value: int | None = None) -> int:
    return x_min(r, k, n, sqrt_n_value)


def actual_deposit_per_token(r: int, k: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    return equal_price_point(r, n, sqrt_n_value) - x_min(r, k, n, sqrt_n_value)


def capital_efficiency(r: int, k: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    q = equal_price_point(r, n, sqrt_n_value)
    deposit = q - x_min(r, k, n, sqrt_n_value)
    if deposit <= 0:
        raise ValueError("capital efficiency is undefined for zero-width ticks")
    return mul_div_round(q, PRECISION, deposit)


def depeg_price_for_k(r: int, k: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    depegged_reserve = x_max(r, k, n, sqrt_n_value)
    total_on_boundary = mul_div_round(k, sqrt_n_value, ROOT_PRECISION)
    other_reserve = div_round(total_on_boundary - depegged_reserve, n - 1)
    numerator = r - depegged_reserve
    denominator = r - other_reserve
    if denominator <= 0:
        raise ValueError("invalid reserve configuration for depeg price")
    return mul_div_round(numerator, PRECISION, denominator)


def k_from_depeg_price(p_target: int, r: int, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    lo = k_min(r, n, sqrt_n_value)
    hi = k_max(r, n, sqrt_n_value)
    best = lo
    best_diff = abs(depeg_price_for_k(r, lo, n, sqrt_n_value) - p_target)

    for _ in range(MAX_BISECTION_STEPS):
        if lo > hi:
            break
        mid = (lo + hi) // 2
        p_mid = depeg_price_for_k(r, mid, n, sqrt_n_value)
        diff = abs(p_mid - p_target)
        if diff < best_diff:
            best = mid
            best_diff = diff
        if p_mid > p_target:
            lo = mid + 1
        elif p_mid < p_target:
            hi = mid - 1
        else:
            return mid
    return best
