export default function Glossary() {
  return (
    <div className="page-slide-in">
      <h1>Glossary</h1>

      <p>
        Alphabetized definitions of terms used throughout the taurusSwap documentation.
      </p>

      <h2 id="a">A</h2>

      <h3 id="amm">AMM (Automated Market Maker)</h3>
      <p>
        A decentralized exchange protocol that uses a mathematical formula (invariant)
        to price assets, rather than an order book. Examples: Uniswap, Curve, Orbital.
      </p>

      <h3 id="asa">ASA (Algorand Standard Asset)</h3>
      <p>
        A token on Algorand, analogous to ERC-20 on Ethereum. Each ASA has a unique
        integer ID and metadata (name, decimals, total supply).
      </p>

      <h3 id="avm">AVM (Algorand Virtual Machine)</h3>
      <p>
        The stack-based virtual machine that executes TEAL smart contracts. Provides
        opcodes for 512-bit math, square root, and box storage.
      </p>

      <h2 id="b">B</h2>

      <h3 id="box-storage">Box Storage</h3>
      <p>
        Algorand&apos;s key-value storage for smart contracts. Each box can hold up to
        64KB, with a total limit of 64MB per app. Used for per-tick and per-position
        data in taurusSwap.
      </p>

      <h2 id="c">C</h2>

      <h3 id="concentrated-liquidity">Concentrated Liquidity</h3>
      <p>
        A liquidity provision strategy where LPs provide capital only within a specific
        price range, rather than uniformly across all prices. Increases capital efficiency.
      </p>

      <h3 id="consolidation">Consolidation</h3>
      <p>
        The process of combining multiple ticks into a single geometric object (a torus).
        Interior ticks sum their radii; boundary ticks contribute effective radii.
      </p>

      <h2 id="d">D</h2>

      <h3 id="depeg">Depeg</h3>
      <p>
        When a stablecoin trades below its intended peg (e.g., USDC at $0.99 instead
        of $1.00). Orbital ticks are configured to cover specific depeg thresholds.
      </p>

      <h2 id="f">F</h2>

      <h3 id="fee-growth">Fee Growth</h3>
      <p>
        A cumulative tracker of fees earned per unit of liquidity. Used to compute
        LP fee claims in O(1) time regardless of trade count.
      </p>

      <h2 id="i">I</h2>

      <h3 id="interior-tick">Interior Tick</h3>
      <p>
        A tick whose reserves are strictly inside its boundary (x · v &lt; k). The tick
        is actively providing liquidity.
      </p>

      <h2 id="o">O</h2>

      <h3 id="orbital-amm">Orbital AMM</h3>
      <p>
        An AMM design by Paradigm (White, Robinson, Moallemi, June 2025) that
        generalizes concentrated liquidity to n tokens using spherical geometry.
      </p>

      <h2 id="p">P</h2>

      <h3 id="polar-decomposition">Polar Decomposition</h3>
      <p>
        The mathematical transformation x = αv + w that splits reserves into an
        equal-price component (α) and an orthogonal trading component (w).
      </p>

      <h2 id="s">S</h2>

      <h3 id="sphere-invariant">Sphere Invariant</h3>
      <p>
        The equation Σ(r − xᵢ)² = r² that constrains reserves to an n-dimensional
        sphere. The foundation of Orbital AMM.
      </p>

      <h2 id="t">T</h2>

      <h3 id="tick">Tick</h3>
      <p>
        A concentrated liquidity zone defined by parameters (r, k). Geometrically,
        a spherical cap cut by a hyperplane.
      </p>

      <h3 id="torus-invariant">Torus Invariant</h3>
      <p>
        The master equation r_int² = (α_int − r_int√n)² + (‖w‖ − s_bound)² that
        describes the consolidated pool state. Verified on every swap.
      </p>

      <h2 id="v">V</h2>

      <h3 id="virtual-reserves">Virtual Reserves</h3>
      <p>
        The reserves a tick would have if it were the only liquidity source.
        Computed from tick parameters (r, k) using the virtual reserve formula.
      </p>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/frontend/visualizations"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Visualizations
        </a>
        <a
          href="/docs/reference/constants"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Constants →
        </a>
      </div>
    </div>
  );
}
