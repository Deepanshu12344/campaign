import React from 'react';
import { StyleSheet } from 'react-native';
import { TextField, TextFieldProps } from './TextField';

export interface TextAreaProps extends TextFieldProps {
  numberOfLines?: number;
}

export function TextArea({
  numberOfLines = 4,
  style,
  ...rest
}: TextAreaProps) {
  return (
    <TextField
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      style={[styles.textArea, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  textArea: {
    minHeight: 104,
    paddingTop: 12,
  },
});
