export default function TorusInvariant() {
  return (
    <div className="page-slide-in">
      <h1>Torus Invariant</h1>

      <p>
        The torus invariant is the master equation of Orbital AMM. It combines the interior
        sphere constraint and the boundary subspace constraint into a single equation that
        the smart contract verifies on every swap.
      </p>

      <h2 id="derivation">Derivation</h2>

      <p>
        Start with the consolidated state:
      </p>

      <ul>
        <li>Interior sphere: radius r_int, centered at (r_int, ..., r_int)</li>
        <li>Boundary circle: radius s_bound in the orthogonal subspace</li>
      </ul>

      <p>
        A point x is on the torus if:
      </p>

      <ol>
        <li>
          Its projection onto the equal-price axis satisfies the interior sphere constraint
        </li>
        <li>
          Its orthogonal component lies on the boundary circle
        </li>
      </ol>

      <p>
        Let α_int = x · v be the position along the equal-price axis, and ‖w‖ be the
        orthogonal norm. The torus condition is:
      </p>

      <div className="katex-display">
        (α_int − α_center)² + (‖w‖ − s_bound)² = r_int²
      </div>

      <p>
        where α_center = r_int√n is the center&apos;s position along the equal-price axis.
      </p>

      <p>
        Rearranging:
      </p>

      <div className="katex-display">
        r_int² = (α_int − r_int√n)² + (‖w‖ − s_bound)²
      </div>

      <p>
        This is the <strong>torus invariant</strong> — the master equation.
      </p>

      <h2 id="verification-approach">Verification Approach</h2>

      <p>
        Given the pre-trade state (r_int, s_bound, k_bound) and a proposed trade
        (Δx_in, Δx_out), the contract:
      </p>

      <ol>
        <li>
          Computes new sumX and sumXSq from the trade
        </li>
        <li>
          Derives α_int&apos; = sumX&apos;/√n and ‖w&apos;‖² = sumXSq&apos; − sumX&apos;²/n
        </li>
        <li>
          Evaluates the RHS: (α_int&apos; − r_int√n)² + (‖w&apos;‖ − s_bound)²
        </li>
        <li>
          Checks that |LHS − RHS| ≤ tolerance
        </li>
      </ol>

      <p>
        This is O(1) verification — constant time regardless of how many tokens or ticks
        are involved.
      </p>

      <h2 id="special-cases">Special Cases</h2>

      <h3 id="pure-interior">Pure Interior (s_bound = 0)</h3>

      <p>
        When there are no boundary ticks, s_bound = 0, and the invariant becomes:
      </p>

      <div className="katex-display">
        r_int² = (α_int − r_int√n)² + ‖w‖²
      </div>

      <p>
        This is just the sphere invariant in polar coordinates — the torus degenerates
        to a sphere.
      </p>

      <h3 id="pure-boundary">Pure Boundary (r_int = 0)</h3>

      <p>
        When all ticks are at the boundary, r_int = 0, and the invariant becomes:
      </p>

      <div className="katex-display">
        0 = α_int² + (‖w‖ − s_bound)²
      </div>

      <p>
        This forces α_int = 0 and ‖w‖ = s_bound — the pool state is constrained to a
        lower-dimensional sphere (the boundary circle itself).
      </p>

      <h2 id="tolerance">Tolerance</h2>

      <p>
        Due to integer arithmetic and the AMOUNT_SCALE factor, the contract uses a
        tolerance:
      </p>

      <div className="katex-display">
        |LHS − RHS| ≤ TOLERANCE
      </div>

      <p>
        where TOLERANCE = 1000 in the scaled math space. This allows for small rounding
        errors while still catching invalid trades.
      </p>

      <h2 id="why-it-works">Why It Works</h2>

      <p>
        The torus invariant encodes the entire liquidity structure in a single equation.
        By verifying this equation holds after a trade, the contract ensures:
      </p>

      <ul>
        <li>
          No liquidity was created or destroyed (conservation)
        </li>
        <li>
          The trade followed the AMM curve (correct pricing)
        </li>
        <li>
          Tick boundaries were respected (concentrated liquidity constraints)
        </li>
      </ul>

      <p>
        This is the breakthrough of Orbital: complex multi-token, multi-tick liquidity
        verification in O(1) time.
      </p>

      <blockquote>
        <strong>Connection to code:</strong> See the <a href="/docs/protocol/swap-verification">Swap Verification</a> page for the actual PyTeal implementation.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/math/consolidation"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Consolidation
        </a>
        <a
          href="/docs/math/capital-efficiency"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Capital Efficiency →
        </a>
      </div>
    </div>
  );
}
