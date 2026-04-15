export default function SmartContract() {
  return (
    <div className="page-slide-in">
      <h1>Smart Contract</h1>

      <p>
        The taurusSwap smart contract is written in PyTeal and compiled to TEAL 8+.
        This page walks through the contract module by module, explaining each ARC-4
        method&apos;s purpose, verification logic, and state updates.
      </p>

      <h2 id="contract-structure">Contract Structure</h2>

      <pre><code>{`contract/
├── __init__.py          # Contract entry point
├── arc4_methods.py      # ARC-4 method definitions
├── swap.py              # Swap verification logic
├── liquidity.py         # Add/remove liquidity
├── fees.py              # Fee accounting
├── state.py             # State layout helpers
└── utils/
    ├── math.py          # 512-bit math helpers
    └── verification.py  # Invariant checks`}</code></pre>

      <h2 id="swap-method">swap Method</h2>

      <p>
        The simple swap method for trades that don&apos;t cross tick boundaries:
      </p>

      <pre><code className="language-python">{`@arc4.method
def swap(
    token_in_index: arc4.UInt64,
    token_out_index: arc4.UInt64,
    amount_in: arc4.UInt64,
    min_out: arc4.UInt64,
    claimed_out: arc4.UInt64,
) -> arc4.UInt64:
    """
    Execute a swap without tick crossings.

    Args:
        token_in_index: Index of input token in reserves array
        token_out_index: Index of output token
        amount_in: Amount of input token (microunits)
        min_out: Minimum acceptable output (slippage protection)
        claimed_out: Claimed output amount (computed by SDK)

    Returns:
        Actual output amount transferred
    """
    # 1. Verify ASA transfer for input
    # 2. Read old state (sumX, sumXSq)
    # 3. Compute new state from trade
    # 4. Verify torus invariant
    # 5. Check claimed_out >= min_out
    # 6. Update state
    # 7. Emit inner transaction for output`}</code></pre>

      <h2 id="swap_with_crossings-method">swap_with_crossings Method</h2>

      <p>
        For trades that cross one or more tick boundaries:
      </p>

      <pre><code className="language-python">{`@arc4.method
def swap_with_crossings(
    token_in_index: arc4.UInt64,
    token_out_index: arc4.UInt64,
    amount_in: arc4.UInt64,
    min_out: arc4.UInt64,
    trade_recipe: arc4.DynamicArray[TradeSegment],
) -> arc4.UInt64:
    """
    Execute a swap that crosses tick boundaries.

    Args:
        trade_recipe: Array of segments, each with:
            - amount_in: Input for this segment
            - amount_out: Output for this segment
            - tick_crossed_id: ID of tick being crossed (or 0)
            - new_tick_state: New state of tick (INTERIOR/BOUNDARY)
    """
    # For each segment:
    #   1. Apply segment's input/output to state
    #   2. Verify invariant holds
    #   3. If crossing claimed:
    #      - Verify α_int normalized == k normalized
    #      - Flip tick state
    #      - Re-consolidate pool state
    # 4. Final check: total output >= min_out`}</code></pre>

      <h2 id="add_tick-method">add_tick Method</h2>

      <p>
        Called by LPs to add a new tick (provide concentrated liquidity):
      </p>

      <pre><code className="language-python">{`@arc4.method
def add_tick(
    r: arc4.UInt64,
    k: arc4.UInt64,
    token_amounts: arc4.DynamicArray[arc4.UInt64],
    position_owner: arc4.Address,
) -> arc4.UInt64:
    """
    Add a new tick and create an LP position.

    Args:
        r: Sphere radius for this tick
        k: Hyperplane offset (defines price range)
        token_amounts: Amount of each token to deposit
        position_owner: Address to receive LP position

    Returns:
        Tick ID (used for future removal/fee claims)
    """
    # 1. Verify n ASA transfers (one per token)
    # 2. Compute new consolidated state (r_int, s_bound)
    # 3. Create tick box: tick:{id} = {r, k, INTERIOR, totalShares}
    # 4. Create position box: pos:{owner}{id} = {shares, fee_checkpoints}
    # 5. Update global state (numTicks++, totalR += r)`}</code></pre>

      <h2 id="remove_liquidity-method">remove_liquidity Method</h2>

      <pre><code className="language-python">{`@arc4.method
def remove_liquidity(
    tick_id: arc4.UInt64,
    shares_to_remove: arc4.UInt64,
    min_amounts: arc4.DynamicArray[arc4.UInt64],
) -> arc4.DynamicArray[arc4.UInt64]:
    """
    Remove liquidity from a tick position.

    Returns:
        Array of amounts returned (one per token)
    """
    # 1. Load position box, verify shares_to_remove <= position.shares
    # 2. Compute output per token: shares * reserves / totalShares
    # 3. Claim outstanding fees (see fee-accounting)
    # 4. Update tick state (totalShares -= shares)
    # 5. Emit inner ASA transfers`}</code></pre>

      <h2 id="claim_fees-method">claim_fees Method</h2>

      <pre><code className="language-python">{`@arc4.method
def claim_fees(
    tick_id: arc4.UInt64,
) -> arc4.DynamicArray[arc4.UInt64]:
    """
    Claim accrued fees for a position.

    Returns:
        Array of fee amounts (one per token)
    """
    # 1. Load position and tick state
    # 2. For each token i:
    #    claimable[i] = positionR * (fee_growth[i] - checkpoint[i]) / PRECISION
    # 3. Update checkpoint: checkpoint[i] = fee_growth[i]
    # 4. Emit inner ASA transfers`}</code></pre>

      <h2 id="read-only-methods">Read-Only Methods</h2>

      <pre><code className="language-python">{`@arc4.method
def get_pool_state() -> PoolState:
    """Return global pool state (no state changes)."""

@arc4.method
def get_tick_state(tick_id: arc4.UInt64) -> TickState:
    """Return state of a specific tick."""

@arc4.method
def get_position(owner: arc4.Address, tick_id: arc4.UInt64) -> Position:
    """Return LP position for owner in tick."""`}</code></pre>

      <h2 id="verification-flow">Verification Flow</h2>

      <p>
        Every state-changing method follows this pattern:
      </p>

      <ol>
        <li>
          <strong>Preconditions</strong> — Check sender, check ASA transfers attached
        </li>
        <li>
          <strong>Read</strong> — Load old state from global/box storage
        </li>
        <li>
          <strong>Compute</strong> — Compute new state from proposed changes
        </li>
        <li>
          <strong>Verify</strong> — Check invariant holds within tolerance
        </li>
        <li>
          <strong>Update</strong> — Write new state to storage
        </li>
        <li>
          <strong>Emit</strong> — Inner transactions for payouts
        </li>
      </ol>

      <p>
        If any step fails, the entire transaction group reverts. This ensures the
        invariant is never violated.
      </p>

      <blockquote>
        <strong>Source:</strong> The full contract is at <code>contract/pool_app.py</code>
        in the repo. See the PyTeal source for exact line numbers.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/protocol/architecture"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Architecture
        </a>
        <a
          href="/docs/protocol/state-layout"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          State Layout →
        </a>
      </div>
    </div>
  );
}
