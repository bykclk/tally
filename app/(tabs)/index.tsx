import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/ui/Card';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { ListItem } from '@/ui/ListItem';
import { MoneyText } from '@/ui/MoneyText';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { monthLabel } from '@/lib/date';
import { useMonthStore } from '@/stores/month';
import {
  buildMonthlyItems,
  totalsFromItems,
  type MonthlyItem,
} from '@/lib/monthlyItems';

export default function HomeScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { year, month, next, prev } = useMonthStore();
  const [items, setItems] = useState<MonthlyItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const next = await buildMonthlyItems(year, month);
        if (!cancelled) setItems(next);
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

  const totals = useMemo(() => totalsFromItems(items), [items]);
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
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.lg,
            fontWeight: theme.font.weight.semibold,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel(year, month, locale)}
        </Text>
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

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          paddingBottom: theme.spacing(20),
          gap: theme.spacing(4),
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
          <Card style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.xs,
                marginBottom: theme.spacing(2),
              }}
            >
              {t('home.confirmedRemaining')}
            </Text>
            <MoneyText amount={totals.confirmedRemaining} size="lg" bold />
          </Card>
          <Card variant="muted" style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.xs,
                marginBottom: theme.spacing(2),
              }}
            >
              {t('home.estimatedRemaining')}
            </Text>
            <MoneyText amount={totals.estimatedRemaining} size="lg" tone="muted" />
          </Card>
        </View>

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
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.xs,
          fontWeight: theme.font.weight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: theme.spacing(1),
        }}
      >
        {title}
      </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
