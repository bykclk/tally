import { getDb } from '../client';

/**
 * Wipes all user-entered financial data (entries, their monthly instances,
 * loans, loan payments, and monthly starting balances) in a single
 * transaction. Preferences (locale, theme, currency, notifications,
 * onboarding) in the `prefs` table are intentionally kept — this resets
 * your data, not your settings. Irreversible; there is no backup.
 */
export async function resetAllData(): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    // Children first (FKs cascade anyway, but explicit is clearer).
    await tx.execute('DELETE FROM loan_payments;');
    await tx.execute('DELETE FROM instances;');
    await tx.execute('DELETE FROM loans;');
    await tx.execute('DELETE FROM entries;');
    await tx.execute('DELETE FROM monthly_balances;');
  });
}
