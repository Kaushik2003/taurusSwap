export default function Architecture() {
  return (
    <div className="page-slide-in">
      <h1>Protocol Architecture</h1>

      <p>
        taurusSwap follows a <strong>compute-off-chain, verify-on-chain</strong> pattern.
        This is essential for scalability: the heavy computation (solving the torus invariant
        for trade output) happens in the SDK, while the contract performs O(1) verification.
      </p>

      <h2 id="the-pattern">The Pattern</h2>

      <p>
        On-chain trade computation would require solving a quartic equation (Newton&apos;s
        method iteration), which is too expensive for the AVM opcode budget. Instead:
      </p>

      <ol>
        <li>
          <strong>Frontend</strong> — User inputs swap parameters (token in, token out, amount)
        </li>
        <li>
          <strong>SDK</strong> — Computes the trade output by solving the torus invariant,
          returns a quote with claimedOut
        </li>
        <li>
          <strong>Transaction Group</strong> — User signs ASA transfer (input) + app call
          (with claimedOut)
        </li>
        <li>
          <strong>Contract</strong> — Verifies the torus invariant still holds with the
          new state, checks claimedOut ≥ minOut, emits inner transaction payout
        </li>
      </ol>

      <p>
        The key insight: verification is always O(1), regardless of how many tokens or
        ticks are involved. The contract never solves equations — it only checks that
        the proposed solution is valid.
      </p>

      <h2 id="data-flow">Data Flow</h2>

      <pre><code>{`┌─────────────┐
│  Frontend   │
│  (React UI) │
└──────┬──────┘
       │ user input
       ▼
┌─────────────────────────┐
│  SDK (compute quote)    │
│  - readPoolState        │
│  - getSwapQuote         │
│  - solve torus invariant│
└──────────┬──────────────┘
           │ quote: { amountOut, priceImpact }
           ▼
┌─────────────────────────┐
│  Transaction Group      │
│  - ASA transfer (in)    │
│  - App call (swap)      │
│  - Signed by user       │
└──────────┬──────────────┘
           │ atomic group
           ▼
┌─────────────────────────┐
│  Contract (verify)      │
│  - read old state       │
│  - compute new sumX,    │
│    sumXSq from trade    │
│  - evaluate invariant   │
│  - check tolerance      │
│  - inner tx payout      │
└─────────────────────────┘`}</code></pre>

      <h2 id="smart-contract-methods">Smart Contract Methods</h2>

      <p>
        The contract exposes these ARC-4 methods:
      </p>

      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>swap</code></td>
            <td>Simple swap without tick crossings</td>
          </tr>
          <tr>
            <td><code>swap_with_crossings</code></td>
            <td>Swap that crosses one or more tick boundaries</td>
          </tr>
          <tr>
            <td><code>add_tick</code></td>
            <td>Add a new tick (LP provides liquidity)</td>
          </tr>
          <tr>
            <td><code>remove_liquidity</code></td>
            <td>Remove liquidity from a tick position</td>
          </tr>
          <tr>
            <td><code>claim_fees</code></td>
            <td>Claim accrued fees from a position</td>
          </tr>
          <tr>
            <td><code>get_pool_state</code></td>
            <td>Read-only: return global state</td>
          </tr>
          <tr>
            <td><code>get_tick_state</code></td>
            <td>Read-only: return tick state by ID</td>
          </tr>
        </tbody>
      </table>

      <h2 id="atomic-composition">Atomic Composition</h2>

      <p>
        Algorand&apos;s atomic transaction groups enable safe composition:
      </p>

      <ul>
        <li>
          <strong>Add liquidity</strong> — n ASA transfers (one per token) + app call, all
          in one group
        </li>
        <li>
          <strong>Swap</strong> — ASA transfer (input) + app call + inner ASA transfer
          (output), all atomic
        </li>
        <li>
          <strong>Remove liquidity</strong> — App call + inner ASA transfers (output),
          all atomic
        </li>
      </ul>

      <p>
        Either all transactions succeed or all fail. There&apos;s no intermediate state
        where the user has transferred input but not received output.
      </p>

      <h2 id="why-not-compute-on-chain">Why Not Compute On-Chain?</h2>

      <p>
        Solving the torus invariant for Δx_out given Δx_in requires:
      </p>

      <ol>
        <li>Substituting the trade into the invariant</li>
        <li>Expanding to get a quartic equation</li>
        <li>Using Newton&apos;s method to find the root</li>
      </ol>

      <p>
        Newton&apos;s method typically requires 10-20 iterations for convergence. Each
        iteration involves multiple 512-bit multiplications and a division. On the AVM,
        this would exceed the opcode budget for a single transaction.
      </p>

      <p>
        By moving computation off-chain, the contract only needs to:
      </p>

      <ul>
        <li>Read 2 state values (sumX, sumXSq)</li>
        <li>Compute new values from the trade (O(1))</li>
        <li>Evaluate the invariant (O(1))</li>
        <li>Check tolerance (O(1))</li>
      </ul>

      <p>
        This fits comfortably within the opcode budget, even for large n.
      </p>

      <blockquote>
        <strong>Note:</strong> The opcode budget pooling pattern (multiple app calls in
        one group sharing a budget) could enable on-chain computation for small n, but
        it&apos;s unnecessary complexity. Off-chain compute is simpler and cheaper.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/math/capital-efficiency"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Capital Efficiency
        </a>
        <a
          href="/docs/protocol/smart-contract"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Smart Contract →
        </a>
      </div>
    </div>
  );
}
