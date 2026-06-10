export const CURRENT_USER_VERSION = 8;

// ── iCloud-sync groundwork (Phase 1, pure-local) ────────────────────────────
// A change log the eventual sync engine reads to know what to push. SQLite
// triggers keep it current automatically — no query function changes — and a
// delete leaves a `op='delete'` tombstone so removals propagate too. Coalesced
// to one pending row per record (PK = table+record_id). Device-local `prefs`
// are intentionally NOT tracked. Every statement is idempotent (IF NOT EXISTS)
// so this list doubles as migration 8 AND a startup "ensure" (ENSURE_SCHEMA)
// that heals a DB whose user_version drifted ahead of this code.
const SYNCABLE_TABLES: { table: string; key: string | null }[] = [
  { table: 'entries', key: 'id' },
  { table: 'instances', key: 'id' },
  { table: 'loans', key: 'id' },
  { table: 'loan_payments', key: 'id' },
  { table: 'monthly_balances', key: null }, // composite key (year, month)
];

// Epoch milliseconds, matching the app's Date.now()-based timestamps.
const NOW_MS = `CAST((julianday('now') - 2440587.5) * 86400000.0 AS INTEGER)`;

function recordIdExpr(ref: 'NEW' | 'OLD', key: string | null): string {
  return key ? `${ref}.${key}` : `${ref}.year || '-' || ${ref}.month`;
}

function syncTriggers({
  table,
  key,
}: {
  table: string;
  key: string | null;
}): string[] {
  const mark = (idExpr: string, op: 'upsert' | 'delete') =>
    `INSERT INTO sync_pending (table_name, record_id, op, changed_at)
       VALUES ('${table}', ${idExpr}, '${op}', ${NOW_MS})
       ON CONFLICT (table_name, record_id)
       DO UPDATE SET op = excluded.op, changed_at = excluded.changed_at;`;
  return [
    `CREATE TRIGGER IF NOT EXISTS trg_sync_${table}_ai AFTER INSERT ON ${table}
       BEGIN ${mark(recordIdExpr('NEW', key), 'upsert')} END;`,
    `CREATE TRIGGER IF NOT EXISTS trg_sync_${table}_au AFTER UPDATE ON ${table}
       BEGIN ${mark(recordIdExpr('NEW', key), 'upsert')} END;`,
    `CREATE TRIGGER IF NOT EXISTS trg_sync_${table}_ad AFTER DELETE ON ${table}
       BEGIN ${mark(recordIdExpr('OLD', key), 'delete')} END;`,
  ];
}

const SYNC_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS sync_pending (
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    op TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
    changed_at INTEGER NOT NULL,
    PRIMARY KEY (table_name, record_id)
  );`,
  ...SYNCABLE_TABLES.flatMap(syncTriggers),
];

/**
 * Idempotent statements run at every startup *after* migrations, so the sync
 * schema exists even when the device's `user_version` is ahead of this code
 * (e.g. after switching off a higher-version branch). A harmless no-op in
 * production, where the migration already created everything.
 */
export const ENSURE_SCHEMA: string[] = SYNC_SCHEMA;

export const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('income', 'expense')),
      kind TEXT NOT NULL CHECK (kind IN ('fixed', 'variable')),
      amount REAL NOT NULL DEFAULT 0,
      day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
      category TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY NOT NULL,
      entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('confirmed', 'pending')),
      is_estimate INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_instances_entry_month
      ON instances (entry_id, year, month);`,
    `CREATE INDEX IF NOT EXISTS idx_instances_year_month
      ON instances (year, month);`,
    `CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL,
      monthly_rate REAL NOT NULL,
      monthly_payment REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  ],
  2: [
    `CREATE TABLE IF NOT EXISTS loan_payments (
      id TEXT PRIMARY KEY NOT NULL,
      loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      paid_at INTEGER NOT NULL,
      amount REAL NOT NULL,
      principal REAL NOT NULL,
      interest REAL NOT NULL,
      balance_before REAL NOT NULL,
      balance_after REAL NOT NULL,
      created_at INTEGER NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_payments_loan_month
      ON loan_payments (loan_id, year, month);`,
    `CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_paid_at
      ON loan_payments (loan_id, paid_at DESC);`,
  ],
  3: [
    `ALTER TABLE loans ADD COLUMN day_of_month INTEGER NOT NULL DEFAULT 1;`,
  ],
  4: [
    `ALTER TABLE loans ADD COLUMN loan_type TEXT NOT NULL DEFAULT 'open';`,
    `ALTER TABLE loans ADD COLUMN num_installments INTEGER;`,
    `ALTER TABLE loans ADD COLUMN start_year INTEGER;`,
    `ALTER TABLE loans ADD COLUMN start_month INTEGER;`,
  ],
  5: [
    `CREATE TABLE IF NOT EXISTS prefs (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  ],
  6: [
    `CREATE TABLE IF NOT EXISTS monthly_balances (
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      starting_balance REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (year, month)
    );`,
  ],
  7: [
    `ALTER TABLE entries ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'monthly';`,
    `ALTER TABLE entries ADD COLUMN one_time_year INTEGER;`,
    `ALTER TABLE entries ADD COLUMN one_time_month INTEGER;`,
  ],
  8: SYNC_SCHEMA,
};
