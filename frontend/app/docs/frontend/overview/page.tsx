export default function FrontendOverview() {
  return (
    <div className="page-slide-in">
      <h1>Frontend Overview</h1>

      <p>
        The taurusSwap frontend is a Next.js 16 application with React 19, built for
        trading, liquidity provision, and portfolio tracking. This page explains the
        architecture and page structure.
      </p>

      <h2 id="tech-stack">Tech Stack</h2>

      <ul>
        <li><strong>Framework:</strong> Next.js 16 (App Router)</li>
        <li><strong>React:</strong> 19 with Server Components</li>
        <li><strong>State:</strong> Zustand (UI state), React Query (server state)</li>
        <li><strong>UI:</strong> Radix UI primitives, Tailwind CSS</li>
        <li><strong>3D:</strong> Three.js via @react-three/fiber and @react-three/drei</li>
        <li><strong>Wallet:</strong> @txnlab/use-wallet-react (Pera, Defly, Lute)</li>
      </ul>

      <h2 id="page-tree">Page Tree</h2>

      <pre><code>{`app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Landing page
├── trade/
│   └── page.tsx            # Main trading interface
├── pool/
│   ├── page.tsx            # Pool list
│   └── add/
│       └── page.tsx        # Add liquidity form
├── portfolio/
│   └── page.tsx            # Portfolio dashboard
├── explore/
│   └── page.tsx            # Token/pool explorer
└── docs/
    ├── layout.tsx          # Docs shell
    ├── page.tsx            # Docs landing
    └── [sections]/         # Documentation pages`}</code></pre>

      <h2 id="state-management">State Management</h2>

      <h3 id="zustand">Zustand (UI State)</h3>

      <pre><code className="language-typescript">{`// store/useAppStore.ts
interface AppState {
  selectedNetwork: 'testnet' | 'mainnet';
  isWalletModalOpen: boolean;
  setNetwork: (network: string) => void;
  toggleWalletModal: (open: boolean) => void;
}`}</code></pre>

      <p>
        Used for: network selection, modal states, theme preference.
      </p>

      <h3 id="react-query">React Query (Server State)</h3>

      <pre><code className="language-typescript">{`// hooks/usePoolState.ts
const { data: poolState } = useQuery({
  queryKey: ['poolState', appId],
  queryFn: () => readPoolState(algodClient, appId),
  staleTime: 30_000,        // 30 seconds
  refetchInterval: 30_000   // Live polling
});`}</code></pre>

      <p>
        Used for: pool state, token balances, transaction history, LP positions.
      </p>

      <h2 id="component-structure">Component Structure</h2>

      <pre><code>{`components/
├── animation/              # Three.js visualizations
│   ├── SphereAmm.tsx
│   ├── PolarDecomposition.tsx
│   ├── TicksAndCaps.tsx
│   └── ...
├── docs/                   # Docs-specific components
│   ├── AnimationEmbed.tsx
│   ├── DocsSidebar.tsx
│   └── DocsToc.tsx
├── landing/                # Landing page components
│   ├── FloatingOrbs.tsx
│   └── Footer.tsx
├── layout/                 # Layout components
│   ├── Layout.tsx
│   └── Navbar.tsx
├── pool/                   # Pool-related components
│   ├── AddLiquidityModal.tsx
│   ├── PositionCard.tsx
│   └── PositionsTable.tsx
├── swap/                   # Swap components
│   └── TokenSelectorModal.tsx
└── ui/                     # shadcn/ui primitives
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    └── ...`}</code></pre>

      <h2 id="data-flow">Data Flow</h2>

      <pre><code>{`┌─────────────────┐
│  Algorand Node  │
└────────┬────────┘
         │ algodClient
         ▼
┌─────────────────┐
│  SDK Functions  │  ← readPoolState, getSwapQuote
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Query    │  ← Caching, refetching
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Components     │  ← Render UI
└─────────────────┘`}</code></pre>

      <h2 id="styling">Styling</h2>

      <p>
        The app uses Tailwind CSS with custom CSS variables for theming:
      </p>

      <pre><code className="language-css">{`:root {
  --green: #9FE870;
  --dark-green: #163300;
  --background: #9FE870;
  --foreground: #0A3F2F;
  --card: #ffffff;
  --border: #0A3F2F;
}

.glass-panel {
  border: 2px solid var(--border);
  box-shadow: 4px 4px 0 0 var(--border);
}`}</code></pre>

      <h2 id="animations">Animations</h2>

      <p>
        Three.js animations are used throughout:
      </p>

      <ul>
        <li>Landing page — Floating orbs background</li>
        <li>Docs — Mathematical concept visualizations</li>
        <li>Pool — Liquidity state visualization</li>
      </ul>

      <p>
        See <a href="/docs/frontend/visualizations">Visualizations</a> for the full gallery.
      </p>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/sdk/api-reference"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← API Reference
        </a>
        <a
          href="/docs/frontend/data-hooks"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Data Hooks →
        </a>
      </div>
    </div>
  );
}
