import { create } from 'zustand';
import { getPref, setPref } from '@/db/queries/prefs';
import type { Currency } from '@/types';

const PREF_KEY = 'currency';

const VALID: readonly Currency[] = ['TRY', 'USD', 'EUR', 'GBP'];

function isCurrency(v: string | null): v is Currency {
  return v !== null && (VALID as readonly string[]).includes(v);
}

type CurrencyState = {
  currency: Currency;
  setCurrency: (currency: Currency) => Promise<void>;
  loadFromPrefs: () => Promise<void>;
};

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: 'TRY',
  setCurrency: async (currency) => {
    set({ currency });
    await setPref(PREF_KEY, currency);
  },
  loadFromPrefs: async () => {
    const stored = await getPref(PREF_KEY);
    set({ currency: isCurrency(stored) ? stored : 'TRY' });
  },
}));
