import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const SimpleButton = ({ title, onPress, style, textStyle, disabled = false, variant = 'primary' }) => {
  const buttonStyle = [
    styles.button,
    styles[variant],
    style,
    disabled && styles.disabled
  ];

  const buttonTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    textStyle,
    disabled && styles.disabledText
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={buttonTextStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#007AFF',
  },
  disabled: {
    backgroundColor: '#F2F2F7',
    borderColor: '#C7C7CC',
  },
  disabledText: {
    color: '#C7C7CC',
  },
});

export default SimpleButton;