import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function Consolidation() {
  return (
    <div className="page-slide-in">
      <h1>Consolidation</h1>

      <p>
        When multiple ticks are active, they don&apos;t remain separate — they consolidate
        into a single geometric object. Understanding consolidation is key to understanding
        how the torus invariant emerges.
      </p>

      <AnimationEmbed
        src="/docs/animations/04_consolidation.mp4"
        title="04 · Consolidation to Torus"
        caption="Multiple ticks collapse into a single torus: interior sphere swept around boundary circle."
      />

      <h2 id="interior-consolidation">Interior Consolidation</h2>

      <p>
        For ticks that are in the interior state (reserves haven&apos;t hit the boundary),
        consolidation is simple:
      </p>

      <div className="katex-display">
        r_int = ∑ᵢ rᵢ
      </div>

      <p>
        The radii sum linearly. This makes intuitive sense: if you have two overlapping
        liquidity zones, their total liquidity is the sum of individual liquidities.
      </p>

      <p>
        The consolidated interior sphere is centered at (r_int, ..., r_int) with radius r_int.
      </p>

      <h2 id="boundary-consolidation">Boundary Consolidation</h2>

      <p>
        For ticks at the boundary, consolidation is more complex. Each boundary tick
        contributes an &quot;effective radius&quot; in the orthogonal subspace:
      </p>

      <div className="katex-display">
        s_bound = ∑ᵢ √(rᵢ² − (kᵢ − rᵢ√n)²)
      </div>

      <p>
        Derivation:
      </p>

      <ol>
        <li>
          At the boundary, the tick&apos;s sphere is cut by the hyperplane x · v = kᵢ
        </li>
        <li>
          The intersection is an (n−2)-sphere with radius √(rᵢ² − dᵢ²)
        </li>
        <li>
          where dᵢ = (kᵢ − rᵢ√n) is the distance from the sphere center to the hyperplane
        </li>
        <li>
          These (n−2)-spheres stack in the orthogonal subspace, summing their radii
        </li>
      </ol>

      <h2 id="the-torus-formation">The Torus Formation</h2>

      <p>
        The consolidated shape is a <em>torus</em> — specifically, an (n−1)-dimensional
        torus formed by sweeping the interior sphere around the boundary circle.
      </p>

      <p>
        Think of it this way:
      </p>

      <ul>
        <li>
          The interior sphere has radius r_int
        </li>
        <li>
          The boundary circle has radius s_bound
        </li>
        <li>
          The torus is the set of points at distance r_int from the boundary circle
        </li>
      </ul>

      <p>
        In 3D, this is the familiar donut shape. In higher dimensions, it&apos;s the
        analogous object.
      </p>

      <h2 id="consolidated-state">Consolidated State</h2>

      <p>
        After consolidation, the pool state is described by three values:
      </p>

      <ul>
        <li><code>r_int</code> — Interior radius (sum of interior tick radii)</li>
        <li><code>s_bound</code> — Boundary effective radius (sum of boundary contributions)</li>
        <li><code>k_bound</code> — The boundary hyperplane offset (from the outermost tick)</li>
      </ul>

      <p>
        These three values fully characterize the torus. The contract stores them in
        global state.
      </p>

      <h2 id="re-consolidation-on-crossing">Re-consolidation on Crossing</h2>

      <p>
        When a trade causes a tick to cross from interior to boundary (or vice versa),
        the consolidated state must be recomputed:
      </p>

      <ol>
        <li>
          Remove the crossing tick&apos;s contribution from r_int or s_bound
        </li>
        <li>
          Flip its state (interior ↔ boundary)
        </li>
        <li>
          Add its contribution to the other sum
        </li>
        <li>
          Update k_bound if the crossing tick is now the outermost boundary
        </li>
      </ol>

      <p>
        This is the <code>swap_with_crossings</code> method in the contract — the most
        complex operation because it requires updating multiple state values atomically.
      </p>

      <blockquote>
        <strong>Implementation note:</strong> The SDK computes which ticks will cross
        before submitting the swap. The contract verifies each crossing claim rather
        than computing it from scratch.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/math/ticks-and-caps"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Ticks and Caps
        </a>
        <a
          href="/docs/math/torus-invariant"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Torus Invariant →
        </a>
      </div>
    </div>
  );
}
