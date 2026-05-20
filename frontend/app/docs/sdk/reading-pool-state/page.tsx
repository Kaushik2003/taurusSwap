export default function ReadingPoolState() {
  return (
    <div className="page-slide-in">
      <h1>Reading Pool State</h1>

      <p>
        <code>readPoolState</code> is the foundation of every SDK operation. It performs
        multiple Algod calls — global state, the <code>reserves</code> box, the{' '}
        <code>fee_growth</code> box, every <code>tick:</code> box, and every{' '}
        <code>token:</code> box — and returns a single typed snapshot.
      </p>

      <h2 id="basic-usage">Basic Usage</h2>

      <pre><code className="language-typescript">{`import { readPoolState } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const algod = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud');
const pool  = await readPoolState(algod, 758284478);

console.log('Tokens:', pool.n);
console.log('Active ticks:', pool.ticks.length);
console.log('Fee:', Number(pool.feeBps) / 100, '%');`}</code></pre>

      <p>
        Via <code>TaurusClient</code> (with 10s cache):
      </p>

      <pre><code className="language-typescript">{`const pool = await client.getPoolState();
// Force a fresh fetch, bypassing the cache:
const fresh = await client.getPoolState(true);
// Manually evict the cache:
client.invalidateCache();`}</code></pre>

      <h2 id="poolstate-type">PoolState Type</h2>

      <pre><code className="language-typescript">{`interface PoolState {
  appId:            number;     // Algorand application ID
  n:                number;     // Number of tokens (e.g. 5)

  // Pool geometry (AMOUNT_SCALE units = raw_microunits / 1_000)
  sqrtN:            bigint;     // floor(√n × 10⁹) — PRECISION-scaled
  invSqrtN:         bigint;     // floor(1/√n × 10⁹) — PRECISION-scaled
  sumX:             bigint;     // ∑ reserves[i]  (AMOUNT_SCALE units)
  sumXSq:           bigint;     // ∑ reserves[i]² (AMOUNT_SCALE² units)
  virtualOffset:    bigint;     // added to each reserve in math space (AMOUNT_SCALE units)

  // Consolidated tick aggregates (AMOUNT_SCALE units)
  rInt:             bigint;     // sum of r across all INTERIOR ticks
  sBound:           bigint;     // effective radius of outermost BOUNDARY tick
  kBound:           bigint;     // hyperplane offset of outermost BOUNDARY tick
  totalR:           bigint;     // sum of r across ALL ticks

  // Fees
  feeBps:           bigint;     // 30n = 0.30%
  feeGrowth:        bigint[];   // [n] PRECISION-scaled per-token fee accumulators (monotone)

  // Reserves
  actualReservesRaw: bigint[];  // [n] actual on-chain balances, raw microunits
  reserves:          bigint[];  // [n] math-space reserves = actualReservesRaw/1000 + virtualOffset

  // Ticks
  numTicks:         number;     // monotonic counter — next tick ID (never reused)
  ticks:            Tick[];     // all live tick objects

  // Tokens
  tokenAsaIds:      number[];   // [n] Algorand Standard Asset IDs
  tokenDecimals:    number[];   // [n] decimals per token (USDC/USDT = 6)
}`}</code></pre>

      <h2 id="field-guide">Field Guide</h2>

      <h3 id="reserves">Reserves</h3>

      <p>
        <code>actualReservesRaw[i]</code> is the true on-chain balance of token <code>i</code> in
        raw microunits (no virtual offset). This is what you use for TVL and display:
      </p>

      <pre><code className="language-typescript">{`const tvlUsd = pool.actualReservesRaw.reduce(
  (sum, r) => sum + Number(r), 0
) / 1e6; // stablecoins have 6 decimals

pool.actualReservesRaw.forEach((r, i) => {
  console.log(\`Token \${pool.tokenAsaIds[i]}: \${Number(r) / 1e6} USD\`);
});`}</code></pre>

      <p>
        <code>reserves[i]</code> is the math-space value: <code>actualReservesRaw[i] / 1000 + virtualOffset</code>.
        Use these only when calling raw math functions. The public SDK API handles the
        conversion automatically.
      </p>

      <h3 id="ticks">Ticks</h3>

      <pre><code className="language-typescript">{`interface Tick {
  id:          number;    // Monotonic ID assigned at creation (never reused)
  r:           bigint;    // Sphere radius — AMOUNT_SCALE units
  k:           bigint;    // Hyperplane offset — AMOUNT_SCALE units
  state:       TickState; // INTERIOR (0) or BOUNDARY (1)
  totalShares: bigint;    // Sum of all LP shares in this tick
}`}</code></pre>

      <p>
        A tick is <strong>INTERIOR</strong> when the pool&apos;s current price is inside
        its sphere (normal operation). It flips to <strong>BOUNDARY</strong> when a large
        swap pushes the price to the tick&apos;s edge, reducing effective liquidity until
        the price recovers.
      </p>

      <pre><code className="language-typescript">{`const interior  = pool.ticks.filter(t => t.state === 0 /* TickState.INTERIOR */);
const boundary  = pool.ticks.filter(t => t.state === 1 /* TickState.BOUNDARY */);
console.log(\`\${interior.length} interior, \${boundary.length} boundary ticks\`);`}</code></pre>

      <h3 id="fee-growth">Fee Growth</h3>

      <p>
        <code>feeGrowth[i]</code> is a PRECISION-scaled monotone accumulator. It represents
        the total fees earned per unit of <code>r</code> deposited into the pool over all
        time for token <code>i</code>. LPs compute their claimable fees as:
      </p>

      <pre><code>{`claimable_fee[i] = positionR × (feeGrowth[i] - checkpoint[i]) / PRECISION`}</code></pre>

      <p>
        where <code>positionR = tick.r × shares / tick.totalShares</code> and{' '}
        <code>checkpoint[i]</code> is the value of <code>feeGrowth[i]</code> at the time
        the LP last claimed. The SDK computes this automatically in{' '}
        <code>readPosition()</code> and <code>client.getPosition()</code>.
      </p>

      <h3 id="sqrtn-invsqrtn">sqrtN / invSqrtN</h3>

      <p>
        Precomputed constants <code>floor(√n × 10⁹)</code> and{' '}
        <code>floor(1/√n × 10⁹)</code>. These are embedded in pool global state so
        every operation uses the same integer approximation as the contract.
        You should not need to use these directly.
      </p>

      <h2 id="reading-a-position">Reading a Position</h2>

      <p>
        An LP&apos;s position is stored in a <code>pos:</code> box keyed by
        <code>(ownerPublicKey, tickId)</code>. The SDK reads it and computes claimable fees:
      </p>

      <pre><code className="language-typescript">{`import { readPosition } from '@taurusswap/sdk';

// Returns null if the address has no position in this tick
const position = await readPosition(
  algod,
  POOL_APP_ID,
  'OWNER_ADDRESS',
  tickId,          // the tick ID
  pool.n,
  pool.feeGrowth,
  tick,            // the Tick object from pool.ticks
);

if (position) {
  console.log('Shares:', position.shares);
  console.log('Position r (AMOUNT_SCALE):', position.positionR);
  console.log('Claimable fees (raw microunits):', position.claimableFees);
  // Format fees
  position.claimableFees.forEach((fee, i) => {
    console.log(\`  Token \${i}: \${Number(fee) / 1e6} USD\`);
  });
}`}</code></pre>

      <p>Via <code>TaurusClient</code>:</p>

      <pre><code className="language-typescript">{`const position = await client.getPosition('OWNER_ADDRESS', tickId);
// null if no position`}</code></pre>

      <h2 id="position-type">PositionInfo Type</h2>

      <pre><code className="language-typescript">{`interface PositionInfo {
  tickId:          number;    // Which tick this position is in
  shares:          bigint;    // LP's share count in this tick
  positionR:       bigint;    // tick.r × shares / tick.totalShares (AMOUNT_SCALE units)
  claimableFees:   bigint[];  // [n] per-token fees in raw microunits — ready to display
}`}</code></pre>

      <h2 id="polling">Polling Pattern</h2>

      <p>
        Pool state changes every swap and LP operation (~4 second Algorand block time).
        Refresh every 30s for display purposes; use the 10s cache in <code>TaurusClient</code>
        for swap quoting so repeated UI calls don&apos;t hammer Algod.
      </p>

      <pre><code className="language-typescript">{`// React hook example
import { useEffect, useState } from 'react';
import { type PoolState } from '@taurusswap/sdk';
import { taurusClient } from '@/lib/taurus';

export function usePoolState() {
  const [state, setState] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      try {
        const s = await taurusClient.getPoolState();
        if (active) setState(s);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetch();
    const id = setInterval(fetch, 30_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return { state, loading };
}`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/installation" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← Installation
        </a>
        <a href="/docs/sdk/quoting-swaps" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Quoting Swaps →
        </a>
      </div>
    </div>
  );
}
