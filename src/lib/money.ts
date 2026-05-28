const formatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatTRY(amount: number): string {
  return formatter.format(Math.round(amount));
}

export function formatTRYSigned(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${formatter.format(rounded)}`;
}
