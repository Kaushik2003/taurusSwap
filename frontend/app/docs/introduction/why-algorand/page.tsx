export default function WhyAlgorand() {
  return (
    <div className="page-slide-in">
      <h1>Why Algorand?</h1>

      <p>
        Building Orbital AMM on Algorand wasn&apos;t just a deployment choice — it was a
        technical necessity. The AVM&apos;s (Algorand Virtual Machine) architecture provides
        specific capabilities that make the Orbital invariant verifiable on-chain, while
        the EVM&apos;s limitations would have required compromising the design.
      </p>

      <h2 id="native-512-bit-math">Native 512-bit Math</h2>

      <p>
        The Orbital invariant requires computing sums of squares of reserves. For a pool with
        50,000 USDC (50,000 × 10⁶ microunits), squaring the reserve gives 2.5 × 10²¹ — far
        beyond uint64&apos;s max of 1.8 × 10¹⁹. The AVM provides native 512-bit multiplication
        via <code>mulw</code> (which returns both low and high 64-bit words), allowing us to
        compute and compare large squared values directly.
      </p>

      <p>
        On the EVM, we would need a custom fixed-point math library, burning opcode budget
        on every operation. Algorand gives us this capacity as a first-class opcode.
      </p>

      <h2 id="sqrt-as-first-class">√ as First-Class Opcode</h2>

      <p>
        The equal-price point calculation requires computing:
      </p>

      <div className="katex-display">
        q = r(1 − 1/√n)
      </div>

      <p>
        The AVM&apos;s <code>sqrt</code> opcode computes integer square roots in constant time.
        This is critical for computing tick boundaries and verifying crossing conditions.
        On EVM, square root requires Newton&apos;s method iteration — expensive and variable-gas.
      </p>

      <h2 id="box-storage">Box Storage for Arbitrary Data</h2>

      <p>
        Orbital requires storing per-tick state (r, k, isActive) and per-position data
        (shares, fee checkpoints). Algorand&apos;s box storage provides arbitrary key-value
        storage attached to the app, with 64KB per box and up to 64MB total.
      </p>

      <p>
        Our storage layout:
      </p>

      <table>
        <thead>
          <tr>
            <th>Box Key</th>
            <th>Size</th>
            <th>Contents</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>reserves</code></td>
            <td>n × 8 bytes</td>
            <td>Per-token reserve microunits</td>
          </tr>
          <tr>
            <td><code>fee_growth</code></td>
            <td>n × 8 bytes</td>
            <td>Fee growth per unit radius</td>
          </tr>
          <tr>
            <td><code>{`token:{idx}`}</code></td>
            <td>8 bytes</td>
            <td>ASA ID for token index</td>
          </tr>
          <tr>
            <td><code>{`tick:{id}`}</code></td>
            <td>25 bytes</td>
            <td>r (8), k (8), isActive (1), totalShares (8)</td>
          </tr>
          <tr>
            <td><code>{`pos:{owner}{tickId}`}</code></td>
            <td>8 + n × 8 bytes</td>
            <td>shares (8), fee checkpoints (n × 8)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="atomic-transaction-groups">Atomic Transaction Groups</h2>

      <p>
        Adding liquidity requires transferring n different ASAs to the pool and calling the
        smart contract. On Algorand, these happen in a single atomic group: either all
        transfers succeed and the app call executes, or everything fails. This eliminates
        reentrancy risk and ensures invariant preservation.
      </p>

      <p>
        The same pattern applies to swaps: the user&apos;s input transfer, the app call, and the
        pool&apos;s output transfer all happen atomically. No intermediate state is observable.
      </p>

      <h2 id="opcode-budget-pooling">Opcode Budget Pooling</h2>

      <p>
        Algorand allows grouping multiple transactions that share a single opcode budget.
        For complex operations like tick crossing (which requires re-consolidating the torus
        invariant), we can split verification across multiple app calls in the same group,
        effectively parallelizing the computation.
      </p>

      <h2 id="the-tradeoff-unit-scaling">The Tradeoff: Unit Scaling</h2>

      <p>
        Despite the AVM&apos;s strengths, we still needed to introduce <code>AMOUNT_SCALE = 1000</code>
        to prevent overflow. Reserves are divided by 1000 before squaring, bringing the max
        square from 10³² to 2.5 × 10⁹. This is documented in the
        <a href="/docs/protocol/unit-scaling">Unit Scaling</a> section.
      </p>

      <p>
        The EVM would have required far more aggressive scaling, losing precision. Algorand&apos;s
        uint64-centric model is actually a better fit for Orbital&apos;s math than the EVM&apos;s
        256-bit words, because the opcodes we need (sqrt, mulw) are native rather than
        emulated.
      </p>

      <blockquote>
        <strong>Bottom line:</strong> Algorand gives us cheaper verification, better math opcodes,
        and atomic composability. The Orbital invariant would be prohibitively expensive to
        verify on EVM.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/introduction/what-is-orbital"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← What is Orbital?
        </a>
        <a
          href="/docs/introduction/quickstart"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Quickstart →
        </a>
      </div>
    </div>
  );
}
