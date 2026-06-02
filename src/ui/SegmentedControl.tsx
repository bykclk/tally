import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { useTheme } from './theme';

type Option<T extends string | number> = {
  value: T;
  label: string;
  activeColor?: string;
};

type Props<T extends string | number> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: Props<T>) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      {label && (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.md,
            padding: theme.spacing(1),
          },
        ]}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          const activeBg = opt.activeColor ?? theme.colors.accent;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                if (opt.value !== value) {
                  haptics.select();
                  onChange(opt.value);
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
              style={({ pressed }) => [
                styles.segment,
                {
                  backgroundColor: active ? activeBg : 'transparent',
                  borderRadius: theme.radius.sm,
                  paddingVertical: theme.spacing(2),
                  opacity: pressed && !active ? 0.6 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.colors.accentText : theme.colors.text,
                  fontSize: theme.font.size.sm,
                  fontWeight: active
                    ? theme.font.weight.semibold
                    : theme.font.weight.medium,
                  textAlign: 'center',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
