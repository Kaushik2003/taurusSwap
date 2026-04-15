export default function ManagingPositions() {
  return (
    <div className="page-slide-in">
      <h1>Managing Positions</h1>

      <p>
        Once you&apos;ve added liquidity, you&apos;ll need to monitor your position,
        claim fees, and eventually remove liquidity. This page covers all three.
      </p>

      <h2 id="reading-a-position">Reading a Position</h2>

      <pre><code className="language-typescript">{`import { readPosition } from '@taurusswap/sdk';

const position = await readPosition(
  algodClient,
  POOL_APP_ID,
  address,
  tickId
);

console.log('Position:', {
  shares: position.shares,
  pendingFees: position.pendingFees,
  feeCheckpoints: position.feeCheckpoints
});`}</code></pre>

      <h2 id="position-type">Position Type</h2>

      <pre><code className="language-typescript">{`interface Position {
  shares: bigint;           // Your share of tick's total liquidity
  pendingFees: bigint[];    // Accrued fees per token (computed client-side)
  feeCheckpoints: bigint[]; // Fee growth snapshot per token (on-chain)
}`}</code></pre>

      <h2 id="computing-pending-fees">Computing Pending Fees</h2>

      <p>
        The SDK computes pending fees using the fee growth formula:
      </p>

      <pre><code className="language-typescript">{`// From @taurusswap/sdk/pool/fees.ts

export function computePendingFees(
  positionShares: bigint,
  feeGrowth: bigint[],
  feeCheckpoints: bigint[],
  tickTotalR: bigint
): bigint[] {
  return feeGrowth.map((growth, i) => {
    const deltaGrowth = growth - feeCheckpoints[i];
    return (positionShares * deltaGrowth) / PRECISION / tickTotalR;
  });
}`}</code></pre>

      <p>
        This is called automatically by <code>readPosition</code>, so you get
        <code>pendingFees</code> ready to display.
      </p>

      <h2 id="claiming-fees">Claiming Fees</h2>

      <pre><code className="language-typescript">{`import { buildClaimFeesGroup } from '@taurusswap/sdk';

async function claimFees(tickId: number) {
  const { txGroup } = await buildClaimFeesGroup(
    algodClient,
    POOL_APP_ID,
    account,
    tickId
  );

  const signedTxns = await wallet.signTransaction(
    txGroup.map((tx) => tx.txn)
  );

  const result = await algodClient
    .sendGroupTransaction(signedTxns)
    .do();

  await algosdk.waitForConfirmation(algodClient, result.txId, 4);

  console.log('Fees claimed!', result.txId);
}`}</code></pre>

      <h2 id="fee-checkpoint-mechanic">Fee Checkpoint Mechanic</h2>

      <p>
        When you claim fees, your checkpoint is updated to the current fee growth:
      </p>

      <pre><code>{`Before claim:
  feeCheckpoints = [100, 200, 150, ...]
  feeGrowth = [150, 250, 180, ...]
  pending = feeGrowth - checkpoint = [50, 50, 30, ...]

After claim:
  feeCheckpoints = [150, 250, 180, ...]  ← Updated to current
  pending = [0, 0, 0, ...]  ← Reset`}</code></pre>

      <p>
        This ensures you don&apos;t claim the same fees twice.
      </p>

      <h2 id="removing-liquidity">Removing Liquidity</h2>

      <p>
        To withdraw your entire position:
      </p>

      <pre><code className="language-typescript">{`import { buildRemoveLiquidityGroup } from '@taurusswap/sdk';

async function removeLiquidity(tickId: number) {
  const position = await readPosition(
    algodClient,
    POOL_APP_ID,
    account.addr,
    tickId
  );

  const { txGroup } = await buildRemoveLiquidityGroup(
    algodClient,
    POOL_APP_ID,
    account,
    {
      tickId,
      sharesToRemove: position.shares  // Remove everything
    }
  );

  const signedTxns = await wallet.signTransaction(
    txGroup.map((tx) => tx.txn)
  );

  const result = await algodClient
    .sendGroupTransaction(signedTxns)
    .do();

  await algosdk.waitForConfirmation(algodClient, result.txId, 4);

  console.log('Liquidity removed!', result.txId);
}`}</code></pre>

      <h2 id="partial-removal">Partial Removal</h2>

      <p>
        To remove only some of your liquidity:
      </p>

      <pre><code className="language-typescript">{`const position = await readPosition(...);

// Remove 50% of shares
const sharesToRemove = position.shares / 2n;

const { txGroup } = await buildRemoveLiquidityGroup(
  algodClient,
  POOL_APP_ID,
  account,
  {
    tickId,
    sharesToRemove
  }
);`}</code></pre>

      <p>
        Your remaining shares stay in the position box. Fees continue to accrue.
      </p>

      <h2 id="what-you-receive">What You Receive</h2>

      <p>
        When removing liquidity, you get:
      </p>

      <ol>
        <li>
          <strong>Proportional reserves</strong> — Your share of each token&apos;s reserves
        </li>
        <li>
          <strong>All pending fees</strong> — Automatically claimed and added to output
        </li>
      </ol>

      <pre><code>{`Output per token i:
  baseAmount = shares * reserves[i] / tick.totalShares
  feeAmount = pendingFees[i]
  total = baseAmount + feeAmount`}</code></pre>

      <h2 id="position-nft">Position NFT</h2>

      <p>
        Each LP position is uniquely identified by:
      </p>

      <pre><code>{String.raw`positionKey = \`pos:\${address}\${tickId}\``}</code></pre>

      <p>
        This key is the box name. Only the address owner can modify or remove the position.
      </p>

      <h2 id="monitoring-multiple-positions">Monitoring Multiple Positions</h2>

      <pre><code className="language-typescript">{`import { readAllPositions } from '@taurusswap/sdk';

// Get all positions for an address
const positions = await readAllPositions(
  algodClient,
  POOL_APP_ID,
  address
);

// positions is an array of { tickId, position }
for (const { tickId, position } of positions) {
  console.log(\`Tick \${tickId}: \${position.shares} shares\`);
  console.log(\`  Pending fees:\`, position.pendingFees);
}`}</code></pre>

      <h2 id="react-hook-example">React Hook Example</h2>

      <pre><code className="language-typescript">{`function useLiquidityPosition(tickId: number) {
  const { address } = useWallet();
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (!address || !tickId) return;

    const fetch = async () => {
      const pos = await readPosition(algodClient, POOL_APP_ID, address, tickId);
      setPosition(pos);
    };

    fetch();
    const interval = setInterval(fetch, 60_000);  // Refresh every minute
    return () => clearInterval(interval);
  }, [address, tickId]);

  return position;
}

// Usage in component:
function PositionCard({ tickId }: { tickId: number }) {
  const position = useLiquidityPosition(tickId);

  if (!position) return <div>Loading...</div>;

  return (
    <div>
      <div>Shares: {position.shares.toString()}</div>
      <div>Pending Fees:</div>
      {position.pendingFees.map((fee, i) => (
        <div key={i}>Token {i}: {formatAmount(fee)}</div>
      ))}
      <button onClick={() => claimFees(tickId)}>Claim Fees</button>
    </div>
  );
}`}</code></pre>

      <blockquote>
        <strong>Next:</strong> See <a href="/docs/sdk/api-reference">API Reference</a> for complete type definitions.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/adding-liquidity"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Adding Liquidity
        </a>
        <a
          href="/docs/sdk/api-reference"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          API Reference →
        </a>
      </div>
    </div>
  );
}
