import { ScrollView, Text, View } from 'react-native';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useTheme, type Theme } from '@/ui/theme';
import { useT } from '@/lib/i18n';
import { useLocaleStore } from '@/stores/locale';
import { useThemeModeStore } from '@/stores/themeMode';
import { useCurrencyStore } from '@/stores/currency';
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
