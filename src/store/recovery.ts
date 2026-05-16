import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RecoveryLanguage = "en" | "si" | "ta";

interface RecoveryStore {
  preferredLanguage: RecoveryLanguage;
  setPreferredLanguage: (lang: RecoveryLanguage) => void;
}

export const useRecoveryStore = create<RecoveryStore>()(
  persist(
    (set) => ({
      preferredLanguage: "en",
      setPreferredLanguage: (lang) => set({ preferredLanguage: lang }),
    }),
    { name: "flowpilot-recovery-prefs" },
  ),
);
