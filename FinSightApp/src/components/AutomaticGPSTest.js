/**
 * Quick GPS Test for Automatic Ultra-High Precision Implementation
 * 
 * This test simulates the new automatic GPS flow:
 * 1. User enables GPS
 * 2. Ultra-high precision GPS runs automatically
 * 3. Analysis proceeds with precise location
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';

const AutomaticGPSTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  
  const testAutomaticGPS = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing Automatic Ultra-High Precision GPS Flow...');
      
      // Step 1: Simulate user enabling GPS
      const useGPS = await new Promise((resolve) => {
        Alert.alert(
          'GPS Location for Fraud Mapping',
          'Would you like to use GPS location for fraud mapping?\n\n' +
          '🎯 GPS ENABLED: Ultra-high precision GPS will be used automatically for street-level accuracy\n' +
          '❌ NO GPS: Fraud analysis without location tracking',
          [
            { text: 'No GPS', onPress: () => resolve(false) },
            { text: 'Use GPS', onPress: () => resolve(true) }
          ]
        );
      });
      
      if (!useGPS) {
        console.log('📍 User declined GPS - test complete');
        setResult('User declined GPS - no location testing');
        return;
      }
      
      console.log('🎯 User enabled GPS - starting automatic ultra-high precision...');
      
      // Step 2: Import and test ultra-high precision GPS
      Alert.alert(
        'Getting Ultra-High Precision GPS',
        'Acquiring street-level GPS accuracy...\n\n' +
        'This may take 30-60 seconds for optimal precision.\n\n' +
        'For best results:\n' +
        '• Go outdoors or near a window\n' +
        '• Keep device still during scanning\n\n' +
        'Analysis will start after GPS is ready.',
        [{ text: 'OK' }]
      );
      
      try {
        const { LocationService } = await import('../services/LocationService');
        
        console.log('🎯 Starting ULTRA-HIGH PRECISION GPS automatically...');
        const startTime = Date.now();
        
        const gpsResult = await LocationService.getUltraHighPrecisionGPS((progress, accuracy, phase) => {
          console.log(`📡 GPS Progress: ${progress} (Phase: ${phase || 'Unknown'})`);
          if (accuracy) {
            console.log(`📍 Current accuracy: ±${accuracy.toFixed(1)}m`);
          }
        });
        
        const duration = (Date.now() - startTime) / 1000;
        
        if (gpsResult.success) {
          const location = {
            latitude: gpsResult.location.latitude,
            longitude: gpsResult.location.longitude,
            accuracy: gpsResult.location.accuracy,
            isRealGPS: true,
            source: 'ULTRA_HIGH_PRECISION_GPS',
            address: `Test - Ultra Precision GPS (±${gpsResult.location.accuracy.toFixed(1)}m)`,
            city: 'Rwanda',
            canSeeStreets: gpsResult.location.canSeeStreets,
            canSeeBuildings: gpsResult.location.canSeeBuildings,
            precisionLevel: gpsResult.location.accuracyLevel
          };
          
          console.log(`🏆 Got ULTRA-HIGH PRECISION GPS: ${location.latitude}, ${location.longitude} (±${location.accuracy.toFixed(1)}m)`);
          
          // Step 3: Show success notification with achieved accuracy
          let accuracyMessage = '';
          if (location.canSeeBuildings) {
            accuracyMessage = 'Street-Level GPS Ready!\n\nYou can now see individual buildings and streets on the security map!';
            console.log('🏢 STREET-LEVEL ACCURACY: You can see individual buildings!');
          } else if (location.canSeeStreets) {
            accuracyMessage = 'High Precision GPS Ready!\n\nYou can see streets and major landmarks on the security map!';
            console.log('🛣️ HIGH PRECISION: You can see streets and landmarks!');
          } else {
            accuracyMessage = 'GPS Ready!\n\nGood location accuracy achieved.';
          }
          
          Alert.alert(
            accuracyMessage.split('\n')[0],
            `Location accuracy: ±${location.accuracy.toFixed(1)}m\n\n${accuracyMessage.split('\n').slice(1).join('\n')}\n\nTest completed in ${duration.toFixed(1)} seconds.`
          );
          
          // Step 4: Show test results
          const testResult = {
            success: true,
            duration: duration,
            accuracy: location.accuracy,
            precision: location.precisionLevel,
            canSeeBuildings: location.canSeeBuildings,
            canSeeStreets: location.canSeeStreets,
            coordinates: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
          };
          
          setResult(testResult);
          console.log('✅ Automatic GPS test completed successfully:', testResult);
          
        } else {
          console.log('❌ Ultra-high precision GPS failed');
          Alert.alert(
            'GPS Test Failed',
            gpsResult.fallbackMessage || 'Ultra-high precision GPS failed during testing.'
          );
          setResult({ success: false, error: gpsResult.message });
        }
        
      } catch (gpsError) {
        console.error('❌ GPS test error:', gpsError);
        Alert.alert('GPS Test Error', `GPS test failed: ${gpsError.message}`);
        setResult({ success: false, error: gpsError.message });
      }
      
    } catch (error) {
      console.error('❌ Automatic GPS test failed:', error);
      Alert.alert('Test Failed', `Test error: ${error.message}`);
      setResult({ success: false, error: error.message });
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 Automatic Ultra-High Precision GPS Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.disabledButton]} 
        onPress={testAutomaticGPS}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? '🔄 Testing GPS...' : '🚀 Test Automatic GPS'}
        </Text>
      </TouchableOpacity>
      
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Test Results:</Text>
          {result.success ? (
            <View>
              <Text style={styles.successText}>✅ Success!</Text>
              <Text style={styles.resultText}>Duration: {result.duration.toFixed(1)}s</Text>
              <Text style={styles.resultText}>Accuracy: ±{result.accuracy.toFixed(1)}m</Text>
              <Text style={styles.resultText}>Precision: {result.precision}</Text>
              <Text style={styles.resultText}>Buildings visible: {result.canSeeBuildings ? 'YES' : 'NO'}</Text>
              <Text style={styles.resultText}>Streets visible: {result.canSeeStreets ? 'YES' : 'NO'}</Text>
              <Text style={styles.resultText}>Coordinates: {result.coordinates}</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.errorText}>❌ Failed</Text>
              <Text style={styles.resultText}>Error: {result.error}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#2c3e50',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  successText: {
    color: '#27ae60',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 12,
    color: '#5d6d7e',
    marginBottom: 3,
  },
});

export default AutomaticGPSTest;
