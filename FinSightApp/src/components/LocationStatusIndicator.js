/**
 * Location Status Indicator Component
 * 
 * Shows user's current location status and provides options to manage location settings
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LocationVerificationManager from '../utils/LocationVerificationManager';

const LocationStatusIndicator = ({ style }) => {
  const { locationStatus, user, refreshLocationStatus, forceLocationUpdate, clearLocationData } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!locationStatus) {
    return null; // Don't show if location status not loaded yet
  }

  const getStatusColor = () => {
    if (locationStatus.locationEnabled) return '#4CAF50'; // Green
    if (locationStatus.userDeclined) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getStatusText = () => {
    if (locationStatus.locationEnabled) return 'Location Active';
    if (locationStatus.userDeclined) return 'Location Disabled';
    if (locationStatus.permissionDenied) return 'Permission Denied';
    if (locationStatus.gpsUnavailable) return 'GPS Unavailable';
    return 'Location Unknown';
  };

  const getStatusIcon = () => {
    if (locationStatus.locationEnabled) return '📍';
    if (locationStatus.userDeclined) return '🚫';
    return '⚠️';
  };

  const handleRefreshLocation = async () => {
    try {
      setUpdating(true);
      const result = await refreshLocationStatus();
      
      if (result && result.success) {
        Alert.alert(
          'Location Updated',
          result.message || 'Location status refreshed successfully'
        );
      } else {
        Alert.alert(
          'Update Failed',
          result?.error || 'Could not refresh location status'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh location status');
    } finally {
      setUpdating(false);
    }
  };

  const handleForceUpdate = async () => {
    try {
      setUpdating(true);
      const result = await forceLocationUpdate();
      
      if (result && result.success) {
        Alert.alert(
          'Location Updated',
          'Your location has been updated successfully'
        );
      } else {
        Alert.alert(
          'Update Failed',
          result?.error || 'Could not update location'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update location');
    } finally {
      setUpdating(false);
    }
  };

  const handleClearLocation = () => {
    Alert.alert(
      'Clear Location Data',
      'This will remove all location data and disable location services. You can re-enable them later in settings.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              const result = await clearLocationData();
              
              if (result && result.success) {
                Alert.alert(
                  'Location Cleared',
                  'Location data has been cleared successfully'
                );
              } else {
                Alert.alert(
                  'Clear Failed',
                  result?.error || 'Could not clear location data'
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear location data');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleReEnable = async () => {
    try {
      setUpdating(true);
      
      // Use the LocationVerificationManager to re-verify
      const result = await LocationVerificationManager.verifyUserLocation(user.uid, user.email);
      
      if (result.success && result.locationEnabled) {
        await refreshLocationStatus();
        Alert.alert(
          'Location Enabled',
          'Location services have been enabled successfully'
        );
      } else {
        Alert.alert(
          'Enable Failed',
          result.error || 'Could not enable location services'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable location services');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}
        onPress={() => setShowDetails(true)}
        disabled={updating}
      >
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Location Status</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Current Status:</Text>
              <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            {locationStatus.locationData && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last Updated:</Text>
                <Text style={styles.statusValue}>
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </Text>
              </View>
            )}

            {locationStatus.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>{locationStatus.message}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Location Services</Text>
            <Text style={styles.sectionDescription}>
              Location services help FinSight map fraud alerts in your area and protect your community.
            </Text>

            {locationStatus.locationEnabled ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.refreshButton]}
                  onPress={handleRefreshLocation}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>
                    {updating ? 'Refreshing...' : 'Refresh Location'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.updateButton]}
                  onPress={handleForceUpdate}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>
                    {updating ? 'Updating...' : 'Update Location'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.disableButton]}
                  onPress={handleClearLocation}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>Disable Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.enableButton]}
                  onPress={handleReEnable}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>
                    {updating ? 'Enabling...' : 'Enable Location'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.refreshButton]}
                  onPress={handleRefreshLocation}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>
                    {updating ? 'Checking...' : 'Check Status'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Privacy Information</Text>
            <Text style={styles.infoText}>
              • Your exact location is never shared publicly{'\n'}
              • Only general area information is used for fraud mapping{'\n'}
              • Location data helps protect you and your community{'\n'}
              • You can disable location services at any time
            </Text>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 120,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionSection: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
  },
  updateButton: {
    backgroundColor: '#34C759',
  },
  enableButton: {
    backgroundColor: '#34C759',
  },
  disableButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default LocationStatusIndicator;
