/**
 * Simple Location Service
 * 
 * Gets user location when they connect to the app
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class LocationService {
  
  /**
   * Get user's current location
   */
  static async getUserLocation() {
    try {
      console.log('📍 Getting user location...');
      
      // Check if location services are enabled
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        throw new Error('Location services are disabled');
      }
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });
      
      console.log('✅ Location obtained:', location.coords);
      
      return {
        success: true,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get location:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Save user location to Firebase
   */
  static async saveUserLocation(userId, locationData) {
    try {
      console.log('💾 Saving user location to Firebase...');
      
      const userLocationRef = doc(db, 'userLocations', userId);
      
      await setDoc(userLocationRef, {
        userId: userId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
        lastUpdated: serverTimestamp(),
        source: 'mobile_app'
      }, { merge: true });
      
      console.log('✅ Location saved to Firebase');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to save location:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Save location locally
   */
  static async saveLocationLocally(userId, locationData) {
    try {
      const locationKey = `user_location_${userId}`;
      await AsyncStorage.setItem(locationKey, JSON.stringify(locationData));
      console.log('✅ Location saved locally');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save location locally:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get stored location
   */
  static async getStoredLocation(userId) {
    try {
      const locationKey = `user_location_${userId}`;
      const stored = await AsyncStorage.getItem(locationKey);
      
      if (stored) {
        return {
          success: true,
          location: JSON.parse(stored)
        };
      }
      
      return { success: false, error: 'No stored location found' };
      
    } catch (error) {
      console.error('❌ Failed to get stored location:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Main function: Get and save user location when they connect
   */
  static async initializeUserLocation(userId) {
    try {
      console.log('🚀 Initializing location for user:', userId);
      
      // Get current location
      const locationResult = await this.getUserLocation();
      
      if (!locationResult.success) {
        return locationResult;
      }
      
      const locationData = locationResult.location;
      
      // Save to Firebase
      await this.saveUserLocation(userId, locationData);
      
      // Save locally
      await this.saveLocationLocally(userId, locationData);
      
      console.log('✅ User location initialized successfully');
      
      return {
        success: true,
        location: locationData,
        message: 'Location obtained and saved successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to initialize user location:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Update user location (for when user moves)
   */
  static async updateUserLocation(userId) {
    try {
      console.log('🔄 Updating user location...');
      
      const locationResult = await this.getUserLocation();
      
      if (locationResult.success) {
        await this.saveUserLocation(userId, locationResult.location);
        await this.saveLocationLocally(userId, locationResult.location);
        
        return {
          success: true,
          location: locationResult.location,
          message: 'Location updated successfully'
        };
      }
      
      return locationResult;
      
    } catch (error) {
      console.error('❌ Failed to update location:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if location permission is granted
   */
  static async hasLocationPermission() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Failed to check location permission:', error);
      return false;
    }
  }
  
  /**
   * Request location permission
   */
  static async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        status: status
      };
    } catch (error) {
      console.error('❌ Failed to request location permission:', error);
      return {
        granted: false,
        status: 'error',
        error: error.message
      };
    }
  }
}

export default LocationService;
