export const colors = {
  // Brand Primary (Indigo)
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary800: '#3730A3',
  primary100: '#E0E7FF',
  primary50: '#EEF2FF',

  // Slate Inks
  ink900: '#0F172A', // Headings, display
  ink800: '#1E293B', // High contrast elements
  ink700: '#334155', // Primary body, form labels
  ink600: '#475569', // Secondary body, labels
  ink500: '#64748B', // Captions, helper text, placeholders
  ink400: '#94A3B8', // Muted timestamps, icons

  // Borders & Surfaces
  line: '#E2E8F0', // Card borders, dividers, input borders
  bg: '#F8FAFC', // Main app background
  bgMuted: '#F1F5F9', // Muted container background
  surface: '#FFFFFF', // Cards, sheets, elevated surfaces
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',

  // Semantic Alerts & Badges
  success: '#16A34A',
  successBg: '#DCFCE7',

  warning: '#D97706',
  warningBg: '#FEF3C7',
  amber500: '#F59E0B',

  danger: '#DC2626',
  dangerBg: '#FEE2E2',

  info: '#0284C7',
  infoBg: '#E0F2FE',
} as const;

export const typography = {
  fonts: {
    uiRegular: 'PlusJakartaSans-Regular',
    uiMedium: 'PlusJakartaSans-Medium',
    uiSemiBold: 'PlusJakartaSans-SemiBold',
    uiBold: 'PlusJakartaSans-Bold',
    serifRegular: 'Newsreader-Regular',
    serifSemiBold: 'Newsreader-SemiBold',
    serifBold: 'Newsreader-Bold',
    storyRegular: 'Newsreader-Regular',
    storyItalic: 'Newsreader-MediumItalic',
  },
  styles: {
    display: {
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 32,
      lineHeight: 38,
      color: colors.ink900,
    },
    h1: {
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 26,
      lineHeight: 32,
      color: colors.ink900,
    },
    h2: {
      fontFamily: 'PlusJakartaSans-SemiBold',
      fontSize: 20,
      lineHeight: 26,
      color: colors.ink900,
    },
    h3: {
      fontFamily: 'PlusJakartaSans-SemiBold',
      fontSize: 17,
      lineHeight: 24,
      color: colors.ink900,
    },
    body: {
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: colors.ink700,
    },
    bodyMedium: {
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 16,
      lineHeight: 24,
      color: colors.ink700,
    },
    small: {
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 14,
      lineHeight: 20,
      color: colors.ink500,
    },
    smallMedium: {
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 14,
      lineHeight: 20,
      color: colors.ink700,
    },
    caption: {
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 12,
      lineHeight: 16,
      color: colors.ink500,
    },
    captionSemiBold: {
      fontFamily: 'PlusJakartaSans-SemiBold',
      fontSize: 12,
      lineHeight: 16,
      color: colors.ink500,
    },
    storyBody: {
      fontFamily: 'Newsreader-Regular',
      fontSize: 18,
      lineHeight: 28,
      color: colors.ink900,
    },
    storyItalic: {
      fontFamily: 'Newsreader-MediumItalic',
      fontSize: 18,
      lineHeight: 28,
      color: colors.ink900,
    },
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20, // Standard screen horizontal padding
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  input: 12,
  lg: 16,
  card: 16,
  sheet: 24,
  pill: 999,
  full: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const motion = {
  durationShort: 150,
  durationBase: 200,
  durationLong: 250,
  pressScale: 0.98,
} as const;

export const touchTargets = {
  minTouchSize: 48,
  buttonHeightLg: 52,
  buttonHeightMd: 44,
  buttonHeightSm: 36,
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  touchTargets,
} as const;

export type Theme = typeof theme;
