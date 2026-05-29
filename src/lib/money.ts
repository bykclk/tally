import { useCallback } from 'react';
import { useCurrencyStore } from '@/stores/currency';
import { useLocaleStore } from '@/stores/locale';
import type { Currency, Locale } from '@/types';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// App locale → BCP-47 tag for Intl. Controls number grouping/decimal style
// and currency-symbol placement (e.g. "$1,250" in en vs "1.250 ₺" in tr).
const INTL_LOCALE: Record<Locale, string> = {
  tr: 'tr-TR',
  en: 'en-US',
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: Locale, currency: Currency): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    formatterCache.set(key, f);
  }
  return f;
}

export function formatMoney(
  amount: number,
  currency: Currency,
  locale: Locale,
): string {
  return getFormatter(locale, currency).format(Math.round(amount));
}

export function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

/** Reactive currency selector for components. */
export function useCurrency(): Currency {
  return useCurrencyStore((s) => s.currency);
}

/**
 * Hook returning a formatter bound to the active currency and locale.
 * Re-renders when either changes.
 */
export function useFormatMoney(): (amount: number) => string {
  const currency = useCurrencyStore((s) => s.currency);
  const locale = useLocaleStore((s) => s.locale);
  return useCallback(
    (amount: number) => formatMoney(amount, currency, locale),
    [currency, locale],
  );
}
