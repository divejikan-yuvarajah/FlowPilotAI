import { create } from "zustand";

const BASE_BALANCE = 1_247_500;

// ─── Derived metrics (computed from stress params) ────────────────────────────

export interface StressMetrics {
  stressedRunwayDays: number;
  crisisDate: string | null;   // date balance first drops below LKR 500k
  cashGap: number;             // LKR shortfall at lowest projected point
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface StressTestStore {
  // ── Existing balance / stress toggle (used by topnav pill + war room) ───────
  balance: number;
  baseBalance: number;
  isStressActive: boolean;
  activateStress: (multiplier?: number) => void;
  deactivateStress: () => void;
  toggle: () => void;

  // ── Simulator scenario parameters ────────────────────────────────────────────
  defaultedClientIds: string[];
  expenseShockPct: number;      // 0-50
  revenueShockPct: number;      // 0-50
  lateThresholdDays: number;    // 7-30

  // ── Derived (written by simulator after computing projection) ────────────────
  metrics: StressMetrics | null;

  // ── Simulator actions ────────────────────────────────────────────────────────
  setDefaultedClientIds: (ids: string[]) => void;
  toggleDefaultedClient: (id: string) => void;
  setExpenseShockPct: (pct: number) => void;
  setRevenueShockPct: (pct: number) => void;
  setLateThresholdDays: (days: number) => void;
  setMetrics: (m: StressMetrics) => void;
  clearAllStress: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStressTestStore = create<StressTestStore>((set, get) => ({
  // Existing
  balance: BASE_BALANCE,
  baseBalance: BASE_BALANCE,
  isStressActive: false,
  activateStress: (multiplier = 0.4) =>
    set({ isStressActive: true, balance: Math.round(BASE_BALANCE * multiplier) }),
  deactivateStress: () =>
    set({ isStressActive: false, balance: BASE_BALANCE }),
  toggle: () => {
    const { isStressActive, activateStress, deactivateStress } = get();
    if (isStressActive) deactivateStress();
    else activateStress();
  },

  // Simulator params
  defaultedClientIds: [],
  expenseShockPct: 0,
  revenueShockPct: 0,
  lateThresholdDays: 14,
  metrics: null,

  // Simulator actions
  setDefaultedClientIds: (ids) => set({ defaultedClientIds: ids }),
  toggleDefaultedClient: (id) => {
    const ids = get().defaultedClientIds;
    set({
      defaultedClientIds: ids.includes(id)
        ? ids.filter((x) => x !== id)
        : [...ids, id],
    });
  },
  setExpenseShockPct: (pct) => set({ expenseShockPct: pct }),
  setRevenueShockPct: (pct) => set({ revenueShockPct: pct }),
  setLateThresholdDays: (days) => set({ lateThresholdDays: days }),
  setMetrics: (m) => {
    // When stressed runway < threshold, also update balance to trigger topnav
    set({
      metrics: m,
      isStressActive: true,
      balance: Math.max(0, BASE_BALANCE - m.cashGap),
    });
  },
  clearAllStress: () =>
    set({
      defaultedClientIds: [],
      expenseShockPct: 0,
      revenueShockPct: 0,
      lateThresholdDays: 14,
      metrics: null,
      isStressActive: false,
      balance: BASE_BALANCE,
    }),
}));
