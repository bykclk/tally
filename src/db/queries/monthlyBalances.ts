import { getDb } from '../client';

export async function getMonthBalance(
  year: number,
  month: number,
): Promise<number | null> {
  const db = getDb();
  const r = await db.execute(
    'SELECT starting_balance FROM monthly_balances WHERE year = ? AND month = ? LIMIT 1;',
    [year, month],
  );
  const row = (r.rows as unknown as { starting_balance: number }[])[0];
  return row ? row.starting_balance : null;
}

export async function setMonthBalance(
  year: number,
  month: number,
  amount: number,
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db.execute(
    `INSERT INTO monthly_balances
       (year, month, starting_balance, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET
       starting_balance = excluded.starting_balance,
       updated_at = excluded.updated_at;`,
    [year, month, amount, now, now],
  );
}

export async function deleteMonthBalance(
  year: number,
  month: number,
): Promise<void> {
  const db = getDb();
  await db.execute(
    'DELETE FROM monthly_balances WHERE year = ? AND month = ?;',
    [year, month],
  );
}
