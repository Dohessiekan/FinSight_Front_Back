/**
 * Simple Location Test for React Native App
 * 
 * Add this to any screen to test location functionality
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LocationTestButton = () => {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runLocationTest = async () => {
    setIsLoading(true);
    setTestResult('Testing...');
    
    try {
      console.log('🧪 Starting Location Test...');
      
      // Test 1: Check if Expo Location module is available
      console.log('📱 Testing Expo Location module...');
      if (!Location) {
        throw new Error('Expo Location module not found');
      }
      
      // Test 2: Check current permissions
      console.log('🔒 Checking location permissions...');
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      console.log(`Current permission status: ${currentStatus}`);
      
      // Test 3: Request permissions if needed
      if (currentStatus !== 'granted') {
        console.log('📋 Requesting location permission...');
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        console.log(`New permission status: ${newStatus}`);
        
        if (newStatus !== 'granted') {
          setTestResult('❌ Permission denied');
          setIsLoading(false);
          return;
        }
      }
      
      // Test 4: Get current location
      console.log('📍 Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      
      if (location && location.coords) {
        console.log(`✅ Location obtained: ${location.coords.latitude}, ${location.coords.longitude}`);
        
        // Test 5: Test AsyncStorage
        console.log('💾 Testing AsyncStorage...');
        await AsyncStorage.setItem('location_test', JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().toISOString()
        }));
        
        const stored = await AsyncStorage.getItem('location_test');
        if (!stored) {
          throw new Error('AsyncStorage test failed');
        }
        
        setTestResult(`✅ ALL TESTS PASSED!\n\nLocation: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}\n\nAccuracy: ${location.coords.accuracy}m\n\nTimestamp: ${new Date(location.timestamp).toLocaleTimeString()}`);
        
        Alert.alert(
          '🎉 Location System Working!',
          'All tests passed successfully:\n\n' +
          '✅ Expo Location module\n' +
          '✅ GPS permissions\n' +
          '✅ Location fetching\n' +
          '✅ Data storage\n\n' +
          'Your location verification system is fully operational!',
          [{ text: 'Excellent!', style: 'default' }]
        );
        
      } else {
        throw new Error('No location data received');
      }
      
    } catch (error) {
      console.error('❌ Location test failed:', error);
      setTestResult(`❌ Test Failed: ${error.message}`);
      
      Alert.alert(
        '⚠️ Location Test Failed',
        `Error: ${error.message}\n\nPlease check:\n• Device location services enabled\n• App location permissions granted\n• GPS signal available`,
        [{ text: 'OK', style: 'default' }]
      );
    }
    
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.testButton, isLoading && styles.disabledButton]} 
        onPress={runLocationTest}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '⏳ Testing...' : '🧪 Test Location System'}
        </Text>
      </TouchableOpacity>
      
      {testResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    maxWidth: '100%',
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
});

export default LocationTestButton;
