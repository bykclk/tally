import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '@/ui/Card';
import { MoneyText } from '@/ui/MoneyText';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { monthLabel } from '@/lib/date';
import { buildMonthlyItems, type MonthlyItem } from '@/lib/monthlyItems';
import { expenseBreakdown, type Breakdown } from '@/lib/breakdown';
import { useMonthStore } from '@/stores/month';

export default function BreakdownScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const initial = useMonthStore.getState();
  const [year] = useState(initial.year);
  const [month] = useState(initial.month);

  const [items, setItems] = useState<MonthlyItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await buildMonthlyItems(year, month);
      if (!cancelled) setItems(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const breakdown = useMemo<Breakdown | null>(() => {
    if (!items) return null;
    return expenseBreakdown(items, {
      loanLabel: t('breakdown.loan'),
      uncategorizedLabel: t('breakdown.uncategorized'),
    });
  }, [items, t]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Stack.Screen
        options={{
          title: t('breakdown.title'),
          headerLeft: () => (
            <Text
              onPress={() => router.back()}
              style={{
                color: theme.colors.accent,
                fontSize: theme.font.size.md,
                fontWeight: theme.font.weight.semibold,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              {t('common.done')}
            </Text>
          ),
        }}
      />

      {!breakdown ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing(4),
            gap: theme.spacing(4),
          }}
        >
          <Card style={{ gap: theme.spacing(1) }}>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.xs,
                textTransform: 'capitalize',
              }}
            >
              {monthLabel(year, month, locale)} · {t('breakdown.totalExpense')}
            </Text>
            <MoneyText amount={breakdown.total} size="xl" bold tone="expense" />
          </Card>

          {breakdown.rows.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: theme.spacing(10) }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.sm,
                  textAlign: 'center',
                }}
              >
                {t('breakdown.empty')}
              </Text>
            </Card>
          ) : (
            <Card style={{ gap: theme.spacing(4) }}>
              {breakdown.rows.map((row) => (
                <Row key={row.category} row={row} theme={theme} />
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Row({
  row,
  theme,
}: {
  row: Breakdown['rows'][number];
  theme: Theme;
}) {
  const pctText = `%${Math.round(row.pct * 100)}`;
  return (
    <View style={{ gap: theme.spacing(2) }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.md,
            fontWeight: theme.font.weight.medium,
            flex: 1,
            marginRight: theme.spacing(3),
          }}
        >
          {row.category}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
            marginRight: theme.spacing(2),
            fontVariant: ['tabular-nums'],
          }}
        >
          {pctText}
        </Text>
        <MoneyText amount={row.amount} size="md" />
      </View>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.colors.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 6,
            width: `${Math.max(2, row.pct * 100)}%`,
            borderRadius: 3,
            backgroundColor: theme.colors.accent,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
