export const colors = {
  bg: '#f7f6fb',
  card: '#ffffff',
  ink: '#17152b',
  muted: '#706d80',
  purple: '#6d42d8',
  blue: '#3264e8',
  border: '#e7e3f0',
  danger: '#d94b65',
  green: '#21a66a',

  purpleLight: '#8c5cf4',
  blueLight: '#37a0ef',
  sidebarBg: '#17132a',
  sidebarFg: '#ffffff',
  sidebarMuted: '#cfc9dd',
  sidebarDim: '#bbb4d1',
  backgroundLight: '#eee9ff',
  overlay: 'rgba(0,0,0,0.5)',
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
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const font = {
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const shadows = {
  card: {
    shadowColor: '#1f1840',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sm: {
    shadowColor: '#1f1840',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;
