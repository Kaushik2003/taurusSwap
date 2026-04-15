export default function TickCrossing() {
  return (
    <div className="page-slide-in">
      <h1>Tick Crossing</h1>

      <p>
        Tick crossing is the most complex operation in Orbital AMM. When a trade moves
        reserves across a tick boundary, the pool&apos;s consolidated state must be
        recomputed. This page explains the crossing condition and the trade recipe format.
      </p>

      <h2 id="the-crossing-condition">The Crossing Condition</h2>

      <p>
        A tick is at the boundary when:
      </p>

      <div className="katex-display">
        x · v = k
      </div>

      <p>
        In terms of tracked state:
      </p>

      <div className="katex-display">
        sumX / √n = k
        <br />
        sumX = k√n
      </div>

      <p>
        For a consolidated pool with multiple ticks, the condition is:
      </p>

      <div className="katex-display">
        α_int = k_bound
        <br />
        sumX / (r_int√n) = k_bound / (r_bound√n)
        <br />
        sumX · r_bound = k_bound · r_int
      </div>

      <p>
        This cross-multiplied form avoids division and is what the contract checks.
      </p>

      <h2 id="trade-recipe-format">Trade Recipe Format</h2>

      <p>
        The SDK computes the full trade path off-chain and submits it as a recipe:
      </p>

      <pre><code className="language-typescript">{`interface TradeSegment {
  amountIn: bigint;
  amountOut: bigint;
  tickCrossedId: number;  // 0 if no crossing
  newTickState: number;   // 0=INTERIOR, 1=BOUNDARY
}

// Example: swap that crosses 2 ticks
const recipe: TradeSegment[] = [
  {
    amountIn: 50_000_000n,
    amountOut: 49_876_543n,
    tickCrossedId: 0,  // No crossing in first segment
    newTickState: 0
  },
  {
    amountIn: 50_000_000n,
    amountOut: 49_654_321n,
    tickCrossedId: 42,  // Crossing tick 42
    newTickState: 1     // Tick becomes BOUNDARY
  },
  {
    amountIn: 0n,
    amountOut: 12_345_678n,
    tickCrossedId: 17,  // Crossing tick 17
    newTickState: 0     // Tick becomes INTERIOR
  }
];`}</code></pre>

      <h2 id="verification-loop">Verification Loop</h2>

      <p>
        The contract verifies each segment sequentially:
      </p>

      <pre><code className="language-python">{`for segment in trade_recipe:
    # 1. Apply segment's input/output
    sumX = sumX + segment.amountIn - segment.amountOut
    sumXSq = update_sumXSq(sumXSq, segment, reserves)

    # 2. Verify invariant holds after this segment
    lhs = r_int ** 2
    rhs = compute_rhs(sumX, sumXSq, r_int, s_bound)
    assert abs(lhs - rhs) <= TOLERANCE

    # 3. If crossing claimed, verify and flip tick
    if segment.tickCrossedId != 0:
        tick = load_tick(segment.tickCrossedId)

        # Verify crossing condition
        assert sumX * tick.r == tick.k * r_int

        # Flip tick state
        old_state = tick.state
        tick.state = segment.newTickState

        # Re-consolidate
        if old_state == INTERIOR:
            r_int -= tick.r
            s_bound += tick.effective_radius
        else:
            s_bound -= tick.effective_radius
            r_int += tick.r

        # Update k_bound if this tick is now outermost
        if segment.newTickState == BOUNDARY:
            k_bound = max(k_bound, tick.k)

        save_tick(tick)

# Final check: total output >= minOut
assert total_output >= min_out`}</code></pre>

      <h2 id="why-binary-search-off-chain">Why Binary Search Off-Chain?</h2>

      <p>
        Computing which ticks will cross requires:
      </p>

      <ol>
        <li>
          Starting from the current state, simulate the trade
        </li>
        <li>
          Check if the crossing condition is met
        </li>
        <li>
          If yes, flip the tick and continue with remaining input
        </li>
        <li>
          Repeat until all input is consumed
        </li>
      </ol>

      <p>
        This is inherently iterative — the number of iterations depends on the trade
        size and tick configuration. On-chain, this would be unbounded gas.
      </p>

      <p>
        Off-chain, the SDK can use binary search to efficiently find crossing points:
      </p>

      <pre><code className="language-python">{`# SDK: Find how much input is needed to reach tick boundary
def find_crossing_input(pool_state, tick) -> float:
    # Current α_int
    alpha = pool_state.sumX / sqrt(pool_state.n)

    # Distance to boundary
    delta_alpha = tick.k - alpha

    # Input needed (approximate, ignores curvature)
    return delta_alpha * sqrt(pool_state.n)

# Binary search for exact amount
low, high = 0, total_input
while high - low > epsilon:
    mid = (low + high) / 2
    simulated = simulate_trade(pool_state, mid)
    if crossed_boundary(simulated, tick):
        high = mid
    else:
        low = mid
return high`}</code></pre>

      <h2 id="re-consolidation-after-crossing">Re-Consolidation After Crossing</h2>

      <p>
        When a tick crosses, the consolidated state changes:
      </p>

      <ul>
        <li>
          <strong>INTERIOR → BOUNDARY</strong>: Remove r from r_int, add effective_radius
          to s_bound
        </li>
        <li>
          <strong>BOUNDARY → INTERIOR</strong>: Remove effective_radius from s_bound,
          add r to r_int
        </li>
      </ul>

      <p>
        The effective_radius of a boundary tick is:
      </p>

      <div className="katex-display">
        s_eff = √(r² − (k − r√n)²)
      </div>

      <p>
        This is computed once when the tick is added and cached in the tick box.
      </p>

      <h2 id="max-crossings-limit">Max Crossings Limit</h2>

      <p>
        To prevent DoS via complex trade recipes, the contract enforces:
      </p>

      <pre><code className="language-python">{`MAX_TICK_CROSSINGS = 20

assert len(trade_recipe) <= MAX_TICK_CROSSINGS`}</code></pre>

      <p>
        In practice, most swaps cross 0-2 ticks. The limit is only hit for very large
        trades that exhaust multiple liquidity zones.
      </p>

      <blockquote>
        <strong>Implementation note:</strong> The SDK&apos;s <code>getSwapQuote</code>
        function returns the trade recipe. Pass it directly to <code>swap_with_crossings</code>.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/protocol/swap-verification"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Swap Verification
        </a>
        <a
          href="/docs/protocol/fee-accounting"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Fee Accounting →
        </a>
      </div>
    </div>
  );
}
