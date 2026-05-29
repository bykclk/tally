import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';
import { Card } from '@/ui/Card';
import { useTheme, type Theme } from '@/ui/theme';
import { useT } from '@/lib/i18n';

export default function AboutScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Stack.Screen
        options={{
          title: t('about.title'),
          headerLeft: () => (
            <Text
              onPress={() => router.back()}
              style={{
                color: theme.colors.accent,
                fontSize: theme.font.size.md,
                fontWeight: theme.font.weight.semibold,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              {t('common.done')}
            </Text>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing(4),
          gap: theme.spacing(4),
        }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing(2), paddingVertical: theme.spacing(4) }}>
          <Image
            source={require('../assets/images/icon.png')}
            style={{ width: 72, height: 72, borderRadius: 16 }}
          />
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.lg,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {t('about.appName')}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.sm }}>
            {t('about.version', { version })}
          </Text>
        </View>

        <InfoCard title={t('about.what.title')} body={t('about.what.body')} theme={theme} />
        <InfoCard
          title={t('about.disclaimer.title')}
          body={t('about.disclaimer.body')}
          theme={theme}
        />
        <InfoCard
          title={t('about.privacy.title')}
          body={t('about.privacy.body')}
          theme={theme}
        />
      </ScrollView>
    </View>
  );
}

function InfoCard({
  title,
  body,
  theme,
}: {
  title: string;
  body: string;
  theme: Theme;
}) {
  return (
    <Card style={{ gap: theme.spacing(2) }}>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.sm,
          fontWeight: theme.font.weight.semibold,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.sm,
          lineHeight: theme.font.size.sm * 1.5,
        }}
      >
        {body}
      </Text>
    </Card>
  );
}
