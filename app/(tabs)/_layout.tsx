import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const t = useT();
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: t('tabs.forecast'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'trending-up' : 'trending-up-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: t('tabs.loans'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
