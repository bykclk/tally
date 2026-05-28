import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import { useTheme } from './theme';
import { useT } from '@/lib/i18n';
import type { MonthlyItem } from '@/lib/monthlyItems';

type Props = {
  item: MonthlyItem;
  onPress?: () => void;
};

export function ListItem({ item, onPress }: Props) {
  const theme = useTheme();
  const t = useT();
  const isPending = item.status === 'pending';
  const isIncome = item.direction === 'income';

  const nameColor = isPending ? theme.colors.textMuted : theme.colors.text;
  const dayBg = isPending ? theme.colors.surfaceMuted : theme.colors.surface;
  const dayBorder = theme.colors.border;

  const subtitle =
    item.source.kind === 'loan'
      ? t('home.tag.loan')
      : item.source.entry.category;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
          opacity: pressed && onPress ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.dayBadge,
          {
            backgroundColor: dayBg,
            borderColor: dayBorder,
            borderRadius: theme.radius.sm,
          },
        ]}
      >
        <Text
          style={{
            color: nameColor,
            fontSize: theme.font.size.sm,
            fontWeight: theme.font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.effectiveDay}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: theme.spacing(3) }}>
        <Text
          numberOfLines={1}
          style={{
            color: nameColor,
            fontSize: theme.font.size.md,
            fontWeight: isPending
              ? theme.font.weight.regular
              : theme.font.weight.medium,
          }}
        >
          {item.name}
        </Text>
        {subtitle && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.xs,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <MoneyText
        amount={isIncome ? item.effectiveAmount : -item.effectiveAmount}
        size="md"
        bold={!isPending}
        tone={
          isPending
            ? 'muted'
            : isIncome
              ? 'income'
              : 'expense'
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
