/**
 * Location Settings Component
 * 
 * Allows users to manage their location preferences and permissions
 * Integrated into the ProfileScreen settings section
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Switch,
  ActivityIndicator,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { LocationVerificationManager } from '../utils/LocationVerificationManager';
import LocationPermissionManager from '../utils/LocationPermissionManager';
import { useAuth } from '../contexts/AuthContext';

export default function LocationSettings() {
  const { user } = useAuth();
  const [locationStatus, setLocationStatus] = useState({
    enabled: false,
    permission: 'unknown',
    lastLocation: null,
    isLoading: true
  });

  useEffect(() => {
    loadLocationStatus();
  }, []);

  const loadLocationStatus = async () => {
    setLocationStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Get current location verification status
      const verificationStatus = await LocationVerificationManager.getCurrentLocationStatus();
      
      // Check current permission status
      const permissionStatus = await LocationPermissionManager.checkLocationPermission();
      
      // Safely handle lastLocation data
      let safeLastLocation = null;
      if (verificationStatus.lastLocation) {
        try {
          // Ensure we're not storing React-unfriendly objects
          safeLastLocation = {
            timestamp: verificationStatus.lastLocation.timestamp || new Date().toISOString(),
            latitude: verificationStatus.lastLocation.latitude || null,
            longitude: verificationStatus.lastLocation.longitude || null,
            accuracy: verificationStatus.lastLocation.accuracy || null
          };
        } catch (error) {
          console.warn('Error processing last location data:', error);
          safeLastLocation = null;
        }
      }
      
      setLocationStatus({
        enabled: verificationStatus.enabled,
        permission: permissionStatus.status,
        lastLocation: safeLastLocation,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load location status:', error);
      setLocationStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLocationToggle = async (enabled) => {
    if (enabled) {
      // User wants to enable location
      await enableLocationServices();
    } else {
      // User wants to disable location
      await disableLocationServices();
    }
  };

  const enableLocationServices = async () => {
    try {
      setLocationStatus(prev => ({ ...prev, isLoading: true }));

      // Request location permission
      const permissionResult = await LocationPermissionManager.requestLocationPermission();
      
      if (permissionResult.status === 'granted') {
        // Initialize location verification
        const result = await LocationVerificationManager.initializeLocationVerification(user?.uid || 'anonymous');
        
        if (result.success) {
          // Safely handle the location data
          let lastLocationData = null;
          if (result.location) {
            lastLocationData = {
              timestamp: new Date().toISOString(),
              coords: result.location.coords || result.location,
              accuracy: result.location.coords?.accuracy || result.location.accuracy || 'Unknown'
            };
          }
          
          setLocationStatus({
            enabled: true,
            permission: 'granted',
            lastLocation: lastLocationData,
            isLoading: false
          });
          
          Alert.alert(
            'Location Enabled',
            'Location services have been enabled successfully. This helps us provide better fraud protection by tracking the location of fraud alerts.',
            [{ text: 'OK' }]
          );
        } else {
          throw new Error(result.error || 'Failed to initialize location services');
        }
      } else {
        setLocationStatus(prev => ({ 
          ...prev, 
          enabled: false, 
          permission: permissionResult.status,
          isLoading: false 
        }));
        
        if (permissionResult.status === 'denied') {
          Alert.alert(
            'Location Permission Required',
            'To enable location services, please grant location permission in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Failed to enable location services:', error);
      setLocationStatus(prev => ({ ...prev, isLoading: false }));
      
      Alert.alert(
        'Error',
        'Failed to enable location services. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const disableLocationServices = async () => {
    Alert.alert(
      'Disable Location Services',
      'This will disable location tracking for fraud alerts. You can re-enable it anytime.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              setLocationStatus(prev => ({ ...prev, isLoading: true }));
              
              // Disable location verification
              await LocationVerificationManager.disableLocationVerification();
              
              setLocationStatus({
                enabled: false,
                permission: 'denied',
                lastLocation: null,
                isLoading: false
              });
              
              Alert.alert(
                'Location Disabled',
                'Location services have been disabled.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to disable location services:', error);
              setLocationStatus(prev => ({ ...prev, isLoading: false }));
              
              Alert.alert(
                'Error',
                'Failed to disable location services. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const getLocationStatusText = () => {
    if (locationStatus.isLoading) {
      return 'Checking location status...';
    }
    
    if (locationStatus.enabled && locationStatus.permission === 'granted') {
      let statusText = 'Location enabled';
      
      // Safely handle lastLocation object
      if (locationStatus.lastLocation) {
        try {
          let lastUpdateText = '';
          
          // Handle different lastLocation formats
          if (locationStatus.lastLocation.timestamp) {
            lastUpdateText = new Date(locationStatus.lastLocation.timestamp).toLocaleDateString();
          } else if (locationStatus.lastLocation.lastUpdated) {
            lastUpdateText = new Date(locationStatus.lastLocation.lastUpdated).toLocaleDateString();
          } else if (typeof locationStatus.lastLocation === 'string') {
            lastUpdateText = new Date(locationStatus.lastLocation).toLocaleDateString();
          }
          
          if (lastUpdateText) {
            statusText += ` • Last updated: ${lastUpdateText}`;
          }
        } catch (error) {
          console.warn('Error formatting last location date:', error);
          // Just show enabled status without date if formatting fails
        }
      }
      
      return statusText;
    }
    
    if (locationStatus.permission === 'denied') {
      return 'Location permission denied';
    }
    
    if (locationStatus.permission === 'never_ask_again') {
      return 'Location permission blocked - Check device settings';
    }
    
    return 'Location services disabled';
  };

  const getLocationStatusColor = () => {
    if (locationStatus.enabled && locationStatus.permission === 'granted') {
      return colors.success;
    }
    
    if (locationStatus.permission === 'denied' || locationStatus.permission === 'never_ask_again') {
      return colors.danger;
    }
    
    return colors.textSecondary;
  };

  const openLocationSettings = () => {
    Alert.alert(
      'Location Settings',
      'To change location permissions, go to your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Services</Text>
      <Text style={styles.description}>
        Enable location tracking to help identify fraud patterns and improve security alerts.
      </Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={styles.settingHeader}>
            <Ionicons 
              name="location-outline" 
              size={24} 
              color={getLocationStatusColor()} 
            />
            <Text style={styles.settingLabel}>Location Tracking</Text>
          </View>
          
          <Text style={[styles.statusText, { color: getLocationStatusColor() }]}>
            {getLocationStatusText()}
          </Text>
        </View>
        
        <View style={styles.settingControl}>
          {locationStatus.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={locationStatus.enabled}
              onValueChange={handleLocationToggle}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={locationStatus.enabled ? colors.primary : colors.gray400}
              disabled={locationStatus.isLoading}
            />
          )}
        </View>
      </View>
      
      {/* Additional Settings */}
      <TouchableOpacity 
        style={styles.additionalSetting}
        onPress={openLocationSettings}
      >
        <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.additionalSettingText}>Device Location Settings</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      
      {locationStatus.enabled && (
        <TouchableOpacity 
          style={styles.additionalSetting}
          onPress={loadLocationStatus}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.additionalSettingText}>Refresh Location Status</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      
      {/* Privacy Notice */}
      <View style={styles.privacyNotice}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.privacyText}>
          Your location data is used only for fraud detection and is stored securely. 
          You can disable this feature at any time.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 36,
    lineHeight: 18,
  },
  settingControl: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  additionalSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  additionalSettingText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 12,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.gray50,
    borderRadius: 12,
  },
  privacyText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 8,
    lineHeight: 16,
  },
});
