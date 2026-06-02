import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/ui/Card';
import { BalanceCurveChart, type CurvePoint } from '@/ui/BalanceCurveChart';
import { MoneyText } from '@/ui/MoneyText';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { useFormatMoney } from '@/lib/money';
import { currentMonth, monthLabel, monthShort } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useMonthStore } from '@/stores/month';
import { buildProjection, type ProjectionMonth } from '@/lib/projection';

const HORIZONS = [3, 6, 12] as const;
type Horizon = (typeof HORIZONS)[number];

export default function ForecastScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const setMonth = useMonthStore((s) => s.set);
  const [horizon, setHorizon] = useState<Horizon>(6);
  const [rows, setRows] = useState<ProjectionMonth[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const [chartW, setChartW] = useState(0);

  const changeHorizon = (h: Horizon) => {
    setSelected(null);
    setTipPos(null);
    setHorizon(h);
  };

  const onSelectPoint = (index: number, pos: { x: number; y: number }) => {
    haptics.select();
    if (index === selected) {
      setSelected(null);
      setTipPos(null);
    } else {
      setSelected(index);
      setTipPos(pos);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const cm = currentMonth();
        const data = await buildProjection(cm.year, cm.month, horizon);
        if (!cancelled) setRows(data);
      })();
      return () => {
        cancelled = true;
      };
    }, [horizon]),
  );

  const points = useMemo<CurvePoint[]>(
    () =>
      rows.map((r) => ({
        label: monthShort(r.year, r.month, locale),
        value: r.estimatedRemaining,
      })),
    [rows, locale],
  );

  const lowestIndex = useMemo(() => {
    if (rows.length === 0) return -1;
    let idx = 0;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].estimatedRemaining < rows[idx].estimatedRemaining) idx = i;
    }
    return idx;
  }, [rows]);

  const hasAny = rows.some((r) => r.hasData);
  const endRow = rows[rows.length - 1];
  const lowRow = lowestIndex >= 0 ? rows[lowestIndex] : undefined;
  const firstNeg = rows.find((r) => r.estimatedRemaining < 0);
  const selectedRow =
    selected !== null && selected < rows.length ? rows[selected] : undefined;

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
            <SegmentedControl<Horizon>
              value={horizon}
              onChange={changeHorizon}
              options={HORIZONS.map((h) => ({
                value: h,
                label: `${h} ${t('forecast.monthsShort')}`,
              }))}
            />

            {firstNeg && (
              <Pressable
                onPress={() => openMonth(firstNeg)}
                style={({ pressed }) => [
                  styles.banner,
                  {
                    backgroundColor: theme.colors.expense + '18',
                    borderRadius: theme.radius.md,
                    padding: theme.spacing(3),
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="warning" size={18} color={theme.colors.expense} />
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontSize: theme.font.size.sm,
                    lineHeight: theme.font.size.sm * 1.35,
                  }}
                >
                  {t('forecast.goesNegative', {
                    month: monthLabel(firstNeg.year, firstNeg.month, locale),
                  })}
                </Text>
                <MoneyText
                  amount={firstNeg.estimatedRemaining}
                  size="sm"
                  bold
                  tone="expense"
                />
              </Pressable>
            )}

            <Card style={{ gap: theme.spacing(4) }}>
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
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
                    {endRow
                      ? monthLabel(endRow.year, endRow.month, locale)
                      : ''}
                  </Text>
                  {endRow && (
                    <MoneyText
                      amount={endRow.estimatedRemaining}
                      size="xxl"
                      bold
                      tone={endRow.estimatedRemaining < 0 ? 'expense' : 'default'}
                    />
                  )}
                </View>

                {lowRow && (
                  <View style={{ alignItems: 'flex-end' }}>
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
                      {t('forecast.lowestLabel')}
                    </Text>
                    <View style={styles.lowInline}>
                      {lowRow.estimatedRemaining < 0 && (
                        <Ionicons
                          name="warning"
                          size={14}
                          color={theme.colors.expense}
                        />
                      )}
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: theme.font.size.sm,
                          fontWeight: theme.font.weight.medium,
                          textTransform: 'capitalize',
                        }}
                      >
                        {monthShort(lowRow.year, lowRow.month, locale)}
                      </Text>
                    </View>
                    <MoneyText
                      amount={lowRow.estimatedRemaining}
                      size="md"
                      bold
                      tone={lowRow.estimatedRemaining < 0 ? 'expense' : 'muted'}
                    />
                  </View>
                )}
              </View>

              <View
                style={{ position: 'relative' }}
                onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
              >
                <BalanceCurveChart
                  points={points}
                  lowestIndex={lowestIndex}
                  selectedIndex={selected}
                  onSelectPoint={onSelectPoint}
                />
                {selectedRow && tipPos && (
                  <PointTooltip
                    row={selectedRow}
                    anchor={tipPos}
                    containerWidth={chartW}
                    theme={theme}
                    monthName={monthShort(
                      selectedRow.year,
                      selectedRow.month,
                      locale,
                    )}
                  />
                )}
              </View>

              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.xs,
                  lineHeight: theme.font.size.xs * 1.4,
                }}
              >
                {selected !== null ? t('forecast.tapHintActive') : t('forecast.note')}
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

const TIP_W = 176;
const TIP_H = 108;

function PointTooltip({
  row,
  anchor,
  containerWidth,
  theme,
  monthName,
}: {
  row: ProjectionMonth;
  anchor: { x: number; y: number };
  containerWidth: number;
  theme: Theme;
  monthName: string;
}) {
  const t = useT();
  const formatMoney = useFormatMoney();

  const maxLeft = Math.max(4, containerWidth - TIP_W - 4);
  const left = Math.min(maxLeft, Math.max(4, anchor.x - TIP_W / 2));
  const above = anchor.y - TIP_H - 12;
  const top = above >= 0 ? above : anchor.y + 14;

  return (
    <View
      style={[
        styles.tooltip,
        {
          left,
          top,
          width: TIP_W,
          pointerEvents: 'none',
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          padding: theme.spacing(3),
        },
      ]}
    >
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.sm,
          fontWeight: theme.font.weight.semibold,
          textTransform: 'capitalize',
          marginBottom: theme.spacing(2),
        }}
      >
        {monthName}
      </Text>

      <TipRow
        icon="arrow-up"
        iconColor={theme.colors.income}
        label={t('entry.direction.income')}
        value={formatMoney(row.income)}
        theme={theme}
      />
      <TipRow
        icon="arrow-down"
        iconColor={theme.colors.expense}
        label={t('entry.direction.expense')}
        value={formatMoney(row.expense)}
        theme={theme}
      />

      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
          marginVertical: theme.spacing(2),
        }}
      />

      <View style={styles.tipLine}>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
          }}
        >
          {t('home.estimatedRemaining')}
        </Text>
        <MoneyText
          amount={row.estimatedRemaining}
          size="sm"
          bold
          tone={row.estimatedRemaining < 0 ? 'expense' : 'default'}
        />
      </View>
    </View>
  );
}

function TipRow({
  icon,
  iconColor,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <View style={[styles.tipLine, { marginBottom: theme.spacing(1) }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={12} color={iconColor} />
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.xs }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.xs,
          fontWeight: theme.font.weight.medium,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
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
  const formatMoney = useFormatMoney();
  const net = row.estimatedRemaining - row.startingBalance;
  const netUp = net >= 0;
  const netColor = netUp ? theme.colors.income : theme.colors.expense;

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
      <View style={{ flex: 1, marginRight: theme.spacing(3), gap: 4 }}>
        <View style={styles.nameRow}>
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
            <Tag text={currentTag} color={theme.colors.accent} theme={theme} />
          )}
        </View>
        <View
          style={[
            styles.netChip,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <Ionicons
            name={netUp ? 'arrow-up' : 'arrow-down'}
            size={11}
            color={netColor}
          />
          <Text
            style={{
              color: netColor,
              fontSize: theme.font.size.xs,
              fontWeight: theme.font.weight.medium,
              fontVariant: ['tabular-nums'],
            }}
          >
            {(netUp ? '+' : '−') + formatMoney(Math.abs(net))}
          </Text>
        </View>
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

function Tag({
  text,
  color,
  theme,
}: {
  text: string;
  color: string;
  theme: Theme;
}) {
  return (
    <View
      style={{
        backgroundColor: color + '22',
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing(2),
        paddingVertical: 1,
      }}
    >
      <Text
        style={{
          color,
          fontSize: theme.font.size.xs,
          fontWeight: theme.font.weight.semibold,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tooltip: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tipLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  lowInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  netChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
