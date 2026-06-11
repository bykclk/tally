import { getDb } from '@/db/client';
import { getPref, setPref } from '@/db/queries/prefs';
import { setApplyingRemote } from '@/db/queries/sync';
import { bumpRefresh } from '@/stores/refresh';
import { pullFromCloud } from './icloud';
import {
  TABLE_BY_RECORD_TYPE,
  COMPOSITE_KEY_TABLES,
  TIMESTAMP_COLUMN,
  type SyncTable,
} from './mapping';

const TOKEN_PREF = 'sync.zoneToken';

export type PullSummary = { applied: number; deleted: number; skipped: number };

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

async function localTimestamp(
  tx: Tx,
  table: SyncTable,
  recordName: string,
): Promise<number | null> {
  const tsCol = TIMESTAMP_COLUMN[table];
  let r;
  if (COMPOSITE_KEY_TABLES.has(table)) {
    const [year, month] = recordName.split('-').map(Number);
    r = await tx.execute(
      `SELECT ${tsCol} AS ts FROM ${table} WHERE year = ? AND month = ?;`,
      [year, month],
    );
  } else {
    r = await tx.execute(`SELECT ${tsCol} AS ts FROM ${table} WHERE id = ?;`, [
      recordName,
    ]);
  }
  const row = r.rows[0] as { ts: number } | undefined;
  return row ? Number(row.ts) : null;
}

async function hasPendingUpsert(
  tx: Tx,
  table: SyncTable,
  recordName: string,
): Promise<boolean> {
  const r = await tx.execute(
    `SELECT op FROM sync_pending WHERE table_name = ? AND record_id = ?;`,
    [table, recordName],
  );
  const row = r.rows[0] as { op: string } | undefined;
  return row?.op === 'upsert';
}

/**
 * Pull remote zone changes and apply them locally with record-level
 * last-writer-wins: an incoming row older than the local one is skipped (the
 * newer local version is still pending and will win on the next push), and a
 * remote deletion is skipped when a local edit is pending for that record.
 * Wrapped in setApplyingRemote so the sync triggers don't re-queue the
 * incoming rows for push, and in a deferred-FK transaction so parent/child
 * rows (e.g. an entry and its instances) can arrive in any order.
 */
export async function applyRemoteChanges(): Promise<PullSummary> {
  const token = (await getPref(TOKEN_PREF)) ?? null;
  const result = await pullFromCloud(token);
  const db = getDb();

  let applied = 0;
  let deleted = 0;
  let skipped = 0;

  await setApplyingRemote(true);
  try {
    await db.transaction(async (tx) => {
      await tx.execute('PRAGMA defer_foreign_keys = ON;');

      for (const change of result.changes) {
        const table = TABLE_BY_RECORD_TYPE[change.recordType];
        if (!table) continue;
        const cols = Object.keys(change.fields);
        if (cols.length === 0) continue;

        // LWW: keep the local row when it's strictly newer than the incoming
        // one — its pending change will overwrite the cloud on the next push.
        const remoteTs = Number(change.fields[TIMESTAMP_COLUMN[table]] ?? 0);
        const localTs = await localTimestamp(tx, table, change.recordName);
        if (localTs !== null && localTs > remoteTs) {
          skipped += 1;
          continue;
        }

        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map((c) => change.fields[c] ?? null);
        await tx.execute(
          `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders});`,
          values as (string | number | null)[],
        );
        // The incoming version is current — drop any stale pending change.
        await tx.execute(
          'DELETE FROM sync_pending WHERE table_name = ? AND record_id = ?;',
          [table, change.recordName],
        );
        applied += 1;
      }

      for (const del of result.deletions) {
        const table = TABLE_BY_RECORD_TYPE[del.recordType];
        if (!table) continue;
        // LWW for deletions: a pending local edit outlives a remote delete —
        // the next push re-creates the record in the cloud.
        if (await hasPendingUpsert(tx, table, del.recordName)) {
          skipped += 1;
          continue;
        }
        if (COMPOSITE_KEY_TABLES.has(table)) {
          const [year, month] = del.recordName.split('-').map(Number);
          await tx.execute(
            `DELETE FROM ${table} WHERE year = ? AND month = ?;`,
            [year, month],
          );
        } else {
          await tx.execute(`DELETE FROM ${table} WHERE id = ?;`, [del.recordName]);
        }
        deleted += 1;
      }
    });
  } finally {
    await setApplyingRemote(false);
  }

  // Advance the change token only after a successful apply.
  if (result.token) {
    await setPref(TOKEN_PREF, result.token);
  }
  if (applied > 0 || deleted > 0) {
    bumpRefresh();
  }
  return { applied, deleted, skipped };
}
