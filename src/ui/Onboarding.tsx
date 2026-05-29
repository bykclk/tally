import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';
import { useT } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';

type Props = {
  onDone: () => void;
};

export function Onboarding({ onDone }: Props) {
  const theme = useTheme();
  const t = useT();

  const points: { icon: keyof typeof Ionicons.glyphMap; key: Parameters<typeof t>[0] }[] = [
    { icon: 'calendar-outline', key: 'onboarding.point1' },
    { icon: 'wallet-outline', key: 'onboarding.point2' },
    { icon: 'lock-closed-outline', key: 'onboarding.point3' },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: theme.spacing(6),
          justifyContent: 'center',
          gap: theme.spacing(6),
        }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing(4) }}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={{ width: 88, height: 88, borderRadius: 20 }}
          />
          <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.xxl,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {t('onboarding.title')}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.md,
                textAlign: 'center',
                lineHeight: theme.font.size.md * 1.4,
              }}
            >
              {t('onboarding.tagline')}
            </Text>
          </View>
        </View>

        <View style={{ gap: theme.spacing(4) }}>
          {points.map((p) => (
            <View
              key={p.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={p.icon} size={20} color={theme.colors.accent} />
              </View>
              <Text
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  fontSize: theme.font.size.sm,
                  lineHeight: theme.font.size.sm * 1.4,
                }}
              >
                {t(p.key)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          padding: theme.spacing(6),
          paddingTop: theme.spacing(2),
          gap: theme.spacing(3),
        }}
      >
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
            textAlign: 'center',
            lineHeight: theme.font.size.xs * 1.5,
          }}
        >
          {t('onboarding.disclaimer')}
        </Text>
        <Pressable
          onPress={() => {
            haptics.light();
            onDone();
          }}
          style={({ pressed }) => [
            styles.startBtn,
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
            {t('onboarding.start')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  startBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
