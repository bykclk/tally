import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useTheme, type Theme } from '@/ui/theme';
import { useT } from '@/lib/i18n';
import { useLocaleStore } from '@/stores/locale';
import { useThemeModeStore } from '@/stores/themeMode';
import { useCurrencyStore } from '@/stores/currency';
import {
  useNotificationStore,
  type DaysBefore,
} from '@/stores/notifications';
import {
  rescheduleAll,
  requestNotificationPermission,
} from '@/lib/notifications';
import type { Currency, LocaleMode, ThemeMode } from '@/types';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();

  const localeMode = useLocaleStore((s) => s.mode);
  const setLocaleMode = useLocaleStore((s) => s.setMode);
  const themeModeValue = useThemeModeStore((s) => s.mode);
  const setThemeModeValue = useThemeModeStore((s) => s.setMode);
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const notifEnabled = useNotificationStore((s) => s.enabled);
  const setNotifEnabled = useNotificationStore((s) => s.setEnabled);
  const daysBefore = useNotificationStore((s) => s.daysBefore);
  const setDaysBefore = useNotificationStore((s) => s.setDaysBefore);

  const handleToggleNotif = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          t('settings.notif.deniedTitle'),
          t('settings.notif.deniedBody'),
        );
        return;
      }
    }
    await setNotifEnabled(value);
    await rescheduleAll();
  };

  const handleDaysChange = async (days: DaysBefore) => {
    await setDaysBefore(days);
    await rescheduleAll();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          gap: theme.spacing(6),
        }}
      >
        <Section title={t('settings.locale.title')} theme={theme}>
          <SegmentedControl<LocaleMode>
            value={localeMode}
            onChange={(v) => {
              void setLocaleMode(v);
            }}
            options={[
              { value: 'tr', label: t('settings.locale.tr') },
              { value: 'en', label: t('settings.locale.en') },
              { value: 'system', label: t('settings.locale.system') },
            ]}
          />
        </Section>

        <Section title={t('settings.theme.title')} theme={theme}>
          <SegmentedControl<ThemeMode>
            value={themeModeValue}
            onChange={(v) => {
              void setThemeModeValue(v);
            }}
            options={[
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'system', label: t('settings.theme.system') },
            ]}
          />
        </Section>

        <Section title={t('settings.currency.title')} theme={theme}>
          <SegmentedControl<Currency>
            value={currency}
            onChange={(v) => {
              void setCurrency(v);
            }}
            options={[
              { value: 'TRY', label: '₺ TRY' },
              { value: 'USD', label: '$ USD' },
              { value: 'EUR', label: '€ EUR' },
              { value: 'GBP', label: '£ GBP' },
            ]}
          />
        </Section>

        <Section title={t('settings.notif.title')} theme={theme}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.md,
              }}
            >
              {t('settings.notif.toggle')}
            </Text>
            <Switch
              value={notifEnabled}
              onValueChange={(v) => {
                void handleToggleNotif(v);
              }}
              trackColor={{ true: theme.colors.accent }}
            />
          </View>
          {notifEnabled && (
            <View style={{ gap: theme.spacing(2), marginTop: theme.spacing(2) }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.xs,
                  paddingHorizontal: theme.spacing(1),
                }}
              >
                {t('settings.notif.daysLabel')}
              </Text>
              <SegmentedControl<DaysBefore>
                value={daysBefore}
                onChange={(v) => {
                  void handleDaysChange(v);
                }}
                options={[
                  { value: 1, label: t('settings.notif.day1') },
                  { value: 2, label: t('settings.notif.day2') },
                  { value: 3, label: t('settings.notif.day3') },
                ]}
              />
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: Theme;
}) {
  return (
    <View style={{ gap: theme.spacing(2) }}>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.xs,
          fontWeight: theme.font.weight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: theme.spacing(1),
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
