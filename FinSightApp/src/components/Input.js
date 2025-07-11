import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function Input({ style, error, ...props }) {
  return (
    <TextInput
      style={[
        styles.input,
        error && styles.inputError,
        style
      ]}
      placeholderTextColor={colors.textLight}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
});
