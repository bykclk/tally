import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import { useTheme } from './theme';
import { useT } from '@/lib/i18n';
import type { MonthlyItem } from '@/lib/monthlyItems';

export type DueState = 'overdue' | 'today' | 'upcoming';

type Props = {
  item: MonthlyItem;
  onPress?: () => void;
  /** Due flag for pending items (relative to today). Ignored when confirmed. */
  dueState?: DueState;
};

export function ListItem({ item, onPress, dueState }: Props) {
  const theme = useTheme();
  const t = useT();
  const isPending = item.status === 'pending';
  const isIncome = item.direction === 'income';

  const overdue = isPending && dueState === 'overdue';
  const dueToday = isPending && dueState === 'today';
  const accent = overdue
    ? theme.colors.expense
    : dueToday
      ? theme.colors.accent
      : null;

  const nameColor = isPending ? theme.colors.textMuted : theme.colors.text;
  const dayBg = accent
    ? accent + '18'
    : isPending
      ? theme.colors.surfaceMuted
      : theme.colors.surface;
  const dayBorder = accent ?? theme.colors.border;
  const dayColor = accent ?? nameColor;

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
            color: dayColor,
            fontSize: theme.font.size.sm,
            fontWeight: theme.font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.effectiveDay}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: theme.spacing(3) }}>
        <View style={styles.nameRow}>
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: nameColor,
              fontSize: theme.font.size.md,
              fontWeight: isPending
                ? theme.font.weight.regular
                : theme.font.weight.medium,
            }}
          >
            {item.name}
          </Text>
          {accent && (
            <View
              style={[
                styles.dueChip,
                { backgroundColor: accent + '22', borderRadius: theme.radius.sm },
              ]}
            >
              <Text
                style={{
                  color: accent,
                  fontSize: theme.font.size.xs,
                  fontWeight: theme.font.weight.semibold,
                }}
              >
                {overdue ? t('home.due.overdue') : t('home.due.today')}
              </Text>
            </View>
          )}
        </View>
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
        tone={isPending ? 'muted' : isIncome ? 'income' : 'expense'}
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
