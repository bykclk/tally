import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runMigrations } from '@/db/client';
import { getPref, setPref } from '@/db/queries/prefs';
import { useCurrencyStore } from '@/stores/currency';
import { useLocaleStore } from '@/stores/locale';
import { useThemeModeStore } from '@/stores/themeMode';
import { useNotificationStore } from '@/stores/notifications';
import { initNotifications, rescheduleAll } from '@/lib/notifications';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { Onboarding } from '@/ui/Onboarding';
import { ToastHost } from '@/ui/ToastHost';
import { useTheme } from '@/ui/theme';

const ONBOARDING_KEY = 'onboarding.done';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await runMigrations();
        await Promise.all([
          useLocaleStore.getState().loadFromPrefs(),
          useThemeModeStore.getState().loadFromPrefs(),
          useCurrencyStore.getState().loadFromPrefs(),
          useNotificationStore.getState().loadFromPrefs(),
        ]);
        setOnboardingDone((await getPref(ONBOARDING_KEY)) === '1');
        setDbReady(true);
        await initNotifications();
        await rescheduleAll();
      } catch (e) {
        setDbError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const completeOnboarding = () => {
    setOnboardingDone(true);
    void setPref(ONBOARDING_KEY, '1');
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void rescheduleAll();
    });
    return () => sub.remove();
  }, []);

  if (dbError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <Text style={{ color: theme.colors.danger, padding: theme.spacing(4) }}>
          DB error: {dbError}
        </Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!onboardingDone) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Onboarding onDone={completeOnboarding} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.bg },
            headerTintColor: theme.colors.text,
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: theme.colors.bg },
          }}
        >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="entry/new" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen
          name="entry/confirm"
          options={{ presentation: 'modal', title: '' }}
        />
        <Stack.Screen
          name="entry/history"
          options={{ presentation: 'modal', title: '' }}
        />
        <Stack.Screen name="loan/new" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="loan/[id]" options={{ title: '' }} />
        <Stack.Screen name="balance" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="breakdown" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="about" options={{ presentation: 'modal', title: '' }} />
        </Stack>
      </ErrorBoundary>
      <ToastHost />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
