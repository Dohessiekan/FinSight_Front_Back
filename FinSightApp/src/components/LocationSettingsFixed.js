/**
 * Location Settings Component - Fixed Version
 * 
 * Safely handles location data to prevent React object rendering errors
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

export default function LocationSettingsFixed() {
  const { user } = useAuth();
  const [locationState, setLocationState] = useState({
    enabled: false,
    permission: 'unknown',
    lastUpdateText: '',
    isLoading: true,
    hasError: false
  });

  useEffect(() => {
    loadLocationStatus();
  }, []);

  const loadLocationStatus = async () => {
    setLocationState(prev => ({ ...prev, isLoading: true, hasError: false }));
    
    try {
      // Get status data
      const verificationStatus = await LocationVerificationManager.getCurrentLocationStatus();
      const permissionStatus = await LocationPermissionManager.checkLocationPermission();
      
      // Safely process last update text
      let lastUpdateText = '';
      if (verificationStatus.lastLocation) {
        try {
          if (verificationStatus.lastLocation.timestamp) {
            lastUpdateText = new Date(verificationStatus.lastLocation.timestamp).toLocaleDateString();
          } else if (typeof verificationStatus.lastLocation === 'string') {
            lastUpdateText = new Date(verificationStatus.lastLocation).toLocaleDateString();
          }
        } catch (dateError) {
          console.warn('Error formatting date:', dateError);
          lastUpdateText = 'Recently';
        }
      }
      
      setLocationState({
        enabled: Boolean(verificationStatus.enabled),
        permission: String(permissionStatus.status || 'unknown'),
        lastUpdateText: String(lastUpdateText),
        isLoading: false,
        hasError: false
      });
      
    } catch (error) {
      console.error('Failed to load location status:', error);
      setLocationState(prev => ({ 
        ...prev, 
        isLoading: false, 
        hasError: true 
      }));
    }
  };

  const handleLocationToggle = async (enabled) => {
    if (enabled) {
      await enableLocationServices();
    } else {
      await disableLocationServices();
    }
  };

  const enableLocationServices = async () => {
    try {
      setLocationState(prev => ({ ...prev, isLoading: true }));

      const permissionResult = await LocationPermissionManager.requestLocationPermission();
      
      if (permissionResult.status === 'granted') {
        const result = await LocationVerificationManager.initializeLocationVerification(user?.uid || 'anonymous');
        
        if (result.success) {
          setLocationState({
            enabled: true,
            permission: 'granted',
            lastUpdateText: 'Just now',
            isLoading: false,
            hasError: false
          });
          
          Alert.alert(
            'Location Enabled',
            'Location services have been enabled successfully. This helps us provide better fraud protection.',
            [{ text: 'OK' }]
          );
        } else {
          throw new Error(result.error || 'Failed to initialize location services');
        }
      } else {
        setLocationState(prev => ({ 
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
      setLocationState(prev => ({ ...prev, isLoading: false, hasError: true }));
      
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
              setLocationState(prev => ({ ...prev, isLoading: true }));
              
              await LocationVerificationManager.disableLocationVerification();
              
              setLocationState({
                enabled: false,
                permission: 'denied',
                lastUpdateText: '',
                isLoading: false,
                hasError: false
              });
              
              Alert.alert(
                'Location Disabled',
                'Location services have been disabled.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to disable location services:', error);
              setLocationState(prev => ({ ...prev, isLoading: false, hasError: true }));
              
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

  const getStatusText = () => {
    if (locationState.isLoading) {
      return 'Checking location status...';
    }
    
    if (locationState.hasError) {
      return 'Error loading location status';
    }
    
    if (locationState.enabled && locationState.permission === 'granted') {
      let text = 'Location enabled';
      if (locationState.lastUpdateText) {
        text += ` • Last updated: ${locationState.lastUpdateText}`;
      }
      return text;
    }
    
    if (locationState.permission === 'denied') {
      return 'Location permission denied';
    }
    
    if (locationState.permission === 'never_ask_again') {
      return 'Location permission blocked - Check device settings';
    }
    
    return 'Location services disabled';
  };

  const getStatusColor = () => {
    if (locationState.hasError) {
      return colors.warning;
    }
    
    if (locationState.enabled && locationState.permission === 'granted') {
      return colors.success;
    }
    
    if (locationState.permission === 'denied' || locationState.permission === 'never_ask_again') {
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
      <Text style={styles.title}>Location Services (Fixed)</Text>
      <Text style={styles.description}>
        Enable location tracking to help identify fraud patterns and improve security alerts.
      </Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={styles.settingHeader}>
            <Ionicons 
              name="location-outline" 
              size={24} 
              color={getStatusColor()} 
            />
            <Text style={styles.settingLabel}>Location Tracking</Text>
          </View>
          
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        <View style={styles.settingControl}>
          {locationState.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={locationState.enabled}
              onValueChange={handleLocationToggle}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={locationState.enabled ? colors.primary : colors.gray400}
              disabled={locationState.isLoading}
            />
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.additionalSetting}
        onPress={openLocationSettings}
      >
        <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.additionalSettingText}>Device Location Settings</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      
      {locationState.enabled && (
        <TouchableOpacity 
          style={styles.additionalSetting}
          onPress={loadLocationStatus}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.additionalSettingText}>Refresh Location Status</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      
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
    borderWidth: 2,
    borderColor: colors.success,
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
