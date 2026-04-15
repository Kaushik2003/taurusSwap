export default function Quickstart() {
  return (
    <div className="page-slide-in">
      <h1>Quickstart</h1>

      <p>
        Get started with taurusSwap in 5 minutes. This guide walks through installing the SDK,
        connecting to Algorand, reading pool state, and executing your first swap.
      </p>

      <h2 id="step-1-install-the-sdk">Step 1: Install the SDK</h2>

      <pre><code>{`npm install @taurusswap/sdk algosdk`}</code></pre>

      <p>
        The SDK has <code>algosdk</code> as a peer dependency. Make sure you&apos;re using
        algosdk v3.5.0 or later for full box storage support.
      </p>

      <h2 id="step-2-initialize-an-algod-client">Step 2: Initialize an Algod Client</h2>

      <pre><code className="language-typescript">{`import algosdk from 'algosdk';

const algodClient = new algosdk.Algodv2(
  'YOUR_ALGOD_TOKEN',
  'https://testnet-api.algonode.cloud',
  ''
);

// For mainnet:
// const algodClient = new algosdk.Algodv2(
//   'YOUR_ALGOD_TOKEN',
//   'https://mainnet-api.algonode.cloud',
//   ''
// );`}</code></pre>

      <p>
        For local development, use Algorand Sandbox:
      </p>

      <pre><code className="language-typescript">{`const algodClient = new algosdk.Algodv2(
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'http://localhost:4001',
  ''
);`}</code></pre>

      <h2 id="step-3-read-pool-state">Step 3: Read Pool State</h2>

      <pre><code className="language-typescript">{`import { readPoolState } from '@taurusswap/sdk';

const POOL_APP_ID = 758284478; // Testnet deployment

const poolState = await readPoolState(algodClient, POOL_APP_ID);

console.log('Pool state:', poolState);
// {
//   n: 5,
//   sumX: 12345678901,
//   sumXSq: 987654321098765,
//   rInt: 50000000,
//   sBound: 12345678,
//   kBound: 45678901,
//   totalR: 62345678,
//   virtualOffset: 1000,
//   fee_bps: 30,
//   numTicks: 3,
//   reserves: [1000000000, 2000000000, ...]
// }`}</code></pre>

      <p>
        The <code>reserves</code> array is in microunits. To display in human-readable units,
        divide by 10⁶ for standard ASA decimals, or use the <code>tokenDecimals</code> map
        from the pool metadata.
      </p>

      <h2 id="step-4-get-a-swap-quote">Step 4: Get a Swap Quote</h2>

      <pre><code className="language-typescript">{`import { getSwapQuote } from '@taurusswap/sdk';

const quote = await getSwapQuote(
  poolState,
  {
    tokenInIndex: 0,      // USDC
    tokenOutIndex: 1,     // USDT
    amountIn: 100_000_000 // 100 USDC (in microunits)
  }
);

console.log('Quote:', quote);
// {
//   amountOut: 99856432,
//   priceImpact: 0.0014,
//   fee: 300000,
//   ticksCrossed: 0,
//   segments: [{ amountIn, amountOut, tickCrossedId: null }]
// }`}</code></pre>

      <p>
        Always show the user <code>priceImpact</code> and <code>amountOut</code> before they
        sign. The <code>fee</code> is in output token microunits.
      </p>

      <h2 id="step-5-execute-the-swap">Step 5: Execute the Swap</h2>

      <pre><code className="language-typescript">{`import { executeSwap, buildSwapTransactionGroup } from '@taurusswap/sdk';
import { Account } from 'algosdk';

const { txGroup, signer } = await buildSwapTransactionGroup(
  algodClient,
  POOL_APP_ID,
  senderAccount,
  {
    tokenInIndex: 0,
    tokenOutIndex: 1,
    amountIn: 100_000_000,
    minOut: quote.amountOut * 0.995, // 0.5% slippage
    claimedOut: quote.amountOut
  }
);

const result = await executeSwap(algodClient, txGroup, signer);

console.log('Swap executed:', result);
// {
//   confirmedRound: 12345678,
//   txId: 'TXID...',
//   actualOut: 99856432
// }`}</code></pre>

      <h2 id="next-steps">Next Steps</h2>

      <ul>
        <li>
          <a href="/docs/sdk/reading-pool-state">Reading Pool State</a> — Deep dive into
          every field of <code>PoolState</code>
        </li>
        <li>
          <a href="/docs/sdk/quoting-swaps">Quoting Swaps</a> — How the quote engine works,
          handling stale state
        </li>
        <li>
          <a href="/docs/sdk/adding-liquidity">Adding Liquidity</a> — LP flow with tick
          parameters and deposit computation
        </li>
        <li>
          <a href="/trade">Try the live app</a> — Execute swaps on testnet with the
          taurusSwap UI
        </li>
      </ul>

      <blockquote>
        <strong>Note:</strong> All examples use testnet. For mainnet, change the
        <code>POOL_APP_ID</code> to the mainnet deployment address (see
        <a href="/docs/reference/deployed-addresses">Deployed Addresses</a>).
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/introduction/why-algorand"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Why Algorand?
        </a>
        <a
          href="/docs/math/overview"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Math Overview →
        </a>
      </div>
    </div>
  );
}
