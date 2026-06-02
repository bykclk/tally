import { getMonthBalance } from '@/db/queries/monthlyBalances';
import { resolveStartingBalance } from './monthlyBalance';
import { buildMonthlyItems, totalsFromItems } from './monthlyItems';
import { shiftMonth } from './date';

export type ProjectionMonth = {
  year: number;
  month: number;
  /** Money carried in at the start of the month. */
  startingBalance: number;
  /** Starting balance + confirmed income − confirmed expense. */
  confirmedRemaining: number;
  /** Starting balance + projected (confirmed + estimated) net — the headline. */
  estimatedRemaining: number;
  /** Projected income for the month (confirmed + estimated). */
  income: number;
  /** Projected expense for the month (confirmed + estimated). */
  expense: number;
  /** Whether the month has any entries/loans at all. */
  hasData: boolean;
};

/**
 * Project the end-of-month remaining balance forward for `count` months,
 * starting at (startYear, startMonth) inclusive.
 *
 * Each month's projected ending (`estimatedRemaining`) becomes the next
 * month's starting balance, mirroring the home screen's rollover — unless a
 * later month has an explicit user-set balance, which overrides the chain.
 *
 * O(count) DB passes: the first month's start is resolved once (which may walk
 * back to the last explicit anchor), then we iterate forward.
 */
export async function buildProjection(
  startYear: number,
  startMonth: number,
  count: number,
): Promise<ProjectionMonth[]> {
  const out: ProjectionMonth[] = [];
  let running = await resolveStartingBalance(startYear, startMonth);
  let cursor = { year: startYear, month: startMonth };

  for (let i = 0; i < count; i++) {
    if (i > 0) {
      const explicit = await getMonthBalance(cursor.year, cursor.month);
      if (explicit !== null) running = explicit;
    }
    const items = await buildMonthlyItems(cursor.year, cursor.month);
    const totals = totalsFromItems(items, running);
    let income = 0;
    let expense = 0;
    for (const it of items) {
      if (it.direction === 'income') income += it.effectiveAmount;
      else expense += it.effectiveAmount;
    }
    out.push({
      year: cursor.year,
      month: cursor.month,
      startingBalance: running,
      confirmedRemaining: totals.confirmedRemaining,
      estimatedRemaining: totals.estimatedRemaining,
      income,
      expense,
      hasData: items.length > 0,
    });
    running = totals.estimatedRemaining;
    cursor = shiftMonth(cursor.year, cursor.month, 1);
  }

  return out;
}
