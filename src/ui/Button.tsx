import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme } from './theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: Props) {
  const theme = useTheme();

  const bg =
    variant === 'primary'
      ? theme.colors.accent
      : variant === 'secondary'
        ? theme.colors.surface
        : 'transparent';
  const fg =
    variant === 'primary'
      ? theme.colors.accentText
      : theme.colors.text;
  const borderColor =
    variant === 'secondary' ? theme.colors.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          paddingVertical: theme.spacing(3),
          paddingHorizontal: theme.spacing(5),
          borderRadius: theme.radius.md,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: fg,
          fontSize: theme.font.size.md,
          fontWeight: theme.font.weight.semibold,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
