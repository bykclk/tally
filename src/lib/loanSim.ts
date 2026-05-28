const MAX_MONTHS = 1200;

export type SimSuccess = {
  ok: true;
  months: number;
  totalInterest: number;
  schedule: number[];
};

export type SimFailure = {
  ok: false;
  reason: 'invalid_input' | 'insufficient_payment';
};

export type SimResult = SimSuccess | SimFailure;

export function simulatePayoff(
  balance: number,
  monthlyRate: number,
  payment: number,
): SimResult {
  if (!Number.isFinite(balance) || balance <= 0) {
    return { ok: false, reason: 'invalid_input' };
  }
  if (!Number.isFinite(payment) || payment <= 0) {
    return { ok: false, reason: 'invalid_input' };
  }
  if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
    return { ok: false, reason: 'invalid_input' };
  }

  const schedule: number[] = [balance];
  let bal = balance;
  let totalInterest = 0;
  let months = 0;

  while (bal > 0 && months < MAX_MONTHS) {
    const interest = bal * monthlyRate;
    const due = bal + interest;

    if (payment >= due) {
      totalInterest += interest;
      months += 1;
      schedule.push(0);
      return { ok: true, months, totalInterest, schedule };
    }

    const principal = payment - interest;
    if (principal <= 0) {
      return { ok: false, reason: 'insufficient_payment' };
    }

    bal -= principal;
    totalInterest += interest;
    months += 1;
    schedule.push(bal);
  }

  return { ok: false, reason: 'insufficient_payment' };
}
