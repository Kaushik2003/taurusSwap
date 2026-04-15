import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function TicksAndCaps() {
  return (
    <div className="page-slide-in">
      <h1>Ticks and Caps</h1>

      <p>
        Ticks are the mechanism that implements concentrated liquidity in Orbital AMM. Each
        tick provides liquidity only within a specific price range, defined geometrically
        as a spherical cap.
      </p>

      <AnimationEmbed
        src="/docs/animations/03_ticks_and_caps.mp4"
        title="03 · Ticks and Caps"
        caption="Ticks cut spherical caps around the equal-price point. When reserves hit the boundary, the tick is exhausted."
      />

      <h2 id="tick-parameters">Tick Parameters</h2>

      <p>
        A tick is defined by two parameters (r, k):
      </p>

      <ul>
        <li>
          <strong>r</strong> — The sphere radius (liquidity provided by this tick)
        </li>
        <li>
          <strong>k</strong> — The hyperplane offset (defines the price range)
        </li>
      </ul>

      <p>
        The tick&apos;s liquidity is active when reserves satisfy:
      </p>

      <div className="katex-display">
        x · v &lt; k
      </div>

      <p>
        where v = (1/√n, ..., 1/√n). When x · v = k, the tick boundary is hit and the
        tick is exhausted.
      </p>

      <h2 id="the-hyperplane-constraint">The Hyperplane Constraint</h2>

      <p>
        Geometrically, x · v = k defines a hyperplane orthogonal to the equal-price direction.
        This hyperplane cuts off a &quot;cap&quot; from the sphere — like slicing off the top
        of a basketball.
      </p>

      <p>
        The cap contains all reserve points where the tick is active. Outside the cap,
        the tick&apos;s liquidity is exhausted.
      </p>

      <h2 id="tick-bounds">Tick Bounds</h2>

      <p>
        The valid range for k is:
      </p>

      <div className="katex-display">
        k_min = r√n − r√(n−1)
        <br />
        k_max = r√n
      </div>

      <p>
        At k_min, the cap just touches the depletion boundary (where one token is zero).
        At k_max, the cap is the entire sphere.
      </p>

      <h2 id="virtual-reserves">Virtual Reserves</h2>

      <p>
        The most complex part of tick math is computing the &quot;virtual reserves&quot; —
        what the reserves would be if this tick were the only liquidity source.
      </p>

      <p>
        For a tick with parameters (r, k), the virtual reserve at the boundary is:
      </p>

      <div className="katex-display">
        x_min = r − (c + √[(n−1)(nr² − c²)])/n
        <br />
        where c = nr − k√n
      </div>

      <p>
        Derivation:
      </p>

      <ol>
        <li>
          At the boundary, x · v = k, so ∑ᵢxᵢ = k√n
        </li>
        <li>
          On the sphere, ∑ᵢ(r − xᵢ)² = r²
        </li>
        <li>
          By symmetry, at the cap edge, n−1 reserves are equal: x₂ = x₃ = ... = xₙ = y
        </li>
        <li>
          So x₁ + (n−1)y = k√n and (r − x₁)² + (n−1)(r − y)² = r²
        </li>
        <li>
          Solving this system gives the formula above
        </li>
      </ol>

      <h2 id="interior-vs-boundary">Interior vs Boundary</h2>

      <p>
        A tick has two states:
      </p>

      <ul>
        <li>
          <strong>Interior</strong> — Reserves are strictly inside the cap (x · v &lt; k).
          The tick provides liquidity according to the sphere invariant.
        </li>
        <li>
          <strong>Boundary</strong> — Reserves are at the cap edge (x · v = k). The tick
          is exhausted; further trades in this direction must use another tick.
        </li>
      </ul>

      <p>
        The contract tracks each tick&apos;s state in box storage. When a tick crosses from
        interior to boundary, the pool&apos;s consolidated state must be recomputed.
      </p>

      <h2 id="price-range-of-a-tick">Price Range of a Tick</h2>

      <p>
        The price range covered by a tick is determined by k. At the lower boundary
        (k = k_min), the price is at the depeg threshold. At the upper boundary
        (k = k_max), the price is at parity.
      </p>

      <p>
        For a depeg threshold of p (e.g., p = 0.99 for a 1% depeg), the corresponding
        k is:
      </p>

      <div className="katex-display">
        k = r√n · p
      </div>

      <p>
        This lets LPs specify price ranges in intuitive terms (&quot;I want to provide
        liquidity between 0.99 and 1.01&quot;) rather than geometric terms.
      </p>

      <blockquote>
        <strong>Note:</strong> The virtual reserve formula is the trickiest derivation in
        Orbital. If you&apos;re implementing your own SDK, verify it against the reference
        Python implementation.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/math/polar-decomposition"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Polar Decomposition
        </a>
        <a
          href="/docs/math/consolidation"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Consolidation →
        </a>
      </div>
    </div>
  );
}
