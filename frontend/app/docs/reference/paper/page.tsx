export default function Paper() {
  return (
    <div className="page-slide-in">
      <h1>Original Paper</h1>

      <p>
        taurusSwap is an implementation of the Orbital AMM design from Paradigm.
        This page links to the original theoretical work and maps paper sections
        to implementation components.
      </p>

      <h2 id="paper-reference">Paper Reference</h2>

      <div className="docs-card p-6 mb-8">
        <h3 className="text-xl font-bold text-dark-green mb-2">
          Orbital: Concentrated Liquidity for Any Number of Tokens
        </h3>
        <p className="text-dark-green/80 mb-4">
          <strong>Authors:</strong> Dave White, Dan Robinson, Ciamac Moallemi
          <br />
          <strong>Published:</strong> June 2025
          <br />
          <strong>Publisher:</strong> Paradigm
        </p>
        <a
          href="https://www.paradigm.xyz/2025/06/orbital"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Read the Paper →
        </a>
      </div>

      <h2 id="section-mapping">Section-to-Implementation Mapping</h2>

      <table>
        <thead>
          <tr>
            <th>Paper Section</th>
            <th>Implementation</th>
            <th>Docs Page</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>2.1 Sphere Invariant</td>
            <td><code>contract/math/sphere.py</code></td>
            <td><a href="/docs/math/sphere-amm">Sphere AMM</a></td>
          </tr>
          <tr>
            <td>2.2 Polar Decomposition</td>
            <td><code>sdk/math/polar.ts</code></td>
            <td><a href="/docs/math/polar-decomposition">Polar Decomposition</a></td>
          </tr>
          <tr>
            <td>3.1 Ticks as Spherical Caps</td>
            <td><code>contract/liquidity/ticks.py</code></td>
            <td><a href="/docs/math/ticks-and-caps">Ticks and Caps</a></td>
          </tr>
          <tr>
            <td>3.2 Consolidation</td>
            <td><code>sdk/math/consolidation.ts</code></td>
            <td><a href="/docs/math/consolidation">Consolidation</a></td>
          </tr>
          <tr>
            <td>4.1 Torus Invariant</td>
            <td><code>contract/verification/torus.py</code></td>
            <td><a href="/docs/math/torus-invariant">Torus Invariant</a></td>
          </tr>
          <tr>
            <td>4.2 Trade Execution</td>
            <td><code>sdk/pool/swap.ts</code></td>
            <td><a href="/docs/sdk/quoting-swaps">Quoting Swaps</a></td>
          </tr>
          <tr>
            <td>5.1 Capital Efficiency</td>
            <td>(Analysis in docs)</td>
            <td><a href="/docs/math/capital-efficiency">Capital Efficiency</a></td>
          </tr>
          <tr>
            <td>6.1 Fee Mechanism</td>
            <td><code>contract/fees.py</code></td>
            <td><a href="/docs/protocol/fee-accounting">Fee Accounting</a></td>
          </tr>
        </tbody>
      </table>

      <h2 id="key-results">Key Results from the Paper</h2>

      <h3 id="efficiency-theorem">Efficiency Theorem (Section 5.1)</h3>

      <p>
        For n tokens at depeg threshold p, the capital efficiency multiplier is:
      </p>

      <div className="katex-display">
        efficiency = q / (q − x_min)
      </div>

      <p>
        For n=5 and p=0.99, this gives approximately 150× efficiency vs. uniform
        liquidity (Curve).
      </p>

      <h3 id="invariant-preservation">Invariant Preservation (Section 4.1)</h3>

      <p>
        Theorem: If the torus invariant holds before a trade and the trade satisfies
        the crossing conditions, the invariant holds after the trade.
      </p>

      <p>
        This is what enables O(1) verification: the contract doesn&apos;t need to
        recompute the full state, only check that the invariant still holds.
      </p>

      <h3 id="crossing-conditions">Crossing Conditions (Section 3.3)</h3>

      <p>
        A tick crosses from interior to boundary when:
      </p>

      <div className="katex-display">
        α_int = k
      </div>

      <p>
        The contract verifies this condition using cross-multiplication to avoid
        division.
      </p>

      <h2 id="our-contributions">Our Contributions</h2>

      <p>
        taurusSwap is an <em>implementation</em> of the Orbital design, not original
        research. Our contributions are:
      </p>

      <ul>
        <li>
          <strong>Algorand deployment</strong> — Adapting the design to the AVM&apos;s
          uint64-centric model with AMOUNT_SCALE
        </li>
        <li>
          <strong>TypeScript SDK</strong> — Reference implementation of the math in
          pure BigInt
        </li>
        <li>
          <strong>Frontend UI</strong> — Trading interface with Three.js visualizations
        </li>
        <li>
          <strong>Fee accounting</strong> — Uniswap V3-style fee growth adapted for
          Orbital&apos;s consolidated liquidity
        </li>
      </ul>

      <p>
        The theoretical work — the sphere invariant, polar decomposition, tick
        geometry, and torus consolidation — is entirely from the Paradigm team.
      </p>

      <h2 id="citation">Citation</h2>

      <p>
        If you reference taurusSwap in academic work, please cite both this
        implementation and the original paper:
      </p>

      <pre><code className="language-bibtex">{`@article{white2025orbital,
  title={Orbital: Concentrated Liquidity for Any Number of Tokens},
  author={White, Dave and Robinson, Dan and Moallemi, Ciamac},
  journal={Paradigm Research},
  year={2025},
  url={https://www.paradigm.xyz/2025/06/orbital}
}

@software{taurusSwap2026,
  title={taurusSwap: Orbital AMM on Algorand},
  author={Kaushik and contributors},
  year={2026},
  url={https://github.com/Kaushik2003/taurusSwap}
}`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/reference/deployed-addresses"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Deployed Addresses
        </a>
        <a
          href="/docs"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Back to Docs →
        </a>
      </div>
    </div>
  );
}
