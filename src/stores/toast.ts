import { create } from 'zustand';

export type ToastAction = { label: string; onPress: () => void };

type ToastState = {
  message: string | null;
  action: ToastAction | null;
  /** Bumped on every show() so the host re-triggers even for an identical message. */
  seq: number;
  show: (message: string, action?: ToastAction) => void;
  hide: () => void;
};

/**
 * Tiny global toast. A single <ToastHost/> mounted at the app root subscribes
 * and renders; anywhere else just calls useToastStore.getState().show(...).
 */
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  action: null,
  seq: 0,
  show: (message, action) =>
    set((s) => ({ message, action: action ?? null, seq: s.seq + 1 })),
  hide: () => set({ message: null, action: null }),
}));

/** Convenience for non-component call sites. */
export const showToast = (message: string, action?: ToastAction) =>
  useToastStore.getState().show(message, action);
