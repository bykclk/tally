import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MoneyField } from '@/ui/MoneyField';
import { MonthYearField } from '@/ui/MonthYearField';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { TextField } from '@/ui/TextField';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, type TranslationKey } from '@/lib/i18n';
import { moneyValueToInput } from '@/lib/moneyInput';
import { currentMonth } from '@/lib/date';
import {
  createLoan,
  deleteLoan,
  getLoan,
  updateLoan,
} from '@/db/queries/loans';
import { bulkSeedLoanPayments } from '@/db/queries/loanPayments';
import type { Loan, LoanType } from '@/types';

type FormState = {
  type: LoanType;
  name: string;
  balance: string;
  ratePercent: string;
  payment: string;
  installmentAmount: string;
  numInstallments: string;
  startYear: string;
  startMonth: string;
  paidInstallments: string;
  dayOfMonth: string;
};

type Errors = Partial<
  Record<
    | 'name'
    | 'balance'
    | 'ratePercent'
    | 'payment'
    | 'installmentAmount'
    | 'numInstallments'
    | 'start'
    | 'paidInstallments'
    | 'dayOfMonth',
    TranslationKey
  >
>;

function parsePositive(raw: string): number | null {
  const normalized = raw.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseRate(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim();
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function parseDay(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 31) return null;
  return n;
}

function parseInt1ToMax(raw: string, max: number): number | null {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > max) return null;
  return n;
}

function parseYear(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 2000 || n > 2200) return null;
  return n;
}

function parseNonNegInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function validate(form: FormState): Errors {
  const e: Errors = {};
  if (!form.name.trim()) e.name = 'loan.validation.nameRequired';
  if (parseDay(form.dayOfMonth) === null)
    e.dayOfMonth = 'loan.validation.dayInvalid';

  if (form.type === 'open') {
    if (parsePositive(form.balance) === null)
      e.balance = 'loan.validation.balanceInvalid';
    if (parseRate(form.ratePercent) === null)
      e.ratePercent = 'loan.validation.rateInvalid';
    if (parsePositive(form.payment) === null)
      e.payment = 'loan.validation.paymentInvalid';
  } else {
    if (parsePositive(form.installmentAmount) === null)
      e.installmentAmount = 'loan.validation.paymentInvalid';
    const numI = parseInt1ToMax(form.numInstallments, 999);
    if (numI === null) e.numInstallments = 'loan.validation.numInstallmentsInvalid';
    if (
      parseInt1ToMax(form.startMonth, 12) === null ||
      parseYear(form.startYear) === null
    )
      e.start = 'loan.validation.startInvalid';
    const paid = parseNonNegInt(form.paidInstallments);
    if (paid === null || (numI !== null && paid > numI)) {
      e.paidInstallments = 'loan.validation.paidInstallmentsInvalid';
    }
  }
  return e;
}

function loanToForm(loan: Loan): FormState {
  const cm = currentMonth();
  return {
    type: loan.loanType,
    name: loan.name,
    balance: moneyValueToInput(loan.balance),
    ratePercent: (loan.monthlyRate * 100).toString(),
    payment: moneyValueToInput(loan.monthlyPayment),
    installmentAmount: moneyValueToInput(loan.monthlyPayment),
    numInstallments: loan.numInstallments != null ? String(loan.numInstallments) : '',
    startYear: loan.startYear != null ? String(loan.startYear) : String(cm.year),
    startMonth:
      loan.startMonth != null ? String(loan.startMonth) : String(cm.month),
    paidInstallments: '',
    dayOfMonth: String(loan.dayOfMonth),
  };
}

function emptyForm(): FormState {
  const cm = currentMonth();
  return {
    type: 'open',
    name: '',
    balance: '',
    ratePercent: '',
    payment: '',
    installmentAmount: '',
    numInstallments: '',
    startYear: String(cm.year),
    startMonth: String(cm.month),
    paidInstallments: '',
    dayOfMonth: '1',
  };
}

export default function LoanFormScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      const loan = await getLoan(id);
      if (cancelled) return;
      if (!loan) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setForm(loanToForm(loan));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id]);

  const errors = useMemo(() => validate(form), [form]);
  const isValid = Object.keys(errors).length === 0;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSubmitted(true);
    if (!isValid || saving) return;
    const day = parseDay(form.dayOfMonth);
    if (day === null) return;

    let payload;
    if (form.type === 'open') {
      const balance = parsePositive(form.balance);
      const ratePct = parseRate(form.ratePercent);
      const payment = parsePositive(form.payment);
      if (balance === null || ratePct === null || payment === null) return;
      payload = {
        name: form.name,
        balance,
        monthlyRate: ratePct / 100,
        monthlyPayment: payment,
        dayOfMonth: day,
        loanType: 'open' as const,
        numInstallments: null,
        startYear: null,
        startMonth: null,
      };
    } else {
      const amount = parsePositive(form.installmentAmount);
      const num = parseInt1ToMax(form.numInstallments, 999);
      const sm = parseInt1ToMax(form.startMonth, 12);
      const sy = parseYear(form.startYear);
      if (amount === null || num === null || sm === null || sy === null) return;
      payload = {
        name: form.name,
        balance: amount * num,
        monthlyRate: 0,
        monthlyPayment: amount,
        dayOfMonth: day,
        loanType: 'installment' as const,
        numInstallments: num,
        startYear: sy,
        startMonth: sm,
      };
    }

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateLoan(id, payload);
      } else {
        const created = await createLoan(payload);
        if (form.type === 'installment') {
          const paidCount = parseNonNegInt(form.paidInstallments) ?? 0;
          if (paidCount > 0) {
            await bulkSeedLoanPayments(created.id, paidCount);
          }
        }
      }
      router.back();
    } catch (e) {
      setSaving(false);
      // eslint-disable-next-line no-console
      console.error('save loan failed', e);
    }
  };

  const handleCancel = () => router.back();

  const handleDelete = () => {
    if (!isEdit || !id) return;
    Alert.alert(
      t('loan.delete.confirmTitle'),
      t('loan.delete.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLoan(id);
              router.dismissAll();
              router.back();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('deleteLoan failed', e);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}
      >
        <Stack.Screen
          options={{
            title: t('loan.edit.title'),
            headerLeft: () => (
              <HeaderButton
                label={t('common.cancel')}
                onPress={handleCancel}
                theme={theme}
              />
            ),
          }}
        />
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View
        style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}
      >
        <Stack.Screen
          options={{
            title: t('loan.edit.title'),
            headerLeft: () => (
              <HeaderButton
                label={t('common.cancel')}
                onPress={handleCancel}
                theme={theme}
              />
            ),
          }}
        />
        <Text
          style={{ color: theme.colors.textMuted, padding: theme.spacing(4) }}
        >
          {t('loan.notFound')}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
    >
      <Stack.Screen
        options={{
          title: isEdit ? t('loan.edit.title') : t('loan.new.title'),
          headerLeft: () => (
            <HeaderButton
              label={t('common.cancel')}
              onPress={handleCancel}
              theme={theme}
            />
          ),
          headerRight: () => (
            <HeaderButton
              label={t('common.save')}
              onPress={handleSave}
              disabled={saving}
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
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedControl<LoanType>
          label={t('loan.field.type')}
          value={form.type}
          onChange={(v) => update('type', v)}
          options={[
            { value: 'open', label: t('loan.type.open') },
            { value: 'installment', label: t('loan.type.installment') },
          ]}
        />

        <TextField
          label={t('loan.field.name')}
          value={form.name}
          onChangeText={(v) => update('name', v)}
          placeholder={t('loan.placeholder.name')}
          maxLength={60}
          error={submitted && errors.name ? t(errors.name) : null}
        />

        {form.type === 'open' ? (
          <>
            <MoneyField
              label={t('loan.field.balance')}
              value={form.balance}
              onChangeText={(v) => update('balance', v)}
              error={submitted && errors.balance ? t(errors.balance) : null}
            />
            <TextField
              label={t('loan.field.rate')}
              value={form.ratePercent}
              onChangeText={(v) => update('ratePercent', v)}
              placeholder="1.85"
              prefix="%"
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              error={
                submitted && errors.ratePercent ? t(errors.ratePercent) : null
              }
            />
            <MoneyField
              label={t('loan.field.payment')}
              value={form.payment}
              onChangeText={(v) => update('payment', v)}
              error={submitted && errors.payment ? t(errors.payment) : null}
            />
          </>
        ) : (
          <>
            <MoneyField
              label={t('loan.field.installmentAmount')}
              value={form.installmentAmount}
              onChangeText={(v) => update('installmentAmount', v)}
              error={
                submitted && errors.installmentAmount
                  ? t(errors.installmentAmount)
                  : null
              }
            />
            <TextField
              label={t('loan.field.numInstallments')}
              value={form.numInstallments}
              onChangeText={(v) =>
                update('numInstallments', v.replace(/\D/g, '').slice(0, 3))
              }
              placeholder="12"
              keyboardType="number-pad"
              maxLength={3}
              error={
                submitted && errors.numInstallments
                  ? t(errors.numInstallments)
                  : null
              }
            />
            <MonthYearField
              label={t('loan.field.startMonth')}
              year={Number(form.startYear) || new Date().getFullYear()}
              month={Number(form.startMonth) || new Date().getMonth() + 1}
              onChange={(y, m) =>
                setForm((s) => ({
                  ...s,
                  startYear: String(y),
                  startMonth: String(m),
                }))
              }
              error={submitted && errors.start ? t(errors.start) : null}
            />
            {!isEdit && (
              <View style={{ gap: theme.spacing(1) }}>
                <TextField
                  label={t('loan.field.paidInstallments')}
                  value={form.paidInstallments}
                  onChangeText={(v) =>
                    update(
                      'paidInstallments',
                      v.replace(/\D/g, '').slice(0, 3),
                    )
                  }
                  placeholder="0"
                  keyboardType="number-pad"
                  maxLength={3}
                  error={
                    submitted && errors.paidInstallments
                      ? t(errors.paidInstallments)
                      : null
                  }
                />
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.xs,
                    lineHeight: theme.font.size.xs * 1.4,
                  }}
                >
                  {t('loan.field.paidInstallments.hint')}
                </Text>
              </View>
            )}
          </>
        )}

        <TextField
          label={t('loan.field.dayOfMonth')}
          value={form.dayOfMonth}
          onChangeText={(v) =>
            update('dayOfMonth', v.replace(/\D/g, '').slice(0, 2))
          }
          placeholder="1-31"
          keyboardType="number-pad"
          maxLength={2}
          error={submitted && errors.dayOfMonth ? t(errors.dayOfMonth) : null}
        />

        {isEdit && (
          <Pressable
            onPress={handleDelete}
            disabled={saving}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: theme.spacing(3),
                marginTop: theme.spacing(2),
                opacity: saving ? 0.4 : pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.danger,
                fontSize: theme.font.size.md,
                fontWeight: theme.font.weight.semibold,
                textAlign: 'center',
              }}
            >
              {t('loan.delete')}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HeaderButton({
  label,
  onPress,
  disabled,
  theme,
  accent,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: Theme;
  accent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      style={({ pressed }) => [
        styles.headerBtn,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      <Text
        style={{
          color: accent ? theme.colors.accent : theme.colors.text,
          fontSize: theme.font.size.md,
          fontWeight: accent
            ? theme.font.weight.semibold
            : theme.font.weight.regular,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
