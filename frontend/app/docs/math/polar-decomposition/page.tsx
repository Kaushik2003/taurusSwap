import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function PolarDecomposition() {
  return (
    <div className="page-slide-in">
      <h1>Polar Decomposition</h1>

      <p>
        Polar decomposition is the mathematical trick that makes O(1) on-chain verification
        possible. Instead of tracking the full n-dimensional reserve vector, the contract
        only needs two scalar values.
      </p>

      <AnimationEmbed
        src="/docs/animations/02_polar_decomposition.mp4"
        title="02 · Polar Decomposition"
        caption="Reserves decomposed into α (equal-price axis) and w (orthogonal trading component)."
      />

      <h2 id="the-decomposition">The Decomposition</h2>

      <p>
        We write the reserve vector as:
      </p>

      <div className="katex-display">
        x = αv + w
      </div>

      <p>
        where:
      </p>

      <ul>
        <li>
          v = (1/√n, 1/√n, ..., 1/√n) is the unit vector along the equal-price direction
        </li>
        <li>
          α = (∑ᵢ xᵢ)/√n is the projection of x onto v
        </li>
        <li>
          w = x − αv is the component orthogonal to v
        </li>
      </ul>

      <p>
        Geometrically, α measures &quot;how far along the equal-price axis&quot; the pool is,
        while w captures the &quot;imbalance&quot; — how far from equal prices the pool has moved.
      </p>

      <h2 id="deriving-alpha">Deriving α</h2>

      <p>
        The projection of x onto v is:
      </p>

      <div className="katex-display">
        α = x · v = ∑ᵢ xᵢ(1/√n) = (∑ᵢ xᵢ)/√n
      </div>

      <p>
        This is just the sum of reserves, scaled by √n. The contract tracks ∑ᵢxᵢ directly,
        so α is free to compute.
      </p>

      <h2 id="the-orthogonal-component">The Orthogonal Component</h2>

      <p>
        The squared norm of w is:
      </p>

      <div className="katex-display">
        ‖w‖² = ‖x − αv‖²
        <br />
        = ‖x‖² − 2α(x · v) + α²‖v‖²
        <br />
        = ‖x‖² − 2α² + α² (since ‖v‖² = 1 and x · v = α)
        <br />
        = ‖x‖² − α²
      </div>

      <p>
        Substituting α = (∑xᵢ)/√n:
      </p>

      <div className="katex-display">
        ‖w‖² = ∑ᵢxᵢ² − (∑ᵢxᵢ)²/n
      </div>

      <p>
        This is the variance formula! ‖w‖² measures how &quot;spread out&quot; the reserves are
        from their mean. When all reserves are equal, ‖w‖² = 0.
      </p>

      <h2 id="why-this-matters">Why This Matters</h2>

      <p>
        The contract stores only two values:
      </p>

      <ul>
        <li><code>sumX = ∑ᵢxᵢ</code></li>
        <li><code>sumXSq = ∑ᵢxᵢ²</code></li>
      </ul>

      <p>
        From these, it can compute:
      </p>

      <div className="katex-display">
        α = sumX/√n
        <br />
        ‖w‖² = sumXSq − sumX²/n
      </div>

      <p>
        This is O(1) state — constant size regardless of how many tokens are in the pool.
        Without this decomposition, the contract would need to store all n reserves
        explicitly.
      </p>

      <h2 id="trading-in-polar-coordinates">Trading in Polar Coordinates</h2>

      <p>
        A swap of Δxᵢ tokens (selling token i) changes the state as follows:
      </p>

      <div className="katex-display">
        sumX&apos; = sumX + Δxᵢ − Δxⱼ
        <br />
        sumXSq&apos; = sumXSq + (xᵢ + Δxᵢ)² − xᵢ² + (xⱼ − Δxⱼ)² − xⱼ²
      </div>

      <p>
        The contract verifies that the new state satisfies the torus invariant. The actual
        trade computation (solving for Δxⱼ given Δxᵢ) happens off-chain in the SDK.
      </p>

      <h2 id="connection-to-the-sphere">Connection to the Sphere</h2>

      <p>
        The sphere invariant can be rewritten in polar coordinates:
      </p>

      <div className="katex-display">
        ∑ᵢ(r − xᵢ)² = r²
        <br />
        nr² − 2r·sumX + sumXSq = r²
        <br />
        sumXSq − 2r·sumX + (n−1)r² = 0
      </div>

      <p>
        This form is what the contract actually checks — it&apos;s algebraically equivalent to
        the sphere equation but uses the tracked values directly.
      </p>

      <blockquote>
        <strong>Key insight:</strong> Polar decomposition turns an n-dimensional problem into
        a 2-dimensional one. The contract never sees the full reserve vector — only its
        projection (α) and its orthogonal norm (‖w‖).
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/math/sphere-amm"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Sphere AMM
        </a>
        <a
          href="/docs/math/ticks-and-caps"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Ticks and Caps →
        </a>
      </div>
    </div>
  );
}
