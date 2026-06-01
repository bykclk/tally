import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/ui/Card';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { ListItem } from '@/ui/ListItem';
import { MoneyText } from '@/ui/MoneyText';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { currentMonth, monthLabel } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useMonthStore } from '@/stores/month';
import {
  buildMonthlyItems,
  totalsFromItems,
  type MonthlyItem,
} from '@/lib/monthlyItems';
import { resolveStartingBalance } from '@/lib/monthlyBalance';

export default function HomeScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { year, month, next, prev, reset } = useMonthStore();
  const cm = currentMonth();
  const isCurrentMonth = year === cm.year && month === cm.month;
  const [items, setItems] = useState<MonthlyItem[]>([]);
  const [startingBalance, setStartingBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [nextItems, start] = await Promise.all([
          buildMonthlyItems(year, month),
          resolveStartingBalance(year, month),
        ]);
        if (cancelled) return;
        setItems(nextItems);
        setStartingBalance(start);
      })();
      return () => {
        cancelled = true;
      };
    }, [year, month]),
  );

  const { confirmed, pending } = useMemo(() => {
    const c: MonthlyItem[] = [];
    const p: MonthlyItem[] = [];
    for (const it of items) {
      (it.status === 'confirmed' ? c : p).push(it);
    }
    return { confirmed: c, pending: p };
  }, [items]);

  const totals = useMemo(
    () => totalsFromItems(items, startingBalance),
    [items, startingBalance],
  );
  const hasAny = items.length > 0;

  const onItemPress = (item: MonthlyItem) => {
    if (item.source.kind === 'loan') {
      router.push({
        pathname: '/loan/[id]',
        params: { id: item.source.loan.id },
      });
      return;
    }
    router.push({
      pathname: '/entry/confirm',
      params: { entryId: item.source.entry.id },
    });
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
    >
      <View style={[styles.header, { paddingHorizontal: theme.spacing(4) }]}>
        <View style={styles.monthNav}>
          <Pressable
            onPress={prev}
            hitSlop={12}
            accessibilityLabel={t('home.prevMonth')}
            style={[styles.navBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.lg }}>
              ‹
            </Text>
          </Pressable>
          <Pressable
            onPress={
              isCurrentMonth
                ? undefined
                : () => {
                    haptics.light();
                    reset();
                  }
            }
            disabled={isCurrentMonth}
            accessibilityLabel={t('home.thisMonth')}
            hitSlop={8}
          >
            <Text
              style={{
                color: isCurrentMonth ? theme.colors.text : theme.colors.accent,
                fontSize: theme.font.size.lg,
                fontWeight: theme.font.weight.semibold,
                textTransform: 'capitalize',
              }}
            >
              {monthLabel(year, month, locale)}
            </Text>
          </Pressable>
          <Pressable
            onPress={next}
            hitSlop={12}
            accessibilityLabel={t('home.nextMonth')}
            style={[styles.navBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.lg }}>
              ›
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push('/breakdown')}
          hitSlop={12}
          accessibilityLabel={t('breakdown.title')}
          style={({ pressed }) => ({
            padding: theme.spacing(2),
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons
            name="pie-chart-outline"
            size={22}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          paddingBottom: theme.spacing(20),
          gap: theme.spacing(4),
        }}
      >
        <Card style={{ gap: theme.spacing(3) }}>
          <View>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.xs,
                fontWeight: theme.font.weight.semibold,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: theme.spacing(1),
              }}
            >
              {t('home.confirmedRemaining')}
            </Text>
            <MoneyText
              amount={totals.confirmedRemaining}
              size="xxl"
              bold
              tone={totals.confirmedRemaining < 0 ? 'expense' : 'default'}
            />
          </View>

          <View
            style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }}
          />

          <View style={styles.summaryRow}>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.sm }}>
              {t('home.estimatedRemaining')}
            </Text>
            <MoneyText amount={totals.estimatedRemaining} size="md" tone="muted" />
          </View>

          <View
            style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }}
          />

          <Pressable
            onPress={() => router.push('/balance')}
            style={({ pressed }) => [styles.summaryRow, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.sm }}>
              {t('home.startingBalance')}
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}
            >
              <MoneyText amount={startingBalance} size="md" tone="muted" />
              <Ionicons
                name="chevron-forward"
                size={15}
                color={theme.colors.textMuted}
              />
            </View>
          </Pressable>
        </Card>

        {!hasAny ? (
          <Card style={{ alignItems: 'center', paddingVertical: theme.spacing(10) }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.md,
                fontWeight: theme.font.weight.semibold,
                marginBottom: theme.spacing(1),
              }}
            >
              {t('home.empty.title')}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.sm,
                textAlign: 'center',
                marginBottom: theme.spacing(3),
              }}
            >
              {t('home.empty.subtitle')}
            </Text>
            <Pressable
              onPress={() => router.push('/entry/new')}
              hitSlop={8}
              style={({ pressed }) => ({
                paddingVertical: theme.spacing(2),
                paddingHorizontal: theme.spacing(3),
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.font.size.md,
                  fontWeight: theme.font.weight.semibold,
                }}
              >
                {t('home.empty.cta')}
              </Text>
            </Pressable>
          </Card>
        ) : (
          <>
            {confirmed.length > 0 && (
              <Section
                title={t('home.section.confirmed')}
                items={confirmed}
                onItemPress={onItemPress}
                theme={theme}
              />
            )}
            {pending.length > 0 && (
              <Section
                title={t('home.section.pending')}
                items={pending}
                onItemPress={onItemPress}
                theme={theme}
              />
            )}
          </>
        )}
      </ScrollView>

      <FloatingActionButton
        onPress={() => router.push('/entry/new')}
        accessibilityLabel={t('home.addEntry')}
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  items,
  onItemPress,
  theme,
}: {
  title: string;
  items: MonthlyItem[];
  onItemPress: (item: MonthlyItem) => void;
  theme: Theme;
}) {
  return (
    <View style={{ gap: theme.spacing(2) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing(1),
        }}
      >
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
            fontWeight: theme.font.weight.semibold,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
            fontWeight: theme.font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {items.length}
        </Text>
      </View>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.map((it, idx) => (
          <View key={it.id}>
            {idx > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.colors.border,
                  marginLeft: theme.spacing(4),
                }}
              />
            )}
            <ListItem item={it} onPress={() => onItemPress(it)} />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
