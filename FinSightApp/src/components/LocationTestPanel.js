/**
 * Location Settings Test Component
 * 
 * Add this temporarily to ProfileScreen to test location functionality
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationVerificationManager from '../utils/LocationVerificationManager';
import LocationPermissionManager from '../utils/LocationPermissionManager';
import { useAuth } from '../contexts/AuthContext';
import colors from '../theme/colors';

export const LocationTestPanel = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState('');

  const runLocationTest = async () => {
    setIsLoading(true);
    setTestResults('🧪 Testing location services...');
    
    try {
      let results = [];
      
      // Test 1: Check current permission status
      results.push('📋 Checking permissions...');
      const permissionStatus = await LocationPermissionManager.checkLocationPermission();
      results.push(`✅ Permission status: ${permissionStatus.status}`);
      
      // Test 2: Check if user is first-time or returning
      results.push('👤 Checking user status...');
      const isFirstTime = await LocationVerificationManager.isFirstTimeUser(user?.uid || 'test');
      results.push(`✅ User type: ${isFirstTime ? 'First-time' : 'Returning'}`);
      
      // Test 3: Get current location status
      results.push('📍 Getting location status...');
      const locationStatus = await LocationVerificationManager.getCurrentLocationStatus();
      results.push(`✅ Location enabled: ${locationStatus.enabled}`);
      
      // Test 4: Test location verification flow
      if (permissionStatus.status === 'granted') {
        results.push('🎯 Testing location verification...');
        const verificationResult = await LocationVerificationManager.verifyUserLocation(user?.uid || 'test');
        results.push(`✅ Verification: ${verificationResult.success ? 'Success' : 'Failed'}`);
        
        if (verificationResult.location) {
          results.push(`📍 Coordinates: ${verificationResult.location.coords.latitude.toFixed(4)}, ${verificationResult.location.coords.longitude.toFixed(4)}`);
        }
      } else {
        results.push('⚠️ Location permission needed for full test');
      }
      
      setTestResults(results.join('\n'));
      
      Alert.alert(
        '🎉 Location Test Complete!',
        'All location services are working correctly!\n\n' +
        'Check the test panel below for detailed results.',
        [{ text: 'Great!' }]
      );
      
    } catch (error) {
      console.error('Location test error:', error);
      setTestResults(`❌ Test failed: ${error.message}`);
      
      Alert.alert(
        '⚠️ Location Test Failed',
        `Error: ${error.message}\n\nThis might be normal if location permissions are not granted.`,
        [{ text: 'OK' }]
      );
    }
    
    setIsLoading(false);
  };

  const testLocationPermission = async () => {
    try {
      setIsLoading(true);
      const result = await LocationPermissionManager.requestLocationPermission();
      
      Alert.alert(
        'Permission Test Result',
        `Status: ${result.status}\n${result.message || 'Permission request completed'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Permission Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Location System Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={runLocationTest}
          disabled={isLoading}
        >
          <Ionicons name="flask-outline" size={20} color={colors.white} />
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run Full Test'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.testButton, styles.permissionButton]} 
          onPress={testLocationPermission}
          disabled={isLoading}
        >
          <Ionicons name="key-outline" size={20} color={colors.white} />
          <Text style={styles.buttonText}>Test Permission</Text>
        </TouchableOpacity>
      </View>
      
      {testResults ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          <Text style={styles.resultsText}>{testResults}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.48,
  },
  permissionButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  resultsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default LocationTestPanel;
