export default function ReadingPoolState() {
  return (
    <div className="page-slide-in">
      <h1>Reading Pool State</h1>

      <p>
        The <code>readPoolState</code> function decodes all on-chain state into a typed
        <code>PoolState</code> object. This is your entry point for any pool interaction.
      </p>

      <h2 id="usage">Usage</h2>

      <pre><code className="language-typescript">{`import { readPoolState } from '@taurusswap/sdk';

const poolState = await readPoolState(algodClient, POOL_APP_ID);`}</code></pre>

      <h2 id="poolstate-type">PoolState Type</h2>

      <pre><code className="language-typescript">{`interface PoolState {
  // Basic info
  n: number;              // Number of tokens
  appId: number;          // Contract app ID

  // Consolidated state
  sumX: bigint;           // Sum of all reserves (∑xᵢ)
  sumXSq: bigint;         // Sum of squared reserves (∑xᵢ²)
  rInt: bigint;           // Interior radius
  sBound: bigint;         // Boundary effective radius
  kBound: bigint;         // Boundary hyperplane offset
  totalR: bigint;         // Total liquidity (sum of all tick radii)

  // Scaling
  virtualOffset: bigint;  // AMOUNT_SCALE (1000)

  // Fees
  feeBps: number;         // Fee in basis points
  feeGrowth: bigint[];    // Fee growth per token (n values)

  // Tick info
  numTicks: number;       // Number of active ticks

  // Per-token data
  reserves: bigint[];     // Reserve of each token (microunits)
  tokenAsas: number[];    // ASA ID of each token
  tokenDecimals: number[]; // Decimal places of each token
}`}</code></pre>

      <h2 id="field-descriptions">Field Descriptions</h2>

      <h3 id="basic-info">Basic Info</h3>

      <ul>
        <li>
          <code>n</code> — Number of tokens in the pool. For a 5-stablecoin pool, n = 5.
        </li>
        <li>
          <code>appId</code> — The Algorand app ID. Used for all subsequent calls.
        </li>
      </ul>

      <h3 id="consolidated-state">Consolidated State</h3>

      <ul>
        <li>
          <code>sumX</code> — Sum of all reserves. Used to compute α (position along equal-price axis).
        </li>
        <li>
          <code>sumXSq</code> — Sum of squared reserves. Used to compute ‖w‖ (orthogonal component).
        </li>
        <li>
          <code>rInt</code> — Interior radius. Sum of radii for all interior ticks.
        </li>
        <li>
          <code>sBound</code> — Boundary effective radius. Sum of effective radii for boundary ticks.
        </li>
        <li>
          <code>kBound</code> — The outermost boundary hyperplane offset.
        </li>
        <li>
          <code>totalR</code> — Total liquidity. Sum of all tick radii (interior + boundary).
        </li>
      </ul>

      <h3 id="scaling">Scaling</h3>

      <ul>
        <li>
          <code>virtualOffset</code> — Always 1000 (AMOUNT_SCALE). Used for unit conversions.
        </li>
      </ul>

      <h3 id="fees">Fees</h3>

      <ul>
        <li>
          <code>feeBps</code> — Fee in basis points. 30 = 0.3%, 100 = 1%.
        </li>
        <li>
          <code>feeGrowth</code> — Array of n values. feeGrowth[i] is the cumulative fee
          growth for token i. Used for LP fee claims.
        </li>
      </ul>

      <h3 id="tick-info">Tick Info</h3>

      <ul>
        <li>
          <code>numTicks</code> — Number of active ticks. A fresh pool starts with 0.
        </li>
      </ul>

      <h3 id="per-token-data">Per-Token Data</h3>

      <ul>
        <li>
          <code>reserves</code> — Array of n reserve values in microunits. Convert to display
          units using tokenDecimals.
        </li>
        <li>
          <code>tokenAsas</code> — Array of n ASA IDs. Use these to identify tokens.
        </li>
        <li>
          <code>tokenDecimals</code> — Array of n decimal places. USDC/USDT use 6.
        </li>
      </ul>

      <h2 id="example-displaying-reserves">Example: Displaying Reserves</h2>

      <pre><code className="language-typescript">{`const poolState = await readPoolState(algodClient, POOL_APP_ID);

// Format reserves for display
const formattedReserves = poolState.reserves.map((reserve, i) => {
  const decimals = poolState.tokenDecimals[i];
  const display = Number(reserve) / (10 ** decimals);
  const token = poolState.tokenAsas[i];
  return \`\${display.toLocaleString()} (ASA \${token})\`;
});

console.log('Pool reserves:');
formattedReserves.forEach((r, i) => console.log(\`  Token \${i}: \${r}\`));`}</code></pre>

      <h2 id="handling-fresh-pools">Handling Fresh Pools</h2>

      <p>
        A newly deployed pool may not have all boxes initialized. Handle gracefully:
      </p>

      <pre><code className="language-typescript">{`import { readPoolState, BoxNotFoundError } from '@taurusswap/sdk';

try {
  const poolState = await readPoolState(algodClient, POOL_APP_ID);
  console.log('Pool is initialized');
} catch (err) {
  if (err instanceof BoxNotFoundError) {
    console.log('Pool not initialized yet - waiting for first liquidity deposit');
    // Show "Pool not ready" UI
  } else {
    throw err;
  }
}`}</code></pre>

      <h2 id="polling-for-updates">Polling for Updates</h2>

      <p>
        Pool state changes with every swap and liquidity operation. Poll periodically:
      </p>

      <pre><code className="language-typescript">{`import { useEffect, useState } from 'react';
import { readPoolState } from '@taurusswap/sdk';

function usePoolState(appId: number) {
  const [state, setState] = useState<PoolState | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const s = await readPoolState(algodClient, appId);
      setState(s);
    };

    fetch();
    const interval = setInterval(fetch, 30_000);  // 30 seconds
    return () => clearInterval(interval);
  }, [appId]);

  return state;
}`}</code></pre>

      <h2 id="reading-tick-state">Reading Tick State</h2>

      <pre><code className="language-typescript">{`import { readTickState } from '@taurusswap/sdk';

const tick = await readTickState(algodClient, POOL_APP_ID, tickId);

console.log('Tick state:', {
  r: tick.r,              // Sphere radius
  k: tick.k,              // Hyperplane offset
  state: tick.state,      // 'INTERIOR' or 'BOUNDARY'
  totalShares: tick.totalShares,
  effectiveRadius: tick.effectiveRadius
});`}</code></pre>

      <h2 id="reading-position-state">Reading Position State</h2>

      <pre><code className="language-typescript">{`import { readPosition } from '@taurusswap/sdk';

const position = await readPosition(
  algodClient,
  POOL_APP_ID,
  address,
  tickId
);

console.log('Position:', {
  shares: position.shares,
  pendingFees: position.pendingFees,  // Already computed!
  feeCheckpoints: position.feeCheckpoints
});`}</code></pre>

      <blockquote>
        <strong>Note:</strong> The <code>pendingFees</code> field is computed client-side
        using the fee growth formula. It&apos;s not stored on-chain.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/installation"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Installation
        </a>
        <a
          href="/docs/sdk/quoting-swaps"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Quoting Swaps →
        </a>
      </div>
    </div>
  );
}
