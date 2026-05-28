import { create } from 'zustand';
import { currentMonth, shiftMonth } from '@/lib/date';

type MonthState = {
  year: number;
  month: number;
  next: () => void;
  prev: () => void;
  reset: () => void;
  set: (year: number, month: number) => void;
};

const initial = currentMonth();

export const useMonthStore = create<MonthState>((set) => ({
  year: initial.year,
  month: initial.month,
  next: () =>
    set((s) => {
      const n = shiftMonth(s.year, s.month, 1);
      return { year: n.year, month: n.month };
    }),
  prev: () =>
    set((s) => {
      const n = shiftMonth(s.year, s.month, -1);
      return { year: n.year, month: n.month };
    }),
  reset: () => {
    const n = currentMonth();
    set({ year: n.year, month: n.month });
  },
  set: (year, month) => set({ year, month }),
}));
