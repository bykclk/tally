import type { Loan } from '@/types';

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function installmentOffset(
  loan: Loan,
  year: number,
  month: number,
): number | null {
  if (
    loan.loanType !== 'installment' ||
    loan.startYear == null ||
    loan.startMonth == null ||
    loan.numInstallments == null
  ) {
    return null;
  }
  const start = monthIndex(loan.startYear, loan.startMonth);
  const requested = monthIndex(year, month);
  const offset = requested - start;
  if (offset < 0 || offset >= loan.numInstallments) return null;
  return offset;
}

/**
 * Open loans: always within "schedule" (they have no fixed end).
 * Installment loans: only within [start, start + N - 1].
 */
export function isMonthInLoanSchedule(
  loan: Loan,
  year: number,
  month: number,
): boolean {
  if (loan.loanType !== 'installment') return true;
  return installmentOffset(loan, year, month) !== null;
}

export function endMonth(loan: Loan): { year: number; month: number } | null {
  if (
    loan.loanType !== 'installment' ||
    loan.startYear == null ||
    loan.startMonth == null ||
    loan.numInstallments == null
  ) {
    return null;
  }
  const startIdx = monthIndex(loan.startYear, loan.startMonth);
  const endIdx = startIdx + loan.numInstallments - 1;
  return { year: Math.floor(endIdx / 12), month: (endIdx % 12) + 1 };
}
