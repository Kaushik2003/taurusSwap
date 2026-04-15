export default function SDKOverview() {
  return (
    <div className="page-slide-in">
      <h1>SDK Overview</h1>

      <p>
        The taurusSwap SDK is a TypeScript library for interacting with Orbital AMM pools.
        It handles all the complex math (solving the torus invariant), state reading, and
        transaction construction.
      </p>

      <h2 id="what-the-sdk-does">What the SDK Does</h2>

      <ul>
        <li>
          <strong>Reads pool state</strong> — Decodes global state and box storage into
          typed objects
        </li>
        <li>
          <strong>Computes quotes</strong> — Solves the torus invariant to find output
          amounts
        </li>
        <li>
          <strong>Builds transactions</strong> — Constructs atomic transaction groups for
          swaps, adding liquidity, and claiming fees
        </li>
        <li>
          <strong>Handles unit conversions</strong> — Converts between display, raw, and
          scaled units automatically
        </li>
      </ul>

      <h2 id="what-it-doesnt-do">What It Doesn&apos;t Do</h2>

      <ul>
        <li>
          <strong>Sign transactions</strong> — You provide a signer (from Pera, Defly, etc.)
        </li>
        <li>
          <strong>Send transactions</strong> — You call <code>algodClient.sendGroupTransaction</code>
        </li>
        <li>
          <strong>Manage wallets</strong> — Use <code>algosdk</code> or a wallet adapter for that
        </li>
      </ul>

      <h2 id="architecture">Three-Layer Architecture</h2>

      <pre><code>{`┌─────────────────────────────────┐
│  @taurusswap/sdk/algorand       │  ← Transaction builders
│  - buildSwapTransactionGroup()  │
│  - buildAddLiquidityGroup()     │
│  - signAndSend()                │
├─────────────────────────────────┤
│  @taurusswap/sdk/pool           │  ← Pool-level operations
│  - readPoolState()              │
│  - getSwapQuote()               │
│  - computeDepositPerToken()     │
├─────────────────────────────────┤
│  @taurusswap/sdk/math           │  ← Pure math (BigInt)
│  - solveTorusInvariant()        │
│  - polarDecompose()             │
│  - consolidateTicks()           │
└─────────────────────────────────┘`}</code></pre>

      <h2 id="design-principles">Design Principles</h2>

      <ul>
        <li>
          <strong>Pure BigInt</strong> — Zero runtime floats. All math uses integer
          arithmetic for determinism.
        </li>
        <li>
          <strong>Reference-accurate</strong> — The SDK matches the Python reference
          implementation to 15+ decimal places.
        </li>
        <li>
          <strong>Type-safe</strong> — Full TypeScript types for all inputs and outputs.
        </li>
        <li>
          <strong>Composable</strong> — Each function is a pure building block. Chain
          them together for complex operations.
        </li>
      </ul>

      <h2 id="minimal-example">Minimal Example</h2>

      <pre><code className="language-typescript">{`import {
  readPoolState,
  getSwapQuote,
  buildSwapTransactionGroup
} from '@taurusswap/sdk';
import algosdk from 'algosdk';

// Initialize
const algodClient = new algosdk.Algodv2(
  'TOKEN',
  'https://testnet-api.algonode.cloud',
  ''
);

const POOL_APP_ID = 758284478;

// Read pool state
const poolState = await readPoolState(algodClient, POOL_APP_ID);

// Get quote
const quote = await getSwapQuote(poolState, {
  tokenInIndex: 0,
  tokenOutIndex: 1,
  amountIn: 100_000_000n  // 100 USDC
});

console.log(\`Output: \${quote.amountOut} microunits\`);
console.log(\`Price impact: \${quote.priceImpact * 100}%\`);

// Build and sign transaction
const { txGroup, signer } = await buildSwapTransactionGroup(
  algodClient,
  POOL_APP_ID,
  account,
  {
    tokenInIndex: 0,
    tokenOutIndex: 1,
    amountIn: 100_000_000n,
    minOut: quote.amountOut * 995n / 1000n,  // 0.5% slippage
    claimedOut: quote.amountOut
  }
);

const result = await algodClient.sendGroupTransaction(txGroup).do();
console.log('TX ID:', result.txId);`}</code></pre>

      <h2 id="modules">Modules</h2>

      <table>
        <thead>
          <tr>
            <th>Module</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>@taurusswap/sdk/math</code></td>
            <td>Pure math: torus invariant, polar decomposition, tick geometry</td>
          </tr>
          <tr>
            <td><code>@taurusswap/sdk/pool</code></td>
            <td>Pool operations: quotes, deposits, fee calculations</td>
          </tr>
          <tr>
            <td><code>@taurusswap/sdk/algorand</code></td>
            <td>Algorand integration: transaction builders, state readers</td>
          </tr>
          <tr>
            <td><code>@taurusswap/sdk/types</code></td>
            <td>Type definitions: PoolState, SwapQuote, Position, etc.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="error-handling">Error Handling</h2>

      <p>
        The SDK throws typed errors for common failure modes:
      </p>

      <pre><code className="language-typescript">{`import {
  InsufficientLiquidityError,
  InvalidTradeDirectionError,
  TickCrossingError,
  BoxNotFoundError
} from '@taurusswap/sdk';

try {
  const quote = await getSwapQuote(poolState, trade);
} catch (err) {
  if (err instanceof InsufficientLiquidityError) {
    // Pool doesn't have enough output tokens
  } else if (err instanceof TickCrossingError) {
    // Trade would cross too many ticks
  }
}`}</code></pre>

      <h2 id="next-steps">Next Steps</h2>

      <ul>
        <li><a href="/docs/sdk/installation">Installation</a> — Package setup</li>
        <li><a href="/docs/sdk/reading-pool-state">Reading Pool State</a> — Decode on-chain state</li>
        <li><a href="/docs/sdk/quoting-swaps">Quoting Swaps</a> — Compute trade outputs</li>
        <li><a href="/docs/sdk/executing-swaps">Executing Swaps</a> — Build and send transactions</li>
      </ul>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/protocol/unit-scaling"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Unit Scaling
        </a>
        <a
          href="/docs/sdk/installation"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Installation →
        </a>
      </div>
    </div>
  );
}
