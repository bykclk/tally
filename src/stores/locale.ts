import { create } from 'zustand';
import { getLocales } from 'expo-localization';
import type { Locale } from '@/types';

function detectInitialLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode;
    if (code === 'en') return 'en';
  } catch {
    // expo-localization may be unavailable on web during prerender
  }
  return 'tr';
}

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: detectInitialLocale(),
  setLocale: (locale) => set({ locale }),
}));
