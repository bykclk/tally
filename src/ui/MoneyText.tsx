import { Text, type TextStyle } from 'react-native';
import { useFormatMoney } from '@/lib/money';
import { useTheme } from './theme';

type Tone = 'default' | 'muted' | 'income' | 'expense';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

type Props = {
  amount: number;
  tone?: Tone;
  size?: Size;
  bold?: boolean;
  style?: TextStyle;
};

export function MoneyText({
  amount,
  tone = 'default',
  size = 'md',
  bold = false,
  style,
}: Props) {
  const theme = useTheme();
  const formatMoney = useFormatMoney();

  const color =
    tone === 'muted'
      ? theme.colors.textMuted
      : tone === 'income'
        ? theme.colors.income
        : tone === 'expense'
          ? theme.colors.expense
          : theme.colors.text;

  return (
    <Text
      style={[
        {
          color,
          fontSize: theme.font.size[size],
          fontWeight: bold
            ? theme.font.weight.bold
            : theme.font.weight.regular,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {formatMoney(amount)}
    </Text>
  );
}
