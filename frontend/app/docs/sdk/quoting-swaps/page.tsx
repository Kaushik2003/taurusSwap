export default function QuotingSwaps() {
  return (
    <div className="page-slide-in">
      <h1>Quoting Swaps</h1>

      <p>
        <code>getSwapQuote</code> is a <strong>synchronous, pure function</strong>. It runs
        the full Newton-bisection solver and tick-crossing logic off-chain, producing an exact
        quote that matches what the on-chain contract will compute. No Algod calls needed
        once you have a <code>PoolState</code>.
      </p>

      <h2 id="signature">Signature</h2>

      <pre><code className="language-typescript">{`function getSwapQuote(
  poolState: PoolState,
  tokenInIdx:  number, // index into pool.tokenAsaIds
  tokenOutIdx: number,
  amountInRaw: bigint, // raw microunits (1 USDC = 1_000_000n)
): SwapQuote`}</code></pre>

      <h2 id="basic-usage">Basic Usage</h2>

      <pre><code className="language-typescript">{`import { readPoolState, getSwapQuote } from '@taurusswap/sdk';

const pool  = await readPoolState(algod, POOL_APP_ID);

// Sell 10 USDC (token 0) → buy USDT (token 1)
const quote = getSwapQuote(pool, 0, 1, 10_000_000n);

console.log('You receive:',   Number(quote.amountOut) / 1e6, 'USDT');
console.log('Effective rate:', quote.effectivePrice.toFixed(6));
console.log('Price impact:',  (quote.priceImpact * 100).toFixed(4) + '%');
console.log('Ticks crossed:', quote.ticksCrossed);`}</code></pre>

      <p>Via <code>TaurusClient</code> (async — fetches pool state from cache first):</p>

      <pre><code className="language-typescript">{`const quote = await client.quote({
  fromIndex: 0,
  toIndex:   1,
  amountIn:  10_000_000n,
});`}</code></pre>

      <h2 id="swapquote-type">SwapQuote Type</h2>

      <pre><code className="language-typescript">{`interface SwapQuote {
  amountIn:           bigint;        // raw microunits — the input you provided
  amountOut:          bigint;        // raw microunits — what you receive
  priceImpact:        number;        // 0.001 = 0.1% — how much the trade moves price
  instantaneousPrice: number;        // spot price before the trade (dimensionless ratio)
  effectivePrice:     number;        // amountOut / amountIn — actual average rate
  ticksCrossed:       number;        // 0 = simple swap; >0 = swap_with_crossings on-chain
  route:              TradeSegment[]; // internal segments (AMOUNT_SCALE units)
}

interface TradeSegment {
  amountIn:       bigint;        // AMOUNT_SCALE units
  amountOut:      bigint;        // AMOUNT_SCALE units
  tickCrossedId:  number | null; // which tick was exited (null = no crossing in this segment)
  newTickState:   TickState | null; // state the crossed tick transitions to
}`}</code></pre>

      <h2 id="understanding-price-impact">Understanding Price Impact</h2>

      <p>
        <code>priceImpact</code> is computed as:
      </p>

      <pre><code>{`priceImpact = 1 − (effectivePrice / instantaneousPrice)`}</code></pre>

      <p>
        For a 100 USDC → USDT swap, if the spot rate is 1.0000 and you receive 99.97 USDT,
        the effective price is 0.9997 and price impact is 0.03%.
      </p>

      <p>Guidelines for stablecoin swaps:</p>

      <table>
        <thead>
          <tr><th>Price Impact</th><th>Interpretation</th></tr>
        </thead>
        <tbody>
          <tr><td>&lt; 0.01%</td><td>Normal — deep pool, small trade</td></tr>
          <tr><td>0.01% – 0.1%</td><td>Acceptable — moderate-sized trade</td></tr>
          <tr><td>0.1% – 1%</td><td>Warn the user</td></tr>
          <tr><td>&gt; 1%</td><td>High — consider splitting the trade</td></tr>
        </tbody>
      </table>

      <h2 id="tick-crossings">Tick Crossings</h2>

      <p>
        The pool uses concentrated liquidity ticks. A large swap may exhaust one tick and
        &quot;cross&quot; into the next. The SDK handles this automatically:
      </p>

      <ul>
        <li><code>ticksCrossed === 0</code> — Simple path. The contract calls <code>swap()</code>.</li>
        <li><code>ticksCrossed &gt; 0</code> — Multi-segment path. The contract calls <code>swap_with_crossings()</code> with a serialised <code>trade_recipe</code>.</li>
      </ul>

      <p>
        <code>buildSwapTxns</code> (and <code>client.buildSwapTxns</code>) automatically
        chooses the right contract method — you don&apos;t need to handle this manually.
      </p>

      <h2 id="slippage">Applying Slippage Tolerance</h2>

      <pre><code className="language-typescript">{`const quote = getSwapQuote(pool, 0, 1, 10_000_000n);

const SLIPPAGE_BPS = 50; // 0.5%
const minAmountOut = (quote.amountOut * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n;

console.log('Expected:', Number(quote.amountOut) / 1e6);
console.log('Minimum: ', Number(minAmountOut) / 1e6);`}</code></pre>

      <p>
        When you pass <code>slippageBps</code> to <code>buildSwapTxns</code>, it applies
        this formula automatically and encodes <code>minAmountOut</code> into the
        transaction as a contract-enforced floor.
      </p>

      <h2 id="getting-prices">Spot Prices</h2>

      <pre><code className="language-typescript">{`// Get all token prices relative to token 0 (= 1.0)
const prices = await client.getAllPrices();
// prices[0] = 1.0  (base token)
// prices[1] = 0.9998  (USDT/USDC spot rate)
// prices[2] = 1.0001  etc.

// Or with explicit base:
const pricesRelativeToUSDT = await client.getAllPrices(1);`}</code></pre>

      <p>
        Under the hood this calls <code>getAllPrices(poolState, baseTokenIdx)</code> which
        uses <code>getPrice(reserves, rInt, i, j)</code> from the sphere math module.
      </p>

      <h2 id="react-hook">React Hook: Live Quote</h2>

      <pre><code className="language-typescript">{`import { useState, useEffect, useCallback } from 'react';
import { type SwapQuote, SwapTooSmallError, InsufficientLiquidityError } from '@taurusswap/sdk';
import { taurusClient } from '@/lib/taurus';

export function useSwapQuote(
  fromIndex: number,
  toIndex: number,
  amountIn: bigint | null,
) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!amountIn || amountIn <= 0n) { setQuote(null); return; }

    let cancelled = false;
    setLoading(true);

    taurusClient
      .quote({ fromIndex, toIndex, amountIn })
      .then((q) => { if (!cancelled) { setQuote(q); setError(null); } })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SwapTooSmallError)          setError('Amount too small');
        else if (err instanceof InsufficientLiquidityError) setError('Insufficient liquidity');
        else setError('Quote failed');
        setQuote(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [fromIndex, toIndex, amountIn?.toString()]);

  return { quote, error, loading };
}`}</code></pre>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a href="/docs/sdk/reading-pool-state" className="text-dark-green/70 hover:text-dark-green font-medium">
          ← Reading Pool State
        </a>
        <a href="/docs/sdk/executing-swaps" className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors">
          Executing Swaps →
        </a>
      </div>
    </div>
  );
}
