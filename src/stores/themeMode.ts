import { create } from 'zustand';
import { getPref, setPref } from '@/db/queries/prefs';
import type { ThemeMode } from '@/types';

const PREF_KEY = 'theme.mode';

type ThemeModeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadFromPrefs: () => Promise<void>;
};

export const useThemeModeStore = create<ThemeModeState>((set) => ({
  mode: 'system',
  setMode: async (mode) => {
    set({ mode });
    await setPref(PREF_KEY, mode);
  },
  loadFromPrefs: async () => {
    const stored = await getPref(PREF_KEY);
    const mode: ThemeMode =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    set({ mode });
  },
}));
