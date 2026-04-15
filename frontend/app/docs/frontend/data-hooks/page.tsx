export default function DataHooks() {
  return (
    <div className="page-slide-in">
      <h1>Data Hooks</h1>

      <p>
        The frontend uses React Query hooks to fetch and cache data from Algorand.
        This page documents each hook and its configuration.
      </p>

      <h2 id="usepoolstate">usePoolState</h2>

      <pre><code className="language-typescript">{`import { usePoolState } from '@/hooks/usePoolState';

function TradeForm({ appId }: { appId: number }) {
  const { data: poolState, isLoading, error } = usePoolState(appId);

  if (isLoading) return <div>Loading pool...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Reserves: {poolState.reserves}</div>;
}`}</code></pre>

      <p>
        Configuration:
      </p>

      <pre><code className="language-typescript">{`useQuery({
  queryKey: ['poolState', appId],
  queryFn: () => readPoolState(algodClient, appId),
  staleTime: 30_000,        // Data is fresh for 30s
  refetchInterval: 30_000   // Poll every 30s
});`}</code></pre>

      <h2 id="useswapquote">useSwapQuote</h2>

      <pre><code className="language-typescript">{`import { useSwapQuote } from '@/hooks/useSwapQuote';

function QuoteDisplay({ poolState, tradeParams }) {
  const { data: quote, isLoading } = useSwapQuote(
    poolState,
    tradeParams,
    { enabled: !!poolState }  // Only fetch when poolState exists
  );

  return <div>Output: {quote?.amountOut}</div>;
}`}</code></pre>

      <p>
        Configuration:
      </p>

      <pre><code className="language-typescript">{`useQuery({
  queryKey: ['swapQuote', poolState, tradeParams],
  queryFn: () => getSwapQuote(poolState, tradeParams),
  staleTime: 5_000,         // Quotes expire fast
  enabled: !!poolState      // Don't fetch until poolState loaded
});`}</code></pre>

      <h2 id="useallpositions">useAllPositions</h2>

      <pre><code className="language-typescript">{`import { useAllPositions } from '@/hooks/useAllPositions';

function PortfolioView({ address, appId }: { address: string; appId: number }) {
  const { data: positions } = useAllPositions(address, appId);

  return (
    <div>
      {positions?.map((pos) => (
        <PositionCard key={pos.tickId} position={pos} />
      ))}
    </div>
  );
}`}</code></pre>

      <p>
        Configuration:
      </p>

      <pre><code className="language-typescript">{`useQuery({
  queryKey: ['positions', address, appId],
  queryFn: () => readAllPositions(algodClient, appId, address),
  staleTime: 60_000,        // 1 minute
  refetchInterval: 60_000
});`}</code></pre>

      <h2 id="usetokenbalances">useTokenBalances</h2>

      <pre><code className="language-typescript">{`import { useTokenBalances } from '@/hooks/useTokenBalances';

function TokenBalance({ address, asaId }) {
  const { data: balance } = useTokenBalances(address, [asaId]);

  return <div>Balance: {balance?.[asaId]}</div>;
}`}</code></pre>

      <p>
        Configuration:
      </p>

      <pre><code className="language-typescript">{`useQuery({
  queryKey: ['tokenBalances', address, asaIds],
  queryFn: () => fetchTokenBalances(algodClient, address, asaIds),
  staleTime: 10_000,        // 10 seconds
  refetchInterval: 10_000   // Live updates
});`}</code></pre>

      <h2 id="uselivepoolmetrics">useLivePoolMetrics</h2>

      <pre><code className="language-typescript">{`import { useLivePoolMetrics } from '@/hooks/useLivePoolMetrics';

function PoolStats({ appId }) {
  const { data: metrics } = useLivePoolMetrics(appId);

  return (
    <div>
      <div>TVL: \${metrics.tvl}</div>
      <div>24h Volume: \${metrics.volume24h}</div>
    </div>
  );
}`}</code></pre>

      <p>
        Configuration:
      </p>

      <pre><code className="language-typescript">{`useQuery({
  queryKey: ['poolMetrics', appId],
  queryFn: () => fetchPoolMetrics(algodClient, appId),
  staleTime: 60_000,
  refetchInterval: 60_000
});`}</code></pre>

      <h2 id="usependingtransactions">usePendingTransactions</h2>

      <pre><code className="language-typescript">{`import { usePendingTransactions } from '@/hooks/usePendingTransactions';

function TxStatus({ txId }) {
  const { data: status } = usePendingTransactions(txId);

  return <div>Status: {status}</div>;
}`}</code></pre>

      <p>
        Configuration:
      </p>

      <pre><code className="language-typescript">{`useQuery({
  queryKey: ['txStatus', txId],
  queryFn: async () => {
    const pending = await algodClient
      .pendingTransactionInformation(txId)
      .do();
    if (pending['confirmed-round']) return 'confirmed';
    if (pending['pool-error']) return 'failed';
    return 'pending';
  },
  refetchInterval: 1000,    // Check every second
  retry: false               // Don't retry on failure
});`}</code></pre>

      <h2 id="stale-time-vs-refetch-interval">Stale Time vs Refetch Interval</h2>

      <table>
        <thead>
          <tr>
            <th>Query</th>
            <th>Stale Time</th>
            <th>Refetch Interval</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>usePoolState</td>
            <td>30s</td>
            <td>30s</td>
            <td>Pool state changes with every swap</td>
          </tr>
          <tr>
            <td>useSwapQuote</td>
            <td>5s</td>
            <td>-</td>
            <td>Quotes are ephemeral, recomputed on input change</td>
          </tr>
          <tr>
            <td>useAllPositions</td>
            <td>60s</td>
            <td>60s</td>
            <td>LP positions change less frequently</td>
          </tr>
          <tr>
            <td>useTokenBalances</td>
            <td>10s</td>
            <td>10s</td>
            <td>Live balance updates for trading UX</td>
          </tr>
          <tr>
            <td>usePendingTransactions</td>
            <td>0</td>
            <td>1s</td>
            <td>Always fresh, polling until confirmed</td>
          </tr>
        </tbody>
      </table>

      <h2 id="custom-query-client">Custom Query Client</h2>

      <pre><code className="language-typescript">{`// app/Providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      networkMode: 'online',  // Only fetch when online
    },
  },
});

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}`}</code></pre>

      <blockquote>
        <strong>Note:</strong> All hooks are in the <code>hooks/</code> directory.
        Import and use them in your components for consistent data fetching.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/frontend/overview"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Frontend Overview
        </a>
        <a
          href="/docs/frontend/visualizations"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Visualizations →
        </a>
      </div>
    </div>
  );
}
