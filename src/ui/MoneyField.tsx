import { Platform } from 'react-native';
import { TextField } from './TextField';
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
  prefix = '₺',
  autoFocus,
  error,
}: Props) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(raw) => onChangeText(formatMoneyInput(raw))}
      placeholder={placeholder}
      prefix={prefix}
      keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
      autoFocus={autoFocus}
      error={error}
    />
  );
}
