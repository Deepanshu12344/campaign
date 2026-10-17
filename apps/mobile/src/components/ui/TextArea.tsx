import React from 'react';
import { StyleSheet } from 'react-native';
import { TextField, TextFieldProps } from './TextField';

import { TextInput } from 'react-native';

export interface TextAreaProps extends TextFieldProps {
  numberOfLines?: number;
}

export const TextArea = React.forwardRef<TextInput, TextAreaProps>(function TextArea(
  {
    numberOfLines = 4,
    style,
    ...rest
  },
  ref
) {
  return (
    <TextField
      ref={ref}
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      style={[styles.textArea, style]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  textArea: {
    minHeight: 104,
    paddingTop: 12,
  },
});
