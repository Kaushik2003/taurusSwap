"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SupportedWallet, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const algodConfig = getAlgodConfigFromViteEnvironment();

  let supportedWallets: SupportedWallet[];
  if (process.env.NEXT_PUBLIC_ALGOD_NETWORK === "localnet") {
    const kmdConfig = getKmdConfigFromViteEnvironment();
    supportedWallets = [
      {
        id: WalletId.KMD,
        options: {
          baseServer: kmdConfig.server,
          token: String(kmdConfig.token),
          port: String(kmdConfig.port),
        },
      },
    ];
  } else {
    supportedWallets = [
      { id: WalletId.DEFLY },
      { id: WalletId.PERA, options: { shouldShowSignTxnToast: false } },
      { id: WalletId.EXODUS },
    ];
  }

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider manager={walletManager}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
