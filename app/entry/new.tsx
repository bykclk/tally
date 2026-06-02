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
import { useT, useLocale, type TranslationKey } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { currentMonth } from '@/lib/date';
import { moneyValueToInput, parseMoneyInput } from '@/lib/moneyInput';
import { useMonthStore } from '@/stores/month';
import {
  createEntry,
  deleteEntry,
  getEntry,
  updateEntry,
} from '@/db/queries/entries';
import type { Direction, Entry, Kind, Locale, Recurrence } from '@/types';

type FormState = {
  recurrence: Recurrence;
  direction: Direction;
  kind: Kind;
  name: string;
  amount: string;
  dayOfMonth: string;
  category: string;
  year: number;
  month: number;
};

type Errors = Partial<Record<'name' | 'amount' | 'dayOfMonth', TranslationKey>>;

function parseAmount(raw: string, locale: Locale): number | null {
  const n = parseMoneyInput(raw, locale);
  if (n === null || n <= 0) return null;
  return n;
}

function parseDay(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 31) return null;
  return n;
}

function validate(form: FormState, locale: Locale): Errors {
  const e: Errors = {};
  if (!form.name.trim()) e.name = 'entry.validation.nameRequired';
  if (parseAmount(form.amount, locale) === null)
    e.amount = 'entry.validation.amountInvalid';
  if (parseDay(form.dayOfMonth) === null) e.dayOfMonth = 'entry.validation.dayInvalid';
  return e;
}

function entryToForm(entry: Entry, locale: Locale): FormState {
  const cm = currentMonth();
  return {
    recurrence: entry.recurrence,
    direction: entry.direction,
    kind: entry.kind,
    name: entry.name,
    amount: moneyValueToInput(entry.amount, locale),
    dayOfMonth: String(entry.dayOfMonth),
    category: entry.category ?? '',
    year: entry.oneTimeYear ?? cm.year,
    month: entry.oneTimeMonth ?? cm.month,
  };
}

export default function EntryFormScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const viewedMonth = useMonthStore.getState();

  const [form, setForm] = useState<FormState>({
    recurrence: 'monthly',
    direction: 'expense',
    kind: 'fixed',
    name: '',
    amount: '',
    dayOfMonth: '',
    category: '',
    year: viewedMonth.year,
    month: viewedMonth.month,
  });
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      const entry = await getEntry(id);
      if (cancelled) return;
      if (!entry) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setForm(entryToForm(entry, locale));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, locale]);

  const errors = useMemo(() => validate(form, locale), [form, locale]);
  const isValid = Object.keys(errors).length === 0;
  const showErrors = submitted;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSubmitted(true);
    if (!isValid || saving) return;
    const amount = parseAmount(form.amount, locale);
    const day = parseDay(form.dayOfMonth);
    if (amount === null || day === null) return;
    setSaving(true);
    try {
      const isOnce = form.recurrence === 'once';
      const payload = {
        name: form.name,
        direction: form.direction,
        // One-time entries have no fixed/variable estimate behaviour.
        kind: isOnce ? ('fixed' as Kind) : form.kind,
        amount,
        dayOfMonth: day,
        category: form.category,
        recurrence: form.recurrence,
        oneTimeYear: isOnce ? form.year : null,
        oneTimeMonth: isOnce ? form.month : null,
      };
      if (isEdit && id) {
        await updateEntry(id, payload);
      } else {
        await createEntry(payload);
      }
      haptics.success();
      router.back();
    } catch (e) {
      setSaving(false);
      // eslint-disable-next-line no-console
      console.error('save entry failed', e);
    }
  };

  const handleCancel = () => router.back();

  const handleDelete = () => {
    if (!isEdit || !id) return;
    Alert.alert(
      t('entry.delete.confirmTitle'),
      t('entry.delete.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(id);
              haptics.warning();
              router.dismissAll();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('deleteEntry failed', e);
            }
          },
        },
      ],
    );
  };

  const amountLabel =
    form.recurrence === 'monthly' && form.kind === 'variable'
      ? t('entry.field.amountEstimate')
      : t('entry.field.amount');
  const namePlaceholder =
    form.direction === 'income'
      ? t('entry.placeholder.name.income')
      : t('entry.placeholder.name.expense');
  const kindHint =
    form.kind === 'fixed' ? t('entry.kind.fixedHint') : t('entry.kind.variableHint');

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}>
        <Stack.Screen
          options={{
            title: t('entry.edit.title'),
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
      <View style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}>
        <Stack.Screen
          options={{
            title: t('entry.edit.title'),
            headerLeft: () => (
              <HeaderButton
                label={t('common.cancel')}
                onPress={handleCancel}
                theme={theme}
              />
            ),
          }}
        />
        <Text style={{ color: theme.colors.textMuted, padding: theme.spacing(4) }}>
          {t('entry.notFound')}
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
          title: isEdit ? t('entry.edit.title') : t('entry.new.title'),
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
        <SegmentedControl<Recurrence>
          label={t('entry.field.recurrence')}
          value={form.recurrence}
          onChange={(v) => update('recurrence', v)}
          options={[
            { value: 'monthly', label: t('entry.recurrence.monthly') },
            { value: 'once', label: t('entry.recurrence.once') },
          ]}
        />

        <SegmentedControl<Direction>
          label={t('entry.field.direction')}
          value={form.direction}
          onChange={(v) => update('direction', v)}
          options={[
            {
              value: 'income',
              label: t('entry.direction.income'),
              activeColor: theme.colors.income,
            },
            {
              value: 'expense',
              label: t('entry.direction.expense'),
              activeColor: theme.colors.expense,
            },
          ]}
        />

        {form.recurrence === 'monthly' ? (
          <View style={{ gap: theme.spacing(1) }}>
            <SegmentedControl<Kind>
              label={t('entry.field.kind')}
              value={form.kind}
              onChange={(v) => update('kind', v)}
              options={[
                { value: 'fixed', label: t('entry.kind.fixed') },
                { value: 'variable', label: t('entry.kind.variable') },
              ]}
            />
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.xs,
                lineHeight: theme.font.size.xs * 1.4,
              }}
            >
              {kindHint}
            </Text>
          </View>
        ) : (
          <MonthYearField
            label={t('entry.field.month')}
            year={form.year}
            month={form.month}
            onChange={(y, m) =>
              setForm((s) => ({ ...s, year: y, month: m }))
            }
          />
        )}

        <TextField
          label={t('entry.field.name')}
          value={form.name}
          onChangeText={(v) => update('name', v)}
          placeholder={namePlaceholder}
          maxLength={60}
          error={showErrors && errors.name ? t(errors.name) : null}
        />

        <MoneyField
          label={amountLabel}
          value={form.amount}
          onChangeText={(v) => update('amount', v)}
          error={showErrors && errors.amount ? t(errors.amount) : null}
        />

        <TextField
          label={t('entry.field.dayOfMonth')}
          value={form.dayOfMonth}
          onChangeText={(v) => update('dayOfMonth', v.replace(/\D/g, '').slice(0, 2))}
          placeholder="1-31"
          keyboardType="number-pad"
          maxLength={2}
          error={showErrors && errors.dayOfMonth ? t(errors.dayOfMonth) : null}
        />

        <TextField
          label={t('entry.field.category')}
          value={form.category}
          onChangeText={(v) => update('category', v)}
          placeholder={t('entry.placeholder.category')}
          maxLength={40}
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
              {t('entry.delete')}
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
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.headerBtn,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      <Text
        style={{
          color: accent ? theme.colors.accent : theme.colors.text,
          fontSize: theme.font.size.md,
          fontWeight: accent ? theme.font.weight.semibold : theme.font.weight.regular,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
