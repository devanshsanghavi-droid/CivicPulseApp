// src/styles/designSystem.ts
// Central design system for CivicPulse React Native app

export const COLORS = {
  // Primary palette
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  primaryBorder: '#dbeafe',
  
  // Status colors
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  
  // Neutral palette
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#f3f4f6',
  
  // Map status colors
  open: '#2563eb',
  acknowledged: '#d97706',
  resolved: '#16a34a',
};

export const TYPOGRAPHY = {
  pageTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: -1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  caption: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  microLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  }),
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  round: 100,
};
