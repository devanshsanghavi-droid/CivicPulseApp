// src/constants/theme.ts
// Light and dark theme color palettes for the app

export const lightTheme = {
    background: '#f8fafc',
    card: '#ffffff',
    border: '#f3f4f6',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    primary: '#2563eb',
    primaryLight: '#eff6ff',
    primaryBorder: '#dbeafe',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    // Status / Map
    open: '#2563eb',
    acknowledged: '#d97706',
    resolved: '#16a34a',
};

export const darkTheme = {
    background: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    primary: '#3b82f6',
    primaryLight: '#1e3a5f',
    primaryBorder: '#1e40af',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    // Status / Map
    open: '#3b82f6',
    acknowledged: '#f59e0b',
    resolved: '#22c55e',
};

export type AppTheme = typeof lightTheme;
