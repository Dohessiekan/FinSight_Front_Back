/**
 * Location Verification Manager
 * 
 * Handles location verification for users:
 * - Request location permission on first login
 * - Verify GPS is enabled on subsequent connections
 * - Store user location preferences and first-time status
 */

import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import LocationPermissionManager from './LocationPermissionManager';
import UserLocationManager from './UserLocationManager';

const STORAGE_KEYS = {
  FIRST_TIME_USER: 'finsight_first_time_user',
  LOCATION_PERMISSION_GRANTED: 'finsight_location_permission',
  LAST_LOCATION_CHECK: 'finsight_last_location_check',
  USER_LOCATION_PREFERENCE: 'finsight_location_preference'
};

export class LocationVerificationManager {
  
  /**
   * Main function called when user connects/logs in
   * Handles first-time users and returning users differently
   */
  static async verifyUserLocation(userId, userEmail = null) {
    try {
      console.log('🔍 Starting location verification for user:', userId);
      
      // Check if this is a first-time user
      const isFirstTime = await this.isFirstTimeUser(userId);
      
      if (isFirstTime) {
        console.log('👋 First-time user detected - requesting location setup');
        return await this.handleFirstTimeUser(userId, userEmail);
      } else {
        console.log('🔄 Returning user - verifying GPS status');
        return await this.handleReturningUser(userId);
      }
      
    } catch (error) {
      console.error('❌ Location verification failed:', error);
      return {
        success: false,
        error: error.message,
        locationEnabled: false
      };
    }
  }
  
  /**
   * Handle first-time user location setup
   */
  static async handleFirstTimeUser(userId, userEmail) {
    try {
      console.log('🆕 Setting up location for first-time user');
      
      // Show explanation to user
      const userConsent = await this.showFirstTimeLocationExplanation();
      
      if (!userConsent) {
        console.log('❌ User declined location permission');
        await this.markUserAsNotFirstTime(userId);
        await this.saveLocationPreference(userId, 'declined');
        return {
          success: true,
          locationEnabled: false,
          userDeclined: true,
          message: 'Location services disabled by user choice'
        };
      }
      
      // Request location permission
      const permissionGranted = await LocationPermissionManager.requestLocationPermission();
      
      if (permissionGranted) {
        // Try to get initial location
        const locationData = await LocationPermissionManager.requestLocationWithPermission();
        
        if (locationData) {
          // Save initial location to Firebase
          await UserLocationManager.updateUserLocation(userId, locationData);
          
          // Save successful setup
          await this.saveLocationSetupResult(userId, {
            permissionGranted: true,
            initialLocationObtained: true,
            locationData: locationData,
            setupDate: new Date().toISOString()
          });
          
          console.log('✅ First-time location setup completed successfully');
          
          return {
            success: true,
            locationEnabled: true,
            isFirstTime: true,
            locationData: locationData,
            message: 'Location services enabled successfully'
          };
        } else {
          console.log('⚠️ Permission granted but location not available');
          await this.saveLocationSetupResult(userId, {
            permissionGranted: true,
            initialLocationObtained: false,
            setupDate: new Date().toISOString()
          });
          
          return {
            success: true,
            locationEnabled: false,
            permissionGranted: true,
            message: 'Location permission granted but GPS not available'
          };
        }
      } else {
        console.log('❌ Location permission denied by user');
        await this.saveLocationSetupResult(userId, {
          permissionGranted: false,
          setupDate: new Date().toISOString()
        });
        
        return {
          success: true,
          locationEnabled: false,
          permissionDenied: true,
          message: 'Location permission denied'
        };
      }
      
    } catch (error) {
      console.error('❌ First-time user setup failed:', error);
      throw error;
    } finally {
      // Always mark user as not first-time after setup attempt
      await this.markUserAsNotFirstTime(userId);
    }
  }
  
  /**
   * Handle returning user location verification
   */
  static async handleReturningUser(userId) {
    try {
      console.log('🔄 Verifying location for returning user');
      
      // Check if user previously granted permission
      const userPrefs = await this.getUserLocationPreference(userId);
      
      if (userPrefs?.preference === 'declined') {
        console.log('📍 User previously declined location - respecting choice');
        return {
          success: true,
          locationEnabled: false,
          userDeclined: true,
          message: 'Location services disabled by user preference'
        };
      }
      
      // Check current permission status
      const hasPermission = await LocationPermissionManager.checkLocationPermission();
      
      if (!hasPermission) {
        console.log('⚠️ Location permission was revoked');
        
        // Offer to re-enable
        const reEnableResult = await this.offerLocationReEnable();
        return {
          success: true,
          locationEnabled: false,
          permissionRevoked: true,
          reEnableOffered: reEnableResult,
          message: 'Location permission was disabled'
        };
      }
      
      // Try to get current location to verify GPS is working
      const locationData = await LocationPermissionManager.requestLocationWithPermission();
      
      if (locationData) {
        // Update user's location in Firebase
        await UserLocationManager.updateUserLocation(userId, locationData);
        
        // Update last successful location check
        await this.updateLastLocationCheck(userId, locationData);
        
        console.log('✅ Location verification successful for returning user');
        
        return {
          success: true,
          locationEnabled: true,
          locationData: locationData,
          message: 'Location services verified and updated'
        };
      } else {
        console.log('⚠️ GPS not available for returning user');
        
        return {
          success: true,
          locationEnabled: false,
          gpsUnavailable: true,
          message: 'GPS signal not available'
        };
      }
      
    } catch (error) {
      console.error('❌ Returning user verification failed:', error);
      throw error;
    }
  }
  
  /**
   * Show first-time location explanation dialog
   */
  static async showFirstTimeLocationExplanation() {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Services Setup',
        'Welcome to FinSight!\n\nTo help protect you and your community from fraud, we\'d like to:\n\n📍 Map fraud alerts in your area\n🛡️ Show fraud patterns across Rwanda\n👥 Help protect other users nearby\n\nYour exact location is never shared publicly - only general area information is used for security purposes.\n\nWould you like to enable location services?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable Location',
            style: 'default',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }
  
  /**
   * Offer to re-enable location for returning users
   */
  static async offerLocationReEnable() {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Services Disabled',
        'Location services have been disabled since your last visit.\n\nWould you like to re-enable them to:\n• See fraud alerts in your area\n• Help protect your community\n• Get location-based security insights',
        [
          {
            text: 'Keep Disabled',
            style: 'cancel',
            onPress: () => resolve({ enabled: false, userChoice: 'keep_disabled' }),
          },
          {
            text: 'Re-enable',
            style: 'default',
            onPress: async () => {
              const granted = await LocationPermissionManager.requestLocationPermission();
              resolve({ enabled: granted, userChoice: 're_enable_attempted' });
            },
          },
        ],
        { cancelable: false }
      );
    });
  }
  
  /**
   * Check if user is logging in for the first time
   */
  static async isFirstTimeUser(userId) {
    try {
      // Check local storage first
      const localFirstTime = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_TIME_USER + '_' + userId);
      
      if (localFirstTime === 'false') {
        return false; // User has logged in before on this device
      }
      
      // Check Firebase for user's location setup history
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const hasLocationSetup = userData.locationSetup || userData.location;
        return !hasLocationSetup; // First time if no location setup exists
      }
      
      return true; // New user entirely
      
    } catch (error) {
      console.warn('⚠️ Error checking first-time status:', error);
      return true; // Default to first-time for safety
    }
  }
  
  /**
   * Mark user as no longer first-time
   */
  static async markUserAsNotFirstTime(userId) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME_USER + '_' + userId, 'false');
      console.log('✅ User marked as not first-time');
    } catch (error) {
      console.warn('⚠️ Failed to mark user as not first-time:', error);
    }
  }
  
  /**
   * Save location setup result to Firebase
   */
  static async saveLocationSetupResult(userId, setupResult) {
    try {
      const userDocRef = doc(db, 'users', userId);
      
      const locationSetupData = {
        locationSetup: {
          ...setupResult,
          setupTimestamp: serverTimestamp(),
          devicePlatform: Platform.OS,
          appVersion: '2.0'
        },
        lastLocationSetupUpdate: serverTimestamp()
      };
      
      await setDoc(userDocRef, locationSetupData, { merge: true });
      
      console.log('✅ Location setup result saved to Firebase');
    } catch (error) {
      console.error('❌ Failed to save location setup result:', error);
    }
  }
  
  /**
   * Save user's location preference
   */
  static async saveLocationPreference(userId, preference) {
    try {
      const prefData = {
        preference: preference, // 'enabled', 'declined', 'revoked'
        timestamp: new Date().toISOString(),
        userId: userId
      };
      
      // Save locally
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_LOCATION_PREFERENCE + '_' + userId, 
        JSON.stringify(prefData)
      );
      
      // Save to Firebase
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        locationPreference: prefData,
        lastLocationPreferenceUpdate: serverTimestamp()
      });
      
      console.log(`✅ Location preference saved: ${preference}`);
    } catch (error) {
      console.error('❌ Failed to save location preference:', error);
    }
  }
  
  /**
   * Get user's location preference
   */
  static async getUserLocationPreference(userId) {
    try {
      // Try local storage first
      const localPref = await AsyncStorage.getItem(
        STORAGE_KEYS.USER_LOCATION_PREFERENCE + '_' + userId
      );
      
      if (localPref) {
        return JSON.parse(localPref);
      }
      
      // Try Firebase
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.locationPreference || null;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Error getting location preference:', error);
      return null;
    }
  }
  
  /**
   * Update last successful location check
   */
  static async updateLastLocationCheck(userId, locationData) {
    try {
      const checkData = {
        timestamp: new Date().toISOString(),
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        },
        success: true
      };
      
      // Save locally
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_LOCATION_CHECK + '_' + userId,
        JSON.stringify(checkData)
      );
      
      // Update Firebase
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        lastLocationCheck: checkData,
        lastLocationVerification: serverTimestamp()
      });
      
      console.log('✅ Last location check updated');
    } catch (error) {
      console.warn('⚠️ Failed to update last location check:', error);
    }
  }
  
  /**
   * Get user's current location verification status
   */
  static async getLocationVerificationStatus(userId) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          hasLocationSetup: !!userData.locationSetup,
          locationPreference: userData.locationPreference,
          lastLocationCheck: userData.lastLocationCheck,
          currentLocation: userData.location
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting location verification status:', error);
      return null;
    }
  }
  
  /**
   * Force location re-verification for current session
   */
  static async forceLocationReVerification(userId) {
    try {
      console.log('🔄 Forcing location re-verification');
      
      const hasPermission = await LocationPermissionManager.checkLocationPermission();
      
      if (!hasPermission) {
        const granted = await LocationPermissionManager.requestLocationPermission();
        if (!granted) {
          return {
            success: false,
            error: 'Location permission denied'
          };
        }
      }
      
      const locationData = await LocationPermissionManager.requestLocationWithPermission();
      
      if (locationData) {
        await UserLocationManager.updateUserLocation(userId, locationData);
        await this.updateLastLocationCheck(userId, locationData);
        
        return {
          success: true,
          locationData: locationData,
          message: 'Location re-verified successfully'
        };
      } else {
        return {
          success: false,
          error: 'Could not obtain location'
        };
      }
      
    } catch (error) {
      console.error('❌ Force re-verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Clear all location data for user (for privacy/reset purposes)
   */
  static async clearUserLocationData(userId) {
    try {
      console.log('🗑️ Clearing user location data');
      
      // Clear local storage
      const keys = Object.values(STORAGE_KEYS).map(key => key + '_' + userId);
      await AsyncStorage.multiRemove(keys);
      
      // Clear Firebase location data
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        location: null,
        locationSetup: null,
        locationPreference: {
          preference: 'declined',
          timestamp: new Date().toISOString(),
          reason: 'user_requested_clear'
        },
        lastLocationCheck: null,
        locationDataCleared: serverTimestamp()
      });
      
      console.log('✅ User location data cleared');
      
      return {
        success: true,
        message: 'Location data cleared successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to clear location data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current location status (for LocationSettings component)
   */
  static async getCurrentLocationStatus() {
    try {
      // Check permission status
      const permissionStatus = await LocationPermissionManager.checkLocationPermission();
      
      // Get last location check from storage
      let lastLocation = null;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_LOCATION_CHECK + '_current');
        if (stored) {
          lastLocation = JSON.parse(stored);
        }
      } catch (storageError) {
        console.warn('Could not read last location from storage:', storageError);
      }
      
      // Determine if location is enabled
      const enabled = permissionStatus.status === 'granted';
      
      return {
        enabled: enabled,
        permission: permissionStatus.status,
        lastLocation: lastLocation,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get current location status:', error);
      return {
        enabled: false,
        permission: 'unknown',
        lastLocation: null,
        error: error.message
      };
    }
  }

  /**
   * Initialize location verification for settings component
   */
  static async initializeLocationVerification(userId) {
    try {
      console.log('🚀 Initializing location verification for user:', userId);
      
      // Request permission
      const permissionResult = await LocationPermissionManager.requestLocationPermission();
      
      if (permissionResult.status !== 'granted') {
        return {
          success: false,
          error: 'Location permission not granted',
          permission: permissionResult.status
        };
      }
      
      // Get current location
      const location = await LocationPermissionManager.requestLocationWithPermission();
      
      if (!location) {
        return {
          success: false,
          error: 'Could not obtain location data'
        };
      }
      
      // Store location data
      await UserLocationManager.storeUserLocation(userId, location);
      
      // Update verification status
      await this.updateLastLocationCheck(userId, location.coords);
      
      // Save preference
      await this.saveLocationPreference(userId, 'enabled');
      
      // Mark as not first time
      await this.markUserAsNotFirstTime(userId);
      
      console.log('✅ Location verification initialized successfully');
      
      return {
        success: true,
        location: location,
        message: 'Location services initialized successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to initialize location verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disable location verification
   */
  static async disableLocationVerification() {
    try {
      console.log('🔒 Disabling location verification');
      
      // Save preference as disabled
      const userId = 'current'; // Will be passed by component
      await this.saveLocationPreference(userId, 'declined');
      
      // Clear local location data but keep user preference
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_LOCATION_CHECK + '_current');
      
      console.log('✅ Location verification disabled');
      
      return {
        success: true,
        message: 'Location services disabled'
      };
      
    } catch (error) {
      console.error('❌ Failed to disable location verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default LocationVerificationManager;
