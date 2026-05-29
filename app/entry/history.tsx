import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { TrendChart, type TrendPoint } from '@/ui/TrendChart';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { monthLabel, monthShort } from '@/lib/date';
import { getEntry } from '@/db/queries/entries';
import { listLastConfirmed } from '@/db/queries/instances';
import type { Entry, Instance } from '@/types';

const MAX_MONTHS = 12;

export default function EntryHistoryScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();

  const [entry, setEntry] = useState<Entry | null>(null);
  // Oldest → newest for charting.
  const [history, setHistory] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!entryId) {
        setLoading(false);
        return;
      }
      const [e, recent] = await Promise.all([
        getEntry(entryId),
        listLastConfirmed(entryId, MAX_MONTHS),
      ]);
      if (cancelled) return;
      setEntry(e);
      setHistory([...recent].reverse());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  const points = useMemo<TrendPoint[]>(
    () =>
      history.map((i) => ({
        label: monthShort(i.year, i.month, locale),
        value: i.amount,
      })),
    [history, locale],
  );

  const average = useMemo(() => {
    if (history.length === 0) return 0;
    return history.reduce((sum, i) => sum + i.amount, 0) / history.length;
  }, [history]);

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}>
        <Stack.Screen
          options={{
            title: t('history.title'),
            headerLeft: () => (
              <HeaderButton
                label={t('common.done')}
                onPress={() => router.back()}
                theme={theme}
                accent
              />
            ),
          }}
        />
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Stack.Screen
        options={{
          title: entry ? entry.name : t('history.title'),
          headerLeft: () => (
            <HeaderButton
              label={t('common.done')}
              onPress={() => router.back()}
              theme={theme}
              accent
            />
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          gap: theme.spacing(4),
        }}
      >
        {history.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: theme.spacing(10) }}>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.sm,
                textAlign: 'center',
              }}
            >
              {t('history.empty')}
            </Text>
          </Card>
        ) : (
          <>
            <Card style={{ gap: theme.spacing(3) }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
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
                  {t('history.average', { n: history.length })}
                </Text>
                <MoneyText amount={average} size="md" bold />
              </View>
              <TrendChart data={points} height={180} />
            </Card>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {[...history].reverse().map((inst, idx) => (
                <View key={`${inst.year}-${inst.month}`}>
                  {idx > 0 && (
                    <View
                      style={{
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: theme.colors.border,
                        marginLeft: theme.spacing(4),
                      }}
                    />
                  )}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: theme.spacing(3),
                      paddingHorizontal: theme.spacing(4),
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.md,
                        textTransform: 'capitalize',
                      }}
                    >
                      {monthLabel(inst.year, inst.month, locale)}
                    </Text>
                    <MoneyText amount={inst.amount} size="md" />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HeaderButton({
  label,
  onPress,
  theme,
  accent,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
  accent?: boolean;
}) {
  return (
    <View>
      <Text
        onPress={onPress}
        style={{
          color: accent ? theme.colors.accent : theme.colors.text,
          fontSize: theme.font.size.md,
          fontWeight: accent
            ? theme.font.weight.semibold
            : theme.font.weight.regular,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
