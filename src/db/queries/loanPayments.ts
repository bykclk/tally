import { getDb } from '../client';
import { uuid } from '@/lib/uuid';
import { getLoan } from './loans';
import type { LoanPayment } from '@/types';

type LoanPaymentRow = {
  id: string;
  loan_id: string;
  year: number;
  month: number;
  paid_at: number;
  amount: number;
  principal: number;
  interest: number;
  balance_before: number;
  balance_after: number;
  created_at: number;
};

function rowToPayment(r: LoanPaymentRow): LoanPayment {
  return {
    id: r.id,
    loanId: r.loan_id,
    year: r.year,
    month: r.month,
    paidAt: r.paid_at,
    amount: r.amount,
    principal: r.principal,
    interest: r.interest,
    balanceBefore: r.balance_before,
    balanceAfter: r.balance_after,
    createdAt: r.created_at,
  };
}

export type RecordPaymentResult =
  | { ok: true; payment: LoanPayment; newBalance: number }
  | {
      ok: false;
      reason:
        | 'no_balance'
        | 'already_paid'
        | 'insufficient_payment'
        | 'loan_not_found';
    };

export async function recordLoanPayment(
  loanId: string,
  year: number,
  month: number,
): Promise<RecordPaymentResult> {
  const db = getDb();
  const loan = await getLoan(loanId);
  if (!loan) return { ok: false, reason: 'loan_not_found' };
  if (loan.balance <= 0) return { ok: false, reason: 'no_balance' };

  const existsR = await db.execute(
    'SELECT id FROM loan_payments WHERE loan_id = ? AND year = ? AND month = ? LIMIT 1;',
    [loanId, year, month],
  );
  if ((existsR.rows as unknown as { id: string }[]).length > 0) {
    return { ok: false, reason: 'already_paid' };
  }

  const interest = loan.balance * loan.monthlyRate;
  let principal: number;
  let amount: number;

  if (loan.monthlyPayment >= loan.balance + interest) {
    principal = loan.balance;
    amount = loan.balance + interest;
  } else {
    principal = loan.monthlyPayment - interest;
    amount = loan.monthlyPayment;
    if (principal <= 0) return { ok: false, reason: 'insufficient_payment' };
  }

  const balanceBefore = loan.balance;
  const balanceAfter = Math.max(0, loan.balance - principal);
  const id = uuid();
  const now = Date.now();

  await db.transaction(async (tx) => {
    await tx.execute(
      `INSERT INTO loan_payments
        (id, loan_id, year, month, paid_at, amount, principal, interest,
         balance_before, balance_after, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        loanId,
        year,
        month,
        now,
        amount,
        principal,
        interest,
        balanceBefore,
        balanceAfter,
        now,
      ],
    );
    await tx.execute(
      'UPDATE loans SET balance = ?, updated_at = ? WHERE id = ?;',
      [balanceAfter, now, loanId],
    );
  });

  const r = await db.execute('SELECT * FROM loan_payments WHERE id = ?;', [id]);
  const row = (r.rows as unknown as LoanPaymentRow[])[0];
  if (!row) throw new Error('recordLoanPayment: row not found after insert');
  return { ok: true, payment: rowToPayment(row), newBalance: balanceAfter };
}

export async function bulkSeedLoanPayments(
  loanId: string,
  count: number,
): Promise<void> {
  if (count <= 0) return;
  const db = getDb();
  const loan = await getLoan(loanId);
  if (!loan) throw new Error('bulkSeedLoanPayments: loan not found');
  if (
    loan.loanType !== 'installment' ||
    loan.numInstallments == null ||
    loan.startYear == null ||
    loan.startMonth == null
  ) {
    throw new Error('bulkSeedLoanPayments: only installment loans supported');
  }
  const actual = Math.min(count, loan.numInstallments);
  if (actual <= 0) return;

  const now = Date.now();
  const startIdx = loan.startYear * 12 + (loan.startMonth - 1);
  let bal = loan.balance;

  await db.transaction(async (tx) => {
    for (let i = 0; i < actual; i++) {
      const idx = startIdx + i;
      const year = Math.floor(idx / 12);
      const month = (idx % 12) + 1;
      const principal = loan.monthlyPayment;
      const balanceBefore = bal;
      const balanceAfter = Math.max(0, bal - principal);

      await tx.execute(
        `INSERT INTO loan_payments
          (id, loan_id, year, month, paid_at, amount, principal, interest,
           balance_before, balance_after, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
        [
          uuid(),
          loanId,
          year,
          month,
          now,
          loan.monthlyPayment,
          principal,
          balanceBefore,
          balanceAfter,
          now,
        ],
      );
      bal = balanceAfter;
    }
    await tx.execute(
      'UPDATE loans SET balance = ?, updated_at = ? WHERE id = ?;',
      [bal, now, loanId],
    );
  });
}

export async function countLoanPayments(loanId: string): Promise<number> {
  const db = getDb();
  const r = await db.execute(
    'SELECT COUNT(*) AS n FROM loan_payments WHERE loan_id = ?;',
    [loanId],
  );
  const row = (r.rows as unknown as { n: number }[])[0];
  return row ? Number(row.n) : 0;
}

export async function deleteLoanPayment(paymentId: string): Promise<void> {
  const db = getDb();
  const r = await db.execute(
    'SELECT * FROM loan_payments WHERE id = ? LIMIT 1;',
    [paymentId],
  );
  const row = (r.rows as unknown as LoanPaymentRow[])[0];
  if (!row) return;
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx.execute('DELETE FROM loan_payments WHERE id = ?;', [paymentId]);
    await tx.execute(
      'UPDATE loans SET balance = balance + ?, updated_at = ? WHERE id = ?;',
      [row.principal, now, row.loan_id],
    );
  });
}

export async function listLoanPayments(
  loanId: string,
  limit = 50,
): Promise<LoanPayment[]> {
  const db = getDb();
  const r = await db.execute(
    `SELECT * FROM loan_payments
     WHERE loan_id = ?
     ORDER BY year DESC, month DESC
     LIMIT ?;`,
    [loanId, limit],
  );
  return (r.rows as unknown as LoanPaymentRow[]).map(rowToPayment);
}

export async function getLatestLoanPayment(
  loanId: string,
): Promise<LoanPayment | null> {
  const db = getDb();
  const r = await db.execute(
    `SELECT * FROM loan_payments
     WHERE loan_id = ?
     ORDER BY paid_at DESC
     LIMIT 1;`,
    [loanId],
  );
  const row = (r.rows as unknown as LoanPaymentRow[])[0];
  return row ? rowToPayment(row) : null;
}

export async function listLoanPaymentsForMonth(
  year: number,
  month: number,
): Promise<LoanPayment[]> {
  const db = getDb();
  const r = await db.execute(
    `SELECT * FROM loan_payments WHERE year = ? AND month = ?;`,
    [year, month],
  );
  return (r.rows as unknown as LoanPaymentRow[]).map(rowToPayment);
}

export async function hasPaymentForMonth(
  loanId: string,
  year: number,
  month: number,
): Promise<boolean> {
  const db = getDb();
  const r = await db.execute(
    'SELECT id FROM loan_payments WHERE loan_id = ? AND year = ? AND month = ? LIMIT 1;',
    [loanId, year, month],
  );
  return (r.rows as unknown as { id: string }[]).length > 0;
}
