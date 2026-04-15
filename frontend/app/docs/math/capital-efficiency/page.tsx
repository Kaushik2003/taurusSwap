import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function CapitalEfficiency() {
  return (
    <div className="page-slide-in">
      <h1>Capital Efficiency</h1>

      <p>
        This is the sales pitch for Orbital AMM, formalized. We&apos;ll derive the efficiency
        multiplier and show why concentrated liquidity is essential for stablecoin trading.
      </p>

      <AnimationEmbed
        src="/docs/animations/05_trade_execution.mp4"
        title="05 · Trade Execution"
        caption="A swap moves the reserve point along the torus surface. The invariant is verified on-chain."
      />

      <h2 id="the-efficiency-formula">The Efficiency Formula</h2>

      <p>
        Capital efficiency is defined as:
      </p>

      <div className="katex-display">
        efficiency = q / (q − x_min)
      </div>

      <p>
        where:
      </p>

      <ul>
        <li>
          q = r(1 − 1/√n) is the equal-price point reserve
        </li>
        <li>
          x_min is the virtual reserve at the depeg threshold
        </li>
      </ul>

      <p>
        Intuitively: efficiency measures how much more capital is deployed at the current
        price compared to a uniform liquidity pool.
      </p>

      <h2 id="derivation">Derivation</h2>

      <p>
        In a uniform pool (like Curve), liquidity is spread across all possible prices.
        Most of this liquidity is never used — it&apos;s &quot;out of the money&quot; at
        the current price.
      </p>

      <p>
        In Orbital, LPs can concentrate liquidity within a specific price range. The
        capital that would have been &quot;wasted&quot; on unused price ranges is now
        deployed where trades actually happen.
      </p>

      <p>
        The ratio q / (q − x_min) captures this:
      </p>

      <ul>
        <li>
          q represents the &quot;active&quot; capital at the current price
        </li>
        <li>
          x_min represents the capital at the edge of the price range
        </li>
        <li>
          The denominator is the &quot;wasted&quot; capital in a uniform pool
        </li>
      </ul>

      <h2 id="numerical-example">Numerical Example</h2>

      <p>
        For n = 5 tokens at a 0.99 depeg threshold:
      </p>

      <div className="katex-display">
        q = r(1 − 1/√5) ≈ 0.553r
        <br />
        x_min ≈ 0.549r (computed from the virtual reserve formula)
        <br />
        efficiency = 0.553r / (0.553r − 0.549r) ≈ 150×
      </div>

      <p>
        This means Orbital provides 150× more liquidity at the current price than Curve
        would with the same capital.
      </p>

      <h2 id="efficiency-at-different-depeg-thresholds">Efficiency at Different Depeg Thresholds</h2>

      <table>
        <thead>
          <tr>
            <th>Depeg Threshold</th>
            <th>Efficiency (n=5)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0.90</td>
            <td>~15×</td>
          </tr>
          <tr>
            <td>0.95</td>
            <td>~30×</td>
          </tr>
          <tr>
            <td>0.99</td>
            <td>~150×</td>
          </tr>
          <tr>
            <td>0.995</td>
            <td>~300×</td>
          </tr>
          <tr>
            <td>0.999</td>
            <td>~1500×</td>
          </tr>
        </tbody>
      </table>

      <p>
        Tighter ticks (higher depeg thresholds) mean more efficiency but narrower price
        coverage. The choice depends on how stable you expect the tokens to be.
      </p>

      <h2 id="the-tradeoff">The Tradeoff</h2>

      <p>
        Concentrated liquidity is a bet on price stability. If a token depegs beyond your
        tick range, your liquidity becomes inactive — you&apos;re no longer earning fees,
        and you&apos;re holding only the depegged token.
      </p>

      <p>
        This is the same tradeoff as Uniswap V3: higher returns in exchange for active
        management. Orbital just generalizes it to n tokens.
      </p>

      <h2 id="comparison-to-curve">Comparison to Curve</h2>

      <p>
        Curve&apos;s stableswap invariant provides about 1-2× capital efficiency for
        stablecoins (depending on the specific implementation). Orbital&apos;s 150× is
        two orders of magnitude better.
      </p>

      <p>
        The difference: Curve&apos;s liquidity is uniform across all price ratios.
        Orbital&apos;s is concentrated where stablecoins actually trade.
      </p>

      <blockquote>
        <strong>Real-world impact:</strong> For a $10M liquidity pool, Orbital provides
        the same effective liquidity as a $1.5B Curve pool. This is why concentrated
        liquidity is essential for efficient stablecoin trading.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/math/torus-invariant"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Torus Invariant
        </a>
        <a
          href="/docs/protocol/architecture"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Protocol Architecture →
        </a>
      </div>
    </div>
  );
}
