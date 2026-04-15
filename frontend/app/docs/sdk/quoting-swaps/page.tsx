export default function QuotingSwaps() {
  return (
    <div className="page-slide-in">
      <h1>Quoting Swaps</h1>

      <p>
        The <code>getSwapQuote</code> function computes the output amount for a swap by
        solving the torus invariant. It handles tick crossings automatically.
      </p>

      <h2 id="usage">Usage</h2>

      <pre><code className="language-typescript">{`import { getSwapQuote } from '@taurusswap/sdk';

const quote = await getSwapQuote(poolState, {
  tokenInIndex: 0,      // Selling USDC
  tokenOutIndex: 1,     // Buying USDT
  amountIn: 100_000_000n // 100 USDC (microunits)
});

console.log('Output:', quote.amountOut);
console.log('Price impact:', quote.priceImpact);
console.log('Fee:', quote.fee);`}</code></pre>

      <h2 id="swapquote-type">SwapQuote Type</h2>

      <pre><code className="language-typescript">{`interface SwapQuote {
  // Output
  amountOut: bigint;    // Amount of output token (microunits)

  // Pricing
  priceImpact: number;  // Price impact as decimal (0.0014 = 0.14%)
  effectivePrice: number; // Output/Input ratio

  // Fees
  fee: bigint;          // Fee amount (in input token microunits)
  feeBps: number;       // Fee in basis points

  // Path info
  ticksCrossed: number; // Number of ticks crossed
  segments: TradeSegment[]; // Trade path segments

  // Validation
  minOut: bigint;       // Minimum output after slippage
}

interface TradeSegment {
  amountIn: bigint;
  amountOut: bigint;
  tickCrossedId: number;  // 0 if no crossing
  newTickState: number;
}`}</code></pre>

      <h2 id="field-descriptions">Field Descriptions</h2>

      <h3 id="output">Output</h3>

      <ul>
        <li>
          <code>amountOut</code> — The exact output amount in microunits. Use this for
          the user&apos;s &quot;You will receive&quot; display.
        </li>
      </ul>

      <h3 id="pricing">Pricing</h3>

      <ul>
        <li>
          <code>priceImpact</code> — How much the trade moves the price. 0.0014 means
          0.14% price slippage from mid-price.
        </li>
        <li>
          <code>effectivePrice</code> — The actual exchange rate: amountOut / amountIn.
          For stablecoin swaps, this should be close to 1.0.
        </li>
      </ul>

      <h3 id="fees">Fees</h3>

      <ul>
        <li>
          <code>fee</code> — The fee amount in input token microunits. Deducted before
          the trade is computed.
        </li>
        <li>
          <code>feeBps</code> — Fee in basis points. 30 = 0.3%.
        </li>
      </ul>

      <h3 id="path-info">Path Info</h3>

      <ul>
        <li>
          <code>ticksCrossed</code> — Number of tick boundaries crossed. More crossings
          = more complex transaction.
        </li>
        <li>
          <code>segments</code> — The trade path. Each segment is a portion of the trade
          between crossings.
        </li>
      </ul>

      <h3 id="validation">Validation</h3>

      <ul>
        <li>
          <code>minOut</code> — amountOut minus slippage tolerance. Pass this to the
          transaction builder.
        </li>
      </ul>

      <h2 id="full-example-with-slippage">Full Example with Slippage</h2>

      <pre><code className="language-typescript">{`const quote = await getSwapQuote(poolState, {
  tokenInIndex: 0,
  tokenOutIndex: 1,
  amountIn: 100_000_000n
});

// Apply slippage tolerance (0.5% = 50 bps)
const SLIPPAGE_BPS = 50;
const minOut = quote.amountOut * (10000n - BigInt(SLIPPAGE_BPS)) / 10000n;

console.log(\`Expected output: \${quote.amountOut} USDT\`);
console.log(\`Minimum output: \${minOut} USDT (\${SLIPPAGE_BPS} bps slippage)\`);
console.log(\`Price impact: \${(quote.priceImpact * 100).toFixed(2)}%\`);

// Warn if price impact is high
if (quote.priceImpact > 0.01) {  // > 1%
  alert('High price impact! Consider splitting into smaller trades.');
}`}</code></pre>

      <h2 id="debouncing-quotes">Debouncing Quotes</h2>

      <p>
        In a React UI, debounce user input to avoid excessive quote requests:
      </p>

      <pre><code className="language-typescript">{`import { useState, useEffect, useCallback } from 'react';
import { getSwapQuote, debounce } from '@taurusswap/sdk';

function SwapForm({ poolState }: { poolState: PoolState }) {
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  const fetchQuote = useCallback(
    debounce(async (input: string) => {
      if (!input || !poolState) return;

      const amountIn = parseAmountToMicrounits(input, 6);
      const q = await getSwapQuote(poolState, {
        tokenInIndex: 0,
        tokenOutIndex: 1,
        amountIn
      });
      setQuote(q);
    }, 300),
    [poolState]
  );

  useEffect(() => {
    fetchQuote(amountIn);
  }, [amountIn, fetchQuote]);

  return (
    <input
      value={amountIn}
      onChange={(e) => setAmountIn(e.target.value)}
      placeholder="Amount in"
    />
    {quote && <div>You receive: {formatAmount(quote.amountOut)}</div>}
  );
}`}</code></pre>

      <h2 id="handling-stale-state">Handling Stale State</h2>

      <p>
        Quotes are valid only for the pool state they were computed from. If the pool
        changes between quote and execution, the transaction may fail:
      </p>

      <pre><code className="language-typescript">{`try {
  const { txGroup } = await buildSwapTransactionGroup(
    algodClient,
    POOL_APP_ID,
    account,
    {
      ...tradeParams,
      claimedOut: quote.amountOut,
      minOut: quote.minOut
    }
  );
  await sendTransaction(txGroup);
} catch (err) {
  if (err.message.includes('invariant check failed')) {
    // Pool state changed - re-quote and retry
    const freshQuote = await getSwapQuote(freshPoolState, tradeParams);
    // Retry with fresh quote...
  }
}`}</code></pre>

      <h2 id="large-trades">Large Trades</h2>

      <p>
        For trades that cross many ticks, the quote includes a trade recipe:
      </p>

      <pre><code className="language-typescript">{`const quote = await getSwapQuote(poolState, {
  tokenInIndex: 0,
  tokenOutIndex: 1,
  amountIn: 1_000_000_000n  // 1000 USDC - large trade
});

console.log(\`Crossing \${quote.ticksCrossed} ticks\`);
console.log('Trade segments:', quote.segments);

// Use swap_with_crossings instead of swap
const method = quote.ticksCrossed > 0
  ? 'swap_with_crossings'
  : 'swap';`}</code></pre>

      <blockquote>
        <strong>Note:</strong> The SDK automatically selects the correct method when you
        use <code>buildSwapTransactionGroup</code>. You don&apos;t need to handle this
        manually.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/reading-pool-state"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Reading Pool State
        </a>
        <a
          href="/docs/sdk/executing-swaps"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Executing Swaps →
        </a>
      </div>
    </div>
  );
}
