export default function AddingLiquidity() {
  return (
    <div className="page-slide-in">
      <h1>Adding Liquidity</h1>

      <p>
        Providing liquidity means opening a new <strong>tick</strong> — a concentrated
        sphere of liquidity defined by a radius <code>r</code> and a hyperplane offset{' '}
        <code>k</code>. The LP deposits an equal amount of every pool token and receives
        shares in that tick.
      </p>

      <h2 id="concepts">Key Concepts</h2>

      <h3 id="tick-params">r and k</h3>

      <p>
        Every tick is a sphere in n-dimensional token space. The two parameters are:
      </p>

      <ul>
        <li>
          <strong>r</strong> (radius, AMOUNT_SCALE units) — Controls how much capital is
          in the tick and how wide the liquidity range is. Larger r = more capital = higher
          absolute fee earnings.
        </li>
        <li>
          <strong>k</strong> (hyperplane offset, AMOUNT_SCALE units) — Sets where the tick
          boundary sits in price space. Tighter k (closer to center) = higher capital
          efficiency but activates sooner during depegs.
        </li>
      </ul>

      <h3 id="depeg-price">Depeg Price</h3>

      <p>
        Rather than computing <code>k</code> directly, you specify a <strong>depeg price</strong>:
        the stablecoin price at which the tick transitions from INTERIOR to BOUNDARY.
        For example, <code>0.99</code> means your tick becomes active (constrains trading)
        when any token falls to 99¢ relative to the others.
      </p>

      <table>
        <thead>
          <tr><th>Depeg Price</th><th>Max depeg tolerated</th><th>Capital Efficiency</th></tr>
        </thead>
        <tbody>
          <tr><td>0.999</td><td>0.1%</td><td>Very high — activates on tiny depegs</td></tr>
          <tr><td>0.99</td><td>1%</td><td>High — good default for stablecoins</td></tr>
          <tr><td>0.95</td><td>5%</td><td>Moderate — tolerates larger depegs</td></tr>
          <tr><td>0.90</td><td>10%</td><td>Low — wide range, lower efficiency</td></tr>
        </tbody>
      </table>

      <h2 id="step-by-step">Step-by-Step Flow</h2>

      <pre><code className="language-typescript">{`import { TaurusClient, tickParamsFromDepegPrice, computeDepositPerToken } from '@taurusswap/sdk';

const client = new TaurusClient();
const pool   = await client.getPoolState();

// ── Step 1: Choose depeg price and deposit amount ────────────────────────────
const DEPEG_PRICE      = 0.99;          // 1% depeg tolerance
const DEPOSIT_PER_TOKEN = 100_000_000n; // 100 USDC (raw microunits) per token

// ── Step 2: Compute tick parameters (r, k) ──────────────────────────────────
const { r, k } = await client.tickParamsFromDepegPrice(DEPEG_PRICE, DEPOSIT_PER_TOKEN);
// r and k are in AMOUNT_SCALE units (raw / 1_000)

// ── Step 3: Verify deposit amount ───────────────────────────────────────────
// computeDepositPerToken returns the exact raw microunits needed per token
const deposit = computeDepositPerToken(r, k, pool.n, pool.sqrtN, pool.invSqrtN);
console.log('Deposit per token:', Number(deposit) / 1e6, 'USD');

// ── Step 4: Build transaction group ─────────────────────────────────────────
const { txns, depositPerTokenRaw, tickId } = await client.buildAddLiquidityTxns({
  sender: 'YOUR_ADDRESS',
  r,
  k,
});
// depositPerTokenRaw is the ASA transfer amount per token
// tickId is the ID the new tick will receive (pool.numTicks before the call)

console.log('Will deposit:', Number(depositPerTokenRaw) / 1e6, 'per token');
console.log('New tick ID will be:', tickId);

// ── Step 5: Sign and submit ──────────────────────────────────────────────────
// const signedTxns = await wallet.signTransaction(txns);
// const { txid }   = await client.algod.sendRawTransaction(signedTxns).do();
// await algosdk.waitForConfirmation(client.algod, txid, 4);`}</code></pre>

      <h2 id="transaction-group-layout">Transaction Group Layout</h2>

      <pre><code>{`For a pool with n = 5 tokens:

┌──────────────────────────────────────────┐
│ Tx 0–k: Budget top-up (opcode overhead)  │
│ Tx k+1: ASA Transfer  user → pool        │  ← token 0, amount = depositPerTokenRaw
│ Tx k+2: ASA Transfer  user → pool        │  ← token 1
│   ...                                    │
│ Tx k+n: ASA Transfer  user → pool        │  ← token n-1
│ Tx k+n+1: App call  add_tick()           │
│   args: [r, k, tickId]                   │
│   creates tick: box and position: box    │
└──────────────────────────────────────────┘
Total: budget_txns + n ASA transfers + 1 app call`}</code></pre>

      <h2 id="capital-efficiency">Capital Efficiency</h2>

      <p>
        Tighter ticks earn more fees per dollar because they provide denser virtual liquidity.
        Use <code>client.getCapitalEfficiency</code> to compare configurations:
      </p>

      <pre><code className="language-typescript">{`const { efficiency, depositPerToken } = await client.getCapitalEfficiency(
  0.99,   // depegPrice
  r,      // tick radius in AMOUNT_SCALE units
);

console.log(\`Capital efficiency: \${efficiency.toFixed(1)}×\`);
// e.g. "12.5×" means this tick earns 12.5× more fees per dollar than a full-range pool`}</code></pre>

      <h2 id="apr-estimate">APR Estimate</h2>

      <p>
        <code>client.estimateAPR</code> combines 24h fee volume from the Indexer with the
        capital efficiency multiplier to project annualised yield:
      </p>

      <pre><code className="language-typescript">{`const apr = await client.estimateAPR(
  0.99,          // depegPrice
  100_000_000n,  // depositPerTokenRaw (100 USD per token)
);

console.log('APR estimate:',      (apr.apr * 100).toFixed(2) + '%');
console.log('Daily fee USD:',     apr.dailyFeeUsd.toFixed(4));
console.log('Efficiency mult:',   apr.efficiencyMultiplier.toFixed(1) + '×');`}</code></pre>

      <blockquote>
        <strong>Note:</strong> APR estimates are based on the past 24h volume. Actual
        returns depend on trading activity and how long your tick stays INTERIOR.
      </blockquote>

      <h2 id="zap-single-token">Zap: Single-Token Deposit</h2>

      <p>
        Users often only have one token. A <strong>zap</strong> splits it into equal
        portions of all n pool tokens via sequential swaps, then adds liquidity:
      </p>

      <pre><code className="language-typescript">{`// Plan the zap (no network calls — pure function)
const plan = await client.computeZap(
  0,             // sourceTokenIdx — the token the user has
  500_000_000n,  // totalAmountRaw — 500 USDC
);

plan.swaps.forEach((s) => {
  console.log(\`Swap \${s.fromIdx}→\${s.toIdx}: \${Number(s.amountIn)/1e6} → \${Number(s.amountOut)/1e6}\`);
});
console.log('Deposit per token:', Number(plan.depositPerToken) / 1e6);
console.log('Avg price impact:', (plan.avgPriceImpact * 100).toFixed(3) + '%');

// Build all transaction groups (swaps first, then add liquidity)
const { swapTxnGroups, addLiquidityTxns } = await client.buildZapTxns({
  sender:        'YOUR_ADDRESS',
  sourceTokenIdx: 0,
  totalAmountRaw: 500_000_000n,
  depegPrice:     0.99,
  slippageBps:    50,
});

// Submit swaps sequentially first, then add liquidity
for (const group of swapTxnGroups) {
  const signed = await wallet.signTransaction(group);
  const { txid } = await client.algod.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(client.algod, txid, 4);
}
const signed = await wallet.signTransaction(addLiquidityTxns);
const { txid } = await client.algod.sendRawTransaction(signed).do();
await algosdk.waitForConfirmation(client.algod, txid, 4);
console.log('Liquidity added, tick ID:', /* from pool.numTicks before the call */);`}</code></pre>

      <h2 id="low-level-addliquidity">Low-Level: addLiquidity</h2>

      <p>
        For scripts and bots that hold the key directly:
      </p>

      <pre><code className="language-typescript">{`import { addLiquidity, tickParamsFromDepegPrice } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const account = algosdk.mnemonicToSecretKey('...');
const pool    = await readPoolState(algod, POOL_APP_ID);
const { r, k } = tickParamsFromDepegPrice(0.99, 100_000_000n, pool.n, pool.sqrtN, pool.invSqrtN);

const { txId, tickId, depositPerTokenRaw } = await addLiquidity({
  client: algod,
  poolAppId: POOL_APP_ID,
  sender: account.addr,
  r,
  k,
  signer: async (txns) => txns.map((t) => t.signTxn(account.sk)),
});

console.log('Tick created:', tickId, '— TX:', txId);`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/executing-swaps" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← Executing Swaps
        </a>
        <a href="/docs/sdk/managing-positions" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Managing Positions →
        </a>
      </div>
    </div>
  );
}
