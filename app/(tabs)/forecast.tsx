import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/ui/Card';
import { ForecastChart, type ForecastBar } from '@/ui/ForecastChart';
import { MoneyText } from '@/ui/MoneyText';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { currentMonth, monthLabel, monthShort } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useMonthStore } from '@/stores/month';
import { buildProjection, type ProjectionMonth } from '@/lib/projection';

const MONTHS_AHEAD = 6;

export default function ForecastScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const setMonth = useMonthStore((s) => s.set);
  const [rows, setRows] = useState<ProjectionMonth[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const cm = currentMonth();
        const data = await buildProjection(cm.year, cm.month, MONTHS_AHEAD);
        if (!cancelled) setRows(data);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const bars = useMemo<ForecastBar[]>(
    () =>
      rows.map((r, i) => ({
        label: monthShort(r.year, r.month, locale),
        value: r.estimatedRemaining,
        highlight: i === 0,
      })),
    [rows, locale],
  );

  const hasAny = rows.some((r) => r.hasData);

  const openMonth = (r: ProjectionMonth) => {
    haptics.light();
    setMonth(r.year, r.month);
    router.navigate('/');
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          gap: theme.spacing(4),
        }}
      >
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
              {t('forecast.empty.title')}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.sm,
                textAlign: 'center',
                marginBottom: theme.spacing(3),
              }}
            >
              {t('forecast.empty.subtitle')}
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
                {t('forecast.empty.cta')}
              </Text>
            </Pressable>
          </Card>
        ) : (
          <>
            <Card style={{ gap: theme.spacing(3) }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.xs,
                  fontWeight: theme.font.weight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                {t('forecast.chartTitle')}
              </Text>
              <ForecastChart data={bars} />
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.xs,
                  lineHeight: theme.font.size.xs * 1.4,
                }}
              >
                {t('forecast.note')}
              </Text>
            </Card>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {rows.map((r, idx) => (
                <View key={`${r.year}-${r.month}`}>
                  {idx > 0 && (
                    <View
                      style={{
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: theme.colors.border,
                        marginLeft: theme.spacing(4),
                      }}
                    />
                  )}
                  <ForecastRow
                    row={r}
                    isCurrent={idx === 0}
                    label={monthLabel(r.year, r.month, locale)}
                    currentTag={t('forecast.thisMonth')}
                    theme={theme}
                    onPress={() => openMonth(r)}
                  />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ForecastRow({
  row,
  isCurrent,
  label,
  currentTag,
  theme,
  onPress,
}: {
  row: ProjectionMonth;
  isCurrent: boolean;
  label: string;
  currentTag: string;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, marginRight: theme.spacing(3) }}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.md,
            fontWeight: isCurrent
              ? theme.font.weight.semibold
              : theme.font.weight.medium,
            textTransform: 'capitalize',
          }}
        >
          {label}
        </Text>
        {isCurrent && (
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: theme.font.size.xs,
              fontWeight: theme.font.weight.semibold,
              marginTop: 2,
            }}
          >
            {currentTag}
          </Text>
        )}
      </View>
      <MoneyText
        amount={row.estimatedRemaining}
        size="md"
        bold
        tone={row.estimatedRemaining < 0 ? 'expense' : 'default'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
