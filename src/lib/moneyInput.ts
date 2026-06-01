import type { Locale } from '@/types';

// Separators per app locale. Drives both how typed input is grouped and how
// it's parsed back to a number, so input matches the locale-aware display.
const SEP: Record<Locale, { thousand: string; decimal: string }> = {
  tr: { thousand: '.', decimal: ',' },
  en: { thousand: ',', decimal: '.' },
};

/**
 * Formats a money TextInput value for the given app locale.
 *  - tr: "1.250,50"  (thousands ".", decimal ",")
 *  - en: "1,250.50"  (thousands ",", decimal ".")
 *
 * Separator detection is locale-agnostic on input (the user may be on a
 * keyboard that emits the "other" separator): the last separator with 1–2
 * trailing digits — or a trailing separator — is the decimal point; every
 * other separator is a thousands grouper. Output is always re-rendered in
 * the locale's style. Decimals are capped at 2.
 */
export function formatMoneyInput(raw: string, locale: Locale): string {
  const { thousand, decimal } = SEP[locale];
  if (!raw) return '';

  const s = raw.replace(/[^\d.,]/g, '');
  if (!s) return '';

  const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  let intRaw: string;
  let decPart: string | null = null;

  if (lastSep !== -1) {
    const after = s.slice(lastSep + 1);
    if (after === '') {
      // Trailing separator → the user is starting the decimal part.
      intRaw = s.slice(0, lastSep).replace(/[.,]/g, '');
      decPart = '';
    } else if (/^\d{1,2}$/.test(after)) {
      intRaw = s.slice(0, lastSep).replace(/[.,]/g, '');
      decPart = after;
    } else {
      // 3+ trailing digits → every separator is a thousands grouper.
      intRaw = s.replace(/[.,]/g, '');
    }
  } else {
    intRaw = s;
  }

  let intDigits = intRaw.replace(/^0+/, '');
  if (intDigits === '' && (decPart !== null || intRaw === '0')) {
    intDigits = '0';
  }

  const grouped = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
  return decPart !== null ? `${grouped}${decimal}${decPart}` : grouped;
}

/** Parses a locale-formatted money string back to a number (null if empty/invalid). */
export function parseMoneyInput(formatted: string, locale: Locale): number | null {
  const { thousand, decimal } = SEP[locale];
  let s = formatted.trim();
  if (!s) return null;
  s = s.split(thousand).join('');
  if (decimal !== '.') s = s.split(decimal).join('.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Format a numeric value as a money-input string (for pre-filling edit forms). */
export function moneyValueToInput(n: number, locale: Locale): string {
  return formatMoneyInput(String(Math.round(n)), locale);
}
