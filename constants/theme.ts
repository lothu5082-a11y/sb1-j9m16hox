export const Colors = {
  primary: '#00E5FF',
  primaryDark: '#00B8D4',
  primaryLight: '#80F0FF',
  secondary: '#00BFA5',
  accent: '#FF6D00',
  accentLight: '#FF9E40',
  success: '#00E676',
  warning: '#FFD600',
  error: '#FF1744',
  background: '#0A0E1A',
  backgroundSecondary: '#111827',
  backgroundTertiary: '#1A2035',
  surface: '#1E2740',
  surfaceLight: '#253050',
  border: '#2A3555',
  borderLight: '#3A4565',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  glow: 'rgba(0, 229, 255, 0.3)',
  glowStrong: 'rgba(0, 229, 255, 0.6)',
  overlay: 'rgba(10, 14, 26, 0.85)',
  gradientStart: '#0A0E1A',
  gradientEnd: '#111827',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 56,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  glowStrong: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};
