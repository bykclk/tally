import { getDb } from '@/db/client';
import { getPref, setPref } from '@/db/queries/prefs';
import { setApplyingRemote } from '@/db/queries/sync';
import { bumpRefresh } from '@/stores/refresh';
import { pullFromCloud } from './icloud';
import { TABLE_BY_RECORD_TYPE, COMPOSITE_KEY_TABLES } from './mapping';

const TOKEN_PREF = 'sync.zoneToken';

export type PullSummary = { applied: number; deleted: number };

/**
 * Pull remote zone changes and apply them locally. Wrapped in
 * setApplyingRemote so the sync triggers don't re-queue the incoming rows for
 * push, and in a deferred-FK transaction so parent/child rows (e.g. an entry
 * and its instances) can arrive in any order within the batch.
 */
export async function applyRemoteChanges(): Promise<PullSummary> {
  const token = (await getPref(TOKEN_PREF)) ?? null;
  const result = await pullFromCloud(token);
  const db = getDb();

  await setApplyingRemote(true);
  try {
    await db.transaction(async (tx) => {
      await tx.execute('PRAGMA defer_foreign_keys = ON;');

      for (const change of result.changes) {
        const table = TABLE_BY_RECORD_TYPE[change.recordType];
        if (!table) continue;
        const cols = Object.keys(change.fields);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map((c) => change.fields[c] ?? null);
        await tx.execute(
          `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders});`,
          values as (string | number | null)[],
        );
        // Remote wins: discard any local pending change for this record.
        await tx.execute(
          'DELETE FROM sync_pending WHERE table_name = ? AND record_id = ?;',
          [table, change.recordName],
        );
      }

      for (const del of result.deletions) {
        const table = TABLE_BY_RECORD_TYPE[del.recordType];
        if (!table) continue;
        if (COMPOSITE_KEY_TABLES.has(table)) {
          const [year, month] = del.recordName.split('-').map(Number);
          await tx.execute(
            `DELETE FROM ${table} WHERE year = ? AND month = ?;`,
            [year, month],
          );
        } else {
          await tx.execute(`DELETE FROM ${table} WHERE id = ?;`, [del.recordName]);
        }
      }
    });
  } finally {
    await setApplyingRemote(false);
  }

  // Advance the change token only after a successful apply.
  if (result.token) {
    await setPref(TOKEN_PREF, result.token);
  }
  if (result.changes.length > 0 || result.deletions.length > 0) {
    bumpRefresh();
  }
  return { applied: result.changes.length, deleted: result.deletions.length };
}
