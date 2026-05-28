import { getDb } from '../client';

type PrefRow = { key: string; value: string };

export async function getPref(key: string): Promise<string | null> {
  const db = getDb();
  const r = await db.execute('SELECT value FROM prefs WHERE key = ? LIMIT 1;', [
    key,
  ]);
  const row = (r.rows as unknown as PrefRow[])[0];
  return row ? row.value : null;
}

export async function setPref(key: string, value: string): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db.execute(
    `INSERT INTO prefs (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at;`,
    [key, value, now],
  );
}
