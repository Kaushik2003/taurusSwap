import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Pool from "./pages/Pool";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";
import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react';
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs';

const queryClient = new QueryClient();

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA, options: { shouldShowSignTxnToast: false } },
    { id: WalletId.EXODUS },
  ]
}

const App = () => {
  const algodConfig = getAlgodConfigFromViteEnvironment()

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
  })

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider manager={walletManager}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/pool" element={<Pool />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
};

export default App;
