export default function UnitScaling() {
  return (
    <div className="page-slide-in">
      <h1>Unit Scaling</h1>

      <p>
        Orbital AMM uses three layers of unit scaling to prevent overflow while maintaining
        precision. This page explains why each layer exists and provides a conversion
        cheat sheet.
      </p>

      <h2 id="the-three-layers">The Three Layers</h2>

      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Unit</th>
            <th>Example (1M USDC)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Raw</strong></td>
            <td>Microunits (ASA)</td>
            <td>1,000,000,000,000 (10¹²)</td>
          </tr>
          <tr>
            <td><strong>Scaled</strong></td>
            <td>AMOUNT_SCALE units</td>
            <td>1,000,000,000 (10⁹)</td>
          </tr>
          <tr>
            <td><strong>Math</strong></td>
            <td>PRECISION units</td>
            <td>1,000,000 (10⁶)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="why-scaling-is-needed">Why Scaling Is Needed</h2>

      <p>
        The torus invariant requires computing squares of reserves:
      </p>

      <div className="katex-display">
        sumXSq = ∑xᵢ²
      </div>

      <p>
        For a pool with 50,000 USDC (50,000 × 10⁶ = 5 × 10¹⁰ microunits):
      </p>

      <div className="katex-display">
        (5 × 10¹⁰)² = 2.5 × 10²¹
      </div>

      <p>
        This exceeds uint64 max (~1.8 × 10¹⁹) by 100×. We need to scale down before
        squaring.
      </p>

      <h2 id="amount-scale">AMOUNT_SCALE</h2>

      <p>
        <code>AMOUNT_SCALE = 1000</code> divides reserves before math operations:
      </p>

      <pre><code className="language-python">{`AMOUNT_SCALE = 1000

# Convert raw to scaled
scaled = raw // AMOUNT_SCALE

# Now squaring 50M tokens:
# (50,000,000,000 / 1000)² = (50,000,000)² = 2.5 × 10¹⁵
# This fits in uint64 ✓`}</code></pre>

      <p>
        After scaling by 1000, the max square is 2.5 × 10¹⁵ — well within uint64 range.
      </p>

      <h2 id="precision">PRECISION</h2>

      <p>
        <code>PRECISION = 10⁹</code> is used for fee growth and other fixed-point
        calculations:
      </p>

      <pre><code className="language-python">{`PRECISION = 1_000_000_000

# Fee growth per unit of liquidity
fee_growth += fee_amount * PRECISION // r_int`}</code></pre>

      <p>
        PRECISION provides 9 decimal places of precision — enough for small fee
        accruals without overflow.
      </p>

      <h2 id="conversion-cheat-sheet">Conversion Cheat Sheet</h2>

      <pre><code className="language-python">{`# Raw → Scaled
scaled = raw // AMOUNT_SCALE  # Divide by 1000

# Scaled → Raw
raw = scaled * AMOUNT_SCALE  # Multiply by 1000

# Scaled → Math (PRECISION units)
math = scaled * PRECISION // AMOUNT_SCALE

# Math → Scaled
scaled = math * AMOUNT_SCALE // PRECISION

# Raw → Display (human-readable)
display = raw / (10 ** decimals)  # e.g., / 10⁶ for USDC

# Display → Raw
raw = int(display * (10 ** decimals))`}</code></pre>

      <h2 id="example-conversions">Example Conversions</h2>

      <p>
        For 1M USDC (6 decimals):
      </p>

      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Formula</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Display (1M)</td>
            <td>Raw</td>
            <td>1M × 10⁶</td>
            <td>10¹²</td>
          </tr>
          <tr>
            <td>Raw</td>
            <td>Scaled</td>
            <td>10¹² / 1000</td>
            <td>10⁹</td>
          </tr>
          <tr>
            <td>Scaled</td>
            <td>Math</td>
            <td>10⁹ × 10⁹ / 1000</td>
            <td>10¹⁵</td>
          </tr>
          <tr>
            <td>Math</td>
            <td>Display</td>
            <td>10¹⁵ / 10⁹ / 10⁶</td>
            <td>1M</td>
          </tr>
        </tbody>
      </table>

      <h2 id="overflow-prevention">Overflow Prevention</h2>

      <p>
        The contract enforces scaling at every step:
      </p>

      <pre><code className="language-python">{`# Before any squaring:
assert x < MAX_SAFE_SQUARE_INPUT
# MAX_SAFE_SQUARE_INPUT = floor(sqrt(2⁶⁴ - 1)) ≈ 4.29 × 10⁹

# After AMOUNT_SCALE, max reserve is ~5 × 10⁷
# Square is ~2.5 × 10¹⁵, well below limit ✓`}</code></pre>

      <h2 id="precision-loss">Precision Loss</h2>

      <p>
        Integer division introduces rounding errors. The contract uses:
      </p>

      <ul>
        <li>
          <strong>Truncation</strong> — <code>a // b</code> always rounds down
        </li>
        <li>
          <strong>Tolerance</strong> — Invariant checks allow ±1000 error
        </li>
      </ul>

      <p>
        For typical pool sizes (1M-100M), precision loss is &lt; 0.01%. For very small
        pools (&lt; 10k), it can reach 1%.
      </p>

      <blockquote>
        <strong>SDK note:</strong> The SDK handles all conversions internally. You work
        with display units (1M USDC), and it converts to raw/scaled/math as needed.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/protocol/fee-accounting"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Fee Accounting
        </a>
        <a
          href="/docs/sdk/overview"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          SDK Overview →
        </a>
      </div>
    </div>
  );
}
