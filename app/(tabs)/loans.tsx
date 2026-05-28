import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
  const subtitle =
    loan.loanType === 'installment' && loan.numInstallments != null
      ? `${loan.paidCount}/${loan.numInstallments} · ${formatMoney(loan.monthlyPayment)}`
      : `%${(loan.monthlyRate * 100).toFixed(2)} · ${formatMoney(loan.monthlyPayment)}`;

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
      <View style={{ flex: 1 }}>
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
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
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
});
