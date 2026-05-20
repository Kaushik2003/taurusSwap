export default function Installation() {
  return (
    <div className="page-slide-in">
      <h1>Installation</h1>

      <p>
        Install the SDK and its peer dependency. The whole setup takes under 5 minutes.
      </p>

      <h2 id="install">Install</h2>

      <pre><code>{`npm install @taurusswap/sdk algosdk`}</code></pre>

      <p>Or with yarn / pnpm:</p>

      <pre><code>{`yarn add @taurusswap/sdk algosdk
pnpm add @taurusswap/sdk algosdk`}</code></pre>

      <p>
        <code>algosdk ^3.0.0</code> is a <strong>peer dependency</strong> — it must be
        installed separately so your app controls the version. The SDK was built against
        algosdk v3.
      </p>

      <h2 id="typescript-configuration">TypeScript Configuration</h2>

      <p>
        The SDK uses <code>BigInt</code> literals and ES2020 features. Your{' '}
        <code>tsconfig.json</code> must target ES2020 or later:
      </p>

      <pre><code className="language-json">{`{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}`}</code></pre>

      <p>
        If you&apos;re using Next.js 13+, these are already the defaults — no changes needed.
      </p>

      <h2 id="quickstart">Quickstart</h2>

      <p>
        The fastest way to verify the installation. This reads pool state from testnet and
        prints the current reserves:
      </p>

      <pre><code className="language-typescript">{`import { TaurusClient } from '@taurusswap/sdk';

const client = new TaurusClient(); // defaults to testnet AlgoNode

async function main() {
  const pool = await client.getPoolState();

  console.log('Tokens in pool:', pool.n);
  console.log('Token ASA IDs:', pool.tokenAsaIds);
  console.log('Total TVL (microunits):', pool.actualReservesRaw.reduce((a, b) => a + b, 0n));

  // Format as USD (all stablecoins, 6 decimals)
  const tvlUsd = pool.actualReservesRaw.reduce((sum, r) => sum + Number(r), 0) / 1e6;
  console.log('Total TVL (USD):', tvlUsd.toFixed(2));
}

main().catch(console.error);`}</code></pre>

      <h2 id="custom-configuration">Custom Configuration</h2>

      <p>
        Pass a <code>TaurusClientConfig</code> to <code>TaurusClient</code> to point at
        different endpoints or your own pool:
      </p>

      <pre><code className="language-typescript">{`import { TaurusClient, type TaurusClientConfig } from '@taurusswap/sdk';

const config: TaurusClientConfig = {
  // Algod — defaults to https://testnet-api.algonode.cloud
  algodUrl:   'https://mainnet-api.algonode.cloud',
  algodToken: '',              // empty string for AlgoNode public endpoint

  // Indexer — defaults to https://testnet-idx.algonode.cloud
  indexerUrl: 'https://mainnet-idx.algonode.cloud',

  // Pool — defaults to 758284478 (testnet)
  poolAppId: 123456789,

  // Pool state cache TTL in milliseconds (default 10 000 = 10s)
  // Set to 0 to disable caching entirely
  cacheTtlMs: 15_000,
};

const client = new TaurusClient(config);`}</code></pre>

      <h2 id="using-the-low-level-api">Using the Low-Level API</h2>

      <p>
        If you already have an <code>algosdk.Algodv2</code> instance (e.g. from your wallet
        adapter), you can skip <code>TaurusClient</code> and call functions directly:
      </p>

      <pre><code className="language-typescript">{`import { readPoolState, getSwapQuote } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const algod = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud');
const POOL_APP_ID = 758284478;

const pool  = await readPoolState(algod, POOL_APP_ID);
const quote = getSwapQuote(pool, 0, 1, 10_000_000n); // synchronous!
console.log('amountOut:', quote.amountOut);`}</code></pre>

      <h2 id="environment-variables">Environment Variables (Next.js)</h2>

      <p>Recommended pattern for Next.js apps:</p>

      <pre><code className="language-typescript">{`// lib/taurus.ts
import { TaurusClient } from '@taurusswap/sdk';

export const taurusClient = new TaurusClient({
  algodUrl:   process.env.NEXT_PUBLIC_ALGOD_URL  ?? 'https://testnet-api.algonode.cloud',
  algodToken: process.env.NEXT_PUBLIC_ALGOD_TOKEN ?? '',
  indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL ?? 'https://testnet-idx.algonode.cloud',
  poolAppId:  Number(process.env.NEXT_PUBLIC_POOL_APP_ID ?? 758284478),
});`}</code></pre>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3 id="bigint-not-supported">&quot;BigInt is not supported&quot;</h3>
      <p>
        Your tsconfig <code>target</code> is below ES2020. Set <code>"target": "ES2020"</code>{' '}
        and add <code>"ES2020"</code> to the <code>lib</code> array.
      </p>

      <h3 id="cannot-find-module">&quot;Cannot find module &apos;@taurusswap/sdk&apos;&quot;</h3>
      <pre><code>{`rm -rf node_modules package-lock.json
npm install`}</code></pre>

      <h3 id="box-not-found">Box not found errors on fresh pools</h3>
      <p>
        A pool with no liquidity yet may not have all boxes initialised. The SDK returns
        empty arrays gracefully — always check <code>pool.ticks.length</code> before quoting.
      </p>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/overview" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← SDK Overview
        </a>
        <a href="/docs/sdk/reading-pool-state" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Reading Pool State →
        </a>
      </div>
    </div>
  );
}
