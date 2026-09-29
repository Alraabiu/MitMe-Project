export const colors = {
  // Brand
  purple: '#6d42d8',
  purpleLight: '#8c5cf4',
  purpleSoft: '#f0ebff',
  blue: '#3264e8',
  blueLight: '#37a0ef',

  // Neutrals
  ink: '#17152b',
  inkSoft: '#2b2740',
  muted: '#706d80',
  mutedLight: '#9b94b8',
  border: '#e7e3f0',
  borderLight: '#f2efff',
  card: '#ffffff',
  surface: '#f6f5fb',
  surfaceAlt: '#faf9fe',

  // Feedback
  success: '#21a66a',
  successSoft: '#e6f7ef',
  danger: '#d94b65',
  dangerSoft: '#fdecee',
  warning: '#e08c1c',
  warningSoft: '#fef3e0',

  // Existing keys (kept for backward compatibility)
  bg: '#f7f6fb',
  green: '#21a66a',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const font = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const weights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const shadows = {
  card: {
    shadowColor: '#1f1840',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sm: {
    shadowColor: '#1f1840',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nav: {
    shadowColor: '#1f1840',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;