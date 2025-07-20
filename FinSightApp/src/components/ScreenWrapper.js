import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScreenWrapper = ({ children, style }) => {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  
  // Calculate ONLY the bottom spacing needed to clear the navigation bar
  const tabBarHeight = 60;
  const androidBottomSpacing = isAndroid ? Math.max(insets.bottom, 16) : insets.bottom;
  const androidMargin = isAndroid ? 12 : 0; // Margin from screen edges
  
  // Reduce total padding - only what's needed to clear navbar
  const totalBottomSpacing = tabBarHeight + androidBottomSpacing + androidMargin;
  
  return (
    <View 
      style={[
        {
          flex: 1,
          paddingBottom: totalBottomSpacing, // Only bottom padding, no top padding
        },
        style
      ]}
    >
      {children}
    </View>
  );
};

export default ScreenWrapper;
