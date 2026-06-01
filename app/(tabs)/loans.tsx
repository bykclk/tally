import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/ui/Card';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { MoneyText } from '@/ui/MoneyText';
import { useTheme, type Theme } from '@/ui/theme';
import { useT } from '@/lib/i18n';
import { useFormatMoney } from '@/lib/money';
import {
  listLoansWithProgress,
  type LoanWithProgress,
} from '@/db/queries/loans';

export default function LoansScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const [loans, setLoans] = useState<LoanWithProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const list = await listLoansWithProgress(true);
        if (!cancelled) setLoans(list);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const totals = useMemo(() => {
    let balance = 0;
    let monthly = 0;
    for (const l of loans) {
      balance += l.balance;
      if (l.balance > 0) monthly += l.monthlyPayment;
    }
    return { balance, monthly };
  }, [loans]);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          paddingBottom: theme.spacing(20),
          gap: theme.spacing(3),
        }}
      >
        {loans.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: theme.spacing(10) }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.md,
                fontWeight: theme.font.weight.semibold,
                marginBottom: theme.spacing(1),
              }}
            >
              {t('loans.empty.title')}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.sm,
                textAlign: 'center',
                marginBottom: theme.spacing(3),
              }}
            >
              {t('loans.empty.subtitle')}
            </Text>
            <Pressable
              onPress={() => router.push('/loan/new')}
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
                {t('loans.empty.cta')}
              </Text>
            </Pressable>
          </Card>
        ) : (
          <>
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
                  {t('loans.totalDebt')}
                </Text>
                <MoneyText amount={totals.balance} size="xxl" bold />
              </View>
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.colors.border,
                }}
              />
              <View style={rowStyles.between}>
                <Text
                  style={{ color: theme.colors.textMuted, fontSize: theme.font.size.sm }}
                >
                  {t('loans.monthlyTotal')}
                </Text>
                <MoneyText amount={totals.monthly} size="md" tone="muted" />
              </View>
            </Card>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
            {loans.map((loan, idx) => (
              <View key={loan.id}>
                {idx > 0 && (
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: theme.colors.border,
                      marginLeft: theme.spacing(4),
                    }}
                  />
                )}
                <LoanRow
                  loan={loan}
                  theme={theme}
                  onPress={() =>
                    router.push({
                      pathname: '/loan/[id]',
                      params: { id: loan.id },
                    })
                  }
                />
              </View>
            ))}
            </Card>
          </>
        )}
      </ScrollView>

      <FloatingActionButton
        onPress={() => router.push('/loan/new')}
        accessibilityLabel={t('loans.addLoan')}
      />
    </SafeAreaView>
  );
}

function LoanRow({
  loan,
  theme,
  onPress,
}: {
  loan: LoanWithProgress;
  theme: Theme;
  onPress: () => void;
}) {
  const formatMoney = useFormatMoney();
  const isInstallment =
    loan.loanType === 'installment' && loan.numInstallments != null;
  const subtitle = isInstallment
    ? `${loan.paidCount}/${loan.numInstallments} · ${formatMoney(loan.monthlyPayment)}`
    : `%${(loan.monthlyRate * 100).toFixed(2)} · ${formatMoney(loan.monthlyPayment)}`;
  const pct =
    isInstallment && loan.numInstallments
      ? Math.min(1, loan.paidCount / loan.numInstallments)
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        rowStyles.row,
        {
          paddingVertical: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, marginRight: theme.spacing(3), gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.md,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {loan.name}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
          }}
        >
          {subtitle}
        </Text>
        {pct !== null && (
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.surfaceMuted,
              overflow: 'hidden',
              marginTop: theme.spacing(1),
            }}
          >
            <View
              style={{
                height: 4,
                width: `${Math.max(2, pct * 100)}%`,
                borderRadius: 2,
                backgroundColor: theme.colors.accent,
              }}
            />
          </View>
        )}
      </View>
      <MoneyText amount={loan.balance} size="md" bold />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
