/**
 * Location Debug Component
 * 
 * Helps debug the object rendering issue
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LocationVerificationManager } from '../utils/LocationVerificationManager';
import LocationPermissionManager from '../utils/LocationPermissionManager';
import colors from '../theme/colors';

export const LocationDebug = () => {
  const [debugInfo, setDebugInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runLocationDebug = async () => {
    setIsLoading(true);
    setDebugInfo('🔍 Debugging location data...\n\n');
    
    try {
      // Test getCurrentLocationStatus
      console.log('Testing getCurrentLocationStatus...');
      const locationStatus = await LocationVerificationManager.getCurrentLocationStatus();
      
      let debugText = '📍 LOCATION STATUS DEBUG:\n';
      debugText += `Type: ${typeof locationStatus}\n`;
      debugText += `Keys: ${Object.keys(locationStatus || {}).join(', ')}\n\n`;
      
      // Safely stringify each property
      Object.entries(locationStatus || {}).forEach(([key, value]) => {
        debugText += `${key}: `;
        if (value === null || value === undefined) {
          debugText += 'null/undefined\n';
        } else if (typeof value === 'object') {
          debugText += `[Object] ${JSON.stringify(value).substring(0, 100)}...\n`;
        } else {
          debugText += `${value}\n`;
        }
      });
      
      debugText += '\n🔒 PERMISSION STATUS DEBUG:\n';
      const permissionStatus = await LocationPermissionManager.checkLocationPermission();
      debugText += `Permission: ${JSON.stringify(permissionStatus, null, 2)}\n\n`;
      
      debugText += '✅ Debug complete - Check for object values above';
      
      setDebugInfo(debugText);
      
    } catch (error) {
      console.error('Debug failed:', error);
      setDebugInfo(`❌ Debug failed: ${error.message}\n\nStack: ${error.stack}`);
    }
    
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Location Object Debug</Text>
      
      <TouchableOpacity 
        style={styles.debugButton} 
        onPress={runLocationDebug}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '⏳ Debugging...' : '🔍 Debug Location Data'}
        </Text>
      </TouchableOpacity>
      
      {debugInfo ? (
        <ScrollView style={styles.debugOutput}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#F44336',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  debugButton: {
    backgroundColor: '#F44336',
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
  debugOutput: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  debugText: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});

export default LocationDebug;
