import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

export default function Button({ 
  title, 
  onPress, 
  style, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  icon,
  iconPosition = 'left',
  ...props 
}) {
  const buttonStyle = [
    styles.button,
    variant === 'outline' && styles.outlineButton,
    variant === 'secondary' && styles.secondaryButton,
    variant === 'danger' && styles.dangerButton,
    (disabled || loading) && styles.disabledButton,
    style,
  ];

  const textStyle = [
    styles.text,
    variant === 'outline' && styles.outlineText,
    variant === 'secondary' && styles.secondaryText,
    variant === 'danger' && styles.dangerText,
    (disabled || loading) && styles.disabledText,
  ];

  const iconColor = variant === 'outline' ? colors.primary : 
                   variant === 'secondary' ? colors.text :
                   variant === 'danger' ? colors.white :
                   colors.white;

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={variant === 'outline' || variant === 'secondary' ? colors.primary : colors.white} 
          />
          <Text style={[textStyle, { marginLeft: 8 }]}>Loading...</Text>
        </View>
      );
    }

    if (icon && iconPosition === 'left') {
      return (
        <View style={styles.contentContainer}>
          <Ionicons name={icon} size={20} color={iconColor} />
          <Text style={[textStyle, { marginLeft: 8 }]}>{title}</Text>
        </View>
      );
    }

    if (icon && iconPosition === 'right') {
      return (
        <View style={styles.contentContainer}>
          <Text style={[textStyle, { marginRight: 8 }]}>{title}</Text>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      );
    }

    return <Text style={textStyle}>{title}</Text>;
  };

  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress} 
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    minHeight: 56,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryButton: {
    backgroundColor: colors.gray100,
    shadowColor: colors.gray300,
    shadowOpacity: 0.1,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  disabledButton: {
    backgroundColor: colors.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  outlineText: {
    color: colors.primary,
  },
  secondaryText: {
    color: colors.text,
  },
  dangerText: {
    color: colors.white,
  },
  disabledText: {
    color: colors.textLight,
  },
});
