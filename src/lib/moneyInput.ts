/**
 * Formats a TextInput value for Turkish-style money entry:
 *  - thousand separator: "." (dot)
 *  - decimal separator: "," (comma)
 *  - max 2 decimal digits
 *
 * Accepts both "," and "." as decimal candidates so users on Android — where
 * the numeric keypad may only offer "." regardless of system locale — can
 * still enter decimals. Detection rules:
 *  - If the raw input contains a ",", it's treated as the decimal separator
 *    (Turkish convention). Everything before it is integer (with stray
 *    separators stripped as thousand seps).
 *  - Else if there is exactly one "." trailing 1–2 digits, that "." is the
 *    decimal. (A single "." followed by 3+ digits is read as a thousand
 *    separator instead, which is the common Turkish reading.)
 *  - Else every "." is a thousand separator and gets stripped.
 */
export function formatMoneyInput(raw: string): string {
  if (!raw) return '';

  // Keep only digits and separators
  const s = raw.replace(/[^\d.,]/g, '');
  if (!s) return '';

  let intRaw: string;
  let decPart: string | null = null;

  const commaIdx = s.indexOf(',');
  if (commaIdx !== -1) {
    // Explicit Turkish decimal: comma is the decimal point.
    intRaw = s.slice(0, commaIdx).replace(/[.,]/g, '');
    decPart = s.slice(commaIdx + 1).replace(/[.,]/g, '').slice(0, 2);
  } else {
    const lastDot = s.lastIndexOf('.');
    if (lastDot !== -1) {
      const afterDot = s.slice(lastDot + 1);
      if (/^\d{1,2}$/.test(afterDot)) {
        // Single "." with 1–2 trailing digits → decimal.
        intRaw = s.slice(0, lastDot).replace(/\./g, '');
        decPart = afterDot;
      } else {
        // Treat every "." as thousand separator.
        intRaw = s.replace(/\./g, '');
      }
    } else {
      intRaw = s;
    }
  }

  // Strip leading zeros, but preserve a single "0" when meaningful.
  let intDigits = intRaw.replace(/^0+/, '');
  if (intDigits === '' && (decPart !== null || intRaw === '0')) {
    intDigits = '0';
  }

  const formattedInt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return decPart !== null ? `${formattedInt},${decPart}` : formattedInt;
}

/**
 * Convenience: format a numeric value as a money-input string (used for
 * pre-filling forms in edit mode).
 */
export function moneyValueToInput(n: number): string {
  return formatMoneyInput(String(Math.round(n)));
}
