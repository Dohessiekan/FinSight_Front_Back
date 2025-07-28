/**
 * Quick Location Status Test
 * 
 * Test the fixed getCurrentLocationStatus method
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { LocationVerificationManager } from '../utils/LocationVerificationManager';
import LocationPermissionManager from '../utils/LocationPermissionManager';
import colors from '../theme/colors';

export const LocationStatusTest = () => {
  const [status, setStatus] = useState('Ready to test');
  const [isLoading, setIsLoading] = useState(false);

  const testLocationStatus = async () => {
    setIsLoading(true);
    setStatus('🧪 Testing getCurrentLocationStatus...');
    
    try {
      console.log('Testing LocationVerificationManager.getCurrentLocationStatus()...');
      
      // Test the method that was missing
      const locationStatus = await LocationVerificationManager.getCurrentLocationStatus();
      
      console.log('Location status result:', locationStatus);
      
      // Test permission check
      const permissionStatus = await LocationPermissionManager.checkLocationPermission();
      
      console.log('Permission status result:', permissionStatus);
      
      setStatus(`✅ Success!\n\nLocation enabled: ${locationStatus.enabled}\nPermission: ${locationStatus.permission}\nLast location: ${locationStatus.lastLocation ? 'Available' : 'None'}`);
      
      Alert.alert(
        '🎉 Test Successful!',
        `LocationVerificationManager.getCurrentLocationStatus() is now working!\n\n` +
        `• Location enabled: ${locationStatus.enabled}\n` +
        `• Permission: ${locationStatus.permission}\n` +
        `• Error fixed: ✅`,
        [{ text: 'Great!' }]
      );
      
    } catch (error) {
      console.error('Test failed:', error);
      setStatus(`❌ Test failed: ${error.message}`);
      
      Alert.alert(
        '⚠️ Test Failed',
        `Error: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
    
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Location Status Fix Test</Text>
      
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={testLocationStatus}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '⏳ Testing...' : '🧪 Test getCurrentLocationStatus'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.status}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF9800',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    textAlign: 'center',
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  status: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default LocationStatusTest;
