import * as Haptics from 'expo-haptics';

/**
 * Fire-and-forget haptic feedback helpers. All calls return promises but we
 * never await them at call sites — the haptic should happen in parallel with
 * the user-visible action, not block it.
 */
export const haptics = {
  light: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  select: () => {
    void Haptics.selectionAsync();
  },
  success: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
