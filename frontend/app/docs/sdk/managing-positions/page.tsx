export default function ManagingPositions() {
  return (
    <div className="page-slide-in">
      <h1>Managing Positions</h1>

      <p>
        Once you&apos;ve added liquidity, the SDK gives you three operations: read your
        position and claimable fees, claim fees without removing principal, and remove
        liquidity (partially or fully).
      </p>

      <h2 id="reading-a-position">Reading a Position</h2>

      <pre><code className="language-typescript">{`import { readPosition } from '@taurusswap/sdk';

const pool     = await readPoolState(algod, POOL_APP_ID);
const tick     = pool.ticks.find((t) => t.id === tickId);

// Returns null if the address has no position in this tick
const position = await readPosition(
  algod,
  POOL_APP_ID,
  'OWNER_ADDRESS',
  tickId,
  pool.n,
  pool.feeGrowth,
  tick!,
);

if (position) {
  console.log('Shares:',          position.shares);
  console.log('Position r:',      position.positionR);  // AMOUNT_SCALE units
  console.log('Claimable fees:',  position.claimableFees.map((f, i) =>
    \`Token \${i}: \${Number(f) / 1e6} USD\`
  ));
}`}</code></pre>

      <p>Via <code>TaurusClient</code> (simpler — handles pool state internally):</p>

      <pre><code className="language-typescript">{`const position = await client.getPosition('OWNER_ADDRESS', tickId);
// → PositionInfo | null`}</code></pre>

      <h2 id="position-type">PositionInfo Type</h2>

      <pre><code className="language-typescript">{`interface PositionInfo {
  tickId:        number;    // Which tick
  shares:        bigint;    // Your share count in this tick
  positionR:     bigint;    // tick.r × shares / tick.totalShares  (AMOUNT_SCALE units)
                            // = your proportional contribution to total liquidity
  claimableFees: bigint[];  // [n] per-token fees in raw microunits — ready for display
}`}</code></pre>

      <h2 id="fee-mechanics">How Fee Accounting Works</h2>

      <p>
        Each tick position stores a <code>feeGrowthCheckpoint[i]</code> per token. When a
        swap collects fees, the global <code>pool.feeGrowth[i]</code> accumulator grows.
        Your claimable fee for token <code>i</code> is:
      </p>

      <pre><code>{`claimable[i] = positionR × (feeGrowth[i] − checkpoint[i]) / PRECISION`}</code></pre>

      <p>
        After claiming, the contract resets your checkpoint to the current{' '}
        <code>feeGrowth[i]</code>, so you can&apos;t double-claim.
        When you remove liquidity, fees are claimed atomically as part of the same
        transaction — you never need a separate claim before removing.
      </p>

      <h2 id="estimating-removal">Estimating What You&apos;ll Receive</h2>

      <p>
        Before building a removal transaction, preview the amounts:
      </p>

      <pre><code className="language-typescript">{`const { receivePerTokenRaw, claimableFeesRaw } = await client.estimateRemoval(
  'OWNER_ADDRESS',
  tickId,
  shares,          // how many shares to remove (pass tick.totalShares for full exit)
);

receivePerTokenRaw.forEach((amt, i) => {
  console.log(\`Token \${i} principal: \${Number(amt) / 1e6} USD\`);
});
claimableFeesRaw.forEach((fee, i) => {
  console.log(\`Token \${i} fees:      \${Number(fee) / 1e6} USD\`);
});`}</code></pre>

      <h2 id="claim-fees">Claiming Fees</h2>

      <p>
        Claim all accrued fees without touching your principal:
      </p>

      <pre><code className="language-typescript">{`// Via TaurusClient
const txns = await client.buildClaimFeesTxns({ sender: 'YOUR_ADDRESS', tickId });

// Via low-level function
import { claimFees } from '@taurusswap/sdk';
const { txId } = await claimFees({
  client: algod,
  poolAppId: POOL_APP_ID,
  sender: account.addr,
  tickId,
  signer: async (txns) => txns.map((t) => t.signTxn(account.sk)),
});

// Sign and submit (wallet path)
const signedTxns = await wallet.signTransaction(txns);
const { txid } = await client.algod.sendRawTransaction(signedTxns).do();
await algosdk.waitForConfirmation(client.algod, txid, 4);
console.log('Fees claimed:', txid);`}</code></pre>

      <h3>Claim Transaction Group Layout</h3>

      <pre><code>{`┌──────────────────────────────────────────┐
│ Tx 0: App call  claim_fees(tickId)       │
│   inner txs: pool → user  (n fee tokens) │
└──────────────────────────────────────────┘`}</code></pre>

      <h2 id="remove-liquidity">Removing Liquidity</h2>

      <h3>Full Exit</h3>

      <pre><code className="language-typescript">{`// Via TaurusClient
const pool     = await client.getPoolState();
const tick     = pool.ticks.find((t) => t.id === tickId)!;

const txns = await client.buildRemoveLiquidityTxns({
  sender: 'YOUR_ADDRESS',
  tickId,
  shares: tick.totalShares, // full exit — remove all of your shares
});

// Via low-level function
import { removeLiquidity } from '@taurusswap/sdk';
const { txId } = await removeLiquidity({
  client: algod,
  poolAppId: POOL_APP_ID,
  sender: account.addr,
  tickId,
  shares: tick.totalShares,
  signer: async (txns) => txns.map((t) => t.signTxn(account.sk)),
});`}</code></pre>

      <h3>Partial Exit</h3>

      <pre><code className="language-typescript">{`const position = await client.getPosition('YOUR_ADDRESS', tickId);
if (!position) throw new Error('No position');

// Remove 50% of your shares
const sharesToRemove = position.shares / 2n;

const txns = await client.buildRemoveLiquidityTxns({
  sender: 'YOUR_ADDRESS',
  tickId,
  shares: sharesToRemove,
});
// Your remaining shares stay in the pos: box — fees continue accruing`}</code></pre>

      <h3>Remove Transaction Group Layout</h3>

      <pre><code>{`┌──────────────────────────────────────────┐
│ Tx 0: App call  remove_liquidity(        │
│         tickId, shares)                  │
│   inner txs: pool → user  (n tokens)     │
│     = pro-rata reserves + accrued fees   │
└──────────────────────────────────────────┘`}</code></pre>

      <h2 id="what-you-receive">What You Receive on Removal</h2>

      <pre><code>{`For each token i:
  principal[i] = positionR × actualReserves[i] / pool.totalR  (raw microunits)
  fees[i]      = positionR × (feeGrowth[i] − checkpoint[i]) / PRECISION
  total[i]     = principal[i] + fees[i]`}</code></pre>

      <p>
        The contract sends all n token amounts atomically as inner transactions.
        You do not need to claim fees separately before removing.
      </p>

      <h2 id="react-hook">React Hook: Position Dashboard</h2>

      <pre><code className="language-typescript">{`import { useState, useEffect } from 'react';
import { type PositionInfo, TickNotFoundError } from '@taurusswap/sdk';
import { taurusClient } from '@/lib/taurus';

export function usePosition(address: string | null, tickId: number | null) {
  const [position, setPosition] = useState<PositionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || tickId == null) return;
    let active = true;
    setLoading(true);

    taurusClient.getPosition(address, tickId)
      .then((p) => { if (active) setPosition(p); })
      .catch((err) => {
        if (err instanceof TickNotFoundError) setPosition(null);
        else console.error(err);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [address, tickId]);

  return { position, loading };
}

// Usage
function PositionCard({ tickId }: { tickId: number }) {
  const { activeAddress } = useWallet();
  const { position, loading } = usePosition(activeAddress, tickId);

  if (loading) return <span>Loading...</span>;
  if (!position) return <span>No position</span>;

  return (
    <div>
      <div>Shares: {position.shares.toString()}</div>
      <div>Claimable fees:</div>
      {position.claimableFees.map((fee, i) => (
        <div key={i}>Token {i}: {(Number(fee) / 1e6).toFixed(4)} USD</div>
      ))}
    </div>
  );
}`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/adding-liquidity" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← Adding Liquidity
        </a>
        <a href="/docs/sdk/api-reference" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          API Reference →
        </a>
      </div>
    </div>
  );
}
