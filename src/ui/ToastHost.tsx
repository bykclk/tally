import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/toast';
import { haptics } from '@/lib/haptics';
import { useTheme } from './theme';

/**
 * Single root-mounted toast renderer. Slides up from the bottom, auto-dismisses
 * (longer when there's an action so "Undo" is reachable), and uses RN's Animated
 * (native driver) — no Reanimated worklets involved.
 */
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const message = useToastStore((s) => s.message);
  const action = useToastStore((s) => s.action);
  const seq = useToastStore((s) => s.seq);
  const hide = useToastStore((s) => s.hide);
  const anim = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => hide());
  }, [anim, hide]);

  useEffect(() => {
    if (!message) return;
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 80,
    }).start();
    const timer = setTimeout(dismiss, action ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [seq, message, action, anim, dismiss]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + 64,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.sm,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {message}
        </Text>
        {action && (
          <Pressable
            onPress={() => {
              haptics.light();
              action.onPress();
              dismiss();
            }}
            hitSlop={10}
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              style={{
                color: theme.colors.accent,
                fontSize: theme.font.size.sm,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
