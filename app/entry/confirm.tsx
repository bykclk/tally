import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MoneyField } from '@/ui/MoneyField';
import { TextField } from '@/ui/TextField';
import { useTheme, type Theme } from '@/ui/theme';
import { useT, type TranslationKey } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { moneyValueToInput } from '@/lib/moneyInput';
import { isoForDayInMonth, daysInMonth } from '@/lib/date';
import { useMonthStore } from '@/stores/month';
import { getEntry } from '@/db/queries/entries';
import {
  deleteInstance,
  getInstance,
  upsertInstance,
} from '@/db/queries/instances';
import { estimateForEntry } from '@/lib/estimate';
import type { Entry } from '@/types';

type Errors = Partial<Record<'amount' | 'day', TranslationKey>>;

function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseDay(raw: string, year: number, month: number): number | null {
  const n = Number(raw.trim());
  const max = daysInMonth(year, month);
  if (!Number.isInteger(n) || n < 1 || n > max) return null;
  return n;
}

export default function ConfirmInstanceScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();

  const initialMonth = useMonthStore.getState();
  const [year] = useState(initialMonth.year);
  const [month] = useState(initialMonth.month);

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!entryId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const e = await getEntry(entryId);
      if (cancelled) return;
      if (!e) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const existing = await getInstance(e.id, year, month);
      if (cancelled) return;

      let defaultAmount = e.amount;
      let defaultDay = e.dayOfMonth;
      if (existing) {
        defaultAmount = existing.amount;
        const m = /^\d{4}-\d{2}-(\d{2})$/.exec(existing.date);
        if (m) defaultDay = Number(m[1]);
      } else if (e.kind === 'variable') {
        const est = await estimateForEntry(e.id);
        if (cancelled) return;
        if (est !== null) defaultAmount = est;
      }

      setEntry(e);
      setAmount(moneyValueToInput(defaultAmount));
      setDay(String(defaultDay));
      setHasConfirmed(existing?.status === 'confirmed');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId, year, month]);

  const errors = useMemo<Errors>(() => {
    const e: Errors = {};
    if (parseAmount(amount) === null) e.amount = 'entry.validation.amountInvalid';
    if (parseDay(day, year, month) === null) e.day = 'entry.validation.dayInvalid';
    return e;
  }, [amount, day, year, month]);
  const isValid = Object.keys(errors).length === 0;

  const handleCancel = () => router.back();

  const handleSave = async () => {
    setSubmitted(true);
    if (!isValid || !entry || saving) return;
    const amt = parseAmount(amount);
    const d = parseDay(day, year, month);
    if (amt === null || d === null) return;
    setSaving(true);
    try {
      await upsertInstance({
        entryId: entry.id,
        year,
        month,
        amount: amt,
        date: isoForDayInMonth(year, month, d),
        status: 'confirmed',
        isEstimate: false,
      });
      haptics.success();
      router.back();
    } catch (e) {
      setSaving(false);
      // eslint-disable-next-line no-console
      console.error('upsertInstance failed', e);
    }
  };

  const handleUnconfirm = async () => {
    if (!entry || saving) return;
    setSaving(true);
    try {
      await deleteInstance(entry.id, year, month);
      haptics.warning();
      router.back();
    } catch (e) {
      setSaving(false);
      // eslint-disable-next-line no-console
      console.error('deleteInstance failed', e);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.bg, flex: 1 },
        ]}
      >
        <Stack.Screen
          options={{
            title: t('confirm.title'),
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

  if (notFound || !entry) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg, flex: 1 }]}>
        <Stack.Screen
          options={{
            title: t('confirm.title'),
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
          style={{
            color: theme.colors.textMuted,
            padding: theme.spacing(4),
          }}
        >
          {t('confirm.notFound')}
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
          title: entry.name,
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
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.sm,
            lineHeight: theme.font.size.sm * 1.4,
          }}
        >
          {hasConfirmed ? t('confirm.subtitle.edit') : t('confirm.subtitle')}
        </Text>

        <MoneyField
          label={t('confirm.field.amount')}
          value={amount}
          onChangeText={setAmount}
          autoFocus={!hasConfirmed}
          error={submitted && errors.amount ? t(errors.amount) : null}
        />

        <TextField
          label={t('confirm.field.day')}
          value={day}
          onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))}
          placeholder="1-31"
          keyboardType="number-pad"
          maxLength={2}
          error={submitted && errors.day ? t(errors.day) : null}
        />

        <Pressable
          onPress={() =>
            router.replace({
              pathname: '/entry/new',
              params: { id: entry.id },
            })
          }
          hitSlop={8}
          style={({ pressed }) => [
            styles.editLink,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: theme.font.size.sm,
              fontWeight: theme.font.weight.semibold,
              textAlign: 'center',
            }}
          >
            {t('confirm.editTemplate')}
          </Text>
        </Pressable>

        {hasConfirmed && (
          <Pressable
            onPress={handleUnconfirm}
            disabled={saving}
            hitSlop={8}
            style={({ pressed }) => [
              styles.unconfirm,
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
              {t('confirm.unconfirm')}
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
  unconfirm: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  editLink: { paddingVertical: 8, alignItems: 'center' },
});
