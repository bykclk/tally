import { getDb } from '../client';

export type SyncOp = 'upsert' | 'delete';

/** One coalesced local change awaiting upload to the cloud. */
export type PendingChange = {
  tableName: string;
  recordId: string;
  op: SyncOp;
  changedAt: number;
};

type Row = {
  table_name: string;
  record_id: string;
  op: SyncOp;
  changed_at: number;
};

/**
 * Local changes the future sync engine still needs to push, oldest first.
 * Maintained automatically by SQLite triggers (see SYNC_SCHEMA); nothing reads
 * this in Phase 1 — it just accumulates the groundwork the CloudKit layer
 * (Phase 2) will consume.
 */
export async function listPendingChanges(): Promise<PendingChange[]> {
  const db = getDb();
  const r = await db.execute(
    `SELECT table_name, record_id, op, changed_at
       FROM sync_pending
      ORDER BY changed_at ASC;`,
  );
  return (r.rows as unknown as Row[]).map((x) => ({
    tableName: x.table_name,
    recordId: x.record_id,
    op: x.op,
    changedAt: x.changed_at,
  }));
}

/** How many records have un-pushed local changes. */
export async function countPendingChanges(): Promise<number> {
  const db = getDb();
  const r = await db.execute('SELECT COUNT(*) AS n FROM sync_pending;');
  const row = r.rows[0] as { n: number } | undefined;
  return Number(row?.n ?? 0);
}

/** Drop a pending entry once its change has been confirmed uploaded. */
export async function clearPendingChange(
  tableName: string,
  recordId: string,
): Promise<void> {
  const db = getDb();
  await db.execute(
    'DELETE FROM sync_pending WHERE table_name = ? AND record_id = ?;',
    [tableName, recordId],
  );
}
