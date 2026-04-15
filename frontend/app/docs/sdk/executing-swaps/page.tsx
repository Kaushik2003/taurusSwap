export default function ExecutingSwaps() {
  return (
    <div className="page-slide-in">
      <h1>Executing Swaps</h1>

      <p>
        Once you have a quote, executing the swap involves building a transaction group,
        getting the user&apos;s signature, and submitting to the network.
      </p>

      <h2 id="building-the-transaction-group">Building the Transaction Group</h2>

      <pre><code className="language-typescript">{`import { buildSwapTransactionGroup } from '@taurusswap/sdk';

const { txGroup, signer } = await buildSwapTransactionGroup(
  algodClient,
  POOL_APP_ID,
  account,
  {
    tokenInIndex: 0,
    tokenOutIndex: 1,
    amountIn: 100_000_000n,
    minOut: quote.amountOut * 995n / 1000n,  // 0.5% slippage
    claimedOut: quote.amountOut
  }
);`}</code></pre>

      <h2 id="transaction-group-structure">Transaction Group Structure</h2>

      <p>
        The swap transaction group contains:
      </p>

      <ol>
        <li>
          <strong>ASA Transfer</strong> — User transfers input tokens to the pool
        </li>
        <li>
          <strong>App Call</strong> — Calls the <code>swap</code> or <code>swap_with_crossings</code> method
        </li>
      </ol>

      <p>
        The contract emits an inner transaction that transfers output tokens back to the user.
      </p>

      <pre><code>{`┌─────────────────────────────────────┐
│ Tx 0: ASA Transfer                  │
│  - Sender: User                     │
│  - Receiver: Pool                   │
│  - Amount: amountIn                 │
├─────────────────────────────────────┤
│ Tx 1: App Call (swap)               │
│  - Sender: User                     │
│  - Method: swap()                   │
│  - Args: [tokenInIdx, tokenOutIdx,  │
│           amountIn, minOut,         │
│           claimedOut]               │
│  - Inner Tx: Pool → User (output)   │
└─────────────────────────────────────┘`}</code></pre>

      <h2 id="signing-with-a-wallet">Signing with a Wallet</h2>

      <h3 id="pera-wallet">Pera Wallet</h3>

      <pre><code className="language-typescript">{`import { PeraWalletConnect } from '@perawallet/connect';

const pera = new PeraWalletConnect();

const handleSwap = async () => {
  const { txGroup } = await buildSwapTransactionGroup(
    algodClient,
    POOL_APP_ID,
    account,
    tradeParams
  );

  // Pera signs the group
  const signedTxns = await pera.signTransaction([
    txGroup.map((tx) => tx.txn)
  ]);

  // Send signed transactions
  const result = await algodClient
    .sendGroupTransaction(signedTxns)
    .do();

  console.log('TX ID:', result.txId);
};`}</code></pre>

      <h3 id="defly-wallet">Defly Wallet</h3>

      <pre><code className="language-typescript">{`import { DeflyWalletConnect } from '@blockshake/defly-connect';

const defly = new DeflyWalletConnect();

const signedTxns = await defly.signTransaction(
  txGroup.map((tx) => tx.txn)
);`}</code></pre>

      <h3 id="use-wallet-react">use-wallet-react</h3>

      <pre><code className="language-typescript">{`import { useWallet } from '@txnlab/use-wallet-react';

function SwapForm() {
  const { signer } = useWallet();

  const handleSwap = async () => {
    if (!signer) {
      alert('Connect wallet first');
      return;
    }

    const { txGroup } = await buildSwapTransactionGroup(
      algodClient,
      POOL_APP_ID,
      account,
      tradeParams
    );

    // Signer from use-wallet handles the group
    const result = await signer.signGroupTransaction(txGroup);

    // Send...
  };

  return <button onClick={handleSwap}>Swap</button>;
}`}</code></pre>

      <h2 id="sending-the-transaction">Sending the Transaction</h2>

      <pre><code className="language-typescript">{`const result = await algodClient
  .sendGroupTransaction(signedTxns)
  .do();

console.log('Transaction sent:', result.txId);

// Wait for confirmation
const confirmation = await algosdk.waitForConfirmation(
  algodClient,
  result.txId,
  4
);

console.log('Confirmed in round:', confirmation['confirmed-round']);`}</code></pre>

      <h2 id="error-handling">Error Handling</h2>

      <pre><code className="language-typescript">{`import {
  InsufficientLiquidityError,
  SlippageExceededError,
  InvariantCheckFailedError
} from '@taurusswap/sdk';

async function executeSwap() {
  try {
    const { txGroup } = await buildSwapTransactionGroup(
      algodClient,
      POOL_APP_ID,
      account,
      tradeParams
    );

    const result = await algodClient
      .sendGroupTransaction(txGroup)
      .do();

    return { success: true, txId: result.txId };

  } catch (err) {
    if (err instanceof InsufficientLiquidityError) {
      return {
        success: false,
        error: 'Pool does not have enough output tokens'
      };
    }

    if (err instanceof SlippageExceededError) {
      return {
        success: false,
        error: 'Price moved too much. Try again with a fresh quote.'
      };
    }

    if (err.message.includes('invariant check failed')) {
      return {
        success: false,
        error: 'Pool state changed. Refresh and try again.'
      };
    }

    // Generic error
    console.error('Swap failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
}`}</code></pre>

      <h2 id="full-integration-example">Full Integration Example</h2>

      <pre><code className="language-typescript">{`async function executeSwapWithRetry(
  poolState: PoolState,
  tradeParams: SwapParams,
  maxRetries = 2
): Promise<{ success: boolean; txId?: string; error?: string }> {

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Refresh pool state on retry
      if (attempt > 0) {
        poolState = await readPoolState(algodClient, POOL_APP_ID);
      }

      // Get fresh quote
      const quote = await getSwapQuote(poolState, tradeParams);

      // Build transaction
      const { txGroup } = await buildSwapTransactionGroup(
        algodClient,
        POOL_APP_ID,
        account,
        {
          ...tradeParams,
          claimedOut: quote.amountOut,
          minOut: quote.amountOut * 995n / 1000n
        }
      );

      // Sign and send
      const signedTxns = await wallet.signTransaction(
        txGroup.map((tx) => tx.txn)
      );

      const result = await algodClient
        .sendGroupTransaction(signedTxns)
        .do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, result.txId, 4);

      return { success: true, txId: result.txId };

    } catch (err) {
      lastError = err as Error;

      // Don't retry on certain errors
      if (err instanceof InsufficientLiquidityError) {
        break;
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error'
  };
}`}</code></pre>

      <h2 id="monitoring-transaction-status">Monitoring Transaction Status</h2>

      <pre><code className="language-typescript">{`function useTransactionStatus(txId: string | null) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [round, setRound] = useState<number | null>(null);

  useEffect(() => {
    if (!txId) return;

    const checkStatus = async () => {
      try {
        const pending = await algodClient.pendingTransactionInformation(txId).do();

        if (pending['pool-error']) {
          setStatus('failed');
          return;
        }

        if (pending['confirmed-round']) {
          setStatus('confirmed');
          setRound(pending['confirmed-round']);
          return;
        }

        // Still pending - check again in 1 second
        setTimeout(checkStatus, 1000);
      } catch (err) {
        setStatus('failed');
      }
    };

    checkStatus();
  }, [txId]);

  return { status, round };
}`}</code></pre>

      <blockquote>
        <strong>Next:</strong> See <a href="/docs/sdk/adding-liquidity">Adding Liquidity</a> for the LP flow.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/quoting-swaps"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Quoting Swaps
        </a>
        <a
          href="/docs/sdk/adding-liquidity"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Adding Liquidity →
        </a>
      </div>
    </div>
  );
}
