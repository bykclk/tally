import { create } from 'zustand';

type RefreshState = {
  /** Incremented to ask focused data screens to reload (e.g. after an undo). */
  tick: number;
  bump: () => void;
};

/**
 * A global "data changed, reload" signal. Screens include `tick` in their
 * focus-effect deps; a mutation made off-screen (like a toast "Undo") calls
 * bump() so the live screen refreshes without waiting for a re-focus.
 */
export const useRefreshStore = create<RefreshState>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));

export const bumpRefresh = () => useRefreshStore.getState().bump();
