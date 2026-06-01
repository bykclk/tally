import { getDb } from '../client';
import { uuid } from '@/lib/uuid';
import type { Entry, Direction, Kind, Recurrence } from '@/types';

export type CreateEntryInput = {
  name: string;
  direction: Direction;
  kind: Kind;
  amount: number;
  dayOfMonth: number;
  category?: string | null;
  recurrence?: Recurrence;
  oneTimeYear?: number | null;
  oneTimeMonth?: number | null;
};

type EntryRow = {
  id: string;
  name: string;
  direction: Direction;
  kind: Kind;
  amount: number;
  day_of_month: number;
  category: string | null;
  recurrence: Recurrence;
  one_time_year: number | null;
  one_time_month: number | null;
  active: number;
  created_at: number;
  updated_at: number;
};

function rowToEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    name: r.name,
    direction: r.direction,
    kind: r.kind,
    amount: r.amount,
    dayOfMonth: r.day_of_month,
    category: r.category,
    recurrence: r.recurrence,
    oneTimeYear: r.one_time_year,
    oneTimeMonth: r.one_time_month,
    active: r.active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listEntries(opts?: {
  direction?: Direction;
  activeOnly?: boolean;
}): Promise<Entry[]> {
  const db = getDb();
  const conds: string[] = [];
  const params: (string | number)[] = [];
  if (opts?.direction) {
    conds.push('direction = ?');
    params.push(opts.direction);
  }
  if (opts?.activeOnly ?? true) {
    conds.push('active = 1');
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const r = await db.execute(
    `SELECT * FROM entries ${where} ORDER BY day_of_month ASC, name ASC;`,
    params,
  );
  return (r.rows as unknown as EntryRow[]).map(rowToEntry);
}

export async function getEntry(id: string): Promise<Entry | null> {
  const db = getDb();
  const r = await db.execute('SELECT * FROM entries WHERE id = ? LIMIT 1;', [id]);
  const row = (r.rows as unknown as EntryRow[])[0];
  return row ? rowToEntry(row) : null;
}

export async function updateEntry(
  id: string,
  patch: Partial<CreateEntryInput>,
): Promise<Entry> {
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(patch.name.trim());
  }
  if (patch.direction !== undefined) {
    sets.push('direction = ?');
    params.push(patch.direction);
  }
  if (patch.kind !== undefined) {
    sets.push('kind = ?');
    params.push(patch.kind);
  }
  if (patch.amount !== undefined) {
    sets.push('amount = ?');
    params.push(patch.amount);
  }
  if (patch.dayOfMonth !== undefined) {
    sets.push('day_of_month = ?');
    params.push(patch.dayOfMonth);
  }
  if (patch.category !== undefined) {
    const cat = patch.category?.trim() ? patch.category.trim() : null;
    sets.push('category = ?');
    params.push(cat);
  }
  if (patch.recurrence !== undefined) {
    sets.push('recurrence = ?');
    params.push(patch.recurrence);
  }
  if (patch.oneTimeYear !== undefined) {
    sets.push('one_time_year = ?');
    params.push(patch.oneTimeYear);
  }
  if (patch.oneTimeMonth !== undefined) {
    sets.push('one_time_month = ?');
    params.push(patch.oneTimeMonth);
  }
  if (sets.length > 0) {
    const now = Date.now();
    sets.push('updated_at = ?');
    params.push(now);
    params.push(id);
    await db.execute(
      `UPDATE entries SET ${sets.join(', ')} WHERE id = ?;`,
      params,
    );
  }
  const updated = await getEntry(id);
  if (!updated) throw new Error('updateEntry: not found');
  return updated;
}

export async function deleteEntry(id: string): Promise<void> {
  const db = getDb();
  await db.execute('DELETE FROM entries WHERE id = ?;', [id]);
}

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  const db = getDb();
  const id = uuid();
  const now = Date.now();
  const category = input.category?.trim() ? input.category.trim() : null;
  const recurrence: Recurrence = input.recurrence ?? 'monthly';
  const oneTimeYear = recurrence === 'once' ? (input.oneTimeYear ?? null) : null;
  const oneTimeMonth = recurrence === 'once' ? (input.oneTimeMonth ?? null) : null;
  await db.execute(
    `INSERT INTO entries
      (id, name, direction, kind, amount, day_of_month, category,
       recurrence, one_time_year, one_time_month, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
    [
      id,
      input.name.trim(),
      input.direction,
      input.kind,
      input.amount,
      input.dayOfMonth,
      category,
      recurrence,
      oneTimeYear,
      oneTimeMonth,
      now,
      now,
    ],
  );
  const created = await getEntry(id);
  if (!created) throw new Error('createEntry: row not found after insert');
  return created;
}
