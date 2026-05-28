import { getDb } from '../client';
import { uuid } from '@/lib/uuid';
import type { Loan, LoanType } from '@/types';

export type CreateLoanInput = {
  name: string;
  balance: number;
  monthlyRate: number;
  monthlyPayment: number;
  dayOfMonth: number;
  loanType: LoanType;
  numInstallments: number | null;
  startYear: number | null;
  startMonth: number | null;
};

type LoanRow = {
  id: string;
  name: string;
  balance: number;
  monthly_rate: number;
  monthly_payment: number;
  day_of_month: number;
  loan_type: LoanType;
  num_installments: number | null;
  start_year: number | null;
  start_month: number | null;
  active: number;
  created_at: number;
  updated_at: number;
};

function rowToLoan(r: LoanRow): Loan {
  return {
    id: r.id,
    name: r.name,
    balance: r.balance,
    monthlyRate: r.monthly_rate,
    monthlyPayment: r.monthly_payment,
    dayOfMonth: r.day_of_month,
    loanType: r.loan_type,
    numInstallments: r.num_installments,
    startYear: r.start_year,
    startMonth: r.start_month,
    active: r.active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listLoans(activeOnly = true): Promise<Loan[]> {
  const db = getDb();
  const where = activeOnly ? 'WHERE active = 1' : '';
  const r = await db.execute(
    `SELECT * FROM loans ${where} ORDER BY name ASC;`,
  );
  return (r.rows as unknown as LoanRow[]).map(rowToLoan);
}

export async function getLoan(id: string): Promise<Loan | null> {
  const db = getDb();
  const r = await db.execute('SELECT * FROM loans WHERE id = ? LIMIT 1;', [id]);
  const row = (r.rows as unknown as LoanRow[])[0];
  return row ? rowToLoan(row) : null;
}

export async function updateLoan(
  id: string,
  patch: Partial<CreateLoanInput>,
): Promise<Loan> {
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(patch.name.trim());
  }
  if (patch.balance !== undefined) {
    sets.push('balance = ?');
    params.push(patch.balance);
  }
  if (patch.monthlyRate !== undefined) {
    sets.push('monthly_rate = ?');
    params.push(patch.monthlyRate);
  }
  if (patch.monthlyPayment !== undefined) {
    sets.push('monthly_payment = ?');
    params.push(patch.monthlyPayment);
  }
  if (patch.dayOfMonth !== undefined) {
    sets.push('day_of_month = ?');
    params.push(patch.dayOfMonth);
  }
  if (patch.loanType !== undefined) {
    sets.push('loan_type = ?');
    params.push(patch.loanType);
  }
  if (patch.numInstallments !== undefined) {
    sets.push('num_installments = ?');
    params.push(patch.numInstallments);
  }
  if (patch.startYear !== undefined) {
    sets.push('start_year = ?');
    params.push(patch.startYear);
  }
  if (patch.startMonth !== undefined) {
    sets.push('start_month = ?');
    params.push(patch.startMonth);
  }
  if (sets.length > 0) {
    const now = Date.now();
    sets.push('updated_at = ?');
    params.push(now);
    params.push(id);
    await db.execute(
      `UPDATE loans SET ${sets.join(', ')} WHERE id = ?;`,
      params,
    );
  }
  const updated = await getLoan(id);
  if (!updated) throw new Error('updateLoan: not found');
  return updated;
}

export async function deleteLoan(id: string): Promise<void> {
  const db = getDb();
  await db.execute('DELETE FROM loans WHERE id = ?;', [id]);
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const db = getDb();
  const id = uuid();
  const now = Date.now();
  await db.execute(
    `INSERT INTO loans
      (id, name, balance, monthly_rate, monthly_payment, day_of_month,
       loan_type, num_installments, start_year, start_month,
       active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
    [
      id,
      input.name.trim(),
      input.balance,
      input.monthlyRate,
      input.monthlyPayment,
      input.dayOfMonth,
      input.loanType,
      input.numInstallments,
      input.startYear,
      input.startMonth,
      now,
      now,
    ],
  );
  const created = await getLoan(id);
  if (!created) throw new Error('createLoan: row not found after insert');
  return created;
}
