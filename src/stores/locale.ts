import { create } from 'zustand';
import { getLocales } from 'expo-localization';
import { getPref, setPref } from '@/db/queries/prefs';
import type { Locale, LocaleMode } from '@/types';

const PREF_KEY = 'locale.mode';

function detectSystemLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode;
    if (code === 'en') return 'en';
  } catch {
    // expo-localization may be unavailable on web during prerender
  }
  return 'tr';
}

function resolveLocale(mode: LocaleMode): Locale {
  if (mode === 'system') return detectSystemLocale();
  return mode;
}

type LocaleState = {
  mode: LocaleMode;
  locale: Locale;
  setMode: (mode: LocaleMode) => Promise<void>;
  loadFromPrefs: () => Promise<void>;
};

const initialMode: LocaleMode = 'system';

export const useLocaleStore = create<LocaleState>((set) => ({
  mode: initialMode,
  locale: resolveLocale(initialMode),
  setMode: async (mode) => {
    set({ mode, locale: resolveLocale(mode) });
    await setPref(PREF_KEY, mode);
  },
  loadFromPrefs: async () => {
    const stored = await getPref(PREF_KEY);
    const mode: LocaleMode =
      stored === 'tr' || stored === 'en' || stored === 'system'
        ? stored
        : 'system';
    set({ mode, locale: resolveLocale(mode) });
  },
}));
