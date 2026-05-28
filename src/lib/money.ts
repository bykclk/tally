import { useCallback } from 'react';
import { useCurrencyStore } from '@/stores/currency';
import type { Currency } from '@/types';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const FORMAT_LOCALE = 'tr-TR';

const formatterCache = new Map<Currency, Intl.NumberFormat>();

function getFormatter(currency: Currency): Intl.NumberFormat {
  let f = formatterCache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(FORMAT_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    formatterCache.set(currency, f);
  }
  return f;
}

export function formatMoney(amount: number, currency: Currency): string {
  return getFormatter(currency).format(Math.round(amount));
}

export function formatMoneySigned(amount: number, currency: Currency): string {
  const rounded = Math.round(amount);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${getFormatter(currency).format(rounded)}`;
}

export function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

/** Reactive currency selector for components. */
export function useCurrency(): Currency {
  return useCurrencyStore((s) => s.currency);
}

/** Hook returning a currency-bound formatter. Re-renders when currency changes. */
export function useFormatMoney(): (amount: number) => string {
  const currency = useCurrency();
  return useCallback((amount: number) => formatMoney(amount, currency), [currency]);
}
