export type SyncTable =
  | 'entries'
  | 'instances'
  | 'loans'
  | 'loan_payments'
  | 'monthly_balances';

/** Local table → CloudKit record type. Only these tables sync. */
export const RECORD_TYPE: Record<SyncTable, string> = {
  entries: 'Entry',
  instances: 'Instance',
  loans: 'Loan',
  loan_payments: 'LoanPayment',
  monthly_balances: 'MonthlyBalance',
};

/** CloudKit record type → local table. */
export const TABLE_BY_RECORD_TYPE = Object.fromEntries(
  Object.entries(RECORD_TYPE).map(([table, type]) => [type, table as SyncTable]),
) as Record<string, SyncTable>;

/** Tables keyed by (year, month) instead of a UUID `id`; their record name is
 * `${year}-${month}`. */
export const COMPOSITE_KEY_TABLES = new Set<SyncTable>(['monthly_balances']);

/** Column used for last-writer-wins comparison. loan_payments rows are
 * immutable (created/deleted, never updated), so created_at stands in. */
export const TIMESTAMP_COLUMN: Record<SyncTable, string> = {
  entries: 'updated_at',
  instances: 'updated_at',
  loans: 'updated_at',
  loan_payments: 'created_at',
  monthly_balances: 'updated_at',
};
