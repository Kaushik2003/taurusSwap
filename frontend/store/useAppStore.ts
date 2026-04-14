import { create } from 'zustand';

// Algorand network type
export type AlgorandNetwork = 'localnet' | 'testnet' | 'mainnet';

interface AppState {
  isWalletConnected: boolean;
  walletAddress: string;
  selectedNetwork: AlgorandNetwork;
  isWalletModalOpen: boolean;
  toggleWalletModal: (open: boolean) => void;
  connectWallet: () => void;
  disconnectWallet: () => void;
  setNetwork: (network: AlgorandNetwork) => void;
  setWalletState: (connected: boolean, address: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isWalletConnected: false,
  walletAddress: '',
  selectedNetwork: 'testnet',
  isWalletModalOpen: false,
  toggleWalletModal: (open) => set({ isWalletModalOpen: open }),
  connectWallet: () => set({ isWalletModalOpen: true }),
  disconnectWallet: () => {}, // This will be handled by the ConnectWallet component
  setNetwork: (network) => set({ selectedNetwork: network }),
  setWalletState: (connected, address) => set({
    isWalletConnected: connected,
    walletAddress: address
  }),
}));
