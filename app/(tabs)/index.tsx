import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Card } from '@/ui/Card';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { ListItem, type DueState } from '@/ui/ListItem';
import { MoneyText } from '@/ui/MoneyText';
import { AnimatedMoney } from '@/ui/AnimatedMoney';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { currentMonth, monthLabel, isoForDayInMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useMonthStore } from '@/stores/month';
import { useRefreshStore } from '@/stores/refresh';
import {
  buildMonthlyItems,
  totalsFromItems,
  type MonthlyItem,
} from '@/lib/monthlyItems';
import { resolveStartingBalance } from '@/lib/monthlyBalance';
import { upsertInstance, deleteInstance } from '@/db/queries/instances';
import { showToast } from '@/stores/toast';

export default function HomeScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { year, month, next, prev, reset } = useMonthStore();
  const refreshTick = useRefreshStore((s) => s.tick);
  const cm = currentMonth();
  const isCurrentMonth = year === cm.year && month === cm.month;
  const [items, setItems] = useState<MonthlyItem[]>([]);
  const [startingBalance, setStartingBalance] = useState(0);
  const [todayISO, setTodayISO] = useState(todayIso);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [nextItems, start] = await Promise.all([
      buildMonthlyItems(year, month),
      resolveStartingBalance(year, month),
    ]);
    setItems(nextItems);
    setStartingBalance(start);
  }, [year, month]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setTodayISO(todayIso()); // refresh in case the app crossed midnight
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

  // Reload when an off-screen mutation (e.g. a toast "Undo") bumps the global
  // refresh signal — the focus effect won't re-run while we stay on this screen.
  // Skip the initial run so it doesn't double-load on mount alongside focus.
  const firstTick = useRef(true);
  useEffect(() => {
    if (firstTick.current) {
      firstTick.current = false;
      return;
    }
    void loadData();
  }, [refreshTick, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTodayISO(todayIso());
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

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

  const overdueCount = useMemo(
    () =>
      pending.filter((it) => dueStateFor(it.effectiveDate, todayISO) === 'overdue')
        .length,
    [pending, todayISO],
  );

  // Swipe left → next month, swipe right → previous month. Fling gestures only
  // fire on a horizontal flick, so they coexist with the vertical ScrollView.
  // The ‹ › buttons stay for discoverability/accessibility.
  const goNext = useCallback(() => {
    haptics.light();
    next();
  }, [next]);
  const goPrev = useCallback(() => {
    haptics.light();
    prev();
  }, [prev]);
  // A horizontal pan (not a fling): it needs ~20px sideways travel to activate,
  // which ignores taps and *cancels* an in-progress row tap, so dragging across
  // a list row no longer accidentally opens it. failOffsetY lets a mostly-
  // vertical drag fall through to the ScrollView. onEnd runs as a UI worklet, so
  // hop back to JS with runOnJS before touching the store / haptics.
  const monthSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          if (e.translationX <= -45 || e.velocityX <= -500) {
            runOnJS(goNext)();
          } else if (e.translationX >= 45 || e.velocityX >= 500) {
            runOnJS(goPrev)();
          }
        }),
    [goNext, goPrev],
  );

  // One-tap confirm from the pending list (no modal): bank the estimate as a
  // confirmed instance and offer an undo that restores the previous state.
  const onQuickConfirm = useCallback(
    async (item: MonthlyItem) => {
      if (item.source.kind !== 'entry') return;
      const entry = item.source.entry;
      const prev = item.source.instance;
      await upsertInstance({
        entryId: entry.id,
        year,
        month,
        amount: item.effectiveAmount,
        date: item.effectiveDate,
        status: 'confirmed',
        isEstimate: false,
      });
      await loadData();
      showToast(t('confirm.toast.paid'), {
        label: t('common.undo'),
        onPress: () => {
          const undo = prev
            ? upsertInstance({
                entryId: entry.id,
                year,
                month,
                amount: prev.amount,
                date: prev.date,
                status: prev.status,
                isEstimate: prev.isEstimate,
              })
            : deleteInstance(entry.id, year, month);
          void undo.then(() => loadData());
        },
      });
    },
    [year, month, loadData, t],
  );

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
      <GestureDetector gesture={monthSwipe}>
        <View style={styles.swipeArea}>
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
          accessibilityRole="button"
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.textMuted}
          />
        }
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
            <AnimatedMoney
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
            <AnimatedMoney
              amount={totals.estimatedRemaining}
              size="md"
              tone="muted"
            />
          </View>

          <View
            style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }}
          />

          <Pressable
            onPress={() => {
              haptics.light();
              router.push('/balance');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('home.startingBalance')}
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
            <Ionicons
              name="calendar-outline"
              size={40}
              color={theme.colors.textMuted}
              style={{ marginBottom: theme.spacing(3), opacity: 0.6 }}
            />
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
              accessibilityRole="button"
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
                onQuickConfirm={onQuickConfirm}
                theme={theme}
                todayISO={todayISO}
                overdueCount={overdueCount}
              />
            )}
          </>
        )}
      </ScrollView>
        </View>
      </GestureDetector>

      <FloatingActionButton
        onPress={() => router.push('/entry/new')}
        accessibilityLabel={t('home.addEntry')}
      />
    </SafeAreaView>
  );
}

function todayIso(): string {
  const n = new Date();
  return isoForDayInMonth(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

function dueStateFor(iso: string, today: string): DueState {
  if (iso < today) return 'overdue';
  if (iso === today) return 'today';
  return 'upcoming';
}

function Section({
  title,
  items,
  onItemPress,
  onQuickConfirm,
  theme,
  todayISO,
  overdueCount = 0,
}: {
  title: string;
  items: MonthlyItem[];
  onItemPress: (item: MonthlyItem) => void;
  onQuickConfirm?: (item: MonthlyItem) => void;
  theme: Theme;
  todayISO?: string;
  overdueCount?: number;
}) {
  const t = useT();
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
          {overdueCount > 0 && (
            <Text
              style={{
                color: theme.colors.expense,
                fontSize: theme.font.size.xs,
                fontWeight: theme.font.weight.semibold,
              }}
            >
              {t('home.due.overdueCount', { count: overdueCount })}
            </Text>
          )}
        </View>
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
            <ListItem
              item={it}
              onPress={() => onItemPress(it)}
              onQuickConfirm={
                onQuickConfirm && it.status === 'pending' && it.source.kind === 'entry'
                  ? () => onQuickConfirm(it)
                  : undefined
              }
              dueState={todayISO ? dueStateFor(it.effectiveDate, todayISO) : undefined}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  swipeArea: { flex: 1 },
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
