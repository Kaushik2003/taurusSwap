from orbital_math import PRECISION, ConsolidatedState, Tick, TickState, consolidate_ticks, equal_price_point, k_from_depeg_price


def test_consolidation_sums_interior_and_boundary_terms() -> None:
    n = 5
    r_a = 120 * PRECISION
    r_b = 80 * PRECISION
    k_boundary = k_from_depeg_price((99 * PRECISION) // 100, 60 * PRECISION, n)
    ticks = [
        Tick(tick_id=0, r=r_a, k=k_from_depeg_price((995 * PRECISION) // 1000, r_a, n), state=TickState.INTERIOR),
        Tick(tick_id=1, r=r_b, k=k_from_depeg_price((99 * PRECISION) // 100, r_b, n), state=TickState.INTERIOR),
        Tick(tick_id=2, r=60 * PRECISION, k=k_boundary, state=TickState.BOUNDARY),
    ]

    consolidated = consolidate_ticks(ticks, n)

    assert isinstance(consolidated, ConsolidatedState)
    assert consolidated.r_int == r_a + r_b
    assert consolidated.k_bound == k_boundary
    assert consolidated.s_bound > 0


def test_equal_price_reserves_of_multiple_interior_ticks_consolidate_cleanly() -> None:
    n = 5
    ticks = [
        Tick(tick_id=0, r=90 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 90 * PRECISION, n), state=TickState.INTERIOR),
        Tick(tick_id=1, r=60 * PRECISION, k=k_from_depeg_price((995 * PRECISION) // 1000, 60 * PRECISION, n), state=TickState.INTERIOR),
    ]
    consolidated = consolidate_ticks(ticks, n)
    reserves = [equal_price_point(consolidated.r_int, n)] * n

    assert consolidated.r_int == sum(tick.r for tick in ticks)
    assert all(reserve > 0 for reserve in reserves)
