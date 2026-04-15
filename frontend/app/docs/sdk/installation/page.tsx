export default function Installation() {
  return (
    <div className="page-slide-in">
      <h1>Installation</h1>

      <p>
        Getting started with the taurusSwap SDK takes about 5 minutes. This page covers
        package installation, peer dependencies, and TypeScript configuration.
      </p>

      <h2 id="install-the-package">Install the Package</h2>

      <pre><code>{`npm install @taurusswap/sdk`}</code></pre>

      <p>
        Or with yarn:
      </p>

      <pre><code>{`yarn add @taurusswap/sdk`}</code></pre>

      <h2 id="peer-dependencies">Peer Dependencies</h2>

      <p>
        The SDK requires <code>algosdk</code> v3.5.0 or later:
      </p>

      <pre><code>{`npm install algosdk@^3.5.0`}</code></pre>

      <p>
        <code>algosdk</code> is used for:
      </p>

      <ul>
        <li>Algod client communication</li>
        <li>Transaction construction</li>
        <li>Address encoding/decoding</li>
        <li>Box storage access</li>
      </ul>

      <h2 id="typescript-configuration">TypeScript Configuration</h2>

      <p>
        The SDK uses BigInt literals and modern ES2020 features. Your <code>tsconfig.json</code>
        must have:
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
        If you&apos;re using Next.js, these settings are already the default.
      </p>

      <h2 id="hello-world">Hello World</h2>

      <p>
        Here&apos;s a minimal example that reads pool state and prints the current reserves:
      </p>

      <pre><code className="language-typescript">{`import { readPoolState } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const algodClient = new algosdk.Algodv2(
  'YOUR_ALGOD_TOKEN',
  'https://testnet-api.algonode.cloud',
  ''
);

const POOL_APP_ID = 758284478;

async function main() {
  const poolState = await readPoolState(algodClient, POOL_APP_ID);

  console.log('Pool state:');
  console.log('  Tokens:', poolState.n);
  console.log('  Total liquidity:', poolState.totalR);
  console.log('  Reserves (microunits):', poolState.reserves);
}

main().catch(console.error);`}</code></pre>

      <h2 id="display-units">Display Units</h2>

      <p>
        The SDK returns reserves in microunits. To display in human-readable format:
      </p>

      <pre><code className="language-typescript">{`import { formatTokenAmount } from '@taurusswap/sdk';

const poolState = await readPoolState(algodClient, POOL_APP_ID);

// USDC has 6 decimals
const usdcReserves = formatTokenAmount(
  poolState.reserves[0],
  6  // decimals
);

console.log(\`USDC reserves: \${usdcReserves}\`);  // "1,234,567.89"`}</code></pre>

      <h2 id="wallet-integration">Wallet Integration</h2>

      <p>
        For React apps, use a wallet adapter:
      </p>

      <pre><code className="language-typescript">{`import { useWallet } from '@txnlab/use-wallet-react';

function SwapForm() {
  const { activeAddress, signer } = useWallet();

  const handleSwap = async () => {
    if (!signer) return;

    const { txGroup } = await buildSwapTransactionGroup(
      algodClient,
      POOL_APP_ID,
      activeAddress,
      tradeParams
    );

    const result = await signer.signGroupTransaction(txGroup);
    // Send signed transactions...
  };

  return <button onClick={handleSwap}>Swap</button>;
}`}</code></pre>

      <h2 id="environment-variables">Environment Variables</h2>

      <p>
        Recommended setup for environment configuration:
      </p>

      <pre><code className="language-typescript">{`// lib/config.ts
export const config = {
  testnet: {
    algodToken: process.env.NEXT_PUBLIC_ALGOD_TOKEN!,
    algodServer: 'https://testnet-api.algonode.cloud',
    poolAppId: 758284478,
  },
  mainnet: {
    algodToken: process.env.NEXT_PUBLIC_ALGOD_TOKEN!,
    algodServer: 'https://mainnet-api.algonode.cloud',
    poolAppId: 123456789,  // Update after mainnet deploy
  },
};

export const getAlgodClient = (network: 'testnet' | 'mainnet') => {
  const cfg = config[network];
  return new algosdk.Algodv2(cfg.algodToken, cfg.algodServer, '');
};`}</code></pre>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3 id="bigint-not-defined">&quot;BigInt is not defined&quot;</h3>

      <p>
        Add BigInt to your tsconfig lib:
      </p>

      <pre><code className="language-json">{`"lib": ["ES2020", "BigInt"]`}</code></pre>

      <h3 id="module-not-found">&quot;Module not found: @taurusswap/sdk&quot;</h3>

      <p>
        Clear npm cache and reinstall:
      </p>

      <pre><code>{`rm -rf node_modules package-lock.json
npm install`}</code></pre>

      <h3 id="box-not-found-error">Box not found errors</h3>

      <p>
        Fresh pools may not have all boxes initialized yet. Handle gracefully:
      </p>

      <pre><code className="language-typescript">{`try {
  const state = await readPoolState(algodClient, POOL_APP_ID);
} catch (err) {
  if (err instanceof BoxNotFoundError) {
    console.log('Pool not initialized yet');
  }
}`}</code></pre>

      <blockquote>
        <strong>Next:</strong> See <a href="/docs/sdk/reading-pool-state">Reading Pool State</a> for a deep dive into every field of <code>PoolState</code>.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/overview"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← SDK Overview
        </a>
        <a
          href="/docs/sdk/reading-pool-state"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Reading Pool State →
        </a>
      </div>
    </div>
  );
}
