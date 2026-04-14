import { create } from 'zustand';

interface SwapUIState {
  sellIdx: number;
  buyIdx: number;
  sellAmount: string;
  swapping: boolean;
  setSellIdx: (i: number) => void;
  setBuyIdx: (i: number) => void;
  setSellAmount: (v: string) => void;
  setSwapping: (v: boolean) => void;
  flip: () => void;
}

export const useSwapUIStore = create<SwapUIState>((set) => ({
  sellIdx: 0,
  buyIdx: 1,
  sellAmount: '',
  swapping: false,
  setSellIdx: (i) => set({ sellIdx: i }),
  setBuyIdx: (i) => set({ buyIdx: i }),
  setSellAmount: (v) => set({ sellAmount: v }),
  setSwapping: (v) => set({ swapping: v }),
  flip: () => set((s) => ({ sellIdx: s.buyIdx, buyIdx: s.sellIdx })),
}));
