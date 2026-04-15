export default function FeeAccounting() {
  return (
    <div className="page-slide-in">
      <h1>Fee Accounting</h1>

      <p>
        taurusSwap uses the <strong>fee-growth-per-unit-of-radius</strong> pattern from
        Uniswap V3, adapted for Orbital&apos;s concentrated liquidity. This gives O(1)
        fee settlement regardless of how many trades happened.
      </p>

      <h2 id="the-pattern">The Pattern</h2>

      <p>
        On each swap, fees are accrued proportionally to each tick&apos;s liquidity:
      </p>

      <div className="katex-display">
        fee_growth[i] += fee_amount[i] × PRECISION / r_int
      </div>

      <p>
        where:
      </p>

      <ul>
        <li>
          <code>fee_amount[i]</code> is the fee collected in token i
        </li>
        <li>
          <code>r_int</code> is the total interior radius (active liquidity)
        </li>
        <li>
          <code>PRECISION = 10⁹</code> is a fixed-point scaling factor
        </li>
      </ul>

      <p>
        <code>fee_growth[i]</code> represents &quot;fees earned per unit of liquidity&quot;
        in token i. It&apos;s a global accumulator that only increases.
      </p>

      <h2 id="position-checkpoints">Position Checkpoints</h2>

      <p>
        Each LP position stores a checkpoint of <code>fee_growth</code> at the time of
        deposit (or last claim):
      </p>

      <pre><code className="language-typescript">{`interface Position {
  shares: bigint;
  feeCheckpoints: bigint[];  // One per token
}`}</code></pre>

      <p>
        When a position is created, the checkpoint is set to the current
        <code>fee_growth</code> values. The position doesn&apos;t earn fees from trades
        that happened before it existed.
      </p>

      <h2 id="claiming-fees">Claiming Fees</h2>

      <p>
        When an LP claims fees:
      </p>

      <div className="katex-display">
        claimable[i] = positionR × (fee_growth[i] − checkpoint[i]) / PRECISION
      </div>

      <p>
        where <code>positionR</code> is the position&apos;s share of the tick&apos;s total
        liquidity.
      </p>

      <pre><code className="language-python">{`@arc4.method
def claim_fees(
    tick_id: arc4.UInt64,
) -> arc4.DynamicArray[arc4.UInt64]:
    # Load position
    pos = load_position(Txn.sender, tick_id)

    # Load current fee_growth
    fee_growth = load_fee_growth()

    # Compute claimable per token
    claimable = []
    for i in range(n):
        delta_growth = fee_growth[i] - pos.feeCheckpoints[i]
        claim = pos.shares * delta_growth / PRECISION
        claimable.append(claim)

    # Update checkpoint to current
    pos.feeCheckpoints = fee_growth
    save_position(pos)

    # Emit inner transfers
    for i, amount in enumerate(claimable):
        if amount > 0:
            transfer_asset(token_asa[i], amount, Txn.sender)

    return claimable`}</code></pre>

      <h2 id="why-o1">Why O(1)?</h2>

      <p>
        Without this pattern, claiming fees would require:
      </p>

      <ol>
        <li>Iterating over all trades since the last claim</li>
        <li>Computing the position&apos;s share of each trade&apos;s fees</li>
        <li>Summing them up</li>
      </ol>

      <p>
        This is O(T) where T is the number of trades — potentially millions.
      </p>

      <p>
        With fee growth, claiming is:
      </p>

      <ol>
        <li>Read current <code>fee_growth</code> (n values)</li>
        <li>Subtract checkpoint (n subtractions)</li>
        <li>Multiply by shares (n multiplications)</li>
      </ol>

      <p>
        This is O(n) — constant time per claim, independent of trade count.
      </p>

      <h2 id="fee-distribution-across-ticks">Fee Distribution Across Ticks</h2>

      <p>
        When a swap crosses multiple ticks, fees are distributed proportionally:
      </p>

      <pre><code className="language-python">{`# For each tick that provided liquidity to this trade:
tick_fee_share = tick.r / total_liquidity_used
for i in range(n):
    tick_fee_growth[i] += (fee_amount[i] * tick_fee_share) / tick.r`}</code></pre>

      <p>
        This ensures LPs who provided liquidity for a specific segment of the trade
        are compensated fairly.
      </p>

      <h2 id="numerical-example">Numerical Example</h2>

      <p>
        Suppose:
      </p>

      <ul>
        <li><code>r_int = 1,000,000</code> (1M liquidity)</li>
        <li><code>fee_bps = 30</code> (0.3%)</li>
        <li>Trade: 100M USDC in, 99.7M USDT out</li>
        <li>Fee: 0.3M USDC</li>
      </ul>

      <p>
        Fee growth update:
      </p>

      <div className="katex-display">
        fee_growth[USDC] += 300,000 × 10⁹ / 1,000,000 = 3 × 10¹¹
      </div>

      <p>
        An LP with 10,000 shares (1% of liquidity) can claim:
      </p>

      <div className="katex-display">
        claim = 10,000 × 3 × 10¹¹ / 10⁹ = 3,000 USDC
      </div>

      <h2 id="precision-and-overflow">Precision and Overflow</h2>

      <p>
        <code>PRECISION = 10⁹</code> was chosen to balance:
      </p>

      <ul>
        <li>
          <strong>Precision</strong> — Small positions should still earn measurable fees
        </li>
        <li>
          <strong>Overflow risk</strong> — fee_growth is a uint64; too large PRECISION
          risks overflow
        </li>
      </ul>

      <p>
        At 10⁹, fee_growth can accumulate ~1.8 × 10¹⁰ before overflow — enough for
        trillions in volume.
      </p>

      <blockquote>
        <strong>Connection to SDK:</strong> The <code>readPosition</code> function returns
        both shares and pending fees (computed using this formula). Use it to show users
        their claimable balance before they sign.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/protocol/tick-crossing"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Tick Crossing
        </a>
        <a
          href="/docs/protocol/unit-scaling"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Unit Scaling →
        </a>
      </div>
    </div>
  );
}
