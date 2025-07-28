/**
 * Simple Location System
 * 
 * A clean implementation to get and manage user location
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export class SimpleLocationSystem {
  
  /**
   * Get user's current location
   */
  static async getUserLocation() {
    try {
      console.log('📍 Getting user location...');
      
      // Check permission
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          return {
            success: false,
            error: 'Location permission denied'
          };
        }
      }
      
      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      
      if (location) {
        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date().toISOString(),
          address: null // Will be filled by reverse geocoding if needed
        };
        
        // Save location locally
        await this.saveLocation(locationData);
        
        console.log('✅ Location obtained:', locationData);
        
        return {
          success: true,
          location: locationData
        };
      } else {
        return {
          success: false,
          error: 'Could not get location'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to get location:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check if location permission is granted
   */
  static async checkLocationPermission() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }
  
  /**
   * Request location permission from user
   */
  static async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }
  
  /**
   * Get location with user-friendly prompts
   */
  static async getLocationWithPrompt() {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Access',
        'This app would like to access your location to provide location-based services.',
        [
          {
            text: 'Deny',
            style: 'cancel',
            onPress: () => resolve({
              success: false,
              error: 'User denied location access'
            }),
          },
          {
            text: 'Allow',
            onPress: async () => {
              const result = await this.getUserLocation();
              resolve(result);
            },
          },
        ]
      );
    });
  }
  
  /**
   * Save location data locally
   */
  static async saveLocation(locationData) {
    try {
      await AsyncStorage.setItem('user_location', JSON.stringify(locationData));
      console.log('📱 Location saved locally');
    } catch (error) {
      console.warn('Failed to save location locally:', error);
    }
  }
  
  /**
   * Get saved location data
   */
  static async getSavedLocation() {
    try {
      const saved = await AsyncStorage.getItem('user_location');
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get saved location:', error);
      return null;
    }
  }
  
  /**
   * Get location with address (reverse geocoding)
   */
  static async getLocationWithAddress() {
    try {
      const locationResult = await this.getUserLocation();
      
      if (!locationResult.success) {
        return locationResult;
      }
      
      // Try to get address
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: locationResult.location.latitude,
          longitude: locationResult.location.longitude,
        });
        
        if (address && address.length > 0) {
          const addressInfo = address[0];
          const fullAddress = [
            addressInfo.name,
            addressInfo.street,
            addressInfo.district,
            addressInfo.city,
            addressInfo.region,
            addressInfo.country
          ].filter(Boolean).join(', ');
          
          locationResult.location.address = fullAddress;
          locationResult.location.city = addressInfo.city;
          locationResult.location.country = addressInfo.country;
          
          // Save updated location with address
          await this.saveLocation(locationResult.location);
        }
      } catch (addressError) {
        console.warn('Could not get address:', addressError);
        // Continue without address
      }
      
      return locationResult;
      
    } catch (error) {
      console.error('Failed to get location with address:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check if location services are enabled on device
   */
  static async isLocationEnabled() {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.warn('Could not check if location services are enabled:', error);
      return false;
    }
  }
  
  /**
   * Get location status summary
   */
  static async getLocationStatus() {
    try {
      const hasPermission = await this.checkLocationPermission();
      const isEnabled = await this.isLocationEnabled();
      const savedLocation = await this.getSavedLocation();
      
      return {
        hasPermission: hasPermission,
        isEnabled: isEnabled,
        hasSavedLocation: !!savedLocation,
        savedLocation: savedLocation,
        canGetLocation: hasPermission && isEnabled
      };
    } catch (error) {
      console.error('Failed to get location status:', error);
      return {
        hasPermission: false,
        isEnabled: false,
        hasSavedLocation: false,
        savedLocation: null,
        canGetLocation: false
      };
    }
  }
  
  /**
   * Clear all location data
   */
  static async clearLocationData() {
    try {
      await AsyncStorage.removeItem('user_location');
      console.log('🗑️ Location data cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear location data:', error);
      return false;
    }
  }
  
  /**
   * Watch location changes (for real-time tracking)
   */
  static async startLocationWatching(callback) {
    try {
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission required for watching');
        }
      }
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          
          // Save and callback
          this.saveLocation(locationData);
          if (callback) {
            callback(locationData);
          }
        }
      );
      
      return subscription;
      
    } catch (error) {
      console.error('Failed to start location watching:', error);
      return null;
    }
  }
  
  /**
   * Calculate distance between two points (in kilometers)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  static toRadians(degrees) {
    return degrees * (Math.PI/180);
  }
}

export default SimpleLocationSystem;
