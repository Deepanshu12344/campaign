import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  required?: boolean;
  helper?: string;
  helperText?: string;
  error?: string;
  maxLength?: number;
  showCounter?: boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  rightAccessory?: React.ReactNode;
}

export const TextField = React.forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    required = false,
    helper,
    helperText,
    error,
    maxLength,
    showCounter = false,
    disabled = false,
    value,
    onChangeText,
    containerStyle,
    style,
    onFocus,
    onBlur,
    editable,
    rightAccessory,
    ...rest
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);

  const characterCount = value ? value.length : 0;
  const resolvedHelper = helperText ?? helper;
  const isEditable = disabled ? false : (editable ?? true);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.requiredAsterisk}> *</Text>}
          </Text>
          {showCounter && maxLength !== undefined && (
            <Text style={styles.counterText}>
              {characterCount}/{maxLength}
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedInput,
          Boolean(error) && styles.errorInput,
          disabled && styles.disabledInput,
        ]}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          editable={isEditable}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, rightAccessory ? styles.inputWithAccessory : null, style]}
          {...rest}
        />
        {rightAccessory && <View style={styles.rightAccessory}>{rightAccessory}</View>}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : resolvedHelper ? (
        <Text style={styles.helperText}>{resolvedHelper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: theme.spacing.base,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.textSecondary,
  },
  requiredAsterisk: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fonts.uiBold,
  },
  counterText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textMuted,
  },
  inputWrapper: {
    minHeight: theme.touchTargets.minTouchSize,
    backgroundColor: theme.colors.inputBg, // #1B1E19
    borderWidth: 1,
    borderColor: theme.colors.inputBorder, // #262924
    borderRadius: theme.radii.input, // 16dp
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    minHeight: theme.touchTargets.minTouchSize,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.styles.body.fontSize,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.uiRegular,
  },
  inputWithAccessory: {
    paddingRight: theme.spacing.xs,
  },
  rightAccessory: {
    paddingRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusedInput: {
    borderColor: theme.colors.inputFocusRing, // #9FE870
    borderWidth: 1.5,
  },
  errorInput: {
    borderColor: theme.colors.danger,
  },
  disabledInput: {
    backgroundColor: theme.colors.bgMuted,
    opacity: 0.6,
  },
  helperText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
});
