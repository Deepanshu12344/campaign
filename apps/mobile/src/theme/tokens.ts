/**
 * Design System Tokens — Dark Green-Black & Lime Theme
 *
 * Sampled and matched directly against reference screenshots in docs/reference/:
 * - App Background: #121511 (Dark near-black with subtle forest undertone)
 * - Card Surface:   #2A2D29 (Slate-olive surface, 24dp radius)
 * - Surface Raised: #3F423E (Elevated cards, skeleton placeholders, tag pills)
 * - Line / Border:  #262924 (Subtle inset separators and field borders)
 * - Inset Field:    #1B1E19 (Darker than card surface, 16dp radius)
 * - Tab Bar:        #1F221E (Surface navigation bar)
 * - Brand Lime:     #9FE870 (Primary pill buttons, active tab indicators, arrow circles)
 * - On-Lime Text:   #163300 (Dark green high-contrast text on lime)
 * - Tinted Pill:    #163300 bg with #9FE870 text/icon
 * - Text Primary:   #F2F5EE (Off-white, 16.1:1 contrast on background, 11.4:1 on surface)
 * - Text Secondary: #A8ADA5 (7.9:1 contrast on background, 5.6:1 on surface)
 */

export const colors = {
  // Core Backgrounds & Surfaces
  bg: '#121511',
  bgMuted: '#171A15',
  surface: '#2A2D29',
  surfaceRaised: '#3F423E',
  skeleton: '#3F423E',
  line: '#262924',
  border: '#262924',
  inputBg: '#1B1E19',
  inputBorder: '#262924',
  inputFocusRing: '#9FE870',
  tabBarBg: '#1F221E',
  tabBarBorder: '#262924',
  tabBarActive: '#9FE870',
  tabBarInactive: '#A8ADA5',

  // Brand Lime (Primary)
  primary: '#9FE870',
  primaryPressed: '#8BD65C',
  onPrimary: '#163300',
  lime: '#9FE870',
  limePressed: '#8BD65C',
  onLime: '#163300',

  // Tinted Pill / Tag / Action Backgrounds (Neutral Grey with Brand Lime Accent)
  tintedPillBg: '#2A2D29',
  tintedPillText: '#9FE870',
  darkGreen: '#2A2D29',
  promoCardBg: '#1F221E',

  // Secondary Dark Pill
  darkPillBg: '#2A2D29',
  darkPillText: '#F2F5EE',
  darkPillBorder: '#3F423E',

  // Text & Typography
  textPrimary: '#F2F5EE',
  textSecondary: '#A8ADA5',
  textMuted: '#70756D',
  textInverse: '#121511',
  white: '#FFFFFF',
  black: '#000000',

  // Ink Aliases (High contrast on dark background)
  ink900: '#F2F5EE', // Headings, display off-white
  ink800: '#E4E8DF', // High contrast elements
  ink700: '#D1D7CB', // Primary body
  ink600: '#A8ADA5', // Secondary body, labels
  ink500: '#70756D', // Captions, helper text, placeholders
  ink400: '#545851', // Muted timestamps, icons
  ink300: '#3F423E',
  ink200: '#2A2D29',
  ink100: '#1B1E19',

  // Primary Shades (Lime to neutral slate darks)
  primary50: '#2A2D29',
  primary100: '#2A2D29',
  primary200: '#3F423E',
  primary300: '#9FE870',
  primary400: '#76CC35',
  primary500: '#9FE870',
  primary600: '#9FE870',
  primary700: '#8BD65C',
  primary800: '#73B846',

  // Slate Neutral Shades (Dark theme slate)
  slate50: '#F2F5EE',
  slate100: '#E4E8DF',
  slate200: '#A8ADA5',
  slate300: '#70756D',
  slate400: '#545851',
  slate500: '#3F423E',
  slate600: '#2A2D29',
  slate700: '#1F221E',
  slate800: '#1B1E19',
  slate900: '#121511',

  // Semantic Status (Strict neutral grey, lime, surface and off-white only; zero dark green bg)
  success: '#9FE870',
  successBg: '#2A2D29',
  warning: '#F2F5EE',
  warningBg: '#2A2D29',
  danger: '#F2F5EE', // Forms & errors use off-white outline and text
  dangerBg: '#2A2D29',
  info: '#A8ADA5',
  infoBg: '#2A2D29',

  // Legacy scale compatibility mapped strictly to approved palette
  emerald50: '#2A2D29',
  emerald100: '#2A2D29',
  emerald200: '#2A2D29',
  emerald300: '#9FE870',
  emerald500: '#9FE870',
  emerald600: '#9FE870',
  emerald700: '#9FE870',
  emerald800: '#9FE870',
  emerald900: '#2A2D29',

  amber50: '#2A2D29',
  amber100: '#2A2D29',
  amber200: '#3F423E',
  amber300: '#A8ADA5',
  amber500: '#F2F5EE',
  amber600: '#F2F5EE',
  amber700: '#F2F5EE',
  amber800: '#A8ADA5',
  amber900: '#2A2D29',

  red50: '#2A2D29',
  red200: '#3F423E',
  red600: '#F2F5EE',
  rose50: '#2A2D29',
  rose100: '#2A2D29',
  rose200: '#3F423E',
  rose600: '#F2F5EE',
  rose800: '#F2F5EE',
  rose900: '#2A2D29',

  purple50: '#2A2D29',
  sky200: '#2A2D29',
} as const;

export const typography = {
  fonts: {
    display: 'ArchivoBlack-Regular',
    uiRegular: 'Inter-Regular',
    uiMedium: 'Inter-Medium',
    uiSemiBold: 'Inter-SemiBold',
    uiBold: 'Inter-Bold',
    storyRegular: 'Inter-Regular',
    storyMedium: 'Inter-Medium',
    storySemiBold: 'Inter-SemiBold',
    storyBold: 'Inter-Bold',
    // Fallback aliases for existing components
    serifRegular: 'Inter-Regular',
    serifSemiBold: 'Inter-SemiBold',
    serifBold: 'Inter-Bold',
    storyItalic: 'Inter-Regular',
  },
  styles: {
    // Heavy uppercase display headline (used for hero banners, onboarding, large card titles)
    display: {
      fontFamily: 'ArchivoBlack-Regular',
      fontSize: 32,
      lineHeight: 32,
      textTransform: 'uppercase' as const,
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    displayHero: {
      fontFamily: 'ArchivoBlack-Regular',
      fontSize: 36,
      lineHeight: 36,
      textTransform: 'uppercase' as const,
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    displayCard: {
      fontFamily: 'ArchivoBlack-Regular',
      fontSize: 24,
      lineHeight: 24,
      textTransform: 'uppercase' as const,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },

    // Screen Titles ("Recipients" / "Explore" style)
    screenTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    // Section Titles ("Featured", "Reach calculator", "Explore" style)
    sectionTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    // Card Title
    cardTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
    },

    // Standard Headings
    h1: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 26,
      lineHeight: 32,
      color: colors.textPrimary,
    },
    h2: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 20,
      lineHeight: 26,
      color: colors.textPrimary,
    },
    h3: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 17,
      lineHeight: 23,
      color: colors.textPrimary,
    },
    h4: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },

    // Body text (Inter 17/27 for long story text, Inter 15/22 for UI)
    body: {
      fontFamily: 'Inter-Regular',
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    bodyMedium: {
      fontFamily: 'Inter-Medium',
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    bodyStory: {
      fontFamily: 'Inter-Regular',
      fontSize: 17,
      lineHeight: 27,
      color: colors.textPrimary,
    },
    bodyMuted: {
      fontFamily: 'Inter-Regular',
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    bodySmall: {
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    bodySm: {
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    small: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    smallMedium: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    storyBody: {
      fontFamily: 'Inter-Regular',
      fontSize: 17,
      lineHeight: 27,
      color: colors.textPrimary,
    },

    // Captions & Metadata
    caption: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    captionBold: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 12,
      lineHeight: 16,
      color: colors.textPrimary,
    },
    captionSemiBold: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 12,
      lineHeight: 16,
      color: colors.textPrimary,
    },

    // Buttons
    button: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 15,
      lineHeight: 20,
      color: colors.onLime,
    },
    buttonSmall: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 13,
      lineHeight: 18,
      color: colors.onLime,
    },
    buttonDark: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },

    // Stat & Numbers
    statNumber: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    statLabel: {
      fontFamily: 'Inter-Medium',
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  },
} as const;

export const spacing = {
  // 4px Base Spacing Scale
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,

  // Reference Layout Spacings
  horizontal: 16,
  cardPadding: 20,
  sectionGap: 24,
  rowGap: 16,
  itemGap: 12,
} as const;

export const radii = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  card: 24, // 24dp for surface cards and promo cards
  xl: 24,
  '2xl': 32,
  sheet: 24,
  pill: 9999, // Pill buttons and filter chips
  button: 9999,
  full: 9999,
  avatar: 9999,
  input: 16, // Inset input fields
} as const;

export const radius = radii;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
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
  radii,
  radius: radii,
  shadows,
  motion,
  touchTargets,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Radii = typeof radii;

