import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runMigrations } from '@/db/client';
import { useLocaleStore } from '@/stores/locale';
import { useThemeModeStore } from '@/stores/themeMode';
import { useTheme } from '@/ui/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await runMigrations();
        await Promise.all([
          useLocaleStore.getState().loadFromPrefs(),
          useThemeModeStore.getState().loadFromPrefs(),
        ]);
        setDbReady(true);
      } catch (e) {
        setDbError(e instanceof Error ? e.message : String(e));
      }
    })();
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.text,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="entry/new" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen
          name="entry/confirm"
          options={{ presentation: 'modal', title: '' }}
        />
        <Stack.Screen name="loan/new" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="loan/[id]" options={{ title: '' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
