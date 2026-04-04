"""Datamodels for the Orbital reference simulator."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class TickState(str, Enum):
    INTERIOR = "interior"
    BOUNDARY = "boundary"


@dataclass(frozen=True)
class Tick:
    tick_id: int
    r: int
    k: int
    state: TickState
    liquidity: int = 0


@dataclass(frozen=True)
class ConsolidatedState:
    r_int: int
    s_bound: int
    k_bound: int


@dataclass(frozen=True)
class TradeSegment:
    amount_in: int
    amount_out: int
    tick_crossed_id: int | None = None
    new_state: TickState | None = None


@dataclass(frozen=True)
class TradeResult:
    amount_out: int
    new_reserves: tuple[int, ...]
    new_sum_x: int
    new_sum_x_sq: int
    residual: int
