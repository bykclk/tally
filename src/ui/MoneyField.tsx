import { TextField } from './TextField';
import { useCurrency, currencySymbol } from '@/lib/money';
import { formatMoneyInput } from '@/lib/moneyInput';

type Props = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  autoFocus?: boolean;
  error?: string | null;
};

export function MoneyField({
  label,
  value,
  onChangeText,
  placeholder = '0',
  prefix,
  autoFocus,
  error,
}: Props) {
  const currency = useCurrency();
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(raw) => onChangeText(formatMoneyInput(raw))}
      placeholder={placeholder}
      prefix={prefix ?? currencySymbol(currency)}
      keyboardType="decimal-pad"
      autoFocus={autoFocus}
      error={error}
    />
  );
}
