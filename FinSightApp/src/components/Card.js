import React from 'react';
import { View, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function Card({ children, style, variant = 'default', ...props }) {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.cardElevated,
    variant === 'outlined' && styles.cardOutlined,
    style
  ];

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardElevated: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
