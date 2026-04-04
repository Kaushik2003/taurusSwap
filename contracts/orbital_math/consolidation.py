"""Tick consolidation for the Orbital simulator."""

from __future__ import annotations

from collections.abc import Sequence

from .constants import ROOT_PRECISION
from .fixed_point import isqrt, mul_div_round, sqrt_n_root_scaled
from .models import ConsolidatedState, Tick, TickState


def _boundary_radius(tick: Tick, n: int, sqrt_n_value: int | None = None) -> int:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    offset = tick.k - mul_div_round(tick.r, sqrt_n_value, ROOT_PRECISION)
    return isqrt(max(0, (tick.r * tick.r) - (offset * offset)))


def consolidate_ticks(ticks: Sequence[Tick], n: int, sqrt_n_value: int | None = None) -> ConsolidatedState:
    sqrt_n_value = sqrt_n_value or sqrt_n_root_scaled(n)
    r_int = 0
    s_bound = 0
    k_bound = 0

    for tick in ticks:
        if tick.state == TickState.INTERIOR:
            r_int += tick.r
        else:
            s_bound += _boundary_radius(tick, n, sqrt_n_value)
            k_bound += tick.k

    return ConsolidatedState(r_int=r_int, s_bound=s_bound, k_bound=k_bound)
