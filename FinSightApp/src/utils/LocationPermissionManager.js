/**
 * Location Permission Manager for React Native
 * 
 * Handles location permission requests for fraud alert mapping
 */

import { Platform, Alert, Linking } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';

export class LocationPermissionManager {
  
  /**
   * Request location permission from user
   */
  static async requestLocationPermission() {
    try {
      console.log('📍 Requesting location permission...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Location permission granted');
        return {
          status: 'granted',
          granted: true
        };
      } else {
        console.log('❌ Location permission denied:', status);
        return {
          status: status,
          granted: false
        };
      }
      
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      return {
        status: 'error',
        granted: false
      };
    }
  }
  
  /**
   * Check if location permission is already granted
   */
  static async checkLocationPermission() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      console.log('📍 Location permission status:', status);
      return {
        status: status,
        granted: status === 'granted'
      };
    } catch (error) {
      console.error('❌ Error checking location permission:', error);
      return {
        status: 'error',
        granted: false
      };
    }
  }
  
  /**
   * Show explanation dialog for location permission
   */
  static showLocationPermissionExplanation() {
    Alert.alert(
      'Location Permission Needed',
      'FinSight uses your location to:\n\n• Map fraud alerts in your area\n• Help protect your community\n• Show fraud patterns across Rwanda\n\nYour exact location is never shared - only general area information is used.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Grant Permission',
          onPress: () => this.requestLocationPermission(),
        },
        {
          text: 'Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  }
  
  /**
   * Request location with proper permission handling
   */
  static async requestLocationWithPermission() {
    try {
      // First check if we already have permission
      const permissionCheck = await this.checkLocationPermission();
      
      if (!permissionCheck.granted) {
        // Request permission
        const permissionRequest = await this.requestLocationPermission();
        
        if (!permissionRequest.granted) {
          console.log('⚠️ Location permission not granted');
          return null;
        }
      }
      
      // Now try to get location using Expo Location API
      console.log('📍 Getting current position with Expo Location...');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 300000
      });
      
      console.log('✅ GPS location obtained:', location.coords);
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        address: 'Rwanda',
        city: 'Current Location',
        source: 'gps',
        isRealGPS: true,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('⚠️ Error getting location with permission:', error);
      return null;
    }
  }
}

export default LocationPermissionManager;
