export default function AddingLiquidity() {
  return (
    <div className="page-slide-in">
      <h1>Adding Liquidity</h1>

      <p>
        Providing liquidity to Orbital AMM means creating a new tick with specific price
        range parameters. This page walks through the full LP flow.
      </p>

      <h2 id="tick-parameters">Tick Parameters</h2>

      <p>
        A tick is defined by:
      </p>

      <ul>
        <li>
          <strong>r</strong> — Sphere radius (how much liquidity you&apos;re providing)
        </li>
        <li>
          <strong>k</strong> — Hyperplane offset (defines the price range)
        </li>
      </ul>

      <p>
        Instead of computing k directly, use the helper that converts from a depeg price:
      </p>

      <pre><code className="language-typescript">{`import { kFromDepegPrice } from '@taurusswap/sdk';

// For a 0.99 depeg threshold (1% depeg allowed)
const k = kFromDepegPrice(r, 0.99, n);`}</code></pre>

      <h2 id="computing-deposit-amounts">Computing Deposit Amounts</h2>

      <p>
        The SDK computes how much of each token you need to deposit:
      </p>

      <pre><code className="language-typescript">{`import { computeDepositPerToken } from '@taurusswap/sdk';

const deposits = computeDepositPerToken(
  poolState,
  {
    r: 10_000_000n,  // 10M liquidity
    k: kFromDepegPrice(10_000_000n, 0.99, 5)
  }
);

// deposits[i] is the amount of token i to transfer
console.log('Deposit amounts:', deposits);`}</code></pre>

      <h2 id="the-deposit-flow">The Deposit Flow</h2>

      <ol>
        <li>Compute tick parameters (r, k)</li>
        <li>Calculate deposit per token</li>
        <li>Opt in to all token ASAs (if not already)</li>
        <li>Build transaction group: n ASA transfers + app call</li>
        <li>Sign and send</li>
        <li>Receive LP position NFT (box key proves ownership)</li>
      </ol>

      <h2 id="full-example">Full Example</h2>

      <pre><code className="language-typescript">{`import {
  readPoolState,
  computeDepositPerToken,
  kFromDepegPrice,
  buildAddLiquidityGroup
} from '@taurusswap/sdk';

async function addLiquidity() {
  // 1. Read current pool state
  const poolState = await readPoolState(algodClient, POOL_APP_ID);

  // 2. Define tick parameters
  const LIQUIDITY_AMOUNT = 10_000_000n;  // 10M units
  const DEPEG_THRESHOLD = 0.99;           // 1% depeg allowed

  const r = LIQUIDITY_AMOUNT;
  const k = kFromDepegPrice(r, DEPEG_THRESHOLD, poolState.n);

  // 3. Compute deposit per token
  const deposits = computeDepositPerToken(poolState, { r, k });

  console.log('Depositing:');
  deposits.forEach((amt, i) => {
    const display = Number(amt) / 1e6;
    console.log(\`  Token \${i}: \${display}\`);
  });

  // 4. Build transaction group
  const { txGroup } = await buildAddLiquidityGroup(
    algodClient,
    POOL_APP_ID,
    account,
    {
      r,
      k,
      deposits
    }
  );

  // 5. Sign and send
  const signedTxns = await wallet.signTransaction(
    txGroup.map((tx) => tx.txn)
  );

  const result = await algodClient
    .sendGroupTransaction(signedTxns)
    .do();

  // 6. Wait for confirmation
  const confirmation = await algosdk.waitForConfirmation(
    algodClient,
    result.txId,
    4
  );

  console.log('Liquidity added in round:', confirmation['confirmed-round']);

  // The tick ID is in the app call logs
  const tickId = extractTickIdFromLogs(confirmation.logs);
  console.log('Your tick ID:', tickId);

  return { tickId, txId: result.txId };
}`}</code></pre>

      <h2 id="transaction-group-structure">Transaction Group Structure</h2>

      <pre><code>{`For n=5 tokens:

┌─────────────────────────────────────┐
│ Tx 0-4: ASA Transfers (5 txns)      │
│  - Sender: LP                       │
│  - Receiver: Pool                   │
│  - Amount: deposits[i] for each     │
├─────────────────────────────────────┤
│ Tx 5: App Call (add_tick)           │
│  - Method: add_tick(r, k, ...)      │
│  - Creates tick box                 │
│  - Creates position box             │
└─────────────────────────────────────┘

Total: n + 1 transactions`}</code></pre>

      <h2 id="opting-in-to-tokens">Opting In to Tokens</h2>

      <p>
        Before adding liquidity, ensure you&apos;re opted in to all pool tokens:
      </p>

      <pre><code className="language-typescript">{`import { checkAssetOptIn, buildAssetOptInTx } from '@taurusswap/sdk';

// Check opt-in status
const optIns = await Promise.all(
  poolState.tokenAsas.map((asa) =>
    checkAssetOptIn(algodClient, account.addr, asa)
  )
);

// Build opt-in transactions for missing assets
const optInTxs = [];
for (let i = 0; i < optIns.length; i++) {
  if (!optIns[i]) {
    optInTxs.push(
      await buildAssetOptInTx(algodClient, poolState.tokenAsas[i])
    );
  }
}

// Sign and send opt-ins first
if (optInTxs.length > 0) {
  const signedOptIns = await wallet.signTransaction(
    optInTxs.map((tx) => tx.txn)
  );
  await algodClient.sendGroupTransaction(signedOptIns).do();
}`}</code></pre>

      <h2 id="position-ownership">Position Ownership</h2>

      <p>
        LP positions are stored in box storage with key:
      </p>

      <pre><code>{`pos:{owner_address}{tick_id}`}</code></pre>

      <p>
        The box contains:
      </p>

      <ul>
        <li><code>shares</code> — Your share of the tick&apos;s total liquidity</li>
        <li><code>feeCheckpoints</code> — Fee growth snapshot for each token</li>
      </ul>

      <p>
        To read your position later:
      </p>

      <pre><code className="language-typescript">{`const position = await readPosition(
  algodClient,
  POOL_APP_ID,
  account.addr,
  tickId
);

console.log('Your shares:', position.shares);
console.log('Pending fees:', position.pendingFees);`}</code></pre>

      <h2 id="removing-liquidity">Removing Liquidity</h2>

      <p>
        To remove liquidity (withdraw your share):
      </p>

      <pre><code className="language-typescript">{`import { buildRemoveLiquidityGroup } from '@taurusswap/sdk';

const { txGroup } = await buildRemoveLiquidityGroup(
  algodClient,
  POOL_APP_ID,
  account,
  {
    tickId,
    sharesToRemove: position.shares  // Remove all
  }
);

// Sign and send...
const result = await executeAndSend(txGroup, wallet);

// You'll receive:
// - Proportional share of reserves (all tokens)
// - All accrued fees`}</code></pre>

      <h2 id="claiming-fees">Claiming Fees</h2>

      <p>
        To claim fees without removing liquidity:
      </p>

      <pre><code className="language-typescript">{`import { buildClaimFeesGroup } from '@taurusswap/sdk';

const { txGroup } = await buildClaimFeesGroup(
  algodClient,
  POOL_APP_ID,
  account,
  tickId
);

// Sign and send...
// You'll receive accrued fees in all tokens`}</code></pre>

      <blockquote>
        <strong>Note:</strong> Fees are automatically claimed when you remove liquidity.
        You don&apos;t need a separate claim transaction.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/executing-swaps"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Executing Swaps
        </a>
        <a
          href="/docs/sdk/managing-positions"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Managing Positions →
        </a>
      </div>
    </div>
  );
}
