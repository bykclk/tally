import { getMonthBalance } from '@/db/queries/monthlyBalances';
import { buildMonthlyItems, totalsFromItems } from './monthlyItems';
import { shiftMonth } from './date';

const MAX_ROLLOVER_DEPTH = 60;

/**
 * Resolve the effective starting balance for (year, month):
 *  - If the user has explicitly set a value for that month, return it.
 *  - Otherwise, roll over from the previous month's projected ending
 *    (= previous month's starting + projected income − projected expense,
 *    which equals previous totals' `estimatedRemaining`).
 *  - Bail out and return 0 if we recurse further than MAX_ROLLOVER_DEPTH
 *    months back without finding an explicit anchor.
 */
export async function resolveStartingBalance(
  year: number,
  month: number,
): Promise<number> {
  return inner(year, month, 0);
}

async function inner(
  year: number,
  month: number,
  depth: number,
): Promise<number> {
  if (depth > MAX_ROLLOVER_DEPTH) return 0;

  const stored = await getMonthBalance(year, month);
  if (stored !== null) return stored;

  const prev = shiftMonth(year, month, -1);
  const prevStart = await inner(prev.year, prev.month, depth + 1);
  const prevItems = await buildMonthlyItems(prev.year, prev.month);
  const prevTotals = totalsFromItems(prevItems, prevStart);
  return prevTotals.estimatedRemaining;
}

/**
 * Returns true if this month has an explicit (user-set) starting balance,
 * false if the displayed value is being rolled over from a previous month.
 */
export async function hasExplicitBalance(
  year: number,
  month: number,
): Promise<boolean> {
  return (await getMonthBalance(year, month)) !== null;
}
