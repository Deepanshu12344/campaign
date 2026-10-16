import { theme, Theme } from './tokens';

/**
 * Returns the active design system theme and token constants.
 */
export function useTheme(): Theme {
  return theme;
}
