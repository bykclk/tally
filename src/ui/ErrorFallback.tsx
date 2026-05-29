import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { useT } from '@/lib/i18n';

type Props = {
  error: Error;
  onReset: () => void;
};

export function ErrorFallback({ error, onReset }: Props) {
  const theme = useTheme();
  const t = useT();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.center, { padding: theme.spacing(6), gap: theme.spacing(4) }]}>
        <Ionicons
          name="alert-circle-outline"
          size={56}
          color={theme.colors.textMuted}
        />
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.lg,
            fontWeight: theme.font.weight.bold,
            textAlign: 'center',
          }}
        >
          {t('error.title')}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.sm,
            textAlign: 'center',
            lineHeight: theme.font.size.sm * 1.5,
          }}
        >
          {t('error.body')}
        </Text>

        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: theme.colors.accentText,
              fontSize: theme.font.size.md,
              fontWeight: theme.font.weight.semibold,
            }}
          >
            {t('error.retry')}
          </Text>
        </Pressable>

        {__DEV__ && (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.xs,
              textAlign: 'center',
            }}
          >
            {error.message}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
