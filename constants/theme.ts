export const Colors = {
  // Core backgrounds — deep Vexsora blacks
  background: '#0B0B0A',
  backgroundSecondary: '#111110',
  backgroundTertiary: '#181817',

  // Card surfaces
  surface: '#1E1F20',
  surfaceLight: '#252628',
  surfaceElevated: '#2A2B2D',

  // Borders
  border: '#2C2D2F',
  borderLight: '#3A3B3E',

  // Primary accent — glowing purple
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  primaryLight: '#C084FC',
  primaryFaint: 'rgba(168,85,247,0.08)',

  // Secondary accent — electric blue
  secondary: '#3B82F6',
  secondaryDark: '#1D4ED8',
  secondaryLight: '#60A5FA',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  accent: '#F59E0B',
  accentLight: '#FCD34D',

  // Text
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textMuted: '#475569',

  // Glow effects
  glow: 'rgba(168,85,247,0.25)',
  glowStrong: 'rgba(168,85,247,0.55)',
  glowBlue: 'rgba(59,130,246,0.25)',
  glowBlueStrong: 'rgba(59,130,246,0.50)',

  // Overlay & gradients
  overlay: 'rgba(11,11,10,0.90)',
  overlayLight: 'rgba(11,11,10,0.60)',
  gradientStart: '#0B0B0A',
  gradientMid: '#0F0F10',
  gradientEnd: '#111110',

  // Chat specific
  userBubble: '#1E1F20',
  userBubbleBorder: '#2C2D2F',
  vexsoraBubble: 'transparent',
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const Shadows = {
  glow: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  glowStrong: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 24,
    elevation: 16,
  },
  glowBlue: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const Animations = {
  fast: 150,
  normal: 300,
  slow: 600,
  pulse: 2200,
};
