import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useTheme, type Theme } from '@/ui/theme';
import { useT, useLocale } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { monthLabel } from '@/lib/date';
import { moneyValueToInput, parseMoneyInput } from '@/lib/moneyInput';
import {
  deleteMonthBalance,
  getMonthBalance,
  setMonthBalance,
} from '@/db/queries/monthlyBalances';
import { resolveStartingBalance } from '@/lib/monthlyBalance';
import { useMonthStore } from '@/stores/month';
import type { Locale } from '@/types';

function parseAmount(raw: string, locale: Locale): number | null {
  // Balance may legitimately be 0 or negative, so no positivity check.
  return parseMoneyInput(raw, locale);
}

export default function BalanceScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const initialMonth = useMonthStore.getState();
  const [year] = useState(initialMonth.year);
  const [month] = useState(initialMonth.month);

  const [amount, setAmount] = useState('');
  const [hasExplicit, setHasExplicit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getMonthBalance(year, month);
      const resolved =
        stored !== null ? stored : await resolveStartingBalance(year, month);
      if (cancelled) return;
      setAmount(moneyValueToInput(resolved, locale));
      setHasExplicit(stored !== null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, locale]);

  const handleSave = async () => {
    if (saving) return;
    const parsed = parseAmount(amount, locale);
    if (parsed === null) return;
    setSaving(true);
    try {
      await setMonthBalance(year, month, parsed);
      haptics.success();
      router.back();
    } catch (e) {
      setSaving(false);
      // eslint-disable-next-line no-console
      console.error('setMonthBalance failed', e);
    }
  };

  const handleAuto = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteMonthBalance(year, month);
      haptics.warning();
      router.back();
    } catch (e) {
      setSaving(false);
      // eslint-disable-next-line no-console
      console.error('deleteMonthBalance failed', e);
    }
  };

  const handleCancel = () => router.back();

  const title = t('balance.title', {
    month: monthLabel(year, month, locale),
  });

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.colors.bg }]}>
        <Stack.Screen
          options={{
            title,
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
    >
      <Stack.Screen
        options={{
          title,
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
          {t('balance.subtitle')}
        </Text>

        <MoneyField
          label={t('balance.field')}
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />

        {hasExplicit && (
          <View style={{ gap: theme.spacing(1) }}>
            <Pressable
              onPress={handleAuto}
              disabled={saving}
              hitSlop={8}
              style={({ pressed }) => [
                styles.autoBtn,
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
                  color: theme.colors.text,
                  fontSize: theme.font.size.md,
                  fontWeight: theme.font.weight.semibold,
                  textAlign: 'center',
                }}
              >
                {t('balance.auto')}
              </Text>
            </Pressable>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.xs,
                lineHeight: theme.font.size.xs * 1.4,
                paddingHorizontal: theme.spacing(1),
              }}
            >
              {t('balance.autoHint')}
            </Text>
          </View>
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
  autoBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
