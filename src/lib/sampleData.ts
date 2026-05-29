import { createEntry, listEntries } from '@/db/queries/entries';
import { upsertInstance } from '@/db/queries/instances';
import { createLoan, listLoans } from '@/db/queries/loans';
import { bulkSeedLoanPayments } from '@/db/queries/loanPayments';
import { setMonthBalance } from '@/db/queries/monthlyBalances';
import { currentMonth, shiftMonth, isoForDayInMonth } from './date';
import { translate, type TranslationKey } from './i18n';
import { useLocaleStore } from '@/stores/locale';
import type { Entry } from '@/types';

/** True when there are no entries and no loans (fresh install). */
export async function isDataEmpty(): Promise<boolean> {
  const [entries, loans] = await Promise.all([
    listEntries({ activeOnly: false }),
    listLoans(false),
  ]);
  return entries.length === 0 && loans.length === 0;
}

/**
 * Populates the database with a realistic Turkish sample dataset so a
 * reviewer (or first-time user) immediately sees a populated app instead of
 * empty screens. No-op if data already exists.
 */
export async function seedSampleData(): Promise<void> {
  if (!(await isDataEmpty())) return;

  // Names are localized at seed time and stored as plain strings — they become
  // real user data, frozen in whichever language was active.
  const locale = useLocaleStore.getState().locale;
  const L = (key: TranslationKey) => translate(locale, key);

  const cm = currentMonth();
  const m1 = shiftMonth(cm.year, cm.month, -1);
  const m2 = shiftMonth(cm.year, cm.month, -2);
  const m3 = shiftMonth(cm.year, cm.month, -3);

  const confirm = async (
    entry: Entry,
    ym: { year: number; month: number },
    amount: number,
  ) => {
    await upsertInstance({
      entryId: entry.id,
      year: ym.year,
      month: ym.month,
      amount,
      date: isoForDayInMonth(ym.year, ym.month, entry.dayOfMonth),
      status: 'confirmed',
      isEstimate: false,
    });
  };

  const housing = L('sample.cat.housing');
  const bills = L('sample.cat.bills');

  // --- Income ---
  const salary = await createEntry({
    name: L('sample.salary'),
    direction: 'income',
    kind: 'fixed',
    amount: 52000,
    dayOfMonth: 1,
  });
  await confirm(salary, cm, 52000);

  const sideIncome = await createEntry({
    name: L('sample.sideIncome'),
    direction: 'income',
    kind: 'variable',
    amount: 4000,
    dayOfMonth: 28,
    category: L('sample.cat.freelance'),
  });
  await confirm(sideIncome, m1, 5000);

  // --- Fixed expenses ---
  const rent = await createEntry({
    name: L('sample.rent'),
    direction: 'expense',
    kind: 'fixed',
    amount: 19500,
    dayOfMonth: 5,
    category: housing,
  });
  await confirm(rent, cm, 19500);

  const dues = await createEntry({
    name: L('sample.dues'),
    direction: 'expense',
    kind: 'fixed',
    amount: 2800,
    dayOfMonth: 10,
    category: housing,
  });
  await confirm(dues, cm, 2800);

  const internet = await createEntry({
    name: L('sample.internet'),
    direction: 'expense',
    kind: 'fixed',
    amount: 420,
    dayOfMonth: 15,
    category: bills,
  });
  await confirm(internet, cm, 420);

  // --- Variable expenses with 3 months of confirmed history ---
  const electricity = await createEntry({
    name: L('sample.electricity'),
    direction: 'expense',
    kind: 'variable',
    amount: 575,
    dayOfMonth: 18,
    category: bills,
  });
  await confirm(electricity, m3, 540);
  await confirm(electricity, m2, 610);
  await confirm(electricity, m1, 575);

  const water = await createEntry({
    name: L('sample.water'),
    direction: 'expense',
    kind: 'variable',
    amount: 255,
    dayOfMonth: 20,
    category: bills,
  });
  await confirm(water, m3, 240);
  await confirm(water, m2, 265);
  await confirm(water, m1, 255);

  const gas = await createEntry({
    name: L('sample.gas'),
    direction: 'expense',
    kind: 'variable',
    amount: 620,
    dayOfMonth: 22,
    category: bills,
  });
  await confirm(gas, m3, 1200);
  await confirm(gas, m2, 980);
  await confirm(gas, m1, 620);

  const groceries = await createEntry({
    name: L('sample.groceries'),
    direction: 'expense',
    kind: 'variable',
    amount: 7000,
    dayOfMonth: 26,
    category: L('sample.cat.groceries'),
  });
  await confirm(groceries, m3, 6800);
  await confirm(groceries, m2, 7200);
  await confirm(groceries, m1, 7050);

  // --- Loans ---
  // Open-ended loan: shows the payoff simulator.
  await createLoan({
    name: L('sample.loan.personal'),
    balance: 78000,
    monthlyRate: 0.0425,
    monthlyPayment: 11000,
    dayOfMonth: 12,
    loanType: 'open',
    numInstallments: null,
    startYear: null,
    startMonth: null,
  });

  // Installment loan: 12 instalments, started 3 months ago, 3 already paid.
  const fridge = await createLoan({
    name: L('sample.loan.installment'),
    balance: 2750 * 12,
    monthlyRate: 0,
    monthlyPayment: 2750,
    dayOfMonth: 8,
    loanType: 'installment',
    numInstallments: 12,
    startYear: m3.year,
    startMonth: m3.month,
  });
  await bulkSeedLoanPayments(fridge.id, 3);

  // --- Starting balance for the current month ---
  await setMonthBalance(cm.year, cm.month, 41000);
}
