import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { buildMonthlyItems } from './monthlyItems';
import { shiftMonth, currentMonth, shortDate, daysInMonth } from './date';
import { translate } from './i18n';
import { formatMoney } from './money';
import { useNotificationStore } from '@/stores/notifications';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore } from '@/stores/currency';

const REMINDER_HOUR = 10;
const MAX_SCHEDULED = 60; // stay well under iOS's 64-notification ceiling
const ANDROID_CHANNEL_ID = 'due-reminders';

let handlerConfigured = false;

/** Call once at app startup. Sets the foreground handler + Android channel. */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Ödeme hatırlatmaları',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Request OS permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function reminderDate(
  year: number,
  month: number,
  dueDay: number,
  daysBefore: number,
): Date {
  const safeDay = Math.min(dueDay, daysInMonth(year, month));
  const d = new Date(year, month - 1, safeDay, REMINDER_HOUR, 0, 0, 0);
  d.setDate(d.getDate() - daysBefore);
  return d;
}

/**
 * Cancels all scheduled reminders and re-schedules from current DB state.
 * Safe to call repeatedly (startup, foreground, settings change).
 */
export async function rescheduleAll(): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const { enabled, daysBefore } = useNotificationStore.getState();
  if (!enabled) return;

  const granted = (await Notifications.getPermissionsAsync()).granted;
  if (!granted) return;

  const locale = useLocaleStore.getState().locale;
  const currency = useCurrencyStore.getState().currency;
  const now = Date.now();

  const cm = currentMonth();
  const months = [cm, shiftMonth(cm.year, cm.month, 1)];

  type Pending = { date: Date; title: string; body: string };
  const pending: Pending[] = [];

  for (const { year, month } of months) {
    const items = await buildMonthlyItems(year, month);
    for (const item of items) {
      if (item.direction !== 'expense' || item.status !== 'pending') continue;
      const when = reminderDate(year, month, item.effectiveDay, daysBefore);
      if (when.getTime() <= now) continue;
      pending.push({
        date: when,
        title: item.name,
        body: translate(locale, 'notif.body', {
          date: shortDate(year, month, item.effectiveDay, locale),
          amount: formatMoney(item.effectiveAmount, currency),
        }),
      });
    }
  }

  pending.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const p of pending.slice(0, MAX_SCHEDULED)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.date,
        ...(Platform.OS === 'android'
          ? { channelId: ANDROID_CHANNEL_ID }
          : {}),
      },
    });
  }
}
