export type Direction = 'income' | 'expense';
export type Kind = 'fixed' | 'variable';
export type Recurrence = 'monthly' | 'once';
export type InstanceStatus = 'confirmed' | 'pending';
export type Locale = 'tr' | 'en';
export type LocaleMode = Locale | 'system';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type Entry = {
  id: string;
  name: string;
  direction: Direction;
  kind: Kind;
  amount: number;
  dayOfMonth: number;
  category: string | null;
  recurrence: Recurrence;
  oneTimeYear: number | null;
  oneTimeMonth: number | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Instance = {
  id: string;
  entryId: string;
  year: number;
  month: number;
  amount: number;
  date: string;
  status: InstanceStatus;
  isEstimate: boolean;
  createdAt: number;
  updatedAt: number;
};

export type LoanType = 'open' | 'installment';

export type Loan = {
  id: string;
  name: string;
  balance: number;
  monthlyRate: number;
  monthlyPayment: number;
  dayOfMonth: number;
  loanType: LoanType;
  numInstallments: number | null;
  startYear: number | null;
  startMonth: number | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type LoanPayment = {
  id: string;
  loanId: string;
  year: number;
  month: number;
  paidAt: number;
  amount: number;
  principal: number;
  interest: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: number;
};
