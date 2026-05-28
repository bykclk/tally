import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from './theme';

type Props = ViewProps & {
  variant?: 'surface' | 'muted';
};

export function Card({ variant = 'surface', style, children, ...rest }: Props) {
  const theme = useTheme();
  const isMuted = variant === 'muted';
  return (
    <View
      style={[
        {
          backgroundColor: isMuted ? theme.colors.surfaceMuted : theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: isMuted ? 0 : StyleSheet.hairlineWidth,
          borderRadius: theme.radius.lg,
          padding: theme.spacing(4),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
