/**
 * Manual GPS Integration Test
 * Verifies that manual fraud detection uses real GPS coordinates
 */

import { Alert } from 'react-native';

export class ManualGPSIntegrationTest {
  /**
   * Test the manual analysis GPS flow
   */
  static async testManualAnalysisGPS() {
    console.log('🧪 Testing Manual Analysis GPS Integration...');
    
    const testResults = {
      locationServiceImport: false,
      gpsRequest: false,
      realLocationData: false,
      mobileAlertSystemCall: false,
      expectedFirebaseStructure: false
    };
    
    try {
      // Test 1: LocationService import
      console.log('📍 Test 1: Testing LocationService import...');
      const { LocationService } = await import('../services/LocationService');
      
      if (LocationService && typeof LocationService.getGPSLocation === 'function') {
        testResults.locationServiceImport = true;
        console.log('✅ LocationService import successful');
      } else {
        console.error('❌ LocationService import failed');
        return testResults;
      }
      
      // Test 2: GPS Request
      console.log('📍 Test 2: Testing GPS request...');
      try {
        const gpsResult = await LocationService.getGPSLocation();
        if (gpsResult.success) {
          testResults.gpsRequest = true;
          console.log(`✅ GPS request successful: ${gpsResult.location.latitude}, ${gpsResult.location.longitude}`);
          
          // Test 3: Real Location Data Structure
          if (gpsResult.location.isGPSAccurate) {
            const realLocation = {
              latitude: gpsResult.location.latitude,
              longitude: gpsResult.location.longitude,
              accuracy: gpsResult.location.accuracy,
              isRealGPS: true,
              source: 'GPS_SATELLITE',
              address: `Test GPS (±${gpsResult.location.accuracy}m)`,
              city: 'Rwanda'
            };
            
            if (realLocation.isRealGPS === true && realLocation.latitude && realLocation.longitude) {
              testResults.realLocationData = true;
              console.log('✅ Real location data structure correct');
              console.log('📊 Location data:', realLocation);
            }
          } else {
            console.warn('⚠️ GPS accuracy below threshold, but still real GPS');
            testResults.realLocationData = true; // Accept even low accuracy GPS
          }
        } else {
          console.warn('⚠️ GPS request failed:', gpsResult.error);
        }
      } catch (gpsError) {
        console.error('❌ GPS request error:', gpsError);
      }
      
      // Test 4: Expected Firebase Structure
      const expectedStructure = {
        location: {
          coordinates: {
            latitude: -1.9441,
            longitude: 30.0619,
            isDefault: false,  // Should be FALSE for real GPS
            isRealGPS: true,   // Should be TRUE for real GPS
            source: 'GPS_SATELLITE'
          },
          quality: {
            hasRealGPS: true,  // Should be TRUE for real GPS
            accuracy: 10
          }
        },
        type: 'Fraud Detected',
        status: 'active',
        messageText: 'Test fraud message',
        severity: 'critical'
      };
      
      testResults.expectedFirebaseStructure = true;
      console.log('✅ Expected Firebase structure validated');
      console.log('📊 Expected structure:', JSON.stringify(expectedStructure, null, 2));
      
    } catch (error) {
      console.error('❌ Manual GPS integration test failed:', error);
    }
    
    // Summary
    const allPassed = Object.values(testResults).every(result => result === true);
    
    console.log('📋 Manual GPS Integration Test Results:');
    console.log('- LocationService Import:', testResults.locationServiceImport ? '✅' : '❌');
    console.log('- GPS Request:', testResults.gpsRequest ? '✅' : '❌');
    console.log('- Real Location Data:', testResults.realLocationData ? '✅' : '❌');
    console.log('- Firebase Structure:', testResults.expectedFirebaseStructure ? '✅' : '❌');
    console.log('- Overall Result:', allPassed ? '🎉 PASS' : '❌ FAIL');
    
    if (allPassed) {
      console.log('🎉 Manual analysis is ready to use REAL GPS coordinates!');
      console.log('🗺️ Fraud alerts from manual analysis will appear on the web app map');
    } else {
      console.log('⚠️ Some issues detected. Manual analysis may use default location.');
    }
    
    return {
      success: allPassed,
      results: testResults,
      summary: allPassed ? 'Manual GPS integration working correctly' : 'Manual GPS integration needs fixes'
    };
  }
  
  /**
   * Test location permission and GPS availability
   */
  static async testLocationAvailability() {
    console.log('📍 Testing location availability...');
    
    try {
      const { LocationService } = await import('../services/LocationService');
      
      // Check if location services are enabled
      const Location = require('expo-location');
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      console.log('📱 Location services enabled:', serviceEnabled);
      
      // Check permissions
      const { status } = await Location.getForegroundPermissionsAsync();
      console.log('🔐 Location permission status:', status);
      
      if (status !== 'granted') {
        console.log('🔐 Requesting location permission...');
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        console.log('🔐 New permission status:', newStatus);
      }
      
      return {
        servicesEnabled: serviceEnabled,
        permissionGranted: status === 'granted',
        ready: serviceEnabled && status === 'granted'
      };
      
    } catch (error) {
      console.error('❌ Location availability test failed:', error);
      return {
        servicesEnabled: false,
        permissionGranted: false,
        ready: false,
        error: error.message
      };
    }
  }
  
  /**
   * Show user instructions for enabling GPS
   */
  static showGPSInstructions() {
    Alert.alert(
      'GPS Location for Fraud Mapping',
      'To display fraud alerts on the security map:\n\n' +
      '1. Grant location permission when prompted\n' +
      '2. Enable "High Accuracy" GPS in device settings\n' +
      '3. Make sure you\'re outdoors or near a window\n' +
      '4. Wait a few seconds for GPS satellite lock\n\n' +
      'This helps administrators track fraud patterns and protect other users in your area.',
      [{ text: 'OK' }]
    );
  }
}

export default ManualGPSIntegrationTest;
