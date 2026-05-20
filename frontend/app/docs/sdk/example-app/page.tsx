export default function ExampleApp() {
  return (
    <div className="page-slide-in">
      <h1>Example App</h1>

      <p>
        The <code>example/</code> directory in the monorepo is a full Next.js app that
        demonstrates every SDK operation in a real UI. Every SDK call renders a
        collapsible code panel showing the exact method invoked, its arguments, duration,
        and success/error status.
      </p>

      <blockquote>
        <strong>Source:</strong>{' '}
        <a
          href="https://github.com/Kaushik2003/taurusSwap/tree/main/example"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/Kaushik2003/taurusSwap/tree/main/example
        </a>
      </blockquote>

      <h2 id="what-it-covers">What It Covers</h2>

      <table>
        <thead>
          <tr><th>Tab / Component</th><th>SDK calls demonstrated</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Swap</strong></td>
            <td><code>client.quote()</code>, <code>client.buildSwapTxns()</code></td>
          </tr>
          <tr>
            <td><strong>Liquidity</strong></td>
            <td>
              <code>client.tickParamsFromDepegPrice()</code>,{' '}
              <code>client.getCapitalEfficiency()</code>,{' '}
              <code>client.buildAddLiquidityTxns()</code>
            </td>
          </tr>
          <tr>
            <td><strong>Positions</strong></td>
            <td>
              <code>client.getPosition()</code>,{' '}
              <code>client.estimateRemoval()</code>,{' '}
              <code>client.buildRemoveLiquidityTxns()</code>,{' '}
              <code>client.buildClaimFeesTxns()</code>
            </td>
          </tr>
          <tr>
            <td><strong>Pool Explorer</strong></td>
            <td><code>client.getPoolState()</code>, <code>client.getAllPrices()</code></td>
          </tr>
          <tr>
            <td><strong>SDK Log</strong></td>
            <td>Live log of every SDK call with method, duration, and status</td>
          </tr>
        </tbody>
      </table>

      <h2 id="running-locally">Running Locally</h2>

      <pre><code>{`git clone https://github.com/Kaushik2003/taurusSwap.git
cd taurusSwap/example
npm install
npm run dev`}</code></pre>

      <p>
        The app connects to Algorand <strong>Testnet</strong> (pool app ID{' '}
        <code>758284478</code>). You need testnet ALGO and the five testnet stablecoin ASAs
        to execute transactions. Get testnet ALGO from the{' '}
        <a href="https://bank.testnet.algorand.network/" target="_blank" rel="noopener noreferrer">
          Algorand Testnet Dispenser
        </a>.
      </p>

      <h2 id="core-pattern">Core Pattern</h2>

      <p>
        All SDK state lives in <code>hooks/useTaurus.ts</code>. It creates one{' '}
        <code>TaurusClient</code>, polls pool state every 15 seconds, and exposes typed
        execute functions to each UI component.
      </p>

      <pre><code className="language-typescript">{`import { TaurusClient } from '@taurusswap/sdk';

const client = new TaurusClient({ poolAppId: 758284478 });

// Pool state polled every 15s
const pool = await client.getPoolState();

// Quote (uses cached pool state)
const quote = await client.quote({ fromIndex: 0, toIndex: 1, amountIn: 10_000_000n });

// Build → sign → submit
const txns       = await client.buildSwapTxns({ sender, fromIndex: 0, toIndex: 1, amountIn: 10_000_000n });
const signedTxns = await pera.signTransaction([txns.map(t => ({ txn: t }))]);
const { txid }   = await client.algod.sendRawTransaction(signedTxns).do();
await algosdk.waitForConfirmation(client.algod, txid, 4);`}</code></pre>

      <h2 id="project-structure">Project Structure</h2>

      <pre><code>{`example/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   └── page.tsx            # Main dashboard — tabs + positions panel
├── components/
│   ├── Header.tsx          # Wallet connection (Pera / Defly), token balances
│   ├── SwapCard.tsx        # Swap UI — quote, slippage, SDK call panel
│   ├── LiquidityCard.tsx   # Add liquidity — depeg slider, efficiency calc
│   ├── PoolExplorer.tsx    # TVL, reserves, tick table, curve visualisation
│   ├── PositionsList.tsx   # LP positions, remove liquidity, claim fees
│   ├── SdkActivityLog.tsx  # Real-time log of all SDK calls
│   └── SdkCallPanel.tsx    # Collapsible code + duration + status panel
└── hooks/
    └── useTaurus.ts        # TaurusClient, wallet state, all execute functions`}</code></pre>

      <h2 id="sdk-call-panel">SDK Call Panel</h2>

      <p>
        Each UI action renders a <code>SdkCallPanel</code> — a collapsible block that
        shows the exact SDK code being run, with a syntax-highlighted preview, the call
        duration in milliseconds, and a colour-coded status badge (idle / loading /
        success / error). This makes the example useful as a learning tool: you can see
        exactly what the SDK does for every interaction.
      </p>

      <h2 id="wallet-support">Wallet Support</h2>

      <ul>
        <li><strong>Pera Wallet</strong> — via <code>@perawallet/connect</code></li>
        <li><strong>Defly Wallet</strong> — via <code>@blockshake/defly-connect</code></li>
      </ul>

      <p>
        The wallet session is persisted in <code>localStorage</code> so users stay
        connected across page reloads.
      </p>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/api-reference" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← API Reference
        </a>
        <a href="/docs/frontend/overview" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Frontend Overview →
        </a>
      </div>
    </div>
  );
}
