/* ============================================================
   MitMe — Design System (Light + Dark)
   ============================================================ */

/* ------------------------------------------------------------
   Types
   ------------------------------------------------------------ */

export interface ThemePalette {
  /* Surfaces */
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  surfaceBorder: string;
  surfaceBorderStrong: string;

  /* Brand */
  purple: string;
  purpleLight: string;
  purpleDark: string;
  purpleSoft: string;
  purpleGlow: string;

  blue: string;
  blueLight: string;
  blueSoft: string;

  /* Text */
  ink: string;
  inkStrong: string;
  muted: string;
  mutedLight: string;
  mutedDim: string;

  /* Semantic */
  success: string;
  successSoft: string;
  successGlow: string;

  danger: string;
  dangerSoft: string;
  dangerGlow: string;

  warning: string;
  warningSoft: string;

  /* Legacy aliases */
  card: string;
  border: string;
  green: string;
}

export type GradientPair = readonly [string, string];

export interface ThemeGradients {
  brand: GradientPair;
  brandDeep: GradientPair;
  brandSoft: GradientPair;
  purpleOnly: GradientPair;
  blueOnly: GradientPair;
  success: GradientPair;
  danger: GradientPair;
}

export interface ShadowStyle {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export interface ThemeShadows {
  card: ShadowStyle;
  sm: ShadowStyle;
  nav: ShadowStyle;
  glow: ShadowStyle;
}

/* ------------------------------------------------------------
   DARK palette (default)
   ------------------------------------------------------------ */

export const darkColors: ThemePalette = {
  /* Surfaces */
  bg: '#0A0A0F',
  bgElevated: '#101018',
  surface: '#14141C',
  surfaceElevated: '#1A1A24',
  surfaceHover: '#1F1F2A',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  surfaceBorderStrong: 'rgba(255,255,255,0.10)',

  /* Brand */
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  purpleDark: '#6D42D8',
  purpleSoft: 'rgba(139, 92, 246, 0.12)',
  purpleGlow: 'rgba(139, 92, 246, 0.35)',

  blue: '#3B82F6',
  blueLight: '#60A5FA',
  blueSoft: 'rgba(59, 130, 246, 0.12)',

  /* Text */
  ink: '#F5F5F7',
  inkStrong: '#FFFFFF',
  muted: '#8B8B9A',
  mutedLight: '#6B6B7B',
  mutedDim: '#56566B',

  /* Semantic */
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  successGlow: 'rgba(16, 185, 129, 0.30)',

  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  dangerGlow: 'rgba(239, 68, 68, 0.30)',

  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',

  /* Legacy aliases */
  card: '#14141C',
  border: 'rgba(255,255,255,0.06)',
  green: '#10B981',
};

/* ------------------------------------------------------------
   LIGHT palette
   ------------------------------------------------------------ */

export const lightColors: ThemePalette = {
  /* Surfaces */
  bg: '#F7F6FB',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F9F8FD',
  surfaceHover: '#F0EBFF',
  surfaceBorder: 'rgba(0,0,0,0.06)',
  surfaceBorderStrong: 'rgba(0,0,0,0.10)',

  /* Brand */
  purple: '#6D42D8',
  purpleLight: '#8B5CF6',
  purpleDark: '#4B24A8',
  purpleSoft: 'rgba(109, 66, 216, 0.10)',
  purpleGlow: 'rgba(109, 66, 216, 0.25)',

  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueSoft: 'rgba(37, 99, 235, 0.10)',

  /* Text */
  ink: '#17152B',
  inkStrong: '#0F0D1F',
  muted: '#6B6B7B',
  mutedLight: '#8B8B9A',
  mutedDim: '#A0A0B0',

  /* Semantic */
  success: '#059669',
  successSoft: 'rgba(5, 150, 105, 0.10)',
  successGlow: 'rgba(5, 150, 105, 0.20)',

  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.10)',
  dangerGlow: 'rgba(220, 38, 38, 0.20)',

  warning: '#D97706',
  warningSoft: 'rgba(217, 119, 6, 0.10)',

  /* Legacy aliases */
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  green: '#059669',
};

/* ------------------------------------------------------------
   Backward-compatible default export
   ------------------------------------------------------------ */

export const colors: ThemePalette = darkColors;

/* ------------------------------------------------------------
   Gradients
   ------------------------------------------------------------ */

export const darkGradients: ThemeGradients = {
  brand: ['#8B5CF6', '#3B82F6'],
  brandDeep: ['#6D42D8', '#4F46E5'],
  brandSoft: ['rgba(139,92,246,0.18)', 'rgba(59,130,246,0.14)'],
  purpleOnly: ['#8B5CF6', '#6D42D8'],
  blueOnly: ['#3B82F6', '#2563EB'],
  success: ['#10B981', '#059669'],
  danger: ['#EF4444', '#DC2626'],
};

export const lightGradients: ThemeGradients = {
  brand: ['#6D42D8', '#2563EB'],
  brandDeep: ['#4B24A8', '#3730A3'],
  brandSoft: ['rgba(109,66,216,0.12)', 'rgba(37,99,235,0.10)'],
  purpleOnly: ['#6D42D8', '#4B24A8'],
  blueOnly: ['#2563EB', '#1D4ED8'],
  success: ['#059669', '#047857'],
  danger: ['#DC2626', '#B91C1C'],
};

export const gradients: ThemeGradients = darkGradients;

/* ------------------------------------------------------------
   Non-theme tokens
   ------------------------------------------------------------ */

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
  huge: 34,
} as const;

export const weights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/* ------------------------------------------------------------
   Shadows
   ------------------------------------------------------------ */

export const darkShadows: ThemeShadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nav: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const lightShadows: ThemeShadows = {
  card: {
    shadowColor: '#17152B',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sm: {
    shadowColor: '#17152B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  nav: {
    shadowColor: '#17152B',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  glow: {
    shadowColor: '#6D42D8',
    shadowOpacity: 0.20,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

export const shadows: ThemeShadows = darkShadows;