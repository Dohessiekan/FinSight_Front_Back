/**
 * Location Permission Manager
 * 
 * Handles GPS permission requests on app startup and subsequent checks
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import LocationService from './LocationService';

export class LocationPermissionManager {
  
  static STORAGE_KEYS = {
    FIRST_TIME: 'location_first_time',
    PERMISSION_ASKED: 'location_permission_asked',
    USER_PREFERENCE: 'location_enabled',
    LAST_LOGIN_CHECK: 'location_last_login_check',
    LOGIN_SESSION: 'current_login_session'
  };

  /**
   * Check if this is the first time asking for location permission
   */
  static async isFirstTime() {
    try {
      const firstTime = await AsyncStorage.getItem(this.STORAGE_KEYS.FIRST_TIME);
      return firstTime === null; // If null, it's first time
    } catch (error) {
      console.error('Error checking first time:', error);
      return true; // Default to first time on error
    }
  }

  /**
   * Mark that we've asked for permission before
   */
  static async markAsAsked() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.FIRST_TIME, 'false');
      await AsyncStorage.setItem(this.STORAGE_KEYS.PERMISSION_ASKED, 'true');
    } catch (error) {
      console.error('Error marking permission as asked:', error);
    }
  }

  /**
   * Check current permission status
   */
  static async getCurrentPermissionStatus() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        status: status
      };
    } catch (error) {
      console.error('Error getting permission status:', error);
      return {
        granted: false,
        status: 'error'
      };
    }
  }

  /**
   * Request location permission with user-friendly messaging
   */
  static async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        status: status
      };
    } catch (error) {
      console.error('Error requesting permission:', error);
      return {
        granted: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Main function: Handle location permission on every login (including after logout)
   */
  static async handleAppStartupLocationCheck(userId) {
    try {
      console.log('🚀 Checking location permission on user login...');

      const isFirstTime = await this.isFirstTime();
      const currentPermission = await this.getCurrentPermissionStatus();

      if (isFirstTime) {
        // First time ever - ask for permission with explanation
        return await this.handleFirstTimePermissionRequest(userId);
      } else {
        // User has logged in before - always check permission status
        return await this.handleLoginLocationCheck(userId, currentPermission);
      }

    } catch (error) {
      console.error('❌ Error in app startup location check:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle location check on every login (including after logout/login)
   */
  static async handleLoginLocationCheck(userId, currentPermission) {
    try {
      console.log('🔄 Checking location permission on user login...');
      console.log('📱 Current system permission:', currentPermission.status);

      // Check if user previously had location activated in the app
      const wasActivatedBefore = await this.isLocationEnabledInApp();
      console.log('⚙️ Was location activated before:', wasActivatedBefore);

      if (wasActivatedBefore) {
        // User has activated location before in the app
        if (currentPermission.granted) {
          // Location is activated AND permission is granted - just update silently
          console.log('✅ Location activated and permission granted - updating silently');
          const locationResult = await LocationService.updateUserLocation(userId);
          
          return {
            success: true,
            action: 'silent_update',
            location: locationResult.location,
            message: 'Location updated silently'
          };
        } else {
          // Location is activated BUT permission is denied - ask for permission
          console.log('⚠️ Location activated but permission denied - requesting permission');
          return await this.requestPermissionForActivatedLocation(userId);
        }
      } else {
        // User never activated location before
        if (currentPermission.granted) {
          // Permission is granted but user never activated in app - offer to activate
          console.log('📍 Permission granted but location not activated - offering activation');
          return await this.offerLocationActivation(userId);
        } else {
          // Permission denied and user never activated - offer to enable
          console.log('❌ Permission denied and location not activated - offering enable');
          return await this.offerLocationEnableOnLogin(userId);
        }
      }

    } catch (error) {
      console.error('❌ Error in login location check:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Request permission for location that was previously activated
   */
  static async requestPermissionForActivatedLocation(userId) {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Permission Required',
        'You have location services enabled in FinSight, but the app no longer has permission to access your location. Please grant location permission to continue using this feature.',
        [
          {
            text: 'Disable Location',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
              console.log('👤 User disabled location due to permission issue');
              resolve({
                success: false,
                action: 'user_disabled_location',
                message: 'Location services disabled by user'
              });
            }
          },
          {
            text: 'Grant Permission',
            onPress: async () => {
              const permissionResult = await this.requestLocationPermission();

              if (permissionResult.granted) {
                // Permission granted - get location
                const locationResult = await LocationService.initializeUserLocation(userId);
                
                console.log('✅ Permission granted for activated location');
                resolve({
                  success: true,
                  action: 'permission_granted_for_activated',
                  location: locationResult.location,
                  message: 'Location permission granted and location updated'
                });
              } else {
                // Permission still denied - disable location
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
                console.log('❌ Permission denied for activated location - disabling');
                resolve({
                  success: false,
                  action: 'permission_denied_disabling',
                  message: 'Location permission denied. Location services have been disabled.'
                });
              }
            }
          }
        ]
      );
    });
  }

  /**
   * Offer to activate location when permission is granted but not activated in app
   */
  static async offerLocationActivation(userId) {
    return new Promise((resolve) => {
      Alert.alert(
        'Activate Location Services?',
        'Your device allows location access. Would you like to activate location services in FinSight for better functionality?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              console.log('👤 User declined location activation despite permission');
              resolve({
                success: false,
                action: 'activation_declined',
                message: 'Location activation declined'
              });
            }
          },
          {
            text: 'Activate',
            onPress: async () => {
              // Activate location and get current position
              const locationResult = await LocationService.initializeUserLocation(userId);
              await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'true');
              
              console.log('✅ Location activated by user');
              resolve({
                success: true,
                action: 'location_activated',
                location: locationResult.location,
                message: 'Location services activated successfully'
              });
            }
          }
        ]
      );
    });
  }

  /**
   * Handle case where user previously had location enabled but permission is now revoked
   */
  static async handleRevokedPermissionOnLogin(userId) {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Access Needed',
        'You previously enabled location services, but permission has been revoked. Would you like to re-enable location access?',
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: async () => {
              await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
              console.log('👤 User skipped re-enabling location on login');
              resolve({
                success: false,
                action: 'user_skipped_reenable',
                message: 'Location access skipped'
              });
            }
          },
          {
            text: 'Enable',
            onPress: async () => {
              const permissionResult = await this.requestLocationPermission();

              if (permissionResult.granted) {
                // Permission re-granted
                const locationResult = await LocationService.initializeUserLocation(userId);
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'true');
                
                console.log('✅ Location permission re-enabled on login');
                resolve({
                  success: true,
                  action: 'permission_re_enabled_on_login',
                  location: locationResult.location,
                  message: 'Location access re-enabled successfully'
                });
              } else {
                // Permission still denied
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
                console.log('❌ Location permission still denied on login');
                resolve({
                  success: false,
                  action: 'permission_denied_on_login',
                  message: 'Location permission denied'
                });
              }
            }
          }
        ]
      );
    });
  }

  /**
   * Offer location enable for users who never enabled it or disabled it
   */
  static async offerLocationEnableOnLogin(userId) {
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Location Services?',
        'Would you like to enable location services for better app functionality? This helps provide personalized insights.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
              console.log('👤 User declined location on login');
              resolve({
                success: false,
                action: 'user_declined_on_login',
                message: 'Location services not enabled'
              });
            }
          },
          {
            text: 'Enable',
            onPress: async () => {
              const permissionResult = await this.requestLocationPermission();

              if (permissionResult.granted) {
                // Permission granted
                const locationResult = await LocationService.initializeUserLocation(userId);
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'true');
                
                console.log('✅ Location enabled on login');
                resolve({
                  success: true,
                  action: 'permission_enabled_on_login',
                  location: locationResult.location,
                  message: 'Location services enabled successfully'
                });
              } else {
                // Permission denied
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
                console.log('❌ Location permission denied on login');
                resolve({
                  success: false,
                  action: 'permission_denied_on_login',
                  message: 'Location permission denied'
                });
              }
            }
          }
        ]
      );
    });
  }

  /**
   * Handle first time permission request with explanation
   */
  static async handleFirstTimePermissionRequest(userId) {
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Location Services',
        'FinSight would like to access your location to provide better financial insights and security features. Your location data is kept private and secure.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              await this.markAsAsked();
              await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
              console.log('👤 User declined location permission on first time');
              resolve({
                success: false,
                action: 'user_declined',
                message: 'Location permission declined'
              });
            }
          },
          {
            text: 'Allow',
            onPress: async () => {
              const permissionResult = await this.requestLocationPermission();
              await this.markAsAsked();

              if (permissionResult.granted) {
                // Permission granted - get location and save
                const locationResult = await LocationService.initializeUserLocation(userId);
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'true');
                
                console.log('✅ First time permission granted and location saved');
                resolve({
                  success: true,
                  action: 'permission_granted',
                  location: locationResult.location,
                  message: 'Location permission granted and location saved'
                });
              } else {
                // Permission denied
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
                console.log('❌ First time permission denied');
                resolve({
                  success: false,
                  action: 'permission_denied',
                  message: 'Location permission denied'
                });
              }
            }
          }
        ]
      );
    });
  }

  /**
   * Handle subsequent app opens - check permission status
   */
  static async handleSubsequentPermissionCheck(userId, currentPermission) {
    try {
      console.log('🔄 Checking location permission on subsequent app open...');

      if (currentPermission.granted) {
        // Permission is still granted - update location silently
        console.log('✅ Location permission still granted, updating location...');
        const locationResult = await LocationService.updateUserLocation(userId);
        
        return {
          success: true,
          action: 'location_updated',
          location: locationResult.location,
          message: 'Location updated successfully'
        };
      } else {
        // Permission was revoked or denied - ask user if they want to enable it
        return await this.handleRevokedPermissionPrompt(userId);
      }

    } catch (error) {
      console.error('❌ Error in subsequent permission check:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle case where permission was previously granted but now revoked
   */
  static async handleRevokedPermissionPrompt(userId) {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Access Disabled',
        'Location services have been disabled for FinSight. Would you like to enable them again for better app functionality?',
        [
          {
            text: 'Keep Disabled',
            style: 'cancel',
            onPress: async () => {
              await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
              console.log('👤 User chose to keep location disabled');
              resolve({
                success: false,
                action: 'user_keeps_disabled',
                message: 'Location remains disabled'
              });
            }
          },
          {
            text: 'Enable',
            onPress: async () => {
              const permissionResult = await this.requestLocationPermission();

              if (permissionResult.granted) {
                // Permission re-granted - get location
                const locationResult = await LocationService.initializeUserLocation(userId);
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'true');
                
                console.log('✅ Permission re-granted and location updated');
                resolve({
                  success: true,
                  action: 'permission_re_granted',
                  location: locationResult.location,
                  message: 'Location permission re-enabled and location updated'
                });
              } else {
                // Permission still denied
                await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCE, 'false');
                console.log('❌ Permission still denied after re-request');
                resolve({
                  success: false,
                  action: 'permission_still_denied',
                  message: 'Location permission is still denied'
                });
              }
            }
          }
        ]
      );
    });
  }

  /**
   * Check if user has location enabled in app preferences
   */
  static async isLocationEnabledInApp() {
    try {
      const preference = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCE);
      return preference === 'true';
    } catch (error) {
      console.error('Error checking location preference:', error);
      return false;
    }
  }

  /**
   * Get detailed location status for UI display
   */
  static async getLocationStatus() {
    try {
      const isFirstTime = await this.isFirstTime();
      const currentPermission = await this.getCurrentPermissionStatus();
      const appPreference = await this.isLocationEnabledInApp();

      return {
        isFirstTime,
        systemPermission: currentPermission,
        appPreference,
        canUseLocation: currentPermission.granted && appPreference
      };
    } catch (error) {
      console.error('Error getting location status:', error);
      return {
        isFirstTime: true,
        systemPermission: { granted: false, status: 'error' },
        appPreference: false,
        canUseLocation: false
      };
    }
  }

  /**
   * Mark current login session to track if we've checked location this session
   */
  static async markLoginSession(userId) {
    try {
      const sessionId = `${userId}_${Date.now()}`;
      await AsyncStorage.setItem(this.STORAGE_KEYS.LOGIN_SESSION, sessionId);
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_LOGIN_CHECK, new Date().toISOString());
      return sessionId;
    } catch (error) {
      console.error('Error marking login session:', error);
      return null;
    }
  }

  /**
   * Check if we've already verified location for this login session
   */
  static async hasCheckedLocationThisSession(userId) {
    try {
      const currentSession = await AsyncStorage.getItem(this.STORAGE_KEYS.LOGIN_SESSION);
      const lastCheck = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_LOGIN_CHECK);
      
      // If no session or session doesn't contain current user, need to check
      if (!currentSession || !currentSession.includes(userId)) {
        return false;
      }
      
      // If last check was more than 1 hour ago, check again
      if (lastCheck) {
        const checkTime = new Date(lastCheck);
        const now = new Date();
        const hoursDiff = (now - checkTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 1) {
          return false; // Force check if more than 1 hour
        }
      }
      
      return true; // Already checked this session
      
    } catch (error) {
      console.error('Error checking login session:', error);
      return false; // Default to checking on error
    }
  }

  /**
   * Clear login session (called on logout)
   */
  static async clearLoginSession() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.LOGIN_SESSION);
      console.log('🔄 Login session cleared');
    } catch (error) {
      console.error('Error clearing login session:', error);
    }
  }

  /**
   * Main function: Handle location permission on every login
   * This is called from AuthContext whenever user logs in
   */
  static async handleUserLogin(userId) {
    try {
      console.log('� Handling location permission for user login...');

      // Check if we've already verified location this session
      const alreadyChecked = await this.hasCheckedLocationThisSession(userId);
      
      if (alreadyChecked) {
        console.log('✅ Location already checked this session');
        // Just update location silently if permission is granted and location is activated
        const currentPermission = await this.getCurrentPermissionStatus();
        const isActivated = await this.isLocationEnabledInApp();
        
        if (currentPermission.granted && isActivated) {
          console.log('🔄 Updating location silently (already checked this session)');
          const locationResult = await LocationService.updateUserLocation(userId);
          return {
            success: true,
            action: 'silent_update_session',
            location: locationResult.location,
            message: 'Location updated silently'
          };
        }
        
        return { 
          success: false, 
          action: 'no_permission_or_not_activated', 
          message: 'Location not available this session' 
        };
      }

      // Mark this login session
      await this.markLoginSession(userId);

      // Get current system permission status
      const currentPermission = await this.getCurrentPermissionStatus();
      console.log('📱 System permission status:', currentPermission.status);

      // Check location permission (first time or returning user)
      const isFirstTime = await this.isFirstTime();
      
      if (isFirstTime) {
        // First time ever - ask for permission with explanation
        console.log('🆕 First time user - showing location permission request');
        return await this.handleFirstTimePermissionRequest(userId);
      } else {
        // Returning user - smart permission handling
        console.log('🔄 Returning user - checking smart permission logic');
        return await this.handleLoginLocationCheck(userId, currentPermission);
      }

    } catch (error) {
      console.error('❌ Error in user login location handling:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset location preferences (for testing or user reset)
   */
  static async resetLocationPreferences() {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.FIRST_TIME,
        this.STORAGE_KEYS.PERMISSION_ASKED,
        this.STORAGE_KEYS.USER_PREFERENCE,
        this.STORAGE_KEYS.LAST_LOGIN_CHECK,
        this.STORAGE_KEYS.LOGIN_SESSION
      ]);
      console.log('🔄 Location preferences reset');
    } catch (error) {
      console.error('Error resetting location preferences:', error);
    }
  }
}

export default LocationPermissionManager;
