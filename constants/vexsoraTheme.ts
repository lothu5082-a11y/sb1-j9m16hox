/**
 * Vexsora — "Void Black" Design System
 * --------------------------------------
 * A single source of truth for the premium offline-first theme.
 *
 *  • Void Black (#000000)  — pure deep background, zero distraction
 *  • Neon Violet (#8A2BE2) — system actions (send, controls, the human)
 *  • Neon Emerald (#00FF7F)— active AI states (engine live, thinking, output)
 *
 * Keep this file dependency-free so it can be imported by any layer
 * (UI components, the API client, diagnostics) without side effects.
 */

import { Platform } from 'react-native';

export const VexsoraColors = {
  // Surfaces — graduated voids
  void: '#000000',
  voidRaised: '#050507',
  surface: '#0A0A0D',
  surfaceAlt: '#101015',
  border: '#1B1B22',
  borderBright: '#2A2A35',

  // Neon violet — system / human actions
  violet: '#8A2BE2',
  violetBright: '#A45BF0',
  violetDim: 'rgba(138, 43, 226, 0.14)',
  violetGlow: 'rgba(138, 43, 226, 0.45)',

  // Neon emerald — active AI states
  emerald: '#00FF7F',
  emeraldBright: '#5BFFAB',
  emeraldDim: 'rgba(0, 255, 127, 0.10)',
  emeraldGlow: 'rgba(0, 255, 127, 0.40)',

  // Diagnostics
  danger: '#FF4D6D',
  dangerDim: 'rgba(255, 77, 109, 0.12)',
  dangerGlow: 'rgba(255, 77, 109, 0.35)',
  amber: '#FFB347',

  // Type
  text: '#EDEDF5',
  textDim: '#7A7A8C',
  textFaint: '#42424F',
} as const;

export const VexsoraSpacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const VexsoraRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/** Monospace stack for the terminal aesthetic, per-platform. */
export const MonoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const VexsoraType = {
  mono: MonoFont,
  display: Platform.OS === 'web' ? 'Orbitron, monospace' : 'Orbitron-Bold',
  body: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
} as const;

/** Reusable neon glow shadows. */
export const VexsoraGlow = {
  violet: {
    shadowColor: VexsoraColors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 10,
  },
  emerald: {
    shadowColor: VexsoraColors.emerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 10,
  },
  danger: {
    shadowColor: VexsoraColors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
