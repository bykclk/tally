import { getDb } from '../client';
import { uuid } from '@/lib/uuid';
import type { Instance, InstanceStatus } from '@/types';

export type UpsertInstanceInput = {
  entryId: string;
  year: number;
  month: number;
  amount: number;
  date: string;
  status: InstanceStatus;
  isEstimate: boolean;
};

type InstanceRow = {
  id: string;
  entry_id: string;
  year: number;
  month: number;
  amount: number;
  date: string;
  status: InstanceStatus;
  is_estimate: number;
  created_at: number;
  updated_at: number;
};

function rowToInstance(r: InstanceRow): Instance {
  return {
    id: r.id,
    entryId: r.entry_id,
    year: r.year,
    month: r.month,
    amount: r.amount,
    date: r.date,
    status: r.status,
    isEstimate: r.is_estimate === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listInstancesForMonth(
  year: number,
  month: number,
): Promise<Instance[]> {
  const db = getDb();
  const r = await db.execute(
    'SELECT * FROM instances WHERE year = ? AND month = ? ORDER BY date ASC;',
    [year, month],
  );
  return (r.rows as unknown as InstanceRow[]).map(rowToInstance);
}

export async function getInstance(
  entryId: string,
  year: number,
  month: number,
): Promise<Instance | null> {
  const db = getDb();
  const r = await db.execute(
    'SELECT * FROM instances WHERE entry_id = ? AND year = ? AND month = ? LIMIT 1;',
    [entryId, year, month],
  );
  const row = (r.rows as unknown as InstanceRow[])[0];
  return row ? rowToInstance(row) : null;
}

export async function upsertInstance(
  input: UpsertInstanceInput,
): Promise<Instance> {
  const db = getDb();
  const now = Date.now();
  const id = uuid();
  await db.execute(
    `INSERT INTO instances
       (id, entry_id, year, month, amount, date, status, is_estimate, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(entry_id, year, month) DO UPDATE SET
       amount = excluded.amount,
       date = excluded.date,
       status = excluded.status,
       is_estimate = excluded.is_estimate,
       updated_at = excluded.updated_at;`,
    [
      id,
      input.entryId,
      input.year,
      input.month,
      input.amount,
      input.date,
      input.status,
      input.isEstimate ? 1 : 0,
      now,
      now,
    ],
  );
  const saved = await getInstance(input.entryId, input.year, input.month);
  if (!saved) throw new Error('upsertInstance: row not found after upsert');
  return saved;
}

export async function deleteInstance(
  entryId: string,
  year: number,
  month: number,
): Promise<void> {
  const db = getDb();
  await db.execute(
    'DELETE FROM instances WHERE entry_id = ? AND year = ? AND month = ?;',
    [entryId, year, month],
  );
}

export async function listLastConfirmed(
  entryId: string,
  limit: number,
): Promise<Instance[]> {
  const db = getDb();
  const r = await db.execute(
    `SELECT * FROM instances
     WHERE entry_id = ? AND status = 'confirmed'
     ORDER BY year DESC, month DESC
     LIMIT ?;`,
    [entryId, limit],
  );
  return (r.rows as unknown as InstanceRow[]).map(rowToInstance);
}
