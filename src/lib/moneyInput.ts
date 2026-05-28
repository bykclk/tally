/**
 * Formats a TextInput value for Turkish money entry:
 *  - thousand separator: "." (dot)
 *  - decimal separator: "," (comma)
 *  - max 2 decimal digits
 *
 * Caller stores the formatted string in state and uses it both as `value` and
 * (after running through `parseAmount`) as the numeric source of truth.
 *
 * Note: all "." in the raw input are treated as thousand separators (or
 * leftovers from a previous format pass) and stripped. The "," is the only
 * decimal separator. On Android numeric keypads this means users may not be
 * able to type a decimal — accepted trade-off; TRY amounts are typically whole.
 */
export function formatMoneyInput(raw: string): string {
  if (!raw) return '';

  // Keep only digits and commas; drop spaces, currency symbols, dots, etc.
  let s = raw.replace(/[^\d,]/g, '');

  // Keep only the first comma; treat any later commas as stray.
  const firstComma = s.indexOf(',');
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, '');
  }

  if (s === '') return '';
  if (s === ',') return '0,';

  const hasComma = s.includes(',');
  const [intRaw, decRaw = ''] = s.split(',');

  // Strip leading zeros from integer, but preserve a single "0".
  let intDigits = intRaw.replace(/^0+/, '');
  if (intDigits === '' && intRaw === '0') intDigits = '0';
  if (intDigits === '' && hasComma) intDigits = '0';

  // Cap decimals at 2 digits.
  const decDigits = decRaw.slice(0, 2);

  // Insert "." every three digits from the right.
  const formattedInt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return hasComma ? `${formattedInt},${decDigits}` : formattedInt;
}

/**
 * Convenience: format a numeric value as a money-input string (used for
 * pre-filling forms in edit mode).
 */
export function moneyValueToInput(n: number): string {
  return formatMoneyInput(String(Math.round(n)));
}
