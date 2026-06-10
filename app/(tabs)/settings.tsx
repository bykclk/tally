import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Card } from '@/ui/Card';
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
import { isDataEmpty, seedSampleData } from '@/lib/sampleData';
import { resetAllData } from '@/db/queries/reset';
import { haptics } from '@/lib/haptics';
import {
  iCloudAccountStatus,
  type ICloudAccountStatus,
} from '@/lib/sync/icloud';
import { pushPendingChanges } from '@/lib/sync/push';
import { applyRemoteChanges } from '@/lib/sync/apply';
import { showToast } from '@/stores/toast';
import type { Currency, LocaleMode, ThemeMode } from '@/types';
import type { TranslationKey } from '@/lib/i18n';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();

  const [canSeed, setCanSeed] = useState(false);
  const [icloud, setIcloud] = useState<ICloudAccountStatus | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);

  const handlePush = async () => {
    if (pushing) return;
    setPushing(true);
    try {
      const r = await pushPendingChanges();
      haptics.success();
      showToast(t('settings.icloud.pushDone', { count: r.saved + r.deleted }));
    } catch (e) {
      haptics.warning();
      showToast(t('settings.icloud.pushError'));
      console.error('iCloud push failed', e);
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    if (pulling) return;
    setPulling(true);
    try {
      const r = await applyRemoteChanges();
      haptics.success();
      showToast(t('settings.icloud.pullDone', { count: r.applied + r.deleted }));
    } catch (e) {
      haptics.warning();
      showToast(t('settings.icloud.pullError'));
      console.error('iCloud pull failed', e);
    } finally {
      setPulling(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      isDataEmpty().then((empty) => {
        if (!cancelled) setCanSeed(empty);
      });
      iCloudAccountStatus().then((s) => {
        if (!cancelled) setIcloud(s);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleSeed = () => {
    Alert.alert(
      t('settings.sample.confirmTitle'),
      t('settings.sample.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.sample.load'),
          onPress: async () => {
            try {
              await seedSampleData();
              setCanSeed(false);
              await rescheduleAll();
              haptics.success();
              router.navigate('/');
            } catch (e) {
               
              console.error('seedSampleData failed', e);
            }
          },
        },
      ],
    );
  };

  const handleReset = () => {
    Alert.alert(
      t('settings.reset.confirmTitle'),
      t('settings.reset.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.reset.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllData();
              setCanSeed(true);
              await rescheduleAll();
              haptics.warning();
              router.navigate('/');
            } catch (e) {
               
              console.error('resetAllData failed', e);
            }
          },
        },
      ],
    );
  };

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
            <View style={{ gap: theme.spacing(2) }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.xs,
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

        <Section title={t('settings.data.title')} theme={theme}>
          {canSeed ? (
            <>
              <Pressable
                onPress={handleSeed}
                style={({ pressed }) => ({
                  paddingVertical: theme.spacing(1),
                  alignItems: 'center',
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
                  {t('settings.sample.load')}
                </Text>
              </Pressable>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.xs,
                  lineHeight: theme.font.size.xs * 1.4,
                }}
              >
                {t('settings.sample.hint')}
              </Text>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => ({
                  paddingVertical: theme.spacing(1),
                  alignItems: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: theme.colors.danger,
                    fontSize: theme.font.size.md,
                    fontWeight: theme.font.weight.semibold,
                  }}
                >
                  {t('settings.reset.button')}
                </Text>
              </Pressable>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.xs,
                  lineHeight: theme.font.size.xs * 1.4,
                }}
              >
                {t('settings.reset.hint')}
              </Text>
            </>
          )}
        </Section>

        <Section title={t('settings.icloud.title')} theme={theme}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{ color: theme.colors.textMuted, fontSize: theme.font.size.sm }}
            >
              {t('settings.icloud.statusLabel')}
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.sm,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {icloud ? t(icloudStatusKey(icloud)) : '…'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.light();
              iCloudAccountStatus().then(setIcloud);
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({
              paddingVertical: theme.spacing(1),
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: theme.colors.accent,
                fontSize: theme.font.size.sm,
                fontWeight: theme.font.weight.semibold,
              }}
            >
              {t('settings.icloud.check')}
            </Text>
          </Pressable>
          {icloud === 'available' && (
            <Pressable
              onPress={() => {
                haptics.light();
                void handlePush();
              }}
              disabled={pushing}
              accessibilityRole="button"
              style={({ pressed }) => ({
                paddingVertical: theme.spacing(1),
                opacity: pushing ? 0.4 : pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.font.size.sm,
                  fontWeight: theme.font.weight.semibold,
                }}
              >
                {pushing ? t('settings.icloud.pushing') : t('settings.icloud.push')}
              </Text>
            </Pressable>
          )}
          {icloud === 'available' && (
            <Pressable
              onPress={() => {
                haptics.light();
                void handlePull();
              }}
              disabled={pulling}
              accessibilityRole="button"
              style={({ pressed }) => ({
                paddingVertical: theme.spacing(1),
                opacity: pulling ? 0.4 : pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.font.size.sm,
                  fontWeight: theme.font.weight.semibold,
                }}
              >
                {pulling ? t('settings.icloud.pulling') : t('settings.icloud.pull')}
              </Text>
            </Pressable>
          )}
        </Section>

        <Pressable
          onPress={() => router.push('/about')}
          accessibilityRole="button"
          accessibilityLabel={t('about.title')}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Card
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing(3),
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.md }}>
              {t('about.title')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textMuted}
            />
          </Card>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function icloudStatusKey(status: ICloudAccountStatus): TranslationKey {
  return `settings.icloud.status.${status}` as TranslationKey;
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
      <Card style={{ gap: theme.spacing(2) }}>{children}</Card>
    </View>
  );
}
