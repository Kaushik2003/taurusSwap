"""Orbital AMM pool contract — production v2.

Architecture: compute off-chain, verify on-chain.
The contract never solves the quartic trade equation.  It only verifies
that a proposed trade satisfies the torus invariant in O(1).

=== v2 production changes (BREAKING vs testnet demo) ===

A. Multi-LP position accounting
   - TickData.lp_address REMOVED.  Ownership lives in position boxes.
   - TickData.liquidity renamed to total_shares.
   - New BoxMap positions: key = "pos:" + owner_32bytes + tick_id_8bytes
     value = shares_8bytes + fee_growth_checkpoint_i_8bytes × n
   - Each add_tick call creates one position box for the caller.
   - Multiple LPs at the same r/k create separate tick_ids (no shared tick state).

B. Fee-growth checkpoint accounting
   - fees box REMOVED.  Replaced by fee_growth box (n × 8 bytes).
   - fee_growth[i] is a PRECISION-scaled monotone accumulator:
       fee_growth[i] += fee_charged[i] * PRECISION / total_r
   - Each position stores per-token checkpoints set at deposit time.
   - Claimable fee for position p: pos_r × (fee_growth[i] − checkpoint[i]) / PRECISION
   - Checkpoints reset on every claim or withdrawal → no double-claim, no race.

C. total_r global state
   - Tracks sum of r across ALL ticks (interior + boundary).
   - Enables O(1) pro-rata reserve and fee calculations.
   - Decremented atomically with position removal.

D. Production read API (all readonly=True)
   - get_pool_info()            — full pool snapshot incl. total_r
   - get_tick_info(tick_id)     — TickData for one tick
   - get_position(owner, tick_id) — shares + position_r
   - get_reserves()             — raw n×8 bytes of actual reserves
   - get_fee_growth()           — raw n×8 bytes of fee_growth accumulator
   - get_registered_tokens()    — raw n×8 bytes of ASA IDs
   - get_fees_for_position(owner, tick_id) — n×8 bytes claimable per token
   - list_ticks(start, limit)   — paginated TickEntry array
   - get_price(in, out)         — instantaneous spot price (interior-tick approx)

E. Standalone claim_fees(tick_id)
   - Settle fee without withdrawing principal.

=== BREAKING ABI CHANGES vs v1 ===
  - TickData: lp_address field removed (box shrinks 57 → 25 bytes).
  - fees box gone; fee_growth box present (same n×8 size, different semantics).
  - PoolInfo struct gains total_r field.
  - New global state key: total_r.
  - New BoxMap prefix: pos:
  - TypeScript bindings must be regenerated after `algokit project run build`.

=== v3 changes (BREAKING vs v2) ===
  _AMOUNT_SCALE = 1_000 introduced.  All invariant math (sum_x, sum_x_sq,
  virtual_offset, r, k, r_int, s_bound, k_bound) is now stored and computed
  in scaled units = raw_microunits // 1_000.  Actual ASA transfers and the
  reserves box remain in raw microunits.  r and k passed to add_tick must be
  in scaled units.  PoolInfo gains amount_scale field.

  This lifts the u64 square_raw ceiling from ~11,000 tokens total to
  ~11,000,000,000 tokens total — effectively unlimited for stablecoin use.
  Seeded at 50,000 tokens total (10,000/asset): ~0.1% slippage on 10T swaps.

=== Storage layout ===
  Global state (16 keys):
    n, bootstrapped, registered_tokens, sum_x, sum_x_sq,
    r_int, s_bound, k_bound, virtual_offset, num_ticks,
    sqrt_n, inv_sqrt_n, paused, fee_bps, creator, total_r.
  _AMOUNT_SCALE is a compile-time constant (1_000), not a state key.

  Boxes:
    reserves    (n×8 bytes) — actual per-token reserves in raw microunits.
    fee_growth  (n×8 bytes) — PRECISION-scaled accumulated fee per unit-r.
    token:{idx_be8} (8 bytes) — ASA ID for token at index idx.
    tick:{id_be8}   (25 bytes) — TickData (r,k,state,total_shares) in scaled units.
    pos:{owner_32}{tick_id_be8} (8 + n×8 bytes) — LP position.

=== Opcode budget guidance ===
  claim_fees / remove_liquidity iterate n times each for fee settling,
  reserve payout, and position-box rebuild.  For n=5 caller should group
  at least 2 budget() dummy calls ahead of the real call (total 2100 opcodes).
"""

from algopy import (
    ARC4Contract,
    Account,
    Asset,
    Bytes,
    Box,
    BoxMap,
    Global,
    GlobalState,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    op,
    subroutine,
    urange,
)

_PRECISION = 1_000_000_000
_TOLERANCE = 1_000
_CROSSING_TOLERANCE = 10_000
_SEGMENT_SIZE = 25  # bytes per encoded TradeSegment: 8+8+8+1
_NO_CROSSING = 18_446_744_073_709_551_615  # sentinel: no tick crossed
_FEE_DENOMINATOR = 10_000  # basis-point denominator
# ── Scaling constant ───────────────────────────────────────────────────────────
# Raw ASA balances and transfers remain in native microunits (6 decimals).
# Invariant math (sum_x, sum_x_sq, virtual_offset, r, k, r_int, s_bound,
# k_bound) is stored and computed in SCALED units = microunits / AMOUNT_SCALE.
# This moves math reserves from ~1e10 (10k tokens) down to ~1e7, keeping
# every square_raw() call safely within u64 (10e7^2 = 1e14 << 1.84e19).
# Callers must pass r and k to add_tick in scaled units.
# deposit_per_token returned / expected by the contract is in raw microunits.
_AMOUNT_SCALE = 1_000


# ── ARC-4 structs ──────────────────────────────────────────────────────


class TickData(arc4.Struct):
    """Aggregate state for one tick.

    BREAKING vs v1: lp_address removed; liquidity renamed total_shares.
    Ownership is tracked in per-LP position boxes, not embedded here.
    """

    r: arc4.UInt64
    k: arc4.UInt64
    state: arc4.UInt8       # 0 = INTERIOR, 1 = BOUNDARY
    total_shares: arc4.UInt64  # sum of shares across all LPs in this tick


class TickEntry(arc4.Struct):
    """Tick with its ID — used in list_ticks() return value."""

    tick_id: arc4.UInt64
    r: arc4.UInt64
    k: arc4.UInt64
    state: arc4.UInt8
    total_shares: arc4.UInt64


class PositionInfo(arc4.Struct):
    """Summary of one LP position — returned by get_position()."""

    shares: arc4.UInt64
    position_r: arc4.UInt64  # = tick.r × shares / tick.total_shares


class PoolInfo(arc4.Struct):
    """Full pool snapshot — returned by get_pool_info()."""

    n: arc4.UInt64
    r_int: arc4.UInt64
    s_bound: arc4.UInt64
    k_bound: arc4.UInt64
    sqrt_n: arc4.UInt64
    inv_sqrt_n: arc4.UInt64
    num_ticks: arc4.UInt64
    fee_bps: arc4.UInt64
    virtual_offset: arc4.UInt64
    paused: arc4.UInt64
    sum_x: arc4.UInt64
    sum_x_sq: arc4.UInt64
    total_r: arc4.UInt64  # NEW in v2: sum of r for ALL ticks
    amount_scale: arc4.UInt64  # NEW in v3: raw microunits / amount_scale = scaled math unit


# ── Pure subroutines ───────────────────────────────────────────────────


@subroutine
def reserve_offset(index: UInt64) -> UInt64:
    return index * UInt64(8)


@subroutine
def mul_div_floor(lhs: UInt64, rhs: UInt64, denominator: UInt64) -> UInt64:
    """128-bit multiply then floor-divide.  Safe against u64 overflow in multiply."""
    high, low = op.mulw(lhs, rhs)
    return op.divw(high, low, denominator)


@subroutine
def square_raw(value: UInt64) -> UInt64:
    """value² — asserts the result fits in u64."""
    high, low = op.mulw(value, value)
    assert high == UInt64(0)
    return low


@subroutine
def square_scaled(value: UInt64) -> UInt64:
    """(value²) / PRECISION — the PRECISION-normalised square."""
    return mul_div_floor(value, value, UInt64(_PRECISION))


@subroutine
def to_scaled(raw: UInt64) -> UInt64:
    """Convert a raw microunit reserve value to scaled invariant-math units.

    All math-space quantities (math_reserve, sum_x, sum_x_sq, virtual_offset,
    r, k, r_int, s_bound, k_bound) live in scaled space.
    Actual ASA transfers and the reserves box stay in raw microunits.
    """
    return raw // UInt64(_AMOUNT_SCALE)


@subroutine
def read_reserve(reserves: Box[Bytes], index: UInt64) -> UInt64:
    return op.extract_uint64(reserves.extract(reserve_offset(index), UInt64(8)), 0)


@subroutine
def write_reserve(reserves: Box[Bytes], index: UInt64, value: UInt64) -> None:
    reserves.replace(reserve_offset(index), op.itob(value))


@subroutine
def read_fee_growth(fee_growth: Box[Bytes], index: UInt64) -> UInt64:
    return op.extract_uint64(fee_growth.extract(reserve_offset(index), UInt64(8)), 0)


@subroutine
def write_fee_growth(fee_growth: Box[Bytes], index: UInt64, value: UInt64) -> None:
    fee_growth.replace(reserve_offset(index), op.itob(value))


@subroutine
def abs_diff(lhs: UInt64, rhs: UInt64) -> UInt64:
    if lhs >= rhs:
        return lhs - rhs
    return rhs - lhs


@subroutine
def scaled_k_min(r: UInt64, sqrt_n: UInt64) -> UInt64:
    return mul_div_floor(r, sqrt_n - UInt64(_PRECISION), UInt64(_PRECISION))


@subroutine
def scaled_k_max(r: UInt64, n: UInt64, sqrt_n: UInt64) -> UInt64:
    return mul_div_floor(r, (n - UInt64(1)) * UInt64(_PRECISION), sqrt_n)


@subroutine
def equal_price_reserve(r: UInt64, sqrt_n: UInt64) -> UInt64:
    """The equal-price reserve q = r − r/√n."""
    return r - mul_div_floor(r, UInt64(_PRECISION), sqrt_n)


@subroutine
def x_min_for_tick(r: UInt64, k: UInt64, n: UInt64, sqrt_n: UInt64) -> UInt64:
    """Minimum per-token reserve for a tick with given r, k geometry."""
    c = (n * r) - mul_div_floor(k, sqrt_n, UInt64(_PRECISION))
    discriminant = (n - UInt64(1)) * ((n * r * r) - (c * c))
    return r - ((c + op.sqrt(discriminant)) // n)


@subroutine
def boundary_radius_calc(r: UInt64, k: UInt64, sqrt_n: UInt64) -> UInt64:
    """Compute s = sqrt(r² − (k − r·√n)²) for a boundary tick."""
    r_sqrt_n = mul_div_floor(r, sqrt_n, UInt64(_PRECISION))
    offset = abs_diff(k, r_sqrt_n)
    r_sq = square_raw(r)
    off_sq = square_raw(offset)
    if r_sq >= off_sq:
        return op.sqrt(r_sq - off_sq)
    return UInt64(0)


@subroutine
def verify_preceding_transfer(asset_id: UInt64, amount: UInt64) -> None:
    """Assert that the immediately preceding group transaction is a valid token send."""
    assert Txn.group_index > UInt64(0)
    transfer = gtxn.AssetTransferTransaction(Txn.group_index - UInt64(1))
    assert transfer.sender == Txn.sender
    assert transfer.asset_receiver == Global.current_application_address
    assert transfer.asset_amount == amount
    assert transfer.xfer_asset == Asset(asset_id)


@subroutine
def verify_invariant(
    sum_x: UInt64,
    sum_x_sq: UInt64,
    n: UInt64,
    r_int: UInt64,
    s_bound: UInt64,
    k_bound: UInt64,
    sqrt_n: UInt64,
    inv_sqrt_n: UInt64,
) -> bool:
    """On-chain O(1) torus invariant check.

    Returns True iff the proposed (sum_x, sum_x_sq) lies on the consolidated
    torus defined by (r_int, s_bound, k_bound) within _TOLERANCE.
    """
    alpha_total = mul_div_floor(sum_x, inv_sqrt_n, UInt64(_PRECISION))
    if alpha_total < k_bound:
        return False
    alpha_int = alpha_total - k_bound
    r_int_sqrt_n = mul_div_floor(r_int, sqrt_n, UInt64(_PRECISION))

    variance = mul_div_floor(sum_x, sum_x, n)
    if sum_x_sq < variance:
        return False
    w_total_sq = sum_x_sq - variance
    w_total_norm = op.sqrt(w_total_sq)
    if w_total_norm < s_bound:
        return False
    w_int_norm = w_total_norm - s_bound

    diff_alpha = abs_diff(alpha_int, r_int_sqrt_n)
    lhs = square_scaled(r_int)
    rhs = square_scaled(diff_alpha) + square_scaled(w_int_norm)
    return abs_diff(lhs, rhs) <= UInt64(_TOLERANCE)


@subroutine
def send_tokens(asset_id: UInt64, receiver: Account, amount: UInt64) -> None:
    itxn.AssetTransfer(
        xfer_asset=Asset(asset_id),
        asset_receiver=receiver,
        asset_amount=amount,
        fee=UInt64(0),
    ).submit()


@subroutine
def opt_in_asset(asset_id: UInt64) -> None:
    itxn.AssetTransfer(
        xfer_asset=Asset(asset_id),
        asset_receiver=Global.current_application_address,
        asset_amount=UInt64(0),
        fee=UInt64(0),
    ).submit()


# ── Contract ───────────────────────────────────────────────────────────


class OrbitalPool(ARC4Contract):
    """Orbital AMM pool — multi-stablecoin concentrated liquidity on Algorand.

    v2: multi-LP positions, fee-growth checkpoint accounting, production read API.
    """

    def __init__(self) -> None:
        # ── Scalar global state ────────────────────────────────────────
        self.n = GlobalState(UInt64(0))
        self.bootstrapped = GlobalState(UInt64(0))
        self.registered_tokens = GlobalState(UInt64(0))
        self.sum_x = GlobalState(UInt64(0))
        self.sum_x_sq = GlobalState(UInt64(0))
        self.r_int = GlobalState(UInt64(0))
        self.s_bound = GlobalState(UInt64(0))
        self.k_bound = GlobalState(UInt64(0))
        self.virtual_offset = GlobalState(UInt64(0))
        self.num_ticks = GlobalState(UInt64(0))
        self.sqrt_n = GlobalState(UInt64(0))
        self.inv_sqrt_n = GlobalState(UInt64(0))
        self.paused = GlobalState(UInt64(0))
        self.fee_bps = GlobalState(UInt64(0))
        self.creator = GlobalState(Account())
        # NEW in v2: sum of r for ALL ticks (interior + boundary).
        # Used for O(1) pro-rata reserve and fee distribution.
        self.total_r = GlobalState(UInt64(0))

        # ── Boxes ──────────────────────────────────────────────────────
        self.reserves = Box(Bytes, key=b"reserves")
        # fee_growth replaces the v1 fees box.
        # Layout: n × 8 bytes, each entry is a PRECISION-scaled monotone
        # accumulator: fee_growth[i] += fee_i * PRECISION / total_r per swap.
        self.fee_growth = Box(Bytes, key=b"fee_growth")
        self.tokens = BoxMap(UInt64, UInt64, key_prefix=b"token:")
        self.ticks = BoxMap(UInt64, TickData, key_prefix=b"tick:")
        # Position boxes: key = owner_32bytes + tick_id_8bytes (40 bytes)
        # value = shares_8bytes + [fee_growth_checkpoint_i_8bytes for i in n]
        # Total value size: (1 + n) × 8 bytes.
        self.positions = BoxMap(Bytes, Bytes, key_prefix=b"pos:")

    # ── Pool lifecycle ──────────────────────────────────────────────────

    @arc4.abimethod(create="require")
    def create(
        self,
        n: UInt64,
        sqrt_n_scaled: UInt64,
        inv_sqrt_n_scaled: UInt64,
    ) -> None:
        assert n > UInt64(1)

        # Validate √n: (√n_scaled)² ≈ n × PRECISION² (floor-sqrt allowed).
        expected = n * UInt64(_PRECISION) * UInt64(_PRECISION)
        actual = square_raw(sqrt_n_scaled)
        sqrt_tolerance = (sqrt_n_scaled * UInt64(2)) + UInt64(1)
        assert abs_diff(actual, expected) <= sqrt_tolerance

        # Validate inv_√n: √n × inv_√n ≈ PRECISION².
        inv_check = mul_div_floor(sqrt_n_scaled, inv_sqrt_n_scaled, UInt64(_PRECISION))
        assert abs_diff(inv_check, UInt64(_PRECISION)) <= UInt64(1)

        self.n.value = n
        self.bootstrapped.value = UInt64(0)
        self.registered_tokens.value = UInt64(0)
        self.sum_x.value = UInt64(0)
        self.sum_x_sq.value = UInt64(0)
        self.r_int.value = UInt64(0)
        self.s_bound.value = UInt64(0)
        self.k_bound.value = UInt64(0)
        self.virtual_offset.value = UInt64(0)
        self.num_ticks.value = UInt64(0)
        self.sqrt_n.value = sqrt_n_scaled
        self.inv_sqrt_n.value = inv_sqrt_n_scaled
        self.paused.value = UInt64(0)
        self.fee_bps.value = UInt64(30)  # default 0.30 %
        self.creator.value = Txn.sender
        self.total_r.value = UInt64(0)

    @arc4.abimethod
    def bootstrap(self) -> None:
        """Allocate reserves and fee_growth boxes.  Idempotent if boxes already exist."""
        assert self.paused.value == UInt64(0)
        assert self.bootstrapped.value == UInt64(0)

        n = self.n.value
        created = self.reserves.create(size=n * UInt64(8))
        if not created:
            assert self.reserves.length == n * UInt64(8)

        fg_created = self.fee_growth.create(size=n * UInt64(8))
        if not fg_created:
            assert self.fee_growth.length == n * UInt64(8)

        self.bootstrapped.value = UInt64(1)

    @arc4.abimethod
    def budget(self) -> None:
        """Opcode-budget pooling dummy.  SDK groups these before heavy calls."""
        pass

    @arc4.abimethod
    def register_token(self, token_idx: UInt64, asset_id: UInt64) -> None:
        assert self.paused.value == UInt64(0)
        assert self.bootstrapped.value == UInt64(1)
        assert token_idx < self.n.value
        assert token_idx not in self.tokens

        self.tokens[token_idx] = asset_id
        self.registered_tokens.value += UInt64(1)
        opt_in_asset(asset_id)

    # ── Admin ───────────────────────────────────────────────────────────

    @arc4.abimethod
    def set_paused(self, flag: UInt64) -> None:
        assert Txn.sender == self.creator.value
        self.paused.value = flag

    @arc4.abimethod
    def set_fee(self, new_fee_bps: UInt64) -> None:
        assert Txn.sender == self.creator.value
        assert new_fee_bps <= UInt64(500)  # cap at 5 %
        self.fee_bps.value = new_fee_bps

    # ── LP operations ───────────────────────────────────────────────────

    @arc4.abimethod
    def add_tick(self, r: UInt64, k: UInt64) -> None:
        """Add a new concentrated-liquidity position.

        Caller must include n asset-transfer transactions immediately before
        this call in the same atomic group, each sending deposit_per_token of
        the corresponding registered token to the pool address.

        Creates a position box for (Txn.sender, new_tick_id).
        Updates total_r, r_int, virtual_offset, sum_x, sum_x_sq.
        """
        assert self.paused.value == UInt64(0)
        assert self.bootstrapped.value == UInt64(1)
        assert self.registered_tokens.value == self.n.value
        assert r > UInt64(0)

        n = self.n.value
        sqrt_n = self.sqrt_n.value

        min_k = scaled_k_min(r, sqrt_n)
        max_k = scaled_k_max(r, n, sqrt_n)
        assert k >= min_k
        assert k <= max_k

        q = equal_price_reserve(r, sqrt_n)
        x_min = x_min_for_tick(r, k, n, sqrt_n)
        assert q >= x_min
        # deposit_per_token_scaled: in scaled units (matches r, k, q, x_min space).
        # deposit_per_token_raw: what callers actually transfer in ASA microunits.
        deposit_per_token_scaled = q - x_min
        deposit_per_token_raw = deposit_per_token_scaled * UInt64(_AMOUNT_SCALE)

        assert Txn.group_index >= n
        start_index = Txn.group_index - n

        # virtual_offset and all math quantities are in scaled units.
        prior_offset = self.virtual_offset.value
        new_offset = prior_offset + x_min
        # Incrementally update sum_x_sq as we update each reserve.
        updated_sum_sq = self.sum_x_sq.value

        for index in urange(n):
            transfer = gtxn.AssetTransferTransaction(start_index + index)
            expected_asset = self.tokens[index]
            assert transfer.sender == Txn.sender
            assert transfer.asset_receiver == Global.current_application_address
            assert transfer.asset_amount == deposit_per_token_raw
            assert transfer.xfer_asset == Asset(expected_asset)

            # reserves box is in raw microunits; math space is scaled.
            current_actual_raw = read_reserve(self.reserves, index)
            current_math = to_scaled(current_actual_raw) + prior_offset
            new_actual_raw = current_actual_raw + deposit_per_token_raw
            new_math = to_scaled(new_actual_raw) + new_offset
            write_reserve(self.reserves, index, new_actual_raw)
            # Offset change affects ALL n reserves, correctly captured here.
            updated_sum_sq = updated_sum_sq + square_raw(new_math) - square_raw(current_math)

        tick_id = self.num_ticks.value
        # shares = deposit_per_token_raw × n.  One share = 1/n of a deposited microunit.
        shares = deposit_per_token_raw * n

        self.ticks[tick_id] = TickData(
            r=arc4.UInt64(r),
            k=arc4.UInt64(k),
            state=arc4.UInt8(0),       # starts INTERIOR
            total_shares=arc4.UInt64(shares),
        )

        # Create position box: shares (8 bytes) + fee_growth checkpoints (n×8 bytes).
        # Checkpoints are set to current fee_growth values so the LP does not
        # receive fees accrued before their deposit (no retroactive fee claim).
        pos_key = Txn.sender.bytes + op.itob(tick_id)
        pos_value = op.itob(shares)
        for idx in urange(n):
            fg = read_fee_growth(self.fee_growth, idx)
            pos_value = pos_value + op.itob(fg)
        self.positions[pos_key] = pos_value

        self.num_ticks.value = tick_id + UInt64(1)
        self.r_int.value += r
        self.total_r.value += r
        self.virtual_offset.value = new_offset
        # sum_x increases by n×q (q already in scaled units since r/k are scaled).
        # After add_tick each math_reserve = to_scaled(actual_raw) + new_offset = q.
        self.sum_x.value += n * q
        self.sum_x_sq.value = updated_sum_sq

    @arc4.abimethod
    def claim_fees(self, tick_id: UInt64) -> None:
        """Claim accrued swap fees for position (Txn.sender, tick_id).

        Sends each token's claimable fee to Txn.sender, then resets the
        position's fee_growth checkpoints to the current global values.
        Calling this does NOT withdraw principal.

        Fee safety: checkpoints are updated atomically with the sends.
        A reverted transaction rolls back all inner sends AND the checkpoint
        update, leaving the position unchanged.  No double-claim is possible.

        Opcode budget: group with ≥2 budget() calls for n=5.
        """
        assert self.paused.value == UInt64(0)
        assert self.bootstrapped.value == UInt64(1)
        assert tick_id in self.ticks

        pos_key = Txn.sender.bytes + op.itob(tick_id)
        assert pos_key in self.positions

        tick = self.ticks[tick_id].copy()
        tick_r = tick.r.as_uint64()
        tick_total_shares = tick.total_shares.as_uint64()
        assert tick_total_shares > UInt64(0)

        pos_raw = self.positions[pos_key]
        pos_shares = op.extract_uint64(pos_raw, 0)
        assert pos_shares > UInt64(0)

        # pos_r: this position's proportional radius (its share of tick.r).
        pos_r = mul_div_floor(tick_r, pos_shares, tick_total_shares)

        n = self.n.value
        # Build new position value with updated checkpoints; send fees in same pass.
        new_pos_value = op.itob(pos_shares)  # shares unchanged

        for idx in urange(n):
            fg_global = read_fee_growth(self.fee_growth, idx)
            fg_checkpoint = op.extract_uint64(pos_raw, UInt64(8) + idx * UInt64(8))
            # Checkpoint advances to current value regardless (prevents double-claim
            # even if claimable rounds to zero due to fixed-point floor).
            new_pos_value = new_pos_value + op.itob(fg_global)

            if fg_global > fg_checkpoint:
                fee_delta = fg_global - fg_checkpoint
                claimable = mul_div_floor(pos_r, fee_delta, UInt64(_PRECISION))
                if claimable > UInt64(0):
                    send_tokens(self.tokens[idx], Txn.sender, claimable)

        self.positions[pos_key] = new_pos_value

    @arc4.abimethod
    def remove_liquidity(self, tick_id: UInt64, shares: UInt64) -> None:
        """Remove liquidity from position (Txn.sender, tick_id).

        Authorization: position box must exist for (Txn.sender, tick_id).

        Flow:
          1. Settle outstanding fees via fee_growth checkpoints (atomic).
          2. Compute LP's reserve entitlement: pos_r / total_r of each reserve.
          3. Update consolidation state (r_int / s_bound / k_bound / total_r).
          4. Recompute virtual_offset, sum_x, sum_x_sq from scratch (O(n)).
          5. Send principal + fees to caller.
          6. Update or delete tick and position boxes.

        Partial withdrawal reduces tick.r and tick.k proportionally.
        The position checkpoint is reset to prevent future double-claim on the
        remaining shares.

        Opcode budget: group with ≥2 budget() calls for n=5.
        """
        assert self.paused.value == UInt64(0)
        assert self.bootstrapped.value == UInt64(1)
        assert self.registered_tokens.value == self.n.value
        assert shares > UInt64(0)
        assert tick_id in self.ticks

        pos_key = Txn.sender.bytes + op.itob(tick_id)
        assert pos_key in self.positions

        tick = self.ticks[tick_id].copy()
        tick_r = tick.r.as_uint64()
        tick_k = tick.k.as_uint64()
        tick_state = tick.state.as_uint64()
        tick_total_shares = tick.total_shares.as_uint64()

        pos_raw = self.positions[pos_key]
        pos_shares = op.extract_uint64(pos_raw, 0)
        assert shares <= pos_shares

        n = self.n.value
        sqrt_n = self.sqrt_n.value
        is_full = shares == pos_shares

        # pos_r / pos_k: this withdrawal's proportional contribution.
        pos_r = mul_div_floor(tick_r, shares, tick_total_shares)
        pos_k = mul_div_floor(tick_k, shares, tick_total_shares)
        remaining_r = tick_r - pos_r
        remaining_k = tick_k - pos_k

        # Save old total_r before any mutation (needed for reserve pro-rata).
        old_total_r = self.total_r.value
        assert old_total_r >= pos_r

        # ── Step 1: Settle fees (same logic as claim_fees, inline for atomicity) ──
        for idx in urange(n):
            fg_global = read_fee_growth(self.fee_growth, idx)
            fg_checkpoint = op.extract_uint64(pos_raw, UInt64(8) + idx * UInt64(8))
            if fg_global > fg_checkpoint:
                fee_delta = fg_global - fg_checkpoint
                claimable = mul_div_floor(pos_r, fee_delta, UInt64(_PRECISION))
                if claimable > UInt64(0):
                    send_tokens(self.tokens[idx], Txn.sender, claimable)

        # ── Step 2: Update consolidation state ────────────────────────
        if tick_state == UInt64(0):  # INTERIOR
            self.r_int.value -= pos_r
        else:  # BOUNDARY
            old_s = boundary_radius_calc(tick_r, tick_k, sqrt_n)
            if is_full:
                new_s = UInt64(0)
            else:
                new_s = boundary_radius_calc(remaining_r, remaining_k, sqrt_n)
            self.s_bound.value -= (old_s - new_s)
            self.k_bound.value -= pos_k

        self.total_r.value -= pos_r

        # ── Step 3: Virtual offset ─────────────────────────────────────
        old_x_min = x_min_for_tick(tick_r, tick_k, n, sqrt_n)
        if is_full:
            new_x_min = UInt64(0)
        else:
            new_x_min = x_min_for_tick(remaining_r, remaining_k, n, sqrt_n)
        old_offset = self.virtual_offset.value
        new_offset = old_offset - (old_x_min - new_x_min)
        self.virtual_offset.value = new_offset

        # ── Step 4+5: Reserve payout + recompute aggregates ───────────
        # LP receives pos_r / old_total_r of each actual reserve.
        # Recompute sum_x and sum_x_sq from scratch at new_offset.
        new_sum = UInt64(0)
        new_sum_sq = UInt64(0)
        for idx in urange(n):
            old_actual = read_reserve(self.reserves, idx)
            lp_share = mul_div_floor(old_actual, pos_r, old_total_r)
            new_actual = old_actual - lp_share
            write_reserve(self.reserves, idx, new_actual)
            new_math = to_scaled(new_actual) + new_offset
            new_sum += new_math
            new_sum_sq += square_raw(new_math)
            if lp_share > UInt64(0):
                send_tokens(self.tokens[idx], Txn.sender, lp_share)

        self.sum_x.value = new_sum
        self.sum_x_sq.value = new_sum_sq

        # ── Step 6: Update / delete tick and position boxes ───────────
        if is_full:
            del self.ticks[tick_id]
            del self.positions[pos_key]
        else:
            remaining_shares = pos_shares - shares
            self.ticks[tick_id] = TickData(
                r=arc4.UInt64(remaining_r),
                k=arc4.UInt64(remaining_k),
                state=tick.state,
                total_shares=arc4.UInt64(remaining_shares),
            )
            # Reset fee checkpoints on remaining shares → no future double-claim.
            new_pos_value = op.itob(remaining_shares)
            for idx in urange(n):
                fg = read_fee_growth(self.fee_growth, idx)
                new_pos_value = new_pos_value + op.itob(fg)
            self.positions[pos_key] = new_pos_value

    # ── Swap operations ─────────────────────────────────────────────────

    @arc4.abimethod
    def swap(
        self,
        token_in_idx: UInt64,
        token_out_idx: UInt64,
        amount_in: UInt64,
        claimed_amount_out: UInt64,
        min_amount_out: UInt64,
    ) -> None:
        """Single-segment O(1) swap.

        The transaction immediately preceding this call in the group must be
        an asset transfer of amount_in of tokens[token_in_idx] to the pool.

        Fee is deducted from amount_in before invariant verification.
        The fee stays in the contract's ASA balance and is tracked via
        fee_growth (PRECISION-scaled per-r accumulator), NOT in a fees box.
        """
        assert self.paused.value == UInt64(0)
        assert self.bootstrapped.value == UInt64(1)
        assert self.registered_tokens.value == self.n.value
        assert token_in_idx != token_out_idx
        assert token_in_idx < self.n.value
        assert token_out_idx < self.n.value
        assert claimed_amount_out >= min_amount_out

        token_in_asset = self.tokens[token_in_idx]
        token_out_asset = self.tokens[token_out_idx]
        verify_preceding_transfer(token_in_asset, amount_in)

        fee = mul_div_floor(amount_in, self.fee_bps.value, UInt64(_FEE_DENOMINATOR))
        effective_in = amount_in - fee

        offset = self.virtual_offset.value
        old_in_actual = read_reserve(self.reserves, token_in_idx)
        old_out_actual = read_reserve(self.reserves, token_out_idx)
        assert claimed_amount_out <= old_out_actual

        old_in_math = to_scaled(old_in_actual) + offset
        old_out_math = to_scaled(old_out_actual) + offset
        new_in_actual = old_in_actual + effective_in
        new_out_actual = old_out_actual - claimed_amount_out
        new_in_math = to_scaled(new_in_actual) + offset
        new_out_math = to_scaled(new_out_actual) + offset
        new_sum = self.sum_x.value + to_scaled(effective_in) - to_scaled(claimed_amount_out)
        new_sum_sq = (
            self.sum_x_sq.value
            + square_raw(new_in_math)
            - square_raw(old_in_math)
            + square_raw(new_out_math)
            - square_raw(old_out_math)
        )

        assert verify_invariant(
            new_sum,
            new_sum_sq,
            self.n.value,
            self.r_int.value,
            self.s_bound.value,
            self.k_bound.value,
            self.sqrt_n.value,
            self.inv_sqrt_n.value,
        )

        write_reserve(self.reserves, token_in_idx, new_in_actual)
        write_reserve(self.reserves, token_out_idx, new_out_actual)
        self.sum_x.value = new_sum
        self.sum_x_sq.value = new_sum_sq

        # Accumulate fee into fee_growth (PRECISION-scaled per-r).
        # The fee stays in the contract's ASA balance; only the growth rate
        # is recorded here.  If total_r == 0 (no LPs), fee becomes protocol dust.
        if fee > UInt64(0):
            total_r = self.total_r.value
            if total_r > UInt64(0):
                fg_increment = mul_div_floor(fee, UInt64(_PRECISION), total_r)
                if fg_increment > UInt64(0):
                    old_fg = read_fee_growth(self.fee_growth, token_in_idx)
                    write_fee_growth(self.fee_growth, token_in_idx, old_fg + fg_increment)

        if claimed_amount_out > UInt64(0):
            send_tokens(token_out_asset, Txn.sender, claimed_amount_out)

    @arc4.abimethod
    def swap_with_crossings(
        self,
        token_in_idx: UInt64,
        token_out_idx: UInt64,
        total_amount_in: UInt64,
        trade_recipe: arc4.DynamicBytes,
        min_amount_out: UInt64,
    ) -> None:
        """Multi-segment swap with tick-crossing verification.

        trade_recipe is an ABI-encoded sequence of TradeSegment structs
        (each 25 bytes: amount_in_8 + amount_out_8 + tick_crossed_id_8 + new_state_1).

        For each segment the contract:
          1. Updates running reserves and aggregates.
          2. If a crossing is claimed, transitions the tick's state and verifies
             that α_int_norm ≈ k/r at the crossing boundary.
          3. Verifies the torus invariant after the segment.

        After all segments:
          - Checks total_seg_in == effective_total_in (no input unaccounted).
          - Checks total_seg_out >= min_amount_out (slippage protection).
          - Persists final reserves and consolidation state.
          - Accumulates fee into fee_growth (same as swap()).

        Crossing correctness: the k_norm ≈ α_int_norm check is guarded by
        cur_r_int > 0 (after the transition), so a trade that drives ALL
        interior ticks to boundary in one segment is also handled.
        """
        assert self.paused.value == UInt64(0)
        assert self.bootstrapped.value == UInt64(1)
        assert self.registered_tokens.value == self.n.value
        assert token_in_idx != token_out_idx
        assert token_in_idx < self.n.value
        assert token_out_idx < self.n.value

        token_in_asset = self.tokens[token_in_idx]
        token_out_asset = self.tokens[token_out_idx]
        verify_preceding_transfer(token_in_asset, total_amount_in)

        fee = mul_div_floor(total_amount_in, self.fee_bps.value, UInt64(_FEE_DENOMINATOR))
        effective_total_in = total_amount_in - fee

        recipe_bytes = trade_recipe.native
        assert recipe_bytes.length > UInt64(0)
        assert recipe_bytes.length % UInt64(_SEGMENT_SIZE) == UInt64(0)
        num_segments = recipe_bytes.length // UInt64(_SEGMENT_SIZE)

        n = self.n.value
        sqrt_n = self.sqrt_n.value
        inv_sqrt_n = self.inv_sqrt_n.value
        offset = self.virtual_offset.value

        cur_r_int = self.r_int.value
        cur_s_bound = self.s_bound.value
        cur_k_bound = self.k_bound.value

        running_in_actual = read_reserve(self.reserves, token_in_idx)
        running_out_actual = read_reserve(self.reserves, token_out_idx)
        running_sum = self.sum_x.value
        running_sum_sq = self.sum_x_sq.value

        total_seg_in = UInt64(0)
        total_seg_out = UInt64(0)

        for seg_idx in urange(num_segments):
            seg_off = seg_idx * UInt64(_SEGMENT_SIZE)
            seg_in = op.extract_uint64(recipe_bytes, seg_off)
            seg_out = op.extract_uint64(recipe_bytes, seg_off + UInt64(8))
            seg_tick_id = op.extract_uint64(recipe_bytes, seg_off + UInt64(16))
            seg_new_state = op.getbyte(recipe_bytes, seg_off + UInt64(24))

            assert seg_in > UInt64(0)
            total_seg_in += seg_in
            assert total_seg_in <= effective_total_in

            prev_in_math = to_scaled(running_in_actual) + offset
            prev_out_math = to_scaled(running_out_actual) + offset
            assert seg_out <= running_out_actual

            running_in_actual += seg_in
            running_out_actual -= seg_out
            new_in_math = to_scaled(running_in_actual) + offset
            new_out_math = to_scaled(running_out_actual) + offset

            running_sum = running_sum + to_scaled(seg_in) - to_scaled(seg_out)
            running_sum_sq = (
                running_sum_sq
                + square_raw(new_in_math) - square_raw(prev_in_math)
                + square_raw(new_out_math) - square_raw(prev_out_math)
            )

            # Handle claimed tick crossing in this segment.
            if seg_tick_id != UInt64(_NO_CROSSING):
                assert seg_tick_id < self.num_ticks.value
                assert seg_tick_id in self.ticks
                xtick = self.ticks[seg_tick_id].copy()
                xtick_r = xtick.r.as_uint64()
                xtick_k = xtick.k.as_uint64()
                xtick_old_state = xtick.state.as_uint64()

                if seg_new_state == UInt64(1):
                    # INTERIOR → BOUNDARY crossing.
                    assert xtick_old_state == UInt64(0)
                    cur_r_int -= xtick_r
                    cur_s_bound += boundary_radius_calc(xtick_r, xtick_k, sqrt_n)
                    cur_k_bound += xtick_k
                else:
                    # BOUNDARY → INTERIOR crossing.
                    assert xtick_old_state == UInt64(1)
                    s_contrib = boundary_radius_calc(xtick_r, xtick_k, sqrt_n)
                    cur_r_int += xtick_r
                    cur_s_bound -= s_contrib
                    cur_k_bound -= xtick_k

                # Persist updated tick state (total_shares unchanged by crossing).
                self.ticks[seg_tick_id] = TickData(
                    r=xtick.r,
                    k=xtick.k,
                    state=arc4.UInt8(seg_new_state),
                    total_shares=xtick.total_shares,
                )

                # Boundary proximity check: α_int_norm ≈ k/r at the crossing.
                # Only meaningful when interior ticks still exist after transition.
                if cur_r_int > UInt64(0):
                    alpha_total_val = mul_div_floor(running_sum, inv_sqrt_n, UInt64(_PRECISION))
                    assert alpha_total_val >= cur_k_bound
                    alpha_int = alpha_total_val - cur_k_bound
                    alpha_int_norm = mul_div_floor(alpha_int, UInt64(_PRECISION), cur_r_int)
                    k_norm = mul_div_floor(xtick_k, UInt64(_PRECISION), xtick_r)
                    assert abs_diff(alpha_int_norm, k_norm) <= UInt64(_CROSSING_TOLERANCE)

            # Verify torus invariant after each segment.
            assert verify_invariant(
                running_sum,
                running_sum_sq,
                n,
                cur_r_int,
                cur_s_bound,
                cur_k_bound,
                sqrt_n,
                inv_sqrt_n,
            )

            total_seg_out += seg_out

        # All segments processed — verify totals.
        assert total_seg_in == effective_total_in
        assert total_seg_out >= min_amount_out

        # Persist final state.
        write_reserve(self.reserves, token_in_idx, running_in_actual)
        write_reserve(self.reserves, token_out_idx, running_out_actual)
        self.sum_x.value = running_sum
        self.sum_x_sq.value = running_sum_sq
        self.r_int.value = cur_r_int
        self.s_bound.value = cur_s_bound
        self.k_bound.value = cur_k_bound

        # Accumulate fee into fee_growth.
        if fee > UInt64(0):
            total_r = self.total_r.value
            if total_r > UInt64(0):
                fg_increment = mul_div_floor(fee, UInt64(_PRECISION), total_r)
                if fg_increment > UInt64(0):
                    old_fg = read_fee_growth(self.fee_growth, token_in_idx)
                    write_fee_growth(self.fee_growth, token_in_idx, old_fg + fg_increment)

        if total_seg_out > UInt64(0):
            send_tokens(token_out_asset, Txn.sender, total_seg_out)

    # ── View methods (readonly=True — safe via simulate) ─────────────────

    @arc4.abimethod(readonly=True)
    def get_pool_info(self) -> PoolInfo:
        """Full pool parameter snapshot in a single call.

        Includes total_r (new in v2) alongside all existing consolidation
        and invariant parameters.
        """
        return PoolInfo(
            n=arc4.UInt64(self.n.value),
            r_int=arc4.UInt64(self.r_int.value),
            s_bound=arc4.UInt64(self.s_bound.value),
            k_bound=arc4.UInt64(self.k_bound.value),
            sqrt_n=arc4.UInt64(self.sqrt_n.value),
            inv_sqrt_n=arc4.UInt64(self.inv_sqrt_n.value),
            num_ticks=arc4.UInt64(self.num_ticks.value),
            fee_bps=arc4.UInt64(self.fee_bps.value),
            virtual_offset=arc4.UInt64(self.virtual_offset.value),
            paused=arc4.UInt64(self.paused.value),
            sum_x=arc4.UInt64(self.sum_x.value),
            sum_x_sq=arc4.UInt64(self.sum_x_sq.value),
            total_r=arc4.UInt64(self.total_r.value),
            amount_scale=arc4.UInt64(UInt64(_AMOUNT_SCALE)),
        )

    @arc4.abimethod(readonly=True)
    def get_tick_info(self, tick_id: UInt64) -> TickData:
        """Return TickData for a given tick.  Reverts if tick does not exist."""
        assert tick_id in self.ticks
        return self.ticks[tick_id].copy()

    @arc4.abimethod(readonly=True)
    def get_position(self, owner: arc4.Address, tick_id: UInt64) -> PositionInfo:
        """Return position summary for (owner, tick_id).

        Reverts if the position or tick does not exist.
        position_r = tick.r × shares / tick.total_shares.
        """
        pos_key = owner.bytes + op.itob(tick_id)
        assert pos_key in self.positions
        assert tick_id in self.ticks

        tick = self.ticks[tick_id].copy()
        tick_r = tick.r.as_uint64()
        tick_total_shares = tick.total_shares.as_uint64()
        assert tick_total_shares > UInt64(0)

        pos_raw = self.positions[pos_key]
        pos_shares = op.extract_uint64(pos_raw, 0)
        pos_r = mul_div_floor(tick_r, pos_shares, tick_total_shares)

        return PositionInfo(
            shares=arc4.UInt64(pos_shares),
            position_r=arc4.UInt64(pos_r),
        )

    @arc4.abimethod(readonly=True)
    def get_reserves(self) -> arc4.DynamicBytes:
        """Return raw actual-reserve bytes: n × 8 bytes, big-endian uint64 per token.

        Does NOT include accumulated fees (those live in the contract's ASA
        balance above the reserve level and are accounted via fee_growth).
        """
        assert self.bootstrapped.value == UInt64(1)
        return arc4.DynamicBytes(self.reserves.value)

    @arc4.abimethod(readonly=True)
    def get_fee_growth(self) -> arc4.DynamicBytes:
        """Return raw fee_growth bytes: n × 8 bytes, PRECISION-scaled per-r accumulator.

        SDK usage:
          fee_growth[i] is a monotone value that grows with every swap.
          To compute claimable fees for a position, use get_fees_for_position().
        """
        assert self.bootstrapped.value == UInt64(1)
        return arc4.DynamicBytes(self.fee_growth.value)

    @arc4.abimethod(readonly=True)
    def get_registered_tokens(self) -> arc4.DynamicBytes:
        """Return ASA IDs for all registered tokens: n × 8 bytes, big-endian uint64."""
        assert self.bootstrapped.value == UInt64(1)
        n = self.n.value
        result = Bytes(b"")
        for idx in urange(n):
            result = result + op.itob(self.tokens[idx])
        return arc4.DynamicBytes(result)

    @arc4.abimethod(readonly=True)
    def get_fees_for_position(self, owner: arc4.Address, tick_id: UInt64) -> arc4.DynamicBytes:
        """Return claimable fee amounts per token for position (owner, tick_id).

        Returns n × 8 bytes; decode each 8-byte chunk as a big-endian uint64
        claimable amount for the corresponding token index.

        The returned amounts are what claim_fees() would send at this moment.
        They are floor-divided so the actual on-chain claim matches exactly.
        """
        pos_key = owner.bytes + op.itob(tick_id)
        assert pos_key in self.positions
        assert tick_id in self.ticks

        tick = self.ticks[tick_id].copy()
        tick_r = tick.r.as_uint64()
        tick_total_shares = tick.total_shares.as_uint64()
        assert tick_total_shares > UInt64(0)

        pos_raw = self.positions[pos_key]
        pos_shares = op.extract_uint64(pos_raw, 0)
        pos_r = mul_div_floor(tick_r, pos_shares, tick_total_shares)

        n = self.n.value
        result = Bytes(b"")
        for idx in urange(n):
            fg_global = read_fee_growth(self.fee_growth, idx)
            fg_checkpoint = op.extract_uint64(pos_raw, UInt64(8) + idx * UInt64(8))
            claimable = UInt64(0)
            if fg_global > fg_checkpoint:
                fee_delta = fg_global - fg_checkpoint
                claimable = mul_div_floor(pos_r, fee_delta, UInt64(_PRECISION))
            result = result + op.itob(claimable)
        return arc4.DynamicBytes(result)

    @arc4.abimethod(readonly=True)
    def list_ticks(self, start: UInt64, limit: UInt64) -> arc4.DynamicArray[TickEntry]:
        """Return up to `limit` ticks starting from tick_id = start.

        Only existing (non-deleted) ticks are included.
        Caller should pool budget transactions for large limits.

        Example SDK decode (TypeScript):
          const entries = result.value.map(e => ({ tickId: e.tick_id, r: e.r, ... }))
        """
        result = arc4.DynamicArray[TickEntry]()
        num_ticks = self.num_ticks.value
        for idx in urange(limit):
            tick_id = start + idx
            if tick_id < num_ticks:
                if tick_id in self.ticks:
                    tick = self.ticks[tick_id].copy()
                    result.append(
                        TickEntry(
                            tick_id=arc4.UInt64(tick_id),
                            r=tick.r,
                            k=tick.k,
                            state=tick.state,
                            total_shares=tick.total_shares,
                        )
                    )
        return result.copy()

    @arc4.abimethod(readonly=True)
    def get_price(
        self,
        token_in_idx: UInt64,
        token_out_idx: UInt64,
    ) -> arc4.UInt64:
        """Instantaneous spot price of token_out in terms of token_in.

        PRECISION-scaled: result = PRECISION means 1:1 parity.

        Note: This is an interior-tick approximation using r_int as the
        effective radius.  It is accurate near equal-price but less so when
        significant boundary-tick liquidity is present.  Use the off-chain
        simulator for precise trade sizing.
        """
        assert self.bootstrapped.value == UInt64(1)
        assert token_in_idx < self.n.value
        assert token_out_idx < self.n.value
        assert token_in_idx != token_out_idx

        offset = self.virtual_offset.value
        r = self.r_int.value
        x_in = to_scaled(read_reserve(self.reserves, token_in_idx)) + offset
        x_out = to_scaled(read_reserve(self.reserves, token_out_idx)) + offset

        assert r > x_in
        assert r > x_out
        price = mul_div_floor(r - x_in, UInt64(_PRECISION), r - x_out)
        return arc4.UInt64(price)
