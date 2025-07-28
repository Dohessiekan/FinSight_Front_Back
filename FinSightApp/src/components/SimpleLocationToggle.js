import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationService from '../services/LocationService';
import LocationPermissionManager from '../services/LocationPermissionManager';
import { useAuth } from '../contexts/AuthContext';
import colors from '../theme/colors';

export default function SimpleLocationToggle() {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const { user } = useAuth();

  // Load saved location preference and status
  useEffect(() => {
    loadLocationStatus();
  }, []);

  const loadLocationStatus = async () => {
    try {
      const status = await LocationPermissionManager.getLocationStatus();
      setLocationEnabled(status.canUseLocation);
      
      // If enabled, try to load last known location
      if (status.canUseLocation && user) {
        const stored = await LocationService.getStoredLocation(user.uid);
        if (stored.success) {
          setLastLocation(stored.location);
        }
      }
    } catch (error) {
      console.error('Failed to load location status:', error);
    }
  };

  const handleLocationToggle = async (enabled) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to enable location services');
      return;
    }

    setLoading(true);

    try {
      if (enabled) {
        // Enable location - request permission and get location
        const permissionResult = await LocationPermissionManager.requestLocationPermission();
        
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission Required',
            'Location permission is required to enable GPS tracking. Please allow location access in your device settings.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        // Get and save current location
        const locationResult = await LocationService.initializeUserLocation(user.uid);
        
        if (locationResult.success) {
          setLocationEnabled(true);
          setLastLocation(locationResult.location);
          await AsyncStorage.setItem('location_enabled', 'true');
          
          Alert.alert(
            'Location Enabled',
            'GPS location tracking has been enabled. Your location has been saved.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Location Error',
            locationResult.error || 'Failed to get your location. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Disable location
        setLocationEnabled(false);
        setLastLocation(null);
        await AsyncStorage.setItem('location_enabled', 'false');
        
        Alert.alert(
          'Location Disabled',
          'GPS location tracking has been disabled.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      Alert.alert(
        'Error',
        'An error occurred while updating location settings. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (!user || !locationEnabled) return;
    
    setLoading(true);
    
    try {
      const result = await LocationService.updateUserLocation(user.uid);
      
      if (result.success) {
        setLastLocation(result.location);
        Alert.alert(
          'Location Updated',
          'Your current location has been updated successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Update Failed',
          result.error || 'Failed to update location. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'An error occurred while updating location.');
    } finally {
      setLoading(false);
    }
  };

  const formatLocation = (location) => {
    if (!location) return 'No location available';
    
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  const formatLocationTime = (location) => {
    if (!location || !location.timestamp) return '';
    
    const date = new Date(location.timestamp);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Location Services</Text>
      
      {/* Main toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleLeft}>
          <Ionicons 
            name={locationEnabled ? "location" : "location-outline"} 
            size={24} 
            color={locationEnabled ? colors.primary : colors.textSecondary} 
          />
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>GPS Location</Text>
            <Text style={styles.toggleSubtitle}>
              {locationEnabled ? 'Location tracking enabled' : 'Location tracking disabled'}
            </Text>
          </View>
        </View>
        
        <Switch
          value={locationEnabled}
          onValueChange={handleLocationToggle}
          disabled={loading}
          trackColor={{ false: colors.gray300, true: colors.primaryLight }}
          thumbColor={locationEnabled ? colors.primary : colors.gray500}
        />
      </View>

      {/* Location info when enabled */}
      {locationEnabled && lastLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>Current Location:</Text>
          <Text style={styles.locationText}>{formatLocation(lastLocation)}</Text>
          <Text style={styles.locationTime}>Updated: {formatLocationTime(lastLocation)}</Text>
          
          <TouchableOpacity 
            style={styles.updateButton}
            onPress={updateLocation}
            disabled={loading}
          >
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.updateButtonText}>
              {loading ? 'Updating...' : 'Update Location'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.updateButton, { marginTop: 8, backgroundColor: colors.surface, borderColor: colors.secondary }]}
            onPress={async () => {
              if (!user) return;
              setLoading(true);
              try {
                const result = await LocationPermissionManager.handleUserLogin(user.uid);
                if (result.success && result.location) {
                  setLastLocation(result.location);
                  Alert.alert('Success', 'Location check completed successfully');
                } else {
                  Alert.alert('Info', result.message || 'Location check completed');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to check location');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Ionicons name="location" size={16} color={colors.secondary} />
            <Text style={[styles.updateButtonText, { color: colors.secondary }]}>
              Test Login Check
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info text */}
      <Text style={styles.infoText}>
        {locationEnabled 
          ? 'Your location is being tracked and saved securely. Location permission is verified on every login.'
          : 'Enable location services to allow the app to access your GPS location. You will be prompted on each login to verify location access.'
        }
      </Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locationInfo: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  locationTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});
