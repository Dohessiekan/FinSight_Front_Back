import React from 'react';
import { Dimensions, Platform } from 'react-native';

// Android UI Utilities
export const AndroidUI = {
  // Screen dimensions
  getScreenDimensions: () => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  },

  // Responsive sizing
  responsive: (size) => {
    const { width } = Dimensions.get('window');
    const baseWidth = 375; // iPhone X width as base
    return (size * width) / baseWidth;
  },

  // Android-specific spacing
  getAndroidSpacing: () => {
    if (Platform.OS !== 'android') return 0;
    return {
      statusBar: 24,
      navigationBar: 48,
      padding: 16,
    };
  },

  // Material Design colors
  colors: {
    primary: '#007AFF',
    secondary: '#34C759',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C7C7CC',
    error: '#FF3B30',
    warning: '#FF9500',
  },

  // Common styles
  commonStyles: {
    container: {
      flex: 1,
      backgroundColor: '#F2F2F7',
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      elevation: 2,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
  },
};

export default AndroidUI;