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
