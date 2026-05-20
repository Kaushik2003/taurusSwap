export default function SDKOverview() {
  return (
    <div className="page-slide-in">
      <h1>SDK Overview</h1>

      <p>
        <code>@taurusswap/sdk</code> is the TypeScript client for TaurusSwap — a concentrated-liquidity
        stablecoin AMM on Algorand built on the Orbital AMM design. It handles on-chain state
        decoding, off-chain swap math, and unsigned Algorand transaction construction.
      </p>

      <blockquote>
        <strong>Package:</strong> <code>@taurusswap/sdk</code> &nbsp;·&nbsp;
        <strong>Peer dep:</strong> <code>algosdk ^3.0.0</code> &nbsp;·&nbsp;
        <strong>Testnet App ID:</strong> <code>758284478</code>
      </blockquote>

      <h2 id="what-the-sdk-does">What the SDK Does</h2>

      <ul>
        <li><strong>Reads pool state</strong> — Decodes global state, the <code>reserves</code> box, <code>fee_growth</code> box, and all <code>tick:</code> boxes into a typed <code>PoolState</code> object.</li>
        <li><strong>Quotes swaps off-chain</strong> — Runs the full Newton-bisection solver and tick-crossing logic locally, matching on-chain math exactly.</li>
        <li><strong>Builds unsigned transactions</strong> — Returns <code>algosdk.Transaction[]</code> ready for wallet signing. Never signs or broadcasts itself.</li>
        <li><strong>LP operations</strong> — Computes deposit amounts, tick parameters from depeg prices, and claimable fees.</li>
        <li><strong>Zap</strong> — Plans single-token deposits by splitting one token into equal amounts of all pool tokens.</li>
        <li><strong>APR estimation</strong> — Combines 24h fee volume with capital efficiency to project annualised yield.</li>
      </ul>

      <h2 id="what-it-doesnt-do">What It Doesn&apos;t Do</h2>

      <ul>
        <li><strong>Sign transactions</strong> — Pass the returned <code>Transaction[]</code> to your wallet (Pera, Defly, etc.).</li>
        <li><strong>Broadcast transactions</strong> — Call <code>algod.sendRawTransaction(signedTxns).do()</code> yourself.</li>
        <li><strong>Manage wallets</strong> — Use <code>algosdk</code> or a wallet adapter for key management.</li>
      </ul>

      <h2 id="two-usage-styles">Two Usage Styles</h2>

      <p>The SDK exposes two levels of abstraction:</p>

      <h3 id="high-level-taurusclient">High-level: TaurusClient</h3>

      <p>
        A single class that owns an Algod client, an Indexer client, a 10-second pool-state
        cache, and convenience wrappers for every operation. Recommended for most apps.
      </p>

      <pre><code className="language-typescript">{`import { TaurusClient } from '@taurusswap/sdk';

const client = new TaurusClient(); // defaults to testnet AlgoNode

const quote = await client.quote({ fromIndex: 0, toIndex: 1, amountIn: 1_000_000n });
const txns  = await client.buildSwapTxns({ sender, fromIndex: 0, toIndex: 1, amountIn: 1_000_000n });
// → sign txns with your wallet, then algod.sendRawTransaction(signed).do()`}</code></pre>

      <h3 id="low-level-functions">Low-level: individual functions</h3>

      <p>
        Every operation is also exported as a standalone function. Use these when you need
        fine-grained control or want to bring your own Algod client.
      </p>

      <pre><code className="language-typescript">{`import { readPoolState, getSwapQuote, buildSwapTxns } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const algod = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud');
const pool  = await readPoolState(algod, 758284478);
const quote = getSwapQuote(pool, 0, 1, 1_000_000n); // synchronous
const txns  = await buildSwapTxns(algod, 758284478, sender, pool, 0, 1, 1_000_000n, 50);`}</code></pre>

      <h2 id="architecture">Three-Layer Architecture</h2>

      <pre><code>{`┌──────────────────────────────────────────┐
│  TaurusClient (src/client.ts)            │  ← High-level API + cache
│  .quote()  .buildSwapTxns()              │
│  .buildAddLiquidityTxns()                │
│  .buildZapTxns()  .estimateAPR()         │
├──────────────────────────────────────────┤
│  pool/ & algorand/  (mid-level)          │  ← State reading + tx builders
│  readPoolState()   getSwapQuote()        │
│  buildSwapGroup()  buildAddTickGroup()   │
│  tickParamsFromDepegPrice()              │
├──────────────────────────────────────────┤
│  math/  (pure BigInt functions)          │  ← Invariant math, no I/O
│  solveSwapNewton()  executeTradeWithCrossings()
│  consolidateTicks()  capitalEfficiency() │
└──────────────────────────────────────────┘`}</code></pre>

      <h2 id="unit-system">Unit System</h2>

      <p>There are three unit spaces. Getting this wrong is the most common source of bugs.</p>

      <table>
        <thead>
          <tr><th>Name</th><th>Scale</th><th>Used for</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>raw microunits</strong></td>
            <td>×1</td>
            <td>ASA transfer amounts, all public API inputs/outputs (amountIn, amountOut, depositPerTokenRaw)</td>
          </tr>
          <tr>
            <td><strong>AMOUNT_SCALE units</strong></td>
            <td>÷1 000</td>
            <td>Internal math, r and k tick parameters, reserve aggregates (sumX, rInt, etc.)</td>
          </tr>
          <tr>
            <td><strong>PRECISION units</strong></td>
            <td>×10⁹</td>
            <td>feeGrowth accumulators, sqrtN, invSqrtN, price ratios</td>
          </tr>
        </tbody>
      </table>

      <p>
        The rule of thumb: <strong>1 USDC = 1_000_000n raw microunits</strong>. All SDK
        public methods accept and return raw microunits.
      </p>

      <h2 id="error-classes">Error Classes</h2>

      <p>All errors extend <code>TaurusError</code> and carry a <code>code</code> string:</p>

      <pre><code className="language-typescript">{`import {
  SwapTooSmallError,        // amountIn too small after fee + scaling
  InsufficientLiquidityError, // trade too large for available liquidity
  TickNotFoundError,         // tickId not present in pool
  InvalidTickParamsError,    // deposit would be zero or negative
  InvalidSlippageError,      // slippageBps out of 0–10000 range
  ZapAmountTooSmallError,    // totalAmountRaw too small to split
} from '@taurusswap/sdk';

try {
  const quote = await client.quote({ fromIndex: 0, toIndex: 1, amountIn: 100n });
} catch (err) {
  if (err instanceof SwapTooSmallError)         console.error(err.code); // "SWAP_TOO_SMALL"
  if (err instanceof InsufficientLiquidityError) console.error(err.code); // "INSUFFICIENT_LIQUIDITY"
}`}</code></pre>

      <h2 id="minimal-example">Minimal End-to-End Example</h2>

      <pre><code className="language-typescript">{`import { TaurusClient } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const client = new TaurusClient(); // testnet by default
const sender = 'YOUR_ALGORAND_ADDRESS';

// 1. Quote: sell 10 USDC (token 0) for USDT (token 1)
const quote = await client.quote({
  fromIndex: 0,
  toIndex: 1,
  amountIn: 10_000_000n, // 10 USDC in microunits
});

console.log('You receive:', Number(quote.amountOut) / 1e6, 'USDT');
console.log('Price impact:', (quote.priceImpact * 100).toFixed(4), '%');
console.log('Ticks crossed:', quote.ticksCrossed);

// 2. Build unsigned transaction group
const txns = await client.buildSwapTxns({
  sender,
  fromIndex: 0,
  toIndex: 1,
  amountIn: 10_000_000n,
  slippageBps: 50, // 0.5% default
});

// 3. Sign with your wallet, then submit
// const signedTxns = await peraWallet.signTransaction([txns.map(t => ({ txn: t }))]);
// const { txid } = await client.algod.sendRawTransaction(signedTxns).do();
// await algosdk.waitForConfirmation(client.algod, txid, 4);`}</code></pre>

      <h2 id="next-steps">Next Steps</h2>

      <ul>
        <li><a href="/docs/sdk/installation">Installation</a> — Package setup and tsconfig</li>
        <li><a href="/docs/sdk/reading-pool-state">Reading Pool State</a> — Every field of <code>PoolState</code> explained</li>
        <li><a href="/docs/sdk/quoting-swaps">Quoting Swaps</a> — Off-chain quote, price impact, tick crossings</li>
        <li><a href="/docs/sdk/executing-swaps">Executing Swaps</a> — Build, sign, and submit</li>
        <li><a href="/docs/sdk/adding-liquidity">Adding Liquidity</a> — Tick parameters, deposit amounts, zap</li>
        <li><a href="/docs/sdk/managing-positions">Managing Positions</a> — Read positions, claim fees, remove liquidity</li>
        <li><a href="/docs/sdk/api-reference">API Reference</a> — Full type signatures</li>
      </ul>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/protocol/unit-scaling" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← Unit Scaling
        </a>
        <a href="/docs/sdk/installation" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Installation →
        </a>
      </div>
    </div>
  );
}
