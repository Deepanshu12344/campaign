import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { theme } from '../../theme';

export type CardVariant = 'surface' | 'dashed' | 'promo' | 'raised';

export interface CardProps extends ViewProps {
  children?: React.ReactNode;
  bordered?: boolean;
  variant?: CardVariant;
}

export function Card({
  children,
  style,
  bordered = true,
  variant = 'surface',
  ...rest
}: CardProps) {
  const variantStyle = {
    surface: styles.surface,
    dashed: styles.dashed,
    promo: styles.promo,
    raised: styles.raised,
  }[variant];

  return (
    <View
      style={[
        styles.card,
        variantStyle,
        bordered && variant !== 'dashed' && styles.bordered,
        theme.shadows.card,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radii.card, // 24dp
    padding: theme.spacing.cardPadding, // 20dp
  },
  surface: {
    backgroundColor: theme.colors.surface, // #2A2D29
  },
  dashed: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.surfaceRaised, // #3F423E
  },
  promo: {
    backgroundColor: theme.colors.promoCardBg, // #122606
    borderWidth: 1,
    borderColor: '#1F4700',
  },
  raised: {
    backgroundColor: theme.colors.surfaceRaised, // #3F423E
  },
  bordered: {
    borderWidth: 1,
    borderColor: theme.colors.line, // #262924
  },
});
