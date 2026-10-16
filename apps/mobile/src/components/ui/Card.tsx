import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { theme } from '../../theme';

export interface CardProps extends ViewProps {
  children?: React.ReactNode;
  bordered?: boolean;
}

export function Card({ children, style, bordered = true, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        bordered && styles.bordered,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.base,
  },
  bordered: {
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
});
