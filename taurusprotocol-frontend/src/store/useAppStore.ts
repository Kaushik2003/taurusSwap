import { create } from 'zustand';

interface AppState {
  isWalletConnected: boolean;
  walletAddress: string;
  selectedNetwork: string;
  connectWallet: () => void;
  disconnectWallet: () => void;
  setNetwork: (network: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isWalletConnected: false,
  walletAddress: '0x1234...abcd',
  selectedNetwork: 'ethereum',
  connectWallet: () => set({ isWalletConnected: true }),
  disconnectWallet: () => set({ isWalletConnected: false }),
  setNetwork: (network) => set({ selectedNetwork: network }),
}));
