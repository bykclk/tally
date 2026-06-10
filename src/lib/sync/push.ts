import { getDb } from '@/db/client';
import { listPendingChanges, clearPendingChange } from '@/db/queries/sync';
import { pushToCloud, type CloudRecord } from './icloud';

// Local table → CloudKit record type. Only these tables sync (prefs are
// device-local). Record name = the row's stable id (UUID, or `year-month`
// for monthly_balances), which is unique across tables.
const RECORD_TYPE: Record<string, string> = {
  entries: 'Entry',
  instances: 'Instance',
  loans: 'Loan',
  loan_payments: 'LoanPayment',
  monthly_balances: 'MonthlyBalance',
};

type Row = Record<string, unknown>;

async function fetchRow(table: string, recordId: string): Promise<Row | null> {
  const db = getDb();
  if (table === 'monthly_balances') {
    const [year, month] = recordId.split('-').map(Number);
    const r = await db.execute(
      'SELECT * FROM monthly_balances WHERE year = ? AND month = ?;',
      [year, month],
    );
    return (r.rows[0] as Row | undefined) ?? null;
  }
  // `table` is restricted to RECORD_TYPE keys, so it's safe to interpolate.
  const r = await db.execute(`SELECT * FROM ${table} WHERE id = ?;`, [recordId]);
  return (r.rows[0] as Row | undefined) ?? null;
}

export type PushSummary = { saved: number; deleted: number; skipped: number };

/**
 * Upload every pending local change to CloudKit, then clear the ones that were
 * sent. Phase 2b is one-way (push only); pull + conflict handling come later.
 */
export async function pushPendingChanges(): Promise<PushSummary> {
  const pending = await listPendingChanges();

  const upserts: CloudRecord[] = [];
  const deletes: string[] = [];
  const cleared: { table: string; id: string }[] = [];
  let skipped = 0;

  for (const change of pending) {
    const recordType = RECORD_TYPE[change.tableName];
    if (!recordType) {
      skipped += 1;
      continue;
    }
    if (change.op === 'delete') {
      deletes.push(change.recordId);
      cleared.push({ table: change.tableName, id: change.recordId });
      continue;
    }
    const row = await fetchRow(change.tableName, change.recordId);
    if (!row) {
      // Upsert pending but the row is gone — a later delete will reconcile it.
      skipped += 1;
      continue;
    }
    upserts.push({ recordType, recordName: change.recordId, fields: row });
    cleared.push({ table: change.tableName, id: change.recordId });
  }

  if (upserts.length === 0 && deletes.length === 0) {
    return { saved: 0, deleted: 0, skipped };
  }

  const result = await pushToCloud(upserts, deletes);

  // Only clear what we actually attempted to send (push resolved = success).
  for (const c of cleared) {
    await clearPendingChange(c.table, c.id);
  }

  return { saved: result.saved, deleted: result.deleted, skipped };
}
