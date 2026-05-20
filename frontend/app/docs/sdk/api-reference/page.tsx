export default function ApiReference() {
  return (
    <div className="page-slide-in">
      <h1>API Reference</h1>

      <p>
        Complete reference for all public exports from <code>@taurusswap/sdk</code>.
        Every function, type, and constant is covered.
      </p>

      {/* ────────────────────────────────────────────────────────────────── */}
      <h2 id="taurusclient">TaurusClient</h2>

      <p>
        The high-level entry point. Owns an Algod client, Indexer client, and a pool-state
        cache. Import and instantiate once per app.
      </p>

      <pre><code className="language-typescript">{`import { TaurusClient } from '@taurusswap/sdk';
const client = new TaurusClient(config?: TaurusClientConfig);`}</code></pre>

      <h3 id="taurusclientconfig">TaurusClientConfig</h3>

      <pre><code className="language-typescript">{`interface TaurusClientConfig {
  algodUrl?:    string;  // default: https://testnet-api.algonode.cloud
  algodToken?:  string;  // default: '' (public AlgoNode)
  algodPort?:   number;
  indexerUrl?:  string;  // default: https://testnet-idx.algonode.cloud
  indexerToken?: string;
  poolAppId?:   number;  // default: 758284478 (testnet)
  cacheTtlMs?:  number;  // pool-state cache TTL ms; default 10 000; 0 = no cache
}`}</code></pre>

      <h3 id="client-methods">Methods</h3>

      <table>
        <thead>
          <tr><th>Method</th><th>Returns</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>getPoolState(forceRefresh?)</code></td>
            <td><code>Promise&lt;PoolState&gt;</code></td>
            <td>Fetch pool state; results cached for cacheTtlMs</td>
          </tr>
          <tr>
            <td><code>invalidateCache()</code></td>
            <td><code>void</code></td>
            <td>Force-evict cached pool state</td>
          </tr>
          <tr>
            <td><code>getPosition(address, tickId)</code></td>
            <td><code>Promise&lt;PositionInfo | null&gt;</code></td>
            <td>Read LP position and compute claimable fees</td>
          </tr>
          <tr>
            <td><code>quote(params)</code></td>
            <td><code>Promise&lt;SwapQuote&gt;</code></td>
            <td>Off-chain swap quote</td>
          </tr>
          <tr>
            <td><code>getAllPrices(baseTokenIdx?)</code></td>
            <td><code>Promise&lt;number[]&gt;</code></td>
            <td>Spot price of every token relative to base</td>
          </tr>
          <tr>
            <td><code>buildSwapTxns(params)</code></td>
            <td><code>Promise&lt;Transaction[]&gt;</code></td>
            <td>Build unsigned swap transaction group</td>
          </tr>
          <tr>
            <td><code>buildAddLiquidityTxns(params)</code></td>
            <td><code>Promise&lt;&#123; txns, depositPerTokenRaw, tickId &#125;&gt;</code></td>
            <td>Build unsigned add-tick transaction group</td>
          </tr>
          <tr>
            <td><code>buildRemoveLiquidityTxns(params)</code></td>
            <td><code>Promise&lt;Transaction[]&gt;</code></td>
            <td>Build unsigned remove-liquidity group</td>
          </tr>
          <tr>
            <td><code>buildClaimFeesTxns(params)</code></td>
            <td><code>Promise&lt;Transaction[]&gt;</code></td>
            <td>Build unsigned claim-fees group</td>
          </tr>
          <tr>
            <td><code>computeZap(sourceIdx, totalAmountRaw)</code></td>
            <td><code>Promise&lt;ZapPlan&gt;</code></td>
            <td>Plan single-token deposit (pure, no extra calls)</td>
          </tr>
          <tr>
            <td><code>buildZapTxns(params)</code></td>
            <td><code>Promise&lt;&#123; swapTxnGroups, addLiquidityTxns, plan &#125;&gt;</code></td>
            <td>Build all groups for a zap operation</td>
          </tr>
          <tr>
            <td><code>tickParamsFromDepegPrice(depegPrice, depositRaw)</code></td>
            <td><code>Promise&lt;&#123; r, k &#125;&gt;</code></td>
            <td>Convert depeg price + deposit to (r, k)</td>
          </tr>
          <tr>
            <td><code>getCapitalEfficiency(depegPrice, tickRadius)</code></td>
            <td><code>Promise&lt;&#123; k, efficiency, depositPerToken &#125;&gt;</code></td>
            <td>Capital efficiency multiplier for a tick config</td>
          </tr>
          <tr>
            <td><code>estimateRemoval(address, tickId, shares)</code></td>
            <td><code>Promise&lt;EstimateRemovalResult&gt;</code></td>
            <td>Preview principal + fees before removing</td>
          </tr>
          <tr>
            <td><code>estimateAPR(depegPrice, depositPerTokenRaw)</code></td>
            <td><code>Promise&lt;EstimateAPRResult&gt;</code></td>
            <td>Estimate annualised yield (requires indexer)</td>
          </tr>
          <tr>
            <td><code>getPoolStats()</code></td>
            <td><code>Promise&lt;PoolStats&gt;</code></td>
            <td>24h stats from Indexer: volume, fees, TVL</td>
          </tr>
          <tr>
            <td><code>getTransactions(options?)</code></td>
            <td><code>Promise&lt;AMMTransaction[]&gt;</code></td>
            <td>Recent swap/LP transactions from Indexer</td>
          </tr>
        </tbody>
      </table>

      {/* ────────────────────────────────────────────────────────────────── */}
      <h2 id="standalone-pool-functions">Pool Functions (standalone)</h2>

      <h3 id="readpoolstate">readPoolState</h3>
      <pre><code className="language-typescript">{`async function readPoolState(
  client:  algosdk.Algodv2,
  appId:   number,
): Promise<PoolState>`}</code></pre>
      <p>Reads global state, reserves box, fee_growth box, tick boxes, and token boxes.</p>

      <h3 id="readposition">readPosition</h3>
      <pre><code className="language-typescript">{`async function readPosition(
  client:     algosdk.Algodv2,
  appId:      number,
  address:    string,
  tickId:     number,
  n:          number,
  feeGrowth:  bigint[],
  tick:       Tick,
): Promise<PositionInfo | null>`}</code></pre>
      <p>Returns <code>null</code> if no pos: box exists for (address, tickId).</p>

      <h3 id="getswapquote">getSwapQuote</h3>
      <pre><code className="language-typescript">{`function getSwapQuote(           // synchronous
  poolState:    PoolState,
  tokenInIdx:   number,
  tokenOutIdx:  number,
  amountInRaw:  bigint,
): SwapQuote`}</code></pre>

      <h3 id="buildswaptxns">buildSwapTxns</h3>
      <pre><code className="language-typescript">{`async function buildSwapTxns(
  client:       algosdk.Algodv2,
  poolAppId:    number,
  sender:       string,
  poolState:    PoolState,
  tokenInIdx:   number,
  tokenOutIdx:  number,
  amountInRaw:  bigint,
  slippageBps?: number,           // default 50 (0.5%)
): Promise<algosdk.Transaction[]>`}</code></pre>

      <h3 id="executeswap">executeSwap</h3>
      <pre><code className="language-typescript">{`async function executeSwap(
  client:      algosdk.Algodv2,
  poolAppId:   number,
  sender:      string,
  tokenInIdx:  number,
  tokenOutIdx: number,
  amountInRaw: bigint,
  slippageBps: number,
  signer:      (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>,
): Promise<{ txId: string; amountOut: bigint }>`}</code></pre>

      <h3 id="tickparamsfromdepegprice">tickParamsFromDepegPrice</h3>
      <pre><code className="language-typescript">{`function tickParamsFromDepegPrice(
  depegPrice:            number,   // e.g. 0.99
  totalDepositPerTokenRaw: bigint, // raw microunits
  n:                     number,
  sqrtN:                 bigint,
  invSqrtN:              bigint,
): { r: bigint; k: bigint }        // both in AMOUNT_SCALE units`}</code></pre>

      <h3 id="computedepositpertoken">computeDepositPerToken</h3>
      <pre><code className="language-typescript">{`function computeDepositPerToken(
  r:       bigint,  // AMOUNT_SCALE units
  k:       bigint,  // AMOUNT_SCALE units
  n:       number,
  sqrtN:   bigint,
  invSqrtN: bigint,
): bigint  // raw microunits per token`}</code></pre>

      <h3 id="addliquidity">addLiquidity</h3>
      <pre><code className="language-typescript">{`async function addLiquidity(params: AddLiquidityParams): Promise<AddLiquidityResult>

interface AddLiquidityParams {
  client:   algosdk.Algodv2;
  poolAppId: number;
  sender:   string;
  r:        bigint;   // AMOUNT_SCALE units
  k:        bigint;   // AMOUNT_SCALE units
  signer:   (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}

interface AddLiquidityResult {
  txId:              string;
  tickId:            number;  // ID assigned to the new tick
  depositPerTokenRaw: bigint; // raw microunits deposited per token
}`}</code></pre>

      <h3 id="removeliquidity">removeLiquidity</h3>
      <pre><code className="language-typescript">{`async function removeLiquidity(params: RemoveLiquidityParams): Promise<{ txId: string }>

interface RemoveLiquidityParams {
  client:   algosdk.Algodv2;
  poolAppId: number;
  sender:   string;
  tickId:   number;
  shares:   bigint;  // pass tick.totalShares for full exit
  signer:   (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}`}</code></pre>

      <h3 id="claimfees">claimFees</h3>
      <pre><code className="language-typescript">{`async function claimFees(params: ClaimFeesParams): Promise<{ txId: string }>

interface ClaimFeesParams {
  client:   algosdk.Algodv2;
  poolAppId: number;
  sender:   string;
  tickId:   number;
  signer:   (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
}`}</code></pre>

      <h3 id="computezap">computeZap</h3>
      <pre><code className="language-typescript">{`function computeZap(               // synchronous
  pool:           PoolState,
  sourceTokenIdx: number,
  totalAmountRaw: bigint,
): ZapPlan

interface ZapPlan {
  swaps:          ZapSwap[];
  depositPerToken: bigint;   // min received across all token swaps (raw microunits)
  avgPriceImpact: number;
}

interface ZapSwap {
  fromIdx:     number;
  toIdx:       number;
  amountIn:    bigint;  // raw microunits
  amountOut:   bigint;  // raw microunits (off-chain quote)
  priceImpact: number;
}`}</code></pre>

      {/* ────────────────────────────────────────────────────────────────── */}
      <h2 id="types">Types</h2>

      <pre><code className="language-typescript">{`// Pool snapshot
interface PoolState {
  appId:             number;
  n:                 number;
  sqrtN:             bigint;     // PRECISION-scaled
  invSqrtN:          bigint;     // PRECISION-scaled
  sumX:              bigint;     // AMOUNT_SCALE units
  sumXSq:            bigint;     // AMOUNT_SCALE² units
  virtualOffset:     bigint;     // AMOUNT_SCALE units
  rInt:              bigint;     // AMOUNT_SCALE units
  sBound:            bigint;     // AMOUNT_SCALE units
  kBound:            bigint;     // AMOUNT_SCALE units
  totalR:            bigint;     // AMOUNT_SCALE units
  feeBps:            bigint;     // e.g. 30n = 0.30%
  feeGrowth:         bigint[];   // [n] PRECISION-scaled accumulators
  actualReservesRaw: bigint[];   // [n] raw microunits (use for TVL / display)
  reserves:          bigint[];   // [n] math-space (actualRaw/1000 + virtualOffset)
  numTicks:          number;
  ticks:             Tick[];
  tokenAsaIds:       number[];
  tokenDecimals:     number[];
}

// Tick
interface Tick {
  id:          number;
  r:           bigint;     // AMOUNT_SCALE units
  k:           bigint;     // AMOUNT_SCALE units
  state:       TickState;  // INTERIOR = 0, BOUNDARY = 1
  totalShares: bigint;
}
enum TickState { INTERIOR = 0, BOUNDARY = 1 }

// LP position
interface PositionInfo {
  tickId:        number;
  shares:        bigint;
  positionR:     bigint;    // AMOUNT_SCALE units
  claimableFees: bigint[];  // [n] raw microunits
}

// Swap quote
interface SwapQuote {
  amountIn:           bigint;
  amountOut:          bigint;
  priceImpact:        number;   // 0.01 = 1%
  instantaneousPrice: number;
  effectivePrice:     number;
  ticksCrossed:       number;
  route:              TradeSegment[];
}

// Indexer stats
interface PoolStats {
  tvlUsd:       number;
  volume24hUsd: number;
  fees24hUsd:   number;
  swapCount24h: number;
  activeTicks:  number;
  feeBps:       number;
}

interface AMMTransaction {
  id:           string;
  type:         'swap' | 'add' | 'remove' | 'claim';
  timestamp:    number;  // ms since epoch
  wallet:       string;
  tokenInIdx?:  number;
  tokenOutIdx?: number;
  amountIn?:    bigint;  // raw microunits
  amountOut?:   bigint;  // raw microunits
}

// APR estimate
interface EstimateAPRResult {
  apr:                number;   // e.g. 0.12 = 12%
  dailyFeeUsd:        number;
  efficiencyMultiplier: number;
  tickRadius:         bigint;
}

interface EstimateRemovalResult {
  receivePerTokenRaw: bigint[];  // principal amounts, raw microunits
  claimableFeesRaw:   bigint[];  // fee amounts, raw microunits
}`}</code></pre>

      {/* ────────────────────────────────────────────────────────────────── */}
      <h2 id="error-classes">Error Classes</h2>

      <pre><code className="language-typescript">{`// Base class
class TaurusError extends Error {
  readonly code: string; // machine-readable error code
}

class SwapTooSmallError         extends TaurusError { code = 'SWAP_TOO_SMALL' }
class InsufficientLiquidityError extends TaurusError { code = 'INSUFFICIENT_LIQUIDITY' }
class TickNotFoundError          extends TaurusError { code = 'TICK_NOT_FOUND' }
class InvalidTickParamsError     extends TaurusError { code = 'INVALID_TICK_PARAMS' }
class InvalidSlippageError       extends TaurusError { code = 'INVALID_SLIPPAGE' }
class ZapAmountTooSmallError     extends TaurusError { code = 'ZAP_TOO_SMALL' }
class IndexerNotConfiguredError  extends TaurusError { code = 'INDEXER_NOT_CONFIGURED' }`}</code></pre>

      {/* ────────────────────────────────────────────────────────────────── */}
      <h2 id="constants">Constants</h2>

      <pre><code className="language-typescript">{`import {
  PRECISION,            // 1_000_000_000n  — 10⁹ scaling for feeGrowth and prices
  PRECISION_SQ,         // PRECISION²
  AMOUNT_SCALE,         // 1_000n          — raw microunits / AMOUNT_SCALE = math units
  TOLERANCE,            // 1_000n          — invariant residual tolerance

  SQRT_TABLE,           // Record<number, bigint> — floor(√n × 10⁹) for n = 2..100
  INV_SQRT_TABLE,       // Record<number, bigint> — floor(1/√n × 10⁹)

  MAX_NEWTON_ITERATIONS, // 50  — Newton-bisection solver cap
  MAX_BISECTION_STEPS,   // 80
  MAX_BRACKET_SAMPLES,   // 64
  MAX_TICK_CROSSINGS,    // 20  — safety cap on crossings per trade

  DEFAULT_SLIPPAGE_BPS,  // 50  — 0.50%
  ALGO_MICRO,            // 1_000_000n
  MIN_TXN_FEE,           // 1_000n
  OPCODE_BUDGET_PER_TXN, // 700
} from '@taurusswap/sdk';`}</code></pre>

      {/* ────────────────────────────────────────────────────────────────── */}
      <h2 id="math-exports">Math Exports</h2>

      <p>
        These are exported for advanced use cases. Normal integrations should use the
        pool-level functions above.
      </p>

      <pre><code className="language-typescript">{`// Sphere invariant (single-tick, no crossings)
function sphereInvariant(reserves: bigint[], rInt: bigint, n: number): bigint
function getPrice(reserves: bigint[], rInt: bigint, i: number, j: number): bigint
function equalPricePoint(r: bigint, invSqrtN: bigint): bigint  // q in AMOUNT_SCALE units
function solveSwapSphere(...): bigint

// Torus invariant (multi-tick composite)
function torusInvariant(sumX: bigint, sumXSq: bigint, n: number,
                        rInt: bigint, sBound: bigint, kBound: bigint,
                        sqrtN: bigint, invSqrtN: bigint): bigint
function isValidState(poolState: PoolState): boolean

// Newton-bisection solver
function solveSwapNewton(effectiveInScaled: bigint, tokenInIdx: number,
                         tokenOutIdx: number, reserves: bigint[], n: number,
                         sqrtN: bigint, invSqrtN: bigint, rInt: bigint): bigint

// Tick consolidation
function consolidateTicks(ticks: Tick[], sqrtN: bigint):
  { rInt: bigint; sBound: bigint; kBound: bigint }

// Tick geometry
function kFromDepegPrice(depegPrice: number, r: bigint, n: number,
                         sqrtN: bigint, invSqrtN: bigint): bigint
function capitalEfficiency(r: bigint, k: bigint, n: number,
                            sqrtN: bigint, invSqrtN: bigint): number
function xMin(r: bigint, k: bigint, n: number, sqrtN: bigint): bigint
function xMax(r: bigint, n: number, invSqrtN: bigint): bigint

// BigInt utilities
function sqrt(n: bigint): bigint
function abs(n: bigint): bigint
function min(a: bigint, b: bigint): bigint
function max(a: bigint, b: bigint): bigint`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/managing-positions" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← Managing Positions
        </a>
        <a href="/docs/frontend/overview" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Frontend Overview →
        </a>
      </div>
    </div>
  );
}
