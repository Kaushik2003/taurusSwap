import AnimationEmbed from '@/components/docs/AnimationEmbed';

export default function WhatIsOrbital() {
  return (
    <div className="page-slide-in">
      <h1>What is Orbital AMM?</h1>

      <p>
        Orbital AMM is a novel automated market maker design that generalizes concentrated
        liquidity to any number of tokens. It was introduced by Dave White, Dan Robinson,
        and Ciamac Moallemi from Paradigm in June 2025. The key insight is to represent
        multi-token reserves as a point on the surface of an n-dimensional sphere, where
        each axis corresponds to one token&apos;s reserve.
      </p>

      <h2 id="the-problem">The Problem with Existing AMMs</h2>

      <p>
        Today&apos;s multi-stablecoin pools, like Curve&apos;s 3pool, force all liquidity providers
        into the same liquidity profile. When you deposit into Curve, your capital is spread
        uniformly across all possible price ratios. This is inefficient: most trading volume
        happens when stablecoins trade near their peg, yet liquidity is wasted on states
        where one token is completely depegged.
      </p>

      <p>
        Uniswap V3 introduced concentrated liquidity, allowing LPs to specify price ranges
        where their capital is active. But V3 only works for two-token pools. The math doesn&apos;t
        generalize: you can&apos;t simply extend the &quot;price range&quot; concept to three or more tokens
        because prices in multi-token pools aren&apos;t scalar — they&apos;re vectors of exchange rates
        between every pair.
      </p>

      <h2 id="the-sphere-invariant">The Sphere Invariant</h2>

      <p>
        Orbital solves this by representing reserves geometrically. For n tokens with reserves
        x = (x₁, x₂, ..., xₙ), the sphere invariant states:
      </p>

      <div className="katex-display">
        <span className="katex">
          <span className="katex-html">
            <span className="base">
              <span className="mord">
                <span className="mstyle">
                  <span className="mord">∑</span>
                </span>
                <span className="msupsub">
                  <span className="vlist-t">
                    <span className="vlist-r">
                      <span className="vlist" style={{ height: '0.888em' }}>
                        <span style={{ top: '-2.888em', marginRight: '0.05em' }}>
                          <span className="pstrut" />
                          <span className="mathnormal">n</span>
                        </span>
                      </span>
                    </span>
                  </span>
                </span>
                <span className="msupsub">
                  <span className="vlist-t">
                    <span className="vlist-r">
                      <span className="vlist" style={{ height: '0.888em' }}>
                        <span style={{ top: '-2.888em', marginRight: '-0.05em' }}>
                          <span className="pstrut" />
                          <span className="mathnormal">i</span>
                          <span className="mord">=</span>
                          <span className="mord">1</span>
                        </span>
                      </span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
            <span className="mspace" style={{ marginRight: '0.278em' }} />
            <span className="mopen">(</span>
            <span className="mathnormal">r</span>
            <span className="mspace" style={{ marginRight: '0.222em' }} />
            <span className="mbin">−</span>
            <span className="mspace" style={{ marginRight: '0.222em' }} />
            <span className="mord">
              <span className="mathnormal">x</span>
              <span className="msupsub">
                <span className="vlist-t">
                  <span className="vlist-r">
                    <span className="vlist" style={{ height: '0.581em' }}>
                      <span style={{ top: '-0.278em', marginRight: '0.05em' }}>
                        <span className="pstrut" />
                        <span className="mathnormal">i</span>
                      </span>
                    </span>
                  </span>
                </span>
              </span>
              <span className="mclose">
                <span className="mclose">)</span>
                <span className="msupsub">
                  <span className="vlist-t">
                    <span className="vlist-r">
                      <span className="vlist" style={{ height: '0.864em' }}>
                        <span style={{ top: '-3.066em', marginRight: '0.05em' }}>
                          <span className="pstrut" />
                          <span className="mord">2</span>
                        </span>
                      </span>
                    </span>
                  </span>
                </span>
                <span className="mord">=</span>
                <span className="mspace" style={{ marginRight: '0.278em' }} />
                <span className="mord">
                  <span className="mathnormal">r</span>
                  <span className="msupsub">
                    <span className="vlist-t">
                      <span className="vlist-r">
                        <span className="vlist" style={{ height: '0.864em' }}>
                          <span style={{ top: '-3.066em', marginRight: '0.05em' }}>
                            <span className="pstrut" />
                            <span className="mord">2</span>
                          </span>
                        </span>
                      </span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </span>
        </span>
      </div>

      <p>
        Here, r is the radius of the sphere, which controls total liquidity. The center of the
        sphere is at (r, r, ..., r), and the sphere passes through the point (0, r, r, ..., r) —
        the state where one token is completely depleted. This geometric constraint ensures
        that no-arbitrage conditions hold: reserves can never exceed r for any token.
      </p>

      <AnimationEmbed
        src="/docs/animations/01_sphere_amm.mp4"
        title="01 · Sphere AMM"
        caption="Reserves x ∈ ℝⁿ live on the sphere Σ(r − xᵢ)² = r². Every trade slides the point along the surface."
      />

      <h2 id="concentrated-liquidity-via-ticks">Concentrated Liquidity via Ticks</h2>

      <p>
        The breakthrough of Orbital is how it implements concentrated liquidity. Instead of
        uniform liquidity across the entire sphere, LPs can provide liquidity within specific
        regions called <em>ticks</em>. Each tick is defined by a spherical cap around the equal-price
        point — the point where all tokens have the same marginal value.
      </p>

      <p>
        Geometrically, a tick is the intersection of the sphere with a half-space defined by
        a hyperplane. The hyperplane is orthogonal to the equal-price direction vector
        v = (1/√n, 1/√n, ..., 1/√n). When reserves move along the sphere due to trading,
        they eventually hit the boundary of a tick, at which point that tick&apos;s liquidity is
        exhausted and the pool transitions to the next tick.
      </p>

      <h2 id="the-torus-invariant">The Torus Invariant</h2>

      <p>
        When multiple ticks are combined, the resulting shape is not another sphere, but a
        <em>torus</em> — the surface formed by sweeping a sphere around a circle. The torus invariant
        is the master equation that describes the pool state when multiple ticks are active:
      </p>

      <p>
        The pool state must simultaneously satisfy the interior sphere constraint and lie on
        the boundary subspace. This gives us:
      </p>

      <div className="katex-display">
        r_int² = (α_int − r_int√n)² + (‖w‖ − s_bound)²
      </div>

      <p>
        Where α_int measures position along the equal-price axis, ‖w‖ is the orthogonal
        component, and s_bound is the effective radius contributed by boundary ticks.
        This equation is what the smart contract verifies on every swap.
      </p>

      <h2 id="why-it-matters">Why It Matters</h2>

      <p>
        Orbital&apos;s capital efficiency is dramatically higher than uniform liquidity pools.
        For a 5-token pool at a 0.99 depeg threshold, the efficiency multiplier is about 150×
        compared to Curve. This means LPs can provide the same liquidity with 150× less
        capital, or provide 150× more liquidity with the same capital.
      </p>

      <p>
        The tradeoff is that concentrated liquidity covers a narrower price range. But for
        stablecoins that historically maintain their pegs, this is exactly the right tradeoff:
        provide massive liquidity where trades actually happen, rather than wasting capital
        on tail states that almost never occur.
      </p>

      <blockquote>
        <strong>Note:</strong> taurusSwap is an implementation of the Orbital AMM design from Paradigm.
        The theoretical work is theirs; our contribution is the Algorand implementation and SDK.
        See the <a href="/docs/reference/paper">Paper</a> page for the original source.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Back to Docs
        </a>
        <a
          href="/docs/introduction/why-algorand"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Why Algorand? →
        </a>
      </div>
    </div>
  );
}
