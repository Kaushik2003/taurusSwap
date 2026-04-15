import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function SwapVerification() {
  return (
    <div className="page-slide-in">
      <h1>Swap Verification</h1>

      <p>
        This page shows how the contract verifies a swap — the core operation of the
        protocol. We&apos;ll walk through the step-by-step logic and show the corresponding
        PyTeal pseudocode.
      </p>

      <AnimationEmbed
        src="/docs/animations/05_trade_execution.mp4"
        title="05 · Trade Execution"
        caption="A swap moves the reserve point along the torus surface. The invariant is verified on-chain."
      />

      <h2 id="verification-steps">Verification Steps</h2>

      <p>
        For a simple swap (no tick crossings), the contract:
      </p>

      <ol>
        <li>Verifies the input ASA transfer</li>
        <li>Reads old state (sumX, sumXSq)</li>
        <li>Computes new state from the trade</li>
        <li>Evaluates the torus invariant</li>
        <li>Checks tolerance and minOut</li>
        <li>Updates state</li>
        <li>Emits inner transaction for output</li>
      </ol>

      <h2 id="pseudocode">Pseudocode</h2>

      <pre><code className="language-python">{`# Step 1: Verify input ASA transfer
assert gtxn[0].type == acfg.AssetTransferTx
assert gtxn[0].asset_receiver == Global.current_application_address
assert gtxn[0].xfer_asset == token_asa[token_in_index]
assert gtxn[0].amount >= amount_in

# Step 2: Read old state
sumX_old = GlobalState['sumX']
sumXSq_old = GlobalState['sumXSq']
r_int = GlobalState['rInt']
s_bound = GlobalState['sBound']

# Step 3: Compute new state
# Trade: sell amount_in of token_in, receive claimed_out of token_out
scaled_in = amount_in / AMOUNT_SCALE
scaled_out = claimed_out / AMOUNT_SCALE

sumX_new = sumX_old + scaled_in - scaled_out

# sumXSq update: (x + Δin)² - x² + (x - Δout)² - x²
# = 2x·Δin + Δin² - 2x·Δout + Δout²
x_in = reserves[token_in_index] / AMOUNT_SCALE
x_out = reserves[token_out_index] / AMOUNT_SCALE

sumXSq_new = sumXSq_old + \
    2 * x_in * scaled_in + scaled_in ** 2 - \
    2 * x_out * scaled_out + scaled_out ** 2

# Step 4: Evaluate torus invariant
# LHS = r_int²
lhs = r_int ** 2

# RHS = (α_int - r_int * √n)² + (‖w‖ - s_bound)²
alpha_int = sumX_new / sqrt(n)
norm_w_sq = sumXSq_new - (sumX_new ** 2) / n
norm_w = sqrt(norm_w_sq)

rhs = (alpha_int - r_int * sqrt(n)) ** 2 + \
      (norm_w - s_bound) ** 2

# Step 5: Check tolerance
assert abs(lhs - rhs) <= TOLERANCE
assert claimed_out >= min_out

# Step 6: Update state
GlobalState['sumX'] = sumX_new
GlobalState['sumXSq'] = sumXSq_new

# Update reserves array
reserves[token_in_index] += amount_in
reserves[token_out_index] -= claimed_out
box_put('reserves', reserves)

# Step 7: Emit inner transaction
inner = InnerTxnBuilder.Begin()
inner.set_asset_transfer(
    asset=token_asa[token_out_index],
    amount=claimed_out,
    receiver=Txn.sender,
    close_remainder_to=Txn.sender
)
inner.submit()`}</code></pre>

      <h2 id="key-operations">Key Operations</h2>

      <h3 id="512-bit-multiplication">512-bit Multiplication</h3>

      <p>
        When computing <code>scaled_in ** 2</code>, the result can exceed 2⁶⁴. The contract
        uses <code>mulw</code> to get both low and high 64-bit words:
      </p>

      <pre><code className="language-python">{`# PyTeal: (a * b) with 512-bit result
def mul512(a: Expr, b: Expr) -> Tuple[Expr, Expr]:
    return (
        # Low 64 bits
        b * a,
        # High 64 bits (via mulw)
        Pop(Concat(b, a))  # mulw pushes low, high; we keep high
    )`}</code></pre>

      <h3 id="integer-square-root">Integer Square Root</h3>

      <p>
        The AVM&apos;s <code>sqrt</code> opcode computes floor(√x):
      </p>

      <pre><code className="language-python">{`# PyTeal: integer sqrt
def isqrt(x: Expr) -> Expr:
    return Sqrt(x)  # TEAL 8+ opcode`}</code></pre>

      <h3 id="tolerance-check">Tolerance Check</h3>

      <p>
        Due to integer division and AMOUNT_SCALE, exact equality is impossible. The
        contract uses:
      </p>

      <pre><code className="language-python">{`TOLERANCE = 1000  # In scaled math space

def verify_invariant(lhs: Expr, rhs: Expr) -> Expr:
    diff = If(lhs > rhs, lhs - rhs, rhs - lhs)
    return diff <= TOLERANCE`}</code></pre>

      <h2 id="fee-deduction">Fee Deduction</h2>

      <p>
        Before verification, the contract deducts fees from the input:
      </p>

      <pre><code className="language-python">{`fee_bps = GlobalState['fee_bps']  # e.g., 30 = 0.3%
fee_amount = (amount_in * fee_bps) / 10000
amount_in_after_fee = amount_in - fee_amount

# Fee is added to fee_growth (see fee-accounting)
fee_growth[token_in_index] += \
    (fee_amount / r_int) * PRECISION`}</code></pre>

      <h2 id="crossing-verification">Crossing Verification</h2>

      <p>
        For <code>swap_with_crossings</code>, each segment includes a <code>tickCrossedId</code>.
        The contract verifies the crossing condition:
      </p>

      <pre><code className="language-python">{`# Crossing condition: α_int normalized == k normalized
# i.e., sumX / (r_int * √n) == k / (r * √n)

def verify_crossing(
    sumX: Expr,
    r_int: Expr,
    k_tick: Expr,
    r_tick: Expr
) -> Expr:
    # Cross-multiplied to avoid division:
    # sumX * r * √n == k * r_int * √n
    # sumX * r == k * r_int
    return sumX * r_tick == k_tick * r_int`}</code></pre>

      <p>
        If the crossing is valid, the tick&apos;s state is flipped and the pool is
        re-consolidated.
      </p>

      <blockquote>
        <strong>Note:</strong> The actual PyTeal is more verbose due to type checking
        and error handling. See <code>contract/swap.py</code> for the full implementation.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/protocol/state-layout"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← State Layout
        </a>
        <a
          href="/docs/protocol/tick-crossing"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Tick Crossing →
        </a>
      </div>
    </div>
  );
}
