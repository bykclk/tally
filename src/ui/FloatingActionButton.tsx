import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from './theme';

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
};

const SIZE = 56;

export function FloatingActionButton({
  onPress,
  icon = 'add',
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  return (
    <View
      pointerEvents="box-none"
      style={styles.container}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.colors.accent,
            transform: [{ scale: pressed ? 0.94 : 1 }],
            shadowColor: '#000',
          },
        ]}
      >
        <Ionicons name={icon} size={30} color={theme.colors.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
