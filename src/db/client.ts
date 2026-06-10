import { open, type DB } from '@op-engineering/op-sqlite';
import { CURRENT_USER_VERSION, ENSURE_SCHEMA, MIGRATIONS } from './schema';

const DB_NAME = 'tally.db';

let dbInstance: DB | null = null;
let migrationsPromise: Promise<void> | null = null;

export function getDb(): DB {
  if (!dbInstance) {
    dbInstance = open({ name: DB_NAME });
    dbInstance.execute('PRAGMA foreign_keys = ON;');
    dbInstance.execute('PRAGMA journal_mode = WAL;');
    // So that ON DELETE CASCADE also fires the child tables' sync triggers
    // (otherwise cascade-deleted rows wouldn't leave a delete tombstone).
    dbInstance.execute('PRAGMA recursive_triggers = ON;');
  }
  return dbInstance;
}

async function readUserVersion(db: DB): Promise<number> {
  const r = await db.execute('PRAGMA user_version;');
  const row = r.rows[0] as Record<string, number> | undefined;
  return Number(row?.user_version ?? 0);
}

async function setUserVersion(db: DB, version: number): Promise<void> {
  await db.execute(`PRAGMA user_version = ${version};`);
}

export async function runMigrations(): Promise<void> {
  if (migrationsPromise) return migrationsPromise;
  migrationsPromise = (async () => {
    const db = getDb();
    let current = await readUserVersion(db);
    while (current < CURRENT_USER_VERSION) {
      const next = current + 1;
      const statements = MIGRATIONS[next];
      if (!statements) break;
      for (const sql of statements) {
        await db.execute(sql);
      }
      await setUserVersion(db, next);
      current = next;
    }
    // Idempotent safety net: guarantees the sync schema exists even if the
    // device's user_version is ahead of this code (see ENSURE_SCHEMA). No-op
    // once migrations have already created it.
    for (const sql of ENSURE_SCHEMA) {
      await db.execute(sql);
    }
  })();
  return migrationsPromise;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    migrationsPromise = null;
  }
}
