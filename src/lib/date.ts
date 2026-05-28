import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { enUS } from 'date-fns/locale/en-US';
import type { Locale } from '@/types';

const locales = { tr, en: enUS } as const;

export function monthLabel(year: number, month: number, locale: Locale): string {
  const d = new Date(year, month - 1, 1);
  return format(d, 'LLLL yyyy', { locale: locales[locale] });
}

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return format(d, 'dd/MM/yyyy', { locale: locales[locale] });
}

export function shortDate(
  year: number,
  month: number,
  day: number,
  locale: Locale,
): string {
  const safeDay = Math.min(day, daysInMonth(year, month));
  const d = new Date(year, month - 1, safeDay);
  return format(d, 'd MMM yyyy', { locale: locales[locale] });
}

export function currentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function isoForDayInMonth(
  year: number,
  month: number,
  day: number,
): string {
  const safeDay = Math.min(day, daysInMonth(year, month));
  const m = String(month).padStart(2, '0');
  const d = String(safeDay).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
