import { create } from 'zustand';
import { getPref, setPref } from '@/db/queries/prefs';

const ENABLED_KEY = 'notifications.enabled';
const DAYS_KEY = 'notifications.daysBefore';

const VALID_DAYS = [1, 2, 3] as const;
export type DaysBefore = (typeof VALID_DAYS)[number];

function isDaysBefore(n: number): n is DaysBefore {
  return (VALID_DAYS as readonly number[]).includes(n);
}

type NotificationState = {
  enabled: boolean;
  daysBefore: DaysBefore;
  setEnabled: (enabled: boolean) => Promise<void>;
  setDaysBefore: (days: DaysBefore) => Promise<void>;
  loadFromPrefs: () => Promise<void>;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  enabled: false,
  daysBefore: 2,
  setEnabled: async (enabled) => {
    set({ enabled });
    await setPref(ENABLED_KEY, enabled ? '1' : '0');
  },
  setDaysBefore: async (daysBefore) => {
    set({ daysBefore });
    await setPref(DAYS_KEY, String(daysBefore));
  },
  loadFromPrefs: async () => {
    const [enabledRaw, daysRaw] = await Promise.all([
      getPref(ENABLED_KEY),
      getPref(DAYS_KEY),
    ]);
    const daysNum = Number(daysRaw);
    set({
      enabled: enabledRaw === '1',
      daysBefore: isDaysBefore(daysNum) ? daysNum : 2,
    });
  },
}));
