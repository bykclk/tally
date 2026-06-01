import { listEntries } from '@/db/queries/entries';
import { listInstancesForMonth } from '@/db/queries/instances';
import { listLoans } from '@/db/queries/loans';
import { listLoanPaymentsForMonth } from '@/db/queries/loanPayments';
import { estimateForEntry } from '@/lib/estimate';
import { isoForDayInMonth } from '@/lib/date';
import { isMonthInLoanSchedule } from '@/lib/loanSchedule';
import type {
  Direction,
  Entry,
  Instance,
  InstanceStatus,
  Loan,
  LoanPayment,
} from '@/types';

export type MonthlyItemSource =
  | { kind: 'entry'; entry: Entry; instance: Instance | null }
  | { kind: 'loan'; loan: Loan; payment: LoanPayment | null };

export type MonthlyItem = {
  id: string;
  name: string;
  direction: Direction;
  effectiveAmount: number;
  effectiveDay: number;
  effectiveDate: string;
  status: InstanceStatus;
  isEstimate: boolean;
  source: MonthlyItemSource;
};

export async function buildMonthlyItems(
  year: number,
  month: number,
): Promise<MonthlyItem[]> {
  const [entries, instances, loans, loanPayments] = await Promise.all([
    listEntries({ activeOnly: true }),
    listInstancesForMonth(year, month),
    listLoans(true),
    listLoanPaymentsForMonth(year, month),
  ]);

  const instanceByEntry = new Map<string, Instance>();
  for (const i of instances) instanceByEntry.set(i.entryId, i);

  const paymentByLoan = new Map<string, LoanPayment>();
  for (const p of loanPayments) paymentByLoan.set(p.loanId, p);

  // Monthly entries recur every month; one-time entries appear only in their
  // anchored (year, month).
  const monthEntries = entries.filter(
    (e) =>
      e.recurrence !== 'once' ||
      (e.oneTimeYear === year && e.oneTimeMonth === month),
  );

  const entryItems: MonthlyItem[] = await Promise.all(
    monthEntries.map(async (entry): Promise<MonthlyItem> => {
      const instance = instanceByEntry.get(entry.id) ?? null;

      if (instance) {
        const day = dayFromDate(instance.date) ?? entry.dayOfMonth;
        return {
          id: `entry:${entry.id}`,
          name: entry.name,
          direction: entry.direction,
          effectiveAmount: instance.amount,
          effectiveDay: day,
          effectiveDate: instance.date,
          status: instance.status,
          isEstimate: instance.isEstimate,
          source: { kind: 'entry', entry, instance },
        };
      }

      let amount = entry.amount;
      let isEstimate = false;
      if (entry.kind === 'variable') {
        const est = await estimateForEntry(entry.id);
        if (est !== null) amount = est;
        isEstimate = true;
      }

      return {
        id: `entry:${entry.id}`,
        name: entry.name,
        direction: entry.direction,
        effectiveAmount: amount,
        effectiveDay: entry.dayOfMonth,
        effectiveDate: isoForDayInMonth(year, month, entry.dayOfMonth),
        status: 'pending',
        isEstimate,
        source: { kind: 'entry', entry, instance: null },
      };
    }),
  );

  const loanItems: MonthlyItem[] = loans
    .filter((l) => {
      if (l.loanType === 'installment') {
        return isMonthInLoanSchedule(l, year, month);
      }
      return l.balance > 0 || paymentByLoan.has(l.id);
    })
    .map((loan): MonthlyItem => {
      const payment = paymentByLoan.get(loan.id) ?? null;
      if (payment) {
        return {
          id: `loan:${loan.id}`,
          name: loan.name,
          direction: 'expense',
          effectiveAmount: payment.amount,
          effectiveDay: loan.dayOfMonth,
          effectiveDate: isoForDayInMonth(year, month, loan.dayOfMonth),
          status: 'confirmed',
          isEstimate: false,
          source: { kind: 'loan', loan, payment },
        };
      }
      return {
        id: `loan:${loan.id}`,
        name: loan.name,
        direction: 'expense',
        effectiveAmount: loan.monthlyPayment,
        effectiveDay: loan.dayOfMonth,
        effectiveDate: isoForDayInMonth(year, month, loan.dayOfMonth),
        status: 'pending',
        isEstimate: true,
        source: { kind: 'loan', loan, payment: null },
      };
    });

  const items = [...entryItems, ...loanItems];
  return items.sort((a, b) => a.effectiveDay - b.effectiveDay);
}

function dayFromDate(iso: string): number | null {
  const m = /^\d{4}-\d{2}-(\d{2})$/.exec(iso);
  return m ? Number(m[1]) : null;
}

export function totalsFromItems(
  items: MonthlyItem[],
  startingBalance = 0,
): {
  confirmedRemaining: number;
  estimatedRemaining: number;
} {
  let confirmedIncome = 0;
  let confirmedExpense = 0;
  let projectedIncome = 0;
  let projectedExpense = 0;

  for (const it of items) {
    const isIncome = it.direction === 'income';
    const isConfirmed = it.status === 'confirmed';
    if (isIncome) {
      projectedIncome += it.effectiveAmount;
      if (isConfirmed) confirmedIncome += it.effectiveAmount;
    } else {
      projectedExpense += it.effectiveAmount;
      if (isConfirmed) confirmedExpense += it.effectiveAmount;
    }
  }

  return {
    confirmedRemaining: startingBalance + confirmedIncome - confirmedExpense,
    estimatedRemaining: startingBalance + projectedIncome - projectedExpense,
  };
}
