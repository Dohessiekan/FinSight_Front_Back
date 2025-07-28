/**
 * Location Status Component
 * 
 * Simple component to show location status in your app
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LocationStatus = ({ onPress }) => {
  const { locationStatus } = useAuth();

  if (!locationStatus) {
    return null;
  }

  const getStatusText = () => {
    if (locationStatus.success) {
      return '📍 Location Connected';
    }
    return '📍 Location Unavailable';
  };

  const getStatusColor = () => {
    if (locationStatus.success) {
      return '#4CAF50'; // Green
    }
    return '#FF9800'; // Orange
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: getStatusColor() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>{getStatusText()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginHorizontal: 10,
    marginVertical: 5,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LocationStatus;
