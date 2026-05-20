export default function ExecutingSwaps() {
  return (
    <div className="page-slide-in">
      <h1>Executing Swaps</h1>

      <p>
        The SDK builds unsigned <code>algosdk.Transaction[]</code> arrays. You sign them
        with whatever wallet your users have connected, then submit to Algod. The SDK never
        touches private keys.
      </p>

      <h2 id="high-level-buildswaptxns">High-Level: client.buildSwapTxns</h2>

      <pre><code className="language-typescript">{`import { TaurusClient } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const client = new TaurusClient();

const txns = await client.buildSwapTxns({
  sender:      'SENDER_ADDRESS',
  fromIndex:   0,          // sell token 0 (USDC)
  toIndex:     1,          // buy  token 1 (USDT)
  amountIn:    10_000_000n, // 10 USDC
  slippageBps: 50,         // 0.5% — default if omitted
});

// txns is algosdk.Transaction[]
// Sign and submit (see Signing section below)`}</code></pre>

      <h2 id="low-level-buildswaptxns">Low-Level: buildSwapTxns</h2>

      <p>
        If you manage your own Algod client and pool state:
      </p>

      <pre><code className="language-typescript">{`import { readPoolState, buildSwapTxns } from '@taurusswap/sdk';

const pool = await readPoolState(algod, POOL_APP_ID);
const txns = await buildSwapTxns(
  algod,
  POOL_APP_ID,
  'SENDER_ADDRESS',
  pool,           // pass the pool state you already have
  0,              // tokenInIdx
  1,              // tokenOutIdx
  10_000_000n,    // amountInRaw
  50,             // slippageBps
);`}</code></pre>

      <h2 id="transaction-group-layout">Transaction Group Layout</h2>

      <p>
        The group structure depends on whether the swap crosses any ticks:
      </p>

      <h3>Simple swap (no tick crossings)</h3>

      <pre><code>{`┌──────────────────────────────────────────┐
│ Tx 0: Budget (optional opcode top-up)    │
│ Tx 1: ASA Transfer  user → pool          │
│   amount: amountInRaw                    │
│ Tx 2: App call  swap()                   │
│   args: [tokenInIdx, tokenOutIdx,        │
│          amountInRaw, claimedOut,        │
│          minAmountOut]                   │
│   inner tx: pool → user  (output tokens) │
└──────────────────────────────────────────┘`}</code></pre>

      <h3>Crossing swap (≥1 tick boundary)</h3>

      <pre><code>{`┌──────────────────────────────────────────┐
│ Tx 0–k: Budget top-up (k depends on      │
│         number of crossings)             │
│ Tx k+1: ASA Transfer  user → pool        │
│ Tx k+2: App call  swap_with_crossings()  │
│   args: [tokenInIdx, tokenOutIdx,        │
│          amountInRaw, effectiveAmountIn, │
│          minAmountOut, trade_recipe]     │
│   inner tx: pool → user  (output tokens) │
└──────────────────────────────────────────┘`}</code></pre>

      <p>
        The SDK selects the right path automatically based on <code>quote.ticksCrossed</code>.
      </p>

      <h2 id="signing">Signing: Pera Wallet</h2>

      <pre><code className="language-typescript">{`import { PeraWalletConnect } from '@perawallet/connect';

const pera = new PeraWalletConnect();

async function swap() {
  const txns = await client.buildSwapTxns({
    sender:    activeAddress,
    fromIndex: 0,
    toIndex:   1,
    amountIn:  10_000_000n,
  });

  // Pera expects an array of { txn, signers? } objects per group
  const signedTxns = await pera.signTransaction([
    txns.map((txn) => ({ txn })),
  ]);
  // signedTxns is Uint8Array[]

  const { txid } = await client.algod.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client.algod, txid, 4);
  console.log('Confirmed:', txid);
}`}</code></pre>

      <h2 id="signing-use-wallet">Signing: use-wallet-react</h2>

      <pre><code className="language-typescript">{`import { useWallet } from '@txnlab/use-wallet-react';

function SwapButton() {
  const { activeAddress, signTransactions, algodClient } = useWallet();

  const handleSwap = async () => {
    const txns = await client.buildSwapTxns({
      sender:    activeAddress!,
      fromIndex: 0,
      toIndex:   1,
      amountIn:  10_000_000n,
    });

    // Encode to msgpack bytes for signing
    const encoded = txns.map((t) => algosdk.encodeUnsignedTransaction(t));
    const signedTxns = await signTransactions([encoded]);

    const { txid } = await algodClient.sendRawTransaction(signedTxns).do();
    await algosdk.waitForConfirmation(algodClient, txid, 4);
  };

  return <button onClick={handleSwap}>Swap</button>;
}`}</code></pre>

      <h2 id="executeswap">Fully Atomic: executeSwap</h2>

      <p>
        The low-level <code>executeSwap</code> function combines quote + build + sign + submit
        into one call. Useful for server-side scripts or bots where you hold the key directly:
      </p>

      <pre><code className="language-typescript">{`import { executeSwap } from '@taurusswap/sdk';
import algosdk from 'algosdk';

const account = algosdk.mnemonicToSecretKey('your mnemonic here ...');

const { txId, amountOut } = await executeSwap(
  algod,
  POOL_APP_ID,
  account.addr,
  0,              // tokenInIdx
  1,              // tokenOutIdx
  10_000_000n,    // amountInRaw
  50,             // slippageBps
  async (txns) => {
    // signer callback — sign all txns and return Uint8Array[]
    return txns.map((t) => t.signTxn(account.sk));
  },
);

console.log('TX ID:', txId);
console.log('Received:', Number(amountOut) / 1e6, 'USDT');`}</code></pre>

      <h2 id="error-handling">Error Handling</h2>

      <pre><code className="language-typescript">{`import {
  TaurusClient,
  SwapTooSmallError,
  InsufficientLiquidityError,
  InvalidSlippageError,
} from '@taurusswap/sdk';

try {
  const txns = await client.buildSwapTxns({ sender, fromIndex: 0, toIndex: 1, amountIn });
  // ...sign and submit
} catch (err) {
  if (err instanceof SwapTooSmallError) {
    // amountIn is below ~1000 microunits effective after fee
    showToast('Amount too small. Try a larger trade.');
  } else if (err instanceof InsufficientLiquidityError) {
    // Trade exceeds pool depth
    showToast('Insufficient liquidity. Try a smaller amount.');
  } else if (err instanceof InvalidSlippageError) {
    // slippageBps was outside 0–10 000
    console.error('Bad slippage value');
  } else if (String(err).includes('app call rejection')) {
    // On-chain invariant check failed — pool state changed between quote and submit
    showToast('Price moved. Please refresh the quote and try again.');
  }
}`}</code></pre>

      <h2 id="confirmation-pattern">Confirmation Pattern</h2>

      <pre><code className="language-typescript">{`async function swapAndWait(txns: algosdk.Transaction[], signedTxns: Uint8Array[]) {
  const { txid } = await client.algod.sendRawTransaction(signedTxns).do();

  // waitForConfirmation polls /v2/transactions/{txid}/pending
  const result = await algosdk.waitForConfirmation(client.algod, txid, 4 /* rounds to wait */);

  console.log('Confirmed in round:', result['confirmed-round']);
  console.log('TX ID:', txid);

  // Invalidate the cache so the next quote uses fresh state
  client.invalidateCache();

  return txid;
}`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/quoting-swaps" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← Quoting Swaps
        </a>
        <a href="/docs/sdk/adding-liquidity" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Adding Liquidity →
        </a>
      </div>
    </div>
  );
}
