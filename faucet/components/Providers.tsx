'use client';

/**
 * Client-side provider tree.
 * Kept in its own file so layout.tsx (Server Component) can import it cleanly.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletManager, WalletProvider, WalletId } from '@txnlab/use-wallet-react';
import { useMemo } from 'react';

// Public AlgoNode testnet endpoint — no key needed, safe to expose.
const ALGOD_SERVER =
  process.env.NEXT_PUBLIC_ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = Number(process.env.NEXT_PUBLIC_ALGOD_PORT ?? 443);
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN ?? '';

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  const walletManager = useMemo(
    () =>
      new WalletManager({
        wallets: [
          { id: WalletId.PERA, options: { shouldShowSignTxnToast: false } },
          { id: WalletId.DEFLY },
          { id: WalletId.EXODUS },
        ],
        defaultNetwork: 'testnet',
        networks: {
          testnet: {
            algod: {
              baseServer: ALGOD_SERVER,
              port: ALGOD_PORT,
              token: ALGOD_TOKEN,
            },
          },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider manager={walletManager}>{children}</WalletProvider>
    </QueryClientProvider>
  );
}
