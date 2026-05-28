import { useColorScheme } from 'react-native';
import { useThemeModeStore } from '@/stores/themeMode';

export type ResolvedTheme = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
  income: string;
  expense: string;
  pending: string;
  danger: string;
};

export type Theme = {
  mode: ResolvedTheme;
  colors: ThemeColors;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
  font: {
    size: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
    weight: { regular: '400'; medium: '500'; semibold: '600'; bold: '700' };
  };
};

const lightColors: ThemeColors = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F5F4',
  text: '#1A1A1A',
  textMuted: '#737373',
  border: '#E7E5E4',
  accent: '#0F766E',
  accentText: '#FFFFFF',
  income: '#15803D',
  expense: '#B91C1C',
  pending: '#A8A29E',
  danger: '#DC2626',
};

const darkColors: ThemeColors = {
  bg: '#0A0A0A',
  surface: '#171717',
  surfaceMuted: '#1F1F1F',
  text: '#FAFAFA',
  textMuted: '#A3A3A3',
  border: '#262626',
  accent: '#14B8A6',
  accentText: '#0A0A0A',
  income: '#22C55E',
  expense: '#EF4444',
  pending: '#737373',
  danger: '#F87171',
};

const base = {
  spacing: (n: number) => n * 4,
  radius: { sm: 6, md: 10, lg: 16, pill: 999 },
  font: {
    size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
} as const;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const override = useThemeModeStore((s) => s.mode);
  const mode: ResolvedTheme =
    override === 'light'
      ? 'light'
      : override === 'dark'
        ? 'dark'
        : scheme === 'dark'
          ? 'dark'
          : 'light';
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    ...base,
  };
}
