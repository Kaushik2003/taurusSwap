export default function Constants() {
  return (
    <div className="page-slide-in">
      <h1>Constants</h1>

      <p>
        All numeric constants used in taurusSwap, with explanations for why each
        specific value was chosen.
      </p>

      <h2 id="math-constants">Math Constants</h2>

      <h3 id="precision">PRECISION</h3>

      <pre><code>{`PRECISION = 1_000_000_000  // 10^9`}</code></pre>

      <p>
        Fixed-point scaling factor for fee growth and other fractional calculations.
        Chosen to provide 9 decimal places of precision while avoiding uint64 overflow.
      </p>

      <h3 id="amount-scale">AMOUNT_SCALE</h3>

      <pre><code>{`AMOUNT_SCALE = 1000`}</code></pre>

      <p>
        Divides raw microunit reserves before squaring to prevent overflow.
        Without this, squaring 50M tokens (5 × 10¹⁰ microunits) would give 2.5 × 10²¹,
        exceeding uint64 max (1.8 × 10¹⁹).
      </p>

      <h3 id="tolerance">TOLERANCE</h3>

      <pre><code>{`TOLERANCE = 1000`}</code></pre>

      <p>
        Allowed error margin for invariant checks. Accounts for integer division
        rounding and AMOUNT_SCALE precision loss.
      </p>

      <h2 id="fee-constants">Fee Constants</h2>

      <h3 id="default-fee-bps">DEFAULT_FEE_BPS</h3>

      <pre><code>{`DEFAULT_FEE_BPS = 30  // 0.3%`}</code></pre>

      <p>
        Default swap fee in basis points. Matches Uniswap V3&apos;s 0.3% tier for
        standard volatile pairs.
      </p>

      <h3 id="max-fee-bps">MAX_FEE_BPS</h3>

      <pre><code>{`MAX_FEE_BPS = 1000  // 10%`}</code></pre>

      <p>
        Maximum allowed fee. Prevents governance from setting exploitative fees.
      </p>

      <h2 id="trading-constants">Trading Constants</h2>

      <h3 id="default-slippage-bps">DEFAULT_SLIPPAGE_BPS</h3>

      <pre><code>{`DEFAULT_SLIPPAGE_BPS = 50  // 0.5%`}</code></pre>

      <p>
        Default slippage tolerance in the UI. Users can adjust this, but 0.5% is
        a sensible default for stablecoin swaps.
      </p>

      <h3 id="max-newton-iterations">MAX_NEWTON_ITERATIONS</h3>

      <pre><code>{`MAX_NEWTON_ITERATIONS = 50`}</code></pre>

      <p>
        Maximum iterations for Newton&apos;s method when solving the torus invariant.
        Typically converges in 10-20 iterations; 50 is a safe upper bound.
      </p>

      <h3 id="max-tick-crossings">MAX_TICK_CROSSINGS</h3>

      <pre><code>{`MAX_TICK_CROSSINGS = 20`}</code></pre>

      <p>
        Maximum number of ticks a single swap can cross. Prevents DoS via complex
        trade recipes. Most swaps cross 0-2 ticks.
      </p>

      <h2 id="storage-constants">Storage Constants</h2>

      <h3 id="max-ticks">MAX_TICKS</h3>

      <pre><code>{`MAX_TICKS = 256`}</code></pre>

      <p>
        Maximum number of active ticks per pool. Limited by box storage capacity
        (25 bytes per tick × 256 = 6.4KB).
      </p>

      <h3 id="box-key-prefixes">Box Key Prefixes</h3>

      <pre><code>{`TICK_PREFIX = "tick:"
POSITION_PREFIX = "pos:"
TOKEN_PREFIX = "token:"`}</code></pre>

      <p>
        String prefixes for box storage keys. Used to namespace different data types.
      </p>

      <h2 id="geometric-constants">Geometric Constants</h2>

      <h3 id="sqrt-n-cache">√n Cache</h3>

      <pre><code>{`const SQRT_N_CACHE = {
  2: 1.4142135623730951,
  3: 1.7320508075688772,
  4: 2.0,
  5: 2.23606797749979,
  // ...
};`}</code></pre>

      <p>
        Precomputed square roots for common pool sizes. Avoids runtime sqrt calls
        for constant values.
      </p>

      <h3 id="equal-price-point">Equal-Price Point Formula</h3>

      <pre><code>{`q = r * (1 - 1 / sqrt(n))`}</code></pre>

      <p>
        The reserve value at which all tokens trade at parity. For n=5, this is
        approximately 0.553r.
      </p>

      <h2 id="summary-table">Summary Table</h2>

      <table>
        <thead>
          <tr>
            <th>Constant</th>
            <th>Value</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>PRECISION</td>
            <td>10⁹</td>
            <td>Fixed-point math scaling</td>
          </tr>
          <tr>
            <td>AMOUNT_SCALE</td>
            <td>1000</td>
            <td>Overflow prevention</td>
          </tr>
          <tr>
            <td>TOLERANCE</td>
            <td>1000</td>
            <td>Invariant check margin</td>
          </tr>
          <tr>
            <td>DEFAULT_FEE_BPS</td>
            <td>30</td>
            <td>Default swap fee (0.3%)</td>
          </tr>
          <tr>
            <td>DEFAULT_SLIPPAGE_BPS</td>
            <td>50</td>
            <td>Default slippage (0.5%)</td>
          </tr>
          <tr>
            <td>MAX_NEWTON_ITERATIONS</td>
            <td>50</td>
            <td>Solver iteration limit</td>
          </tr>
          <tr>
            <td>MAX_TICK_CROSSINGS</td>
            <td>20</td>
            <td>Trade complexity limit</td>
          </tr>
          <tr>
            <td>MAX_TICKS</td>
            <td>256</td>
            <td>Max ticks per pool</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/reference/glossary"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Glossary
        </a>
        <a
          href="/docs/reference/deployed-addresses"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Deployed Addresses →
        </a>
      </div>
    </div>
  );
}
