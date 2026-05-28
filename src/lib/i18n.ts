import { tr, type TranslationKey } from '@/locales/tr';
import { en } from '@/locales/en';
import { useLocaleStore } from '@/stores/locale';
import type { Locale } from '@/types';

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { tr, en };

export type { TranslationKey };

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries.tr;
  let value = dict[key] ?? tr[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return value;
}

export function useT(): (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string {
  const locale = useLocaleStore((s) => s.locale);
  return (key, params) => translate(locale, key, params);
}

export function useLocale(): Locale {
  return useLocaleStore((s) => s.locale);
}
