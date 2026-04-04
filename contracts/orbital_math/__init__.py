"""Public API for the Orbital Python math simulator."""

from .constants import MAX_NEWTON_ITERS, PRECISION, TOLERANCE
from .consolidation import consolidate_ticks
from .crossings import alpha_int_norm, find_first_crossing, segment_swap
from .models import ConsolidatedState, Tick, TickState, TradeResult, TradeSegment
from .newton import solve_single_segment_swap
from .polar import polar_decompose, w_norm_sq
from .sphere import equal_price_point, sphere_residual, spot_price
from .ticks import capital_efficiency, depeg_price_for_k, k_from_depeg_price, k_max, k_min, x_max, x_min
from .torus import torus_residual, verify_torus

__all__ = [
    "ConsolidatedState",
    "MAX_NEWTON_ITERS",
    "PRECISION",
    "TOLERANCE",
    "Tick",
    "TickState",
    "TradeResult",
    "TradeSegment",
    "alpha_int_norm",
    "capital_efficiency",
    "consolidate_ticks",
    "depeg_price_for_k",
    "equal_price_point",
    "find_first_crossing",
    "k_from_depeg_price",
    "k_max",
    "k_min",
    "polar_decompose",
    "segment_swap",
    "solve_single_segment_swap",
    "sphere_residual",
    "spot_price",
    "torus_residual",
    "verify_torus",
    "w_norm_sq",
    "x_max",
    "x_min",
]
