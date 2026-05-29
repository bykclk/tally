import type { MonthlyItem } from './monthlyItems';

export type BreakdownRow = {
  category: string;
  amount: number;
  pct: number; // 0..1 of total expense
};

export type Breakdown = {
  rows: BreakdownRow[];
  total: number;
};

/**
 * Aggregates a month's *expense* items by category.
 *  - Entry items use their `category` (falling back to `uncategorizedLabel`).
 *  - Loan items are grouped under `loanLabel`.
 * Uses `effectiveAmount`, so the breakdown reflects the full monthly picture
 * (confirmed actuals + estimates for not-yet-confirmed items). Sorted by
 * amount descending.
 */
export function expenseBreakdown(
  items: MonthlyItem[],
  labels: { loanLabel: string; uncategorizedLabel: string },
): Breakdown {
  const byCategory = new Map<string, number>();

  for (const item of items) {
    if (item.direction !== 'expense') continue;
    const category =
      item.source.kind === 'loan'
        ? labels.loanLabel
        : item.source.entry.category?.trim() || labels.uncategorizedLabel;
    byCategory.set(category, (byCategory.get(category) ?? 0) + item.effectiveAmount);
  }

  let total = 0;
  for (const amount of byCategory.values()) total += amount;

  const rows: BreakdownRow[] = [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { rows, total };
}
