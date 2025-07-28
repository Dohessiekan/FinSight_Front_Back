/**
 * QUICK LOCATION SYSTEM TEST
 * 
 * Add this component to any screen to test your location system
 * Copy and paste this code into ProfileScreen.js or any other screen
 */

// ADD THESE IMPORTS AT THE TOP OF YOUR SCREEN FILE:
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ADD THIS COMPONENT INSIDE YOUR SCREEN:
const QuickLocationTest = () => {
  const [status, setStatus] = useState('Ready to test');

  const testLocationSystem = async () => {
    try {
      setStatus('🧪 Testing...');
      
      // Test 1: Expo Location module
      console.log('📱 Testing Expo Location...');
      if (!Location) {
        throw new Error('Expo Location not available');
      }
      
      // Test 2: Check permissions
      console.log('🔒 Checking permissions...');
      const { status: permStatus } = await Location.getForegroundPermissionsAsync();
      console.log(`Permission status: ${permStatus}`);
      
      // Test 3: Request permission if needed
      if (permStatus !== 'granted') {
        console.log('📋 Requesting permission...');
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          throw new Error('Permission denied');
        }
      }
      
      // Test 4: Get location
      console.log('📍 Getting location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      
      // Test 5: Test storage
      console.log('💾 Testing storage...');
      await AsyncStorage.setItem('test_location', JSON.stringify({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        time: new Date().toISOString()
      }));
      
      const stored = await AsyncStorage.getItem('test_location');
      if (!stored) {
        throw new Error('Storage failed');
      }
      
      setStatus('✅ ALL TESTS PASSED!');
      
      Alert.alert(
        '🎉 Location System Working!',
        `Everything is working perfectly!\n\n` +
        `📍 Location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}\n` +
        `🎯 Accuracy: ${location.coords.accuracy}m\n` +
        `⏰ Time: ${new Date().toLocaleTimeString()}\n\n` +
        `✅ Expo Location module: Working\n` +
        `✅ GPS permissions: Granted\n` +
        `✅ Location fetching: Success\n` +
        `✅ Data storage: Working`,
        [{ text: 'Excellent!', style: 'default' }]
      );
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setStatus(`❌ Failed: ${error.message}`);
      
      Alert.alert(
        '⚠️ Location Test Failed',
        `Error: ${error.message}\n\nTroubleshooting:\n• Enable device location services\n• Grant app location permission\n• Ensure GPS signal available\n• Check if outdoors for better signal`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  return (
    <View style={testStyles.container}>
      <TouchableOpacity style={testStyles.button} onPress={testLocationSystem}>
        <Text style={testStyles.buttonText}>🧪 Test Location System</Text>
      </TouchableOpacity>
      <Text style={testStyles.status}>{status}</Text>
    </View>
  );
};

// ADD THESE STYLES:
const testStyles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    textAlign: 'center',
    color: '#1976D2',
  },
});

// THEN ADD <QuickLocationTest /> TO YOUR SCREEN'S RENDER METHOD

export default QuickLocationTest;
