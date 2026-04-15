import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function SphereAmm() {
  return (
    <div className="page-slide-in">
      <h1>Sphere AMM</h1>

      <p>
        The sphere invariant is the foundation of Orbital AMM. This page provides a complete
        derivation of why reserves must live on a sphere, how the center and radius are
        determined, and how instantaneous prices are computed.
      </p>

      <AnimationEmbed
        src="/docs/animations/01_sphere_amm.mp4"
        title="01 · Sphere AMM"
        caption="Reserves x ∈ ℝⁿ live on the sphere Σ(r − xᵢ)² = r². Every trade slides the point along the surface."
      />

      <h2 id="deriving-the-invariant">Deriving the Invariant</h2>

      <p>
        We start with a simple requirement: the AMM must preserve a conserved quantity that
        represents &quot;total liquidity&quot;. For a two-token pool, Uniswap uses the product
        invariant xy = k. For n tokens, we need a different approach.
      </p>

      <p>
        Consider n tokens with reserves x = (x₁, x₂, ..., xₙ). We want an invariant that:
      </p>

      <ol>
        <li>Is symmetric in all tokens (no token is special)</li>
        <li>Allows any token to be depleted to zero</li>
        <li>Has a bounded state space (reserves can&apos;t go to infinity)</li>
        <li>Gives well-defined prices at every point</li>
      </ol>

      <p>
        The sphere invariant satisfies all four:
      </p>

      <div className="katex-display">
        ∑ᵢ₌₁ⁿ (r − xᵢ)² = r²
      </div>

      <p>
        Expanding this:
      </p>

      <div className="katex-display">
        ∑ᵢ (r² − 2rxᵢ + xᵢ²) = r²
        <br />
        nr² − 2r∑ᵢxᵢ + ∑ᵢxᵢ² = r²
        <br />
        ∑ᵢxᵢ² − 2r∑ᵢxᵢ + (n−1)r² = 0
      </div>

      <h2 id="center-and-radius">Center and Radius</h2>

      <p>
        The sphere is centered at c = (r, r, ..., r). Why? Because the center must be
        equidistant from all axes — if one coordinate were different, that token would be
        &quot;special&quot;, violating symmetry.
      </p>

      <p>
        The sphere passes through (0, r, r, ..., r) — the single-token-depegged state.
        Plugging in:
      </p>

      <div className="katex-display">
        (r − 0)² + (r − r)² + ... + (r − r)² = r² + 0 + ... + 0 = r² ✓
      </div>

      <p>
        This confirms the radius is r. The radius controls total liquidity: larger r means
        more capital is required to move prices.
      </p>

      <h2 id="no-arbitrage-constraint">No-Arbitrage Constraint</h2>

      <p>
        Reserves must satisfy xᵢ ≤ r for all i. Why? If xᵢ &gt; r, then (r − xᵢ)² &gt; r²,
        which would make the sum exceed r² (since all other terms are non-negative).
        Geometrically, the reserve point would be outside the sphere.
      </p>

      <p>
        This gives us a natural price bound: as xᵢ → r, the price of token i goes to
        infinity. No arbitrage ensures reserves stay within the sphere.
      </p>

      <h2 id="instantaneous-pricing">Instantaneous Pricing</h2>

      <p>
        The price of token j in terms of token i is the ratio of their marginal changes.
        We derive it using implicit differentiation.
      </p>

      <p>
        Start with the invariant:
      </p>

      <div className="katex-display">
        F(x) = ∑ₖ(r − xₖ)² − r² = 0
      </div>

      <p>
        Differentiate with respect to xᵢ:
      </p>

      <div className="katex-display">
        ∂F/∂xᵢ = −2(r − xᵢ)
      </div>

      <p>
        Along the invariant surface, dF = 0, so:
      </p>

      <div className="katex-display">
        ∑ₖ (∂F/∂xₖ) dxₖ = 0
        <br />
        −2(r − xᵢ)dxᵢ − 2(r − xⱼ)dxⱼ = 0 (for a trade between i and j)
        <br />
        dxⱼ/dxᵢ = −(r − xᵢ)/(r − xⱼ)
      </div>

      <p>
        The instantaneous price is:
      </p>

      <div className="katex-display">
        price(Xⱼ/Xᵢ) = (r − xᵢ)/(r − xⱼ)
      </div>

      <p>
        At the equal-price point (where all reserves are equal), this simplifies to 1.
        As xᵢ → r (token i is depleted), the price goes to infinity.
      </p>

      <h2 id="the-equal-price-point">The Equal-Price Point</h2>

      <p>
        The equal-price point is where all tokens have the same marginal value. On the
        sphere, this is where the normal vector is parallel to (1, 1, ..., 1).
      </p>

      <p>
        Solving for this point gives:
      </p>

      <div className="katex-display">
        q = r(1 − 1/√n)
      </div>

      <p>
        For n = 5, this is q ≈ 0.553r. At this point, all tokens trade at parity.
      </p>

      <h2 id="geometric-interpretation">Geometric Interpretation</h2>

      <p>
        Think of the sphere as a &quot;liquidity surface&quot;. Trades move the reserve point
        along this surface. The path taken depends on the trade direction:
      </p>

      <ul>
        <li>
          Buying token i (removing xᵢ) moves the point toward the xᵢ = r boundary
        </li>
        <li>
          Selling token i (adding xᵢ) moves the point away from the boundary
        </li>
      </ul>

      <p>
        The sphere constraint ensures that every trade has a unique, well-defined outcome.
        There&apos;s no ambiguity about &quot;which way&quot; the point moves.
      </p>

      <blockquote>
        <strong>Note:</strong> The sphere invariant alone describes a uniform liquidity pool.
        Concentrated liquidity comes from restricting trades to subsets of the sphere via
        ticks, which we cover in <a href="/docs/math/ticks-and-caps">Ticks and Caps</a>.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/math/overview"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Math Overview
        </a>
        <a
          href="/docs/math/polar-decomposition"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Polar Decomposition →
        </a>
      </div>
    </div>
  );
}
