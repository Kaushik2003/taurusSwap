import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function MathOverview() {
  return (
    <div className="page-slide-in">
      <h1>Math Overview</h1>

      <p>
        This section provides a bird&apos;s-eye view of the mathematical pipeline that powers
        Orbital AMM. Understanding this flow is essential before diving into the individual
        derivations.
      </p>

      <h2 id="the-pipeline">The Pipeline</h2>

      <p>
        The math layer transforms raw token reserves into a geometric object that can be
        verified on-chain. Here&apos;s the complete pipeline:
      </p>

      <ol>
        <li>
          <strong>Reserves on a sphere</strong> — Token reserves x = (x₁, ..., xₙ) are
          constrained to live on the surface of an n-dimensional sphere centered at
          (r, r, ..., r) with radius r.
        </li>
        <li>
          <strong>Polar decomposition</strong> — We decompose reserves into two components:
          α (position along the equal-price axis) and w (orthogonal trading component).
        </li>
        <li>
          <strong>Ticks as spherical caps</strong> — Each tick cuts a cap off the sphere
          using a hyperplane constraint.
        </li>
        <li>
          <strong>Consolidation</strong> — Multiple ticks aggregate into a single interior
          sphere and a single boundary circle.
        </li>
        <li>
          <strong>Torus formation</strong> — The consolidated shape is a torus: the interior
          sphere swept around the boundary circle.
        </li>
        <li>
          <strong>Trade execution</strong> — Swaps are computed by solving the torus
          invariant for the new reserve state.
        </li>
      </ol>

      <h2 id="from-reserves-to-sphere">From Reserves to Sphere</h2>

      <p>
        The sphere invariant is the foundation:
      </p>

      <div className="katex-display">
        ∑ᵢ₌₁ⁿ (r − xᵢ)² = r²
      </div>

      <p>
        This equation ensures that reserves always sum to a fixed &quot;liquidity budget&quot;.
        When one token&apos;s reserve decreases (someone buys it), another&apos;s must increase.
        The sphere constraint is what makes this a zero-sum game.
      </p>

      <h2 id="polar-decomposition">Polar Decomposition</h2>

      <p>
        The key insight that makes O(1) verification possible is polar decomposition. We
        write reserves as:
      </p>

      <div className="katex-display">
        x = αv + w
      </div>

      <p>
        where v = (1/√n, ..., 1/√n) is the unit vector along the equal-price direction,
        α = (∑ᵢ xᵢ)/√n measures position along that direction, and w is orthogonal to v.
        The contract only needs to track ∑xᵢ and ∑xᵢ² to reconstruct the full state.
      </p>

      <AnimationEmbed
        src="/docs/animations/02_polar_decomposition.mp4"
        title="02 · Polar Decomposition"
        caption="Reserves decomposed into α (equal-price axis) and w (orthogonal trading component)."
      />

      <h2 id="ticks-and-caps">Ticks and Caps</h2>

      <p>
        A tick is defined by parameters (r, k) where r is the sphere radius and k is the
        hyperplane offset. The tick boundary is where:
      </p>

      <div className="katex-display">
        x · v = k
      </div>

      <p>
        When reserves hit this boundary, the tick is exhausted and the pool transitions
        to the next tick. This is how concentrated liquidity works: each tick provides
        liquidity only within its price range.
      </p>

      <h2 id="consolidation-to-torus">Consolidation to Torus</h2>

      <p>
        When multiple ticks are active, they consolidate into a single geometric object.
        Interior ticks (where reserves haven&apos;t hit the boundary) sum their radii linearly:
      </p>

      <div className="katex-display">
        r_int = ∑ rᵢ (for interior ticks)
      </div>

      <p>
        Boundary ticks contribute an effective radius in the orthogonal subspace:
      </p>

      <div className="katex-display">
        s_bound = ∑ √(rᵢ² − (kᵢ − rᵢ√n)²)
      </div>

      <p>
        The combined shape is a torus — imagine taking the interior sphere and sweeping
        it around the boundary circle.
      </p>

      <AnimationEmbed
        src="/docs/animations/04_consolidation.mp4"
        title="04 · Consolidation to Torus"
        caption="Multiple ticks collapse into a single torus: interior sphere swept around boundary circle."
      />

      <h2 id="the-torus-invariant">The Torus Invariant</h2>

      <p>
        The master equation that the contract verifies is:
      </p>

      <div className="katex-display">
        r_int² = (α_int − r_int√n)² + (‖w‖ − s_bound)²
      </div>

      <p>
        Given the pre-trade state (r_int, s_bound) and the proposed trade (Δx_in, Δx_out),
        the contract computes the post-trade state and checks that this equation holds.
        This is O(1) verification regardless of how many tokens or ticks are involved.
      </p>

      <h2 id="what-comes-next">What Comes Next</h2>

      <p>
        The following pages derive each piece in detail:
      </p>

      <ul>
        <li>
          <a href="/docs/math/sphere-amm">Sphere AMM</a> — Full derivation of the sphere
          invariant and instantaneous pricing
        </li>
        <li>
          <a href="/docs/math/polar-decomposition">Polar Decomposition</a> — Why x = αv + w
          is the right move
        </li>
        <li>
          <a href="/docs/math/ticks-and-caps">Ticks and Caps</a> — Tick geometry and virtual
          reserves
        </li>
        <li>
          <a href="/docs/math/consolidation">Consolidation</a> — How multiple ticks collapse
        </li>
        <li>
          <a href="/docs/math/torus-invariant">Torus Invariant</a> — The master equation
        </li>
        <li>
          <a href="/docs/math/capital-efficiency">Capital Efficiency</a> — The sales pitch,
          formalized
        </li>
      </ul>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/introduction/quickstart"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Quickstart
        </a>
        <a
          href="/docs/math/sphere-amm"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Sphere AMM →
        </a>
      </div>
    </div>
  );
}
