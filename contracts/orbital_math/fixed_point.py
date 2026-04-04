"""Fixed-point helpers for the Orbital math simulator."""

from __future__ import annotations

from math import isqrt as math_isqrt

from .constants import PRECISION, ROOT_PRECISION


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


def isqrt(value: int) -> int:
    if value < 0:
        raise ValueError("square root is undefined for negative integers")
    return math_isqrt(value)


def div_round(numerator: int, denominator: int) -> int:
    if denominator == 0:
        raise ZeroDivisionError("denominator must be non-zero")
    if numerator >= 0:
        return (numerator + (denominator // 2)) // denominator
    return -(((-numerator) + (denominator // 2)) // denominator)


def mul_div(a: int, b: int, denominator: int) -> int:
    if denominator == 0:
        raise ZeroDivisionError("denominator must be non-zero")
    return (a * b) // denominator


def mul_div_round(a: int, b: int, denominator: int) -> int:
    return div_round(a * b, denominator)


def scaled_mul(a: int, b: int) -> int:
    return mul_div(a, b, PRECISION)


def scaled_div(a: int, b: int) -> int:
    if b == 0:
        raise ZeroDivisionError("denominator must be non-zero")
    return mul_div(a, PRECISION, b)


def normalized_square(value: int) -> int:
    return mul_div_round(value, value, PRECISION)


def sqrt_n_root_scaled(n: int) -> int:
    if n <= 0:
        raise ValueError("n must be positive")
    return isqrt(n * ROOT_PRECISION * ROOT_PRECISION)


def inv_sqrt_n_root_scaled(n: int) -> int:
    return mul_div_round(ROOT_PRECISION, ROOT_PRECISION, sqrt_n_root_scaled(n))


def sum_x(reserves: tuple[int, ...] | list[int]) -> int:
    return sum(reserves)


def sum_x_sq(reserves: tuple[int, ...] | list[int]) -> int:
    return sum(value * value for value in reserves)
