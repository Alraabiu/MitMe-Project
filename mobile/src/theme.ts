/* ============================================================
   MitMe — Design System (Dark-first, premium)
   ============================================================ */

export const colors = {
  // ─── Surfaces (deep charcoal, subtle blue tint) ─────────
  bg: '#0A0A0F',
  bgElevated: '#101018',
  surface: '#14141C',
  surfaceElevated: '#1A1A24',
  surfaceHover: '#1F1F2A',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  surfaceBorderStrong: 'rgba(255,255,255,0.10)',

  // ─── Brand (brighter for dark backgrounds) ──────────────
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  purpleDark: '#6D42D8',
  purpleSoft: 'rgba(139, 92, 246, 0.12)',
  purpleGlow: 'rgba(139, 92, 246, 0.35)',

  blue: '#3B82F6',
  blueLight: '#60A5FA',
  blueSoft: 'rgba(59, 130, 246, 0.12)',

  // ─── Text ───────────────────────────────────────────────
  ink: '#F5F5F7',
  inkStrong: '#FFFFFF',
  muted: '#8B8B9A',
  mutedLight: '#6B6B7B',
  mutedDim: '#56566B',

  // ─── Semantic ───────────────────────────────────────────
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  successGlow: 'rgba(16, 185, 129, 0.30)',

  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  dangerGlow: 'rgba(239, 68, 68, 0.30)',

  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',

  // ─── Legacy keys (kept for backward compat) ─────────────
  card: '#14141C',
  border: 'rgba(255,255,255,0.06)',
  green: '#10B981',
} as const;

export const gradients = {
  brand: ['#8B5CF6', '#3B82F6'] as const,
  brandDeep: ['#6D42D8', '#4F46E5'] as const,
  brandSoft: ['rgba(139,92,246,0.18)', 'rgba(59,130,246,0.14)'] as const,
  purpleOnly: ['#8B5CF6', '#6D42D8'] as const,
  blueOnly: ['#3B82F6', '#2563EB'] as const,
  success: ['#10B981', '#059669'] as const,
  danger: ['#EF4444', '#DC2626'] as const,
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
  huge: 34,
} as const;

export const weights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/** Dark UI doesn't rely on drop shadows much — it uses elevation by color. */
export const shadows = {
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
} as const;