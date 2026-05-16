import { create } from "zustand";

const BASE_BALANCE = 1_247_500;

interface StressTestStore {
  balance: number;
  baseBalance: number;
  isStressActive: boolean;
  activateStress: (multiplier?: number) => void;
  deactivateStress: () => void;
  toggle: () => void;
}

export const useStressTestStore = create<StressTestStore>((set, get) => ({
  balance: BASE_BALANCE,
  baseBalance: BASE_BALANCE,
  isStressActive: false,

  activateStress: (multiplier = 0.4) =>
    set({
      isStressActive: true,
      balance: Math.round(BASE_BALANCE * multiplier),
    }),

  deactivateStress: () =>
    set({ isStressActive: false, balance: BASE_BALANCE }),

  toggle: () => {
    const { isStressActive, activateStress, deactivateStress } = get();
    if (isStressActive) deactivateStress();
    else activateStress();
  },
}));
