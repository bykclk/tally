import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '@/ui/Card';
import { MoneyText } from '@/ui/MoneyText';
import { PayoffChart } from '@/ui/PayoffChart';
import { Slider } from '@/ui/Slider';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { useFormatMoney } from '@/lib/money';
import { monthLabel, shortDate } from '@/lib/date';
import { simulatePayoff, type SimResult } from '@/lib/loanSim';
import { isMonthInLoanSchedule } from '@/lib/loanSchedule';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { haptics } from '@/lib/haptics';
import { useMonthStore } from '@/stores/month';
import { getLoan } from '@/db/queries/loans';
import {
  deleteLoanPayment,
  getLatestLoanPayment,
  hasPaymentForMonth,
  listLoanPayments,
  recordLoanPayment,
  type RecordPaymentResult,
} from '@/db/queries/loanPayments';
import type { Loan, LoanPayment, Locale } from '@/types';

type PayDisabledReason =
  | 'paid_off'
  | 'already_paid'
  | 'insufficient'
  | 'out_of_schedule'
  | null;

export default function LoanDetailScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const formatMoney = useFormatMoney();
  const { id } = useLocalSearchParams<{ id: string }>();

  const year = useMonthStore((s) => s.year);
  const month = useMonthStore((s) => s.month);

  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [latestPayment, setLatestPayment] = useState<LoanPayment | null>(null);
  const [paidSelectedMonth, setPaidSelectedMonth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState(0);

  const refresh = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    const [l, p, latest] = await Promise.all([
      getLoan(id),
      listLoanPayments(id, 50),
      getLatestLoanPayment(id),
    ]);
    if (l) {
      const exists = await hasPaymentForMonth(id, year, month);
      setPaidSelectedMonth(exists);
    } else {
      setPaidSelectedMonth(false);
    }
    setLoan(l);
    setPayments(p);
    setLatestPayment(latest);
    setLoading(false);
  }, [id, year, month]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (cancelled) return;
        await refresh();
      })();
      return () => {
        cancelled = true;
      };
    }, [refresh]),
  );

  const baseline = useMemo<SimResult | null>(() => {
    if (!loan || loan.balance <= 0) return null;
    return simulatePayoff(loan.balance, loan.monthlyRate, loan.monthlyPayment);
  }, [loan]);

  const withExtra = useMemo<SimResult | null>(() => {
    if (!loan || loan.balance <= 0 || extra <= 0) return null;
    return simulatePayoff(
      loan.balance,
      loan.monthlyRate,
      loan.monthlyPayment + extra,
    );
  }, [loan, extra]);

  const extraMax = useMemo(() => {
    if (!loan) return 0;
    return Math.max(500, Math.round((loan.monthlyPayment * 3) / 100) * 100);
  }, [loan]);

  const payState = useMemo<{
    amount: number;
    principal: number;
    interest: number;
    balanceAfter: number;
    disabledReason: PayDisabledReason;
  } | null>(() => {
    if (!loan) return null;
    if (
      loan.loanType === 'installment' &&
      !isMonthInLoanSchedule(loan, year, month)
    ) {
      return {
        amount: loan.monthlyPayment,
        principal: 0,
        interest: 0,
        balanceAfter: loan.balance,
        disabledReason: 'out_of_schedule',
      };
    }
    if (loan.balance <= 0) {
      return {
        amount: 0,
        principal: 0,
        interest: 0,
        balanceAfter: 0,
        disabledReason: 'paid_off',
      };
    }
    const interest = loan.balance * loan.monthlyRate;
    let principal: number;
    let amount: number;
    if (loan.monthlyPayment >= loan.balance + interest) {
      principal = loan.balance;
      amount = loan.balance + interest;
    } else {
      principal = loan.monthlyPayment - interest;
      amount = loan.monthlyPayment;
      if (principal <= 0) {
        return {
          amount,
          principal: 0,
          interest,
          balanceAfter: loan.balance,
          disabledReason: 'insufficient',
        };
      }
    }
    return {
      amount,
      principal,
      interest,
      balanceAfter: Math.max(0, loan.balance - principal),
      disabledReason: paidSelectedMonth ? 'already_paid' : null,
    };
  }, [loan, paidSelectedMonth, year, month]);

  const handlePay = () => {
    if (!loan || !payState || payState.disabledReason || busy) return;
    Alert.alert(
      t('loan.payments.confirmTitle'),
      t('loan.payments.confirmMessage', {
        amount: formatMoney(payState.amount),
        principal: Math.round(payState.principal).toString(),
        interest: Math.round(payState.interest).toString(),
        balanceAfter: formatMoney(payState.balanceAfter),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.save'),
          onPress: async () => {
            setBusy(true);
            try {
              const r: RecordPaymentResult = await recordLoanPayment(
                loan.id,
                year,
                month,
              );
              if (r.ok) {
                haptics.success();
              } else {
                haptics.warning();
                Alert.alert(
                  t('loan.payments.errorTitle'),
                  reasonLabel(r.reason, t),
                );
              }
              await refresh();
            } catch (e) {
               
              console.error('recordLoanPayment failed', e);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleUndo = () => {
    if (!latestPayment || busy) return;
    const last = latestPayment;
    Alert.alert(
      t('loan.payments.undoConfirmTitle'),
      t('loan.payments.undoConfirmMessage', {
        amount: formatMoney(last.principal),
        month: monthLabel(last.year, last.month, locale),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteLoanPayment(last.id);
              await refresh();
            } catch (e) {
               
              console.error('deleteLoanPayment failed', e);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}>
        <Stack.Screen options={{ title: t('loan.detail.title') }} />
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}>
        <Stack.Screen options={{ title: t('loan.detail.title') }} />
        <Text style={{ color: theme.colors.textMuted, padding: theme.spacing(4) }}>
          {t('loan.notFound')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Stack.Screen
        options={{
          title: loan.name,
          headerRight: () => (
            <HeaderTextButton
              label={t('loan.edit.headerAction')}
              onPress={() =>
                router.push({ pathname: '/loan/new', params: { id: loan.id } })
              }
              theme={theme}
            />
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          gap: theme.spacing(4),
          paddingBottom: theme.spacing(8),
        }}
      >
        <Card style={{ gap: theme.spacing(3) }}>
          {loan.loanType === 'installment' && loan.numInstallments != null ? (
            <>
              <DetailRow
                label={t('loan.detail.totalAmount')}
                value={formatMoney(loan.monthlyPayment * loan.numInstallments)}
                theme={theme}
              />
              <DetailRow
                label={t('loan.detail.remaining')}
                value={formatMoney(loan.balance)}
                theme={theme}
              />
              <DetailRow
                label={t('loan.detail.installment')}
                value={`${loan.numInstallments} × ${formatMoney(loan.monthlyPayment)}`}
                theme={theme}
              />
              <DetailRow
                label={t('loan.detail.progress')}
                value={`${payments.length} / ${loan.numInstallments}`}
                theme={theme}
              />
            </>
          ) : (
            <>
              <DetailRow
                label={t('loan.detail.balance')}
                value={formatMoney(loan.balance)}
                theme={theme}
              />
              <DetailRow
                label={t('loan.detail.rate')}
                value={`%${(loan.monthlyRate * 100).toFixed(2)}`}
                theme={theme}
              />
              <DetailRow
                label={t('loan.detail.payment')}
                value={formatMoney(loan.monthlyPayment)}
                theme={theme}
              />
            </>
          )}
          {latestPayment && (
            <DetailRow
              label={t('loan.detail.lastPayment')}
              value={shortDate(
                latestPayment.year,
                latestPayment.month,
                loan.dayOfMonth,
                locale,
              )}
              theme={theme}
            />
          )}
        </Card>

        {loan.balance > 0 && loan.loanType === 'open' && (
          <>
            <Card style={{ gap: theme.spacing(2) }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.sm,
                    fontWeight: theme.font.weight.semibold,
                  }}
                >
                  {t('loan.sim.extra')}
                </Text>
                <Text
                  style={{
                    color: theme.colors.accent,
                    fontSize: theme.font.size.lg,
                    fontWeight: theme.font.weight.bold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatMoney(extra)}
                </Text>
              </View>
              <Slider
                value={extra}
                min={0}
                max={extraMax}
                step={100}
                onChange={setExtra}
                accessibilityLabel={t('loan.sim.extra')}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.xs,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  ₺0
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.xs,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatMoney(extraMax)}
                </Text>
              </View>
            </Card>

            <ResultsCard
              baseline={baseline}
              withExtra={withExtra}
              theme={theme}
              t={t}
            />

            {baseline?.ok && (
              <Card>
                <PayoffChart
                  baseline={baseline.schedule}
                  withExtra={withExtra?.ok ? withExtra.schedule : null}
                  height={180}
                />
              </Card>
            )}

            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.xs,
                textAlign: 'center',
                lineHeight: theme.font.size.xs * 1.5,
                paddingHorizontal: theme.spacing(2),
              }}
            >
              {t('loan.disclaimer')}
            </Text>
          </>
        )}

        {loan.loanType === 'installment' ? (
          <InstallmentScheduleSection
            loan={loan}
            payments={payments}
            payState={payState}
            onPay={handlePay}
            busy={busy}
            year={year}
            month={month}
            theme={theme}
            t={t}
            locale={locale}
            onRefresh={refresh}
            setBusy={setBusy}
          />
        ) : (
          <PaymentsSection
            payments={payments}
            payState={payState}
            onPay={handlePay}
            onUndo={handleUndo}
            canUndo={latestPayment !== null}
            busy={busy}
            year={year}
            month={month}
            theme={theme}
            t={t}
            locale={locale}
          />
        )}
      </ScrollView>
    </View>
  );
}

function reasonLabel(
  reason: 'no_balance' | 'already_paid' | 'insufficient_payment' | 'loan_not_found',
  t: ReturnType<typeof useT>,
): string {
  switch (reason) {
    case 'no_balance':
      return t('loan.payments.paidOff');
    case 'already_paid':
      return t('loan.payments.alreadyPaid');
    case 'insufficient_payment':
      return t('loan.payments.insufficient');
    case 'loan_not_found':
      return t('loan.notFound');
  }
}

function PaymentsSection({
  payments,
  payState,
  onPay,
  onUndo,
  canUndo,
  busy,
  year,
  month,
  theme,
  t,
  locale,
}: {
  payments: LoanPayment[];
  payState: {
    amount: number;
    disabledReason: PayDisabledReason;
  } | null;
  onPay: () => void;
  onUndo: () => void;
  canUndo: boolean;
  busy: boolean;
  year: number;
  month: number;
  theme: Theme;
  t: ReturnType<typeof useT>;
  locale: Locale;
}) {
  const formatMoney = useFormatMoney();
  const buttonLabel =
    payState && payState.disabledReason === null
      ? `${t('loan.payments.payThisMonth')} · ${formatMoney(payState.amount)}`
      : payState?.disabledReason === 'paid_off'
        ? t('loan.payments.paidOff')
        : payState?.disabledReason === 'already_paid'
          ? t('loan.payments.alreadyPaid')
          : payState?.disabledReason === 'out_of_schedule'
            ? t('loan.payments.outOfSchedule')
            : t('loan.payments.insufficient');

  const isDisabled = busy || !payState || payState.disabledReason !== null;

  return (
    <View style={{ gap: theme.spacing(2) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
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
          {t('loan.payments.title')}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.sm,
            fontWeight: theme.font.weight.semibold,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel(year, month, locale)}
        </Text>
      </View>

      <Pressable
        onPress={onPay}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.payBtn,
          {
            backgroundColor: isDisabled
              ? theme.colors.surfaceMuted
              : theme.colors.accent,
            borderRadius: theme.radius.md,
            paddingVertical: theme.spacing(3),
            opacity: pressed && !isDisabled ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: isDisabled
              ? theme.colors.textMuted
              : theme.colors.accentText,
            fontSize: theme.font.size.md,
            fontWeight: theme.font.weight.semibold,
            textAlign: 'center',
          }}
        >
          {buttonLabel}
        </Text>
      </Pressable>

      {payments.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: theme.spacing(6) }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.sm,
              textAlign: 'center',
            }}
          >
            {t('loan.payments.empty')}
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {payments.map((p, idx) => (
            <View key={p.id}>
              {idx > 0 && (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: theme.colors.border,
                    marginLeft: theme.spacing(4),
                  }}
                />
              )}
              <PaymentRow payment={p} theme={theme} t={t} locale={locale} />
            </View>
          ))}
        </Card>
      )}

      {canUndo && (
        <Pressable
          onPress={onUndo}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => [
            styles.undoBtn,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingVertical: theme.spacing(3),
              marginTop: theme.spacing(1),
              opacity: busy ? 0.4 : pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: theme.font.size.sm,
              fontWeight: theme.font.weight.semibold,
              textAlign: 'center',
            }}
          >
            {t('loan.payments.undoLast')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

type ScheduleItem = {
  number: number;
  year: number;
  month: number;
  amount: number;
  payment: LoanPayment | null;
  paid: boolean;
};

function InstallmentScheduleSection({
  loan,
  payments,
  payState,
  onPay,
  busy,
  year,
  month,
  theme,
  t,
  locale,
  onRefresh,
  setBusy,
}: {
  loan: Loan;
  payments: LoanPayment[];
  payState: {
    amount: number;
    disabledReason: PayDisabledReason;
  } | null;
  onPay: () => void;
  busy: boolean;
  year: number;
  month: number;
  theme: Theme;
  t: ReturnType<typeof useT>;
  locale: Locale;
  onRefresh: () => Promise<void>;
  setBusy: (b: boolean) => void;
}) {
  const formatMoney = useFormatMoney();
  const [tab, setTab] = useState<'unpaid' | 'paid'>('unpaid');

  const schedule = useMemo<ScheduleItem[]>(() => {
    if (
      loan.loanType !== 'installment' ||
      loan.numInstallments == null ||
      loan.startYear == null ||
      loan.startMonth == null
    ) {
      return [];
    }
    const paidByKey = new Map<string, LoanPayment>();
    for (const p of payments) paidByKey.set(`${p.year}-${p.month}`, p);
    const items: ScheduleItem[] = [];
    const startIdx = loan.startYear * 12 + (loan.startMonth - 1);
    for (let i = 0; i < loan.numInstallments; i++) {
      const idx = startIdx + i;
      const y = Math.floor(idx / 12);
      const m = (idx % 12) + 1;
      const payment = paidByKey.get(`${y}-${m}`) ?? null;
      items.push({
        number: i + 1,
        year: y,
        month: m,
        amount: payment ? payment.amount : loan.monthlyPayment,
        payment,
        paid: payment !== null,
      });
    }
    return items;
  }, [loan, payments]);

  const unpaid = useMemo(() => schedule.filter((s) => !s.paid), [schedule]);
  const paid = useMemo(
    () => schedule.filter((s) => s.paid).reverse(),
    [schedule],
  );
  const visible = tab === 'unpaid' ? unpaid : paid;

  const buttonLabel =
    payState && payState.disabledReason === null
      ? `${t('loan.payments.payThisMonth')} · ${formatMoney(payState.amount)}`
      : payState?.disabledReason === 'paid_off'
        ? t('loan.payments.paidOff')
        : payState?.disabledReason === 'already_paid'
          ? t('loan.payments.alreadyPaid')
          : payState?.disabledReason === 'out_of_schedule'
            ? t('loan.payments.outOfSchedule')
            : t('loan.payments.insufficient');
  const isPayDisabled =
    busy || !payState || payState.disabledReason !== null;

  const handleItemPress = (item: ScheduleItem) => {
    if (busy) return;
    if (item.paid && item.payment) {
      const p = item.payment;
      Alert.alert(
        t('loan.schedule.undoTitle'),
        t('loan.schedule.undoMessage', {
          number: item.number,
          month: monthLabel(item.year, item.month, locale),
          amount: formatMoney(p.amount),
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              setBusy(true);
              try {
                await deleteLoanPayment(p.id);
                haptics.warning();
                await onRefresh();
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        t('loan.schedule.payTitle'),
        t('loan.schedule.payMessage', {
          number: item.number,
          month: monthLabel(item.year, item.month, locale),
          amount: formatMoney(item.amount),
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.save'),
            onPress: async () => {
              setBusy(true);
              try {
                const r = await recordLoanPayment(
                  loan.id,
                  item.year,
                  item.month,
                );
                if (r.ok) {
                  haptics.success();
                } else {
                  haptics.warning();
                  Alert.alert(
                    t('loan.payments.errorTitle'),
                    reasonLabel(r.reason, t),
                  );
                }
                await onRefresh();
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    }
  };

  return (
    <View style={{ gap: theme.spacing(2) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
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
          {t('loan.payments.title')}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.sm,
            fontWeight: theme.font.weight.semibold,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel(year, month, locale)}
        </Text>
      </View>

      <Pressable
        onPress={onPay}
        disabled={isPayDisabled}
        style={({ pressed }) => [
          styles.payBtn,
          {
            backgroundColor: isPayDisabled
              ? theme.colors.surfaceMuted
              : theme.colors.accent,
            borderRadius: theme.radius.md,
            paddingVertical: theme.spacing(3),
            opacity: pressed && !isPayDisabled ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: isPayDisabled
              ? theme.colors.textMuted
              : theme.colors.accentText,
            fontSize: theme.font.size.md,
            fontWeight: theme.font.weight.semibold,
            textAlign: 'center',
          }}
        >
          {buttonLabel}
        </Text>
      </Pressable>

      <View style={{ marginTop: theme.spacing(2) }}>
        <SegmentedControl<'unpaid' | 'paid'>
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'unpaid',
              label: `${t('loan.schedule.unpaid')} (${unpaid.length})`,
            },
            {
              value: 'paid',
              label: `${t('loan.schedule.paid')} (${paid.length})`,
            },
          ]}
        />
      </View>

      {visible.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: theme.spacing(6) }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.sm,
              textAlign: 'center',
            }}
          >
            {tab === 'unpaid'
              ? t('loan.schedule.allPaid')
              : t('loan.schedule.nonePaid')}
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {visible.map((item, idx) => (
            <View key={`${item.year}-${item.month}`}>
              {idx > 0 && (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: theme.colors.border,
                    marginLeft: theme.spacing(4),
                  }}
                />
              )}
              <ScheduleRow
                item={item}
                loan={loan}
                onPress={() => handleItemPress(item)}
                disabled={busy}
                theme={theme}
                t={t}
                locale={locale}
              />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function ScheduleRow({
  item,
  loan,
  onPress,
  disabled,
  theme,
  t,
  locale,
}: {
  item: ScheduleItem;
  loan: Loan;
  onPress: () => void;
  disabled: boolean;
  theme: Theme;
  t: ReturnType<typeof useT>;
  locale: Locale;
}) {
  const formatMoney = useFormatMoney();
  const dateLabel = `${loan.dayOfMonth} ${monthLabel(
    item.year,
    item.month,
    locale,
  )}`;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        scheduleStyles.row,
        {
          paddingVertical: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
          opacity: disabled ? 0.6 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.md,
            fontWeight: theme.font.weight.semibold,
          }}
        >
          {t('loan.schedule.installmentN', { n: item.number })}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
            marginTop: 2,
            textTransform: 'capitalize',
          }}
        >
          {dateLabel}
        </Text>
      </View>
      <Text
        style={{
          color: item.paid ? theme.colors.expense : theme.colors.text,
          fontSize: theme.font.size.md,
          fontWeight: item.paid
            ? theme.font.weight.bold
            : theme.font.weight.medium,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatMoney(item.amount)}
      </Text>
    </Pressable>
  );
}

const scheduleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});

function PaymentRow({
  payment,
  theme,
  t,
  locale,
}: {
  payment: LoanPayment;
  theme: Theme;
  t: ReturnType<typeof useT>;
  locale: Locale;
}) {
  const formatMoney = useFormatMoney();
  return (
    <View style={{ padding: theme.spacing(4), gap: theme.spacing(2) }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.md,
            fontWeight: theme.font.weight.medium,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel(payment.year, payment.month, locale)}
        </Text>
        <MoneyText amount={-payment.amount} size="md" bold tone="expense" />
      </View>
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing(4),
        }}
      >
        <PaymentMini
          label={t('loan.payments.principal')}
          value={formatMoney(payment.principal)}
          theme={theme}
        />
        <PaymentMini
          label={t('loan.payments.interest')}
          value={formatMoney(payment.interest)}
          theme={theme}
        />
        <PaymentMini
          label={t('loan.payments.balanceAfter')}
          value={formatMoney(payment.balanceAfter)}
          theme={theme}
        />
      </View>
    </View>
  );
}

function PaymentMini({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 10,
          fontWeight: theme.font.weight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.xs,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ResultsCard({
  baseline,
  withExtra,
  theme,
  t,
}: {
  baseline: SimResult | null;
  withExtra: SimResult | null;
  theme: Theme;
  t: ReturnType<typeof useT>;
}) {
  const formatMoney = useFormatMoney();
  if (!baseline) return null;

  if (!baseline.ok) {
    return (
      <Card>
        <Text
          style={{
            color: theme.colors.danger,
            fontSize: theme.font.size.sm,
            lineHeight: theme.font.size.sm * 1.4,
          }}
        >
          {t('loan.sim.insufficient')}
        </Text>
      </Card>
    );
  }

  const hasExtra = withExtra?.ok === true;
  const monthsSaved = hasExtra ? baseline.months - withExtra.months : 0;
  const interestSaved = hasExtra
    ? baseline.totalInterest - withExtra.totalInterest
    : 0;

  return (
    <Card style={{ gap: theme.spacing(3) }}>
      <ResultBlock
        label={t('loan.sim.baseline')}
        months={baseline.months}
        interest={baseline.totalInterest}
        tone="muted"
        theme={theme}
        t={t}
      />
      {hasExtra && (
        <ResultBlock
          label={t('loan.sim.withExtra')}
          months={withExtra.months}
          interest={withExtra.totalInterest}
          tone="accent"
          theme={theme}
          t={t}
        />
      )}
      {hasExtra && (
        <>
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.colors.border,
            }}
          />
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
              {t('loan.sim.savings')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <Text
                style={{
                  color: theme.colors.income,
                  fontSize: theme.font.size.md,
                  fontWeight: theme.font.weight.semibold,
                }}
              >
                {t('loan.sim.savingsMonths', { months: monthsSaved })}
              </Text>
              <Text
                style={{
                  color: theme.colors.income,
                  fontSize: theme.font.size.md,
                  fontWeight: theme.font.weight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {t('loan.sim.savingsInterest', {
                  amount: formatMoney(interestSaved),
                })}
              </Text>
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

function ResultBlock({
  label,
  months,
  interest,
  tone,
  theme,
  t,
}: {
  label: string;
  months: number;
  interest: number;
  tone: 'muted' | 'accent';
  theme: Theme;
  t: ReturnType<typeof useT>;
}) {
  const formatMoney = useFormatMoney();
  const color = tone === 'accent' ? theme.colors.text : theme.colors.textMuted;
  return (
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
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text
          style={{
            color,
            fontSize: theme.font.size.lg,
            fontWeight: theme.font.weight.bold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {t('loan.sim.months', { months })}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.sm,
            fontVariant: ['tabular-nums'],
          }}
        >
          {t('loan.sim.interest', { amount: formatMoney(interest) })}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
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
          fontSize: theme.font.size.sm,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.md,
          fontWeight: theme.font.weight.semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function HeaderTextButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.headerBtn,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text
        style={{
          color: theme.colors.accent,
          fontSize: theme.font.size.md,
          fontWeight: theme.font.weight.semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  payBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
});
