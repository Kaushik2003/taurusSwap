export default function ApiReference() {
  return (
    <div className="page-slide-in">
      <h1>API Reference</h1>

      <p>
        Complete reference for all exported functions, types, and constants from the
        taurusSwap SDK. Organized by module.
      </p>

      <h2 id="math-module">@taurusswap/sdk/math</h2>

      <h3 id="solveTorusInvariant">solveTorusInvariant</h3>

      <pre><code className="language-typescript">{`function solveTorusInvariant(
  poolState: PoolState,
  trade: TradeInput
): TradeOutput`}</code></pre>

      <p>
        Solves the torus invariant for the output amount given an input trade.
        Uses Newton&apos;s method for root finding.
      </p>

      <ul>
        <li><strong>Returns:</strong> <code>TradeOutput</code> with amountOut, priceImpact, segments</li>
        <li><strong>Throws:</strong> <code>InsufficientLiquidityError</code> if trade is too large</li>
      </ul>

      <h3 id="polarDecompose">polarDecompose</h3>

      <pre><code className="language-typescript">{`function polarDecompose(
  reserves: bigint[],
  n: number
): { alpha: bigint; normWSq: bigint }`}</code></pre>

      <p>
        Computes the polar decomposition of reserves into α (equal-price component)
        and ‖w‖² (orthogonal component).
      </p>

      <div className="katex-display">
        α = ∑xᵢ / √n
        <br />
        ‖w‖² = ∑xᵢ² − (∑xᵢ)²/n
      </div>

      <h3 id="kFromDepegPrice">kFromDepegPrice</h3>

      <pre><code className="language-typescript">{`function kFromDepegPrice(
  r: bigint,
  depegPrice: number,
  n: number
): bigint`}</code></pre>

      <p>
        Converts a user-friendly depeg threshold into the tick parameter k.
      </p>

      <ul>
        <li><code>depegPrice = 0.99</code> → 1% depeg allowed</li>
        <li><code>depegPrice = 0.95</code> → 5% depeg allowed</li>
      </ul>

      <h2 id="pool-module">@taurusswap/sdk/pool</h2>

      <h3 id="getSwapQuote">getSwapQuote</h3>

      <pre><code className="language-typescript">{`async function getSwapQuote(
  poolState: PoolState,
  trade: {
    tokenInIndex: number;
    tokenOutIndex: number;
    amountIn: bigint;
  }
): Promise<SwapQuote>`}</code></pre>

      <p>
        Computes a swap quote by solving the torus invariant. Handles tick crossings
        automatically.
      </p>

      <h3 id="computeDepositPerToken">computeDepositPerToken</h3>

      <pre><code className="language-typescript">{`function computeDepositPerToken(
  poolState: PoolState,
  tick: { r: bigint; k: bigint }
): bigint[]`}</code></pre>

      <p>
        Returns the deposit amount for each token to add a tick with parameters (r, k).
      </p>

      <h3 id="computePendingFees">computePendingFees</h3>

      <pre><code className="language-typescript">{`function computePendingFees(
  shares: bigint,
  feeGrowth: bigint[],
  feeCheckpoints: bigint[],
  tickTotalR: bigint
): bigint[]`}</code></pre>

      <p>
        Computes accrued fees for a position using the fee growth formula.
      </p>

      <h2 id="algorand-module">@taurusswap/sdk/algorand</h2>

      <h3 id="readPoolState">readPoolState</h3>

      <pre><code className="language-typescript">{`async function readPoolState(
  algodClient: Algodv2,
  appId: number
): Promise<PoolState>`}</code></pre>

      <p>
        Reads and decodes all pool state from global state and box storage.
      </p>

      <h3 id="readTickState">readTickState</h3>

      <pre><code className="language-typescript">{`async function readTickState(
  algodClient: Algodv2,
  appId: number,
  tickId: number
): Promise<TickState>`}</code></pre>

      <p>
        Reads a specific tick&apos;s state from box storage.
      </p>

      <h3 id="readPosition">readPosition</h3>

      <pre><code className="language-typescript">{`async function readPosition(
  algodClient: Algodv2,
  appId: number,
  address: string,
  tickId: number
): Promise<Position>`}</code></pre>

      <p>
        Reads an LP position and computes pending fees.
      </p>

      <h3 id="buildSwapTransactionGroup">buildSwapTransactionGroup</h3>

      <pre><code className="language-typescript">{`async function buildSwapTransactionGroup(
  algodClient: Algodv2,
  appId: number,
  account: Account | string,
  params: {
    tokenInIndex: number;
    tokenOutIndex: number;
    amountIn: bigint;
    minOut: bigint;
    claimedOut: bigint;
  }
): Promise<{ txGroup: Transaction[] }>`}</code></pre>

      <p>
        Builds the atomic transaction group for a swap.
      </p>

      <h3 id="buildAddLiquidityGroup">buildAddLiquidityGroup</h3>

      <pre><code className="language-typescript">{`async function buildAddLiquidityGroup(
  algodClient: Algodv2,
  appId: number,
  account: Account | string,
  params: {
    r: bigint;
    k: bigint;
    deposits: bigint[];
  }
): Promise<{ txGroup: Transaction[] }>`}</code></pre>

      <p>
        Builds the transaction group for adding liquidity (n ASA transfers + app call).
      </p>

      <h3 id="buildRemoveLiquidityGroup">buildRemoveLiquidityGroup</h3>

      <pre><code className="language-typescript">{`async function buildRemoveLiquidityGroup(
  algodClient: Algodv2,
  appId: number,
  account: Account | string,
  params: {
    tickId: number;
    sharesToRemove: bigint;
  }
): Promise<{ txGroup: Transaction[] }>`}</code></pre>

      <p>
        Builds the transaction group for removing liquidity.
      </p>

      <h3 id="buildClaimFeesGroup">buildClaimFeesGroup</h3>

      <pre><code className="language-typescript">{`async function buildClaimFeesGroup(
  algodClient: Algodv2,
  appId: number,
  account: Account | string,
  tickId: number
): Promise<{ txGroup: Transaction[] }>`}</code></pre>

      <p>
        Builds the transaction group for claiming fees.
      </p>

      <h2 id="types">@taurusswap/sdk/types</h2>

      <h3 id="PoolState">PoolState</h3>

      <pre><code className="language-typescript">{`interface PoolState {
  n: number;
  appId: number;
  sumX: bigint;
  sumXSq: bigint;
  rInt: bigint;
  sBound: bigint;
  kBound: bigint;
  totalR: bigint;
  virtualOffset: bigint;
  feeBps: number;
  feeGrowth: bigint[];
  numTicks: number;
  reserves: bigint[];
  tokenAsas: number[];
  tokenDecimals: number[];
}`}</code></pre>

      <h3 id="SwapQuote">SwapQuote</h3>

      <pre><code className="language-typescript">{`interface SwapQuote {
  amountOut: bigint;
  priceImpact: number;
  effectivePrice: number;
  fee: bigint;
  feeBps: number;
  ticksCrossed: number;
  segments: TradeSegment[];
  minOut: bigint;
}`}</code></pre>

      <h3 id="Position">Position</h3>

      <pre><code className="language-typescript">{`interface Position {
  shares: bigint;
  pendingFees: bigint[];
  feeCheckpoints: bigint[];
}`}</code></pre>

      <h3 id="TickState">TickState</h3>

      <pre><code className="language-typescript">{`interface TickState {
  id: number;
  r: bigint;
  k: bigint;
  state: 'INTERIOR' | 'BOUNDARY';
  totalShares: bigint;
  effectiveRadius: bigint;
}`}</code></pre>

      <h2 id="constants">Constants</h2>

      <pre><code className="language-typescript">{`// Math constants
export const PRECISION = 1_000_000_000n;      // 10^9
export const AMOUNT_SCALE = 1000n;
export const TOLERANCE = 1000n;

// Default values
export const DEFAULT_SLIPPAGE_BPS = 50;       // 0.5%
export const MAX_NEWTON_ITERATIONS = 50;
export const MAX_TICK_CROSSINGS = 20;

// Fee defaults
export const DEFAULT_FEE_BPS = 30;            // 0.3%`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/managing-positions"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Managing Positions
        </a>
        <a
          href="/docs/frontend/overview"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Frontend Overview →
        </a>
      </div>
    </div>
  );
}
