export const CURRENT_USER_VERSION = 7;

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
};
