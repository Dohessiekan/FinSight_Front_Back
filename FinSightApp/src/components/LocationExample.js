/**
 * Example Location Component
 * 
 * Shows how to use the location service in your app
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';

const LocationExample = () => {
  const { user, locationStatus } = useAuth();
  const { 
    location, 
    loading, 
    error, 
    hasPermission, 
    requestPermission, 
    getCurrentLocation,
    updateLocation 
  } = useLocation(user?.uid);

  const handleGetLocation = async () => {
    if (!hasPermission) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to get your location.'
        );
        return;
      }
    }

    await getCurrentLocation();
  };

  const handleUpdateLocation = async () => {
    await updateLocation();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Service Example</Text>
      
      {/* Permission Status */}
      <View style={styles.section}>
        <Text style={styles.label}>Permission Status:</Text>
        <Text style={styles.value}>
          {hasPermission ? '✅ Granted' : '❌ Not Granted'}
        </Text>
      </View>

      {/* Current Location */}
      <View style={styles.section}>
        <Text style={styles.label}>Current Location:</Text>
        {loading ? (
          <Text style={styles.loading}>Getting location...</Text>
        ) : location ? (
          <View>
            <Text style={styles.value}>Latitude: {location.latitude}</Text>
            <Text style={styles.value}>Longitude: {location.longitude}</Text>
            <Text style={styles.value}>Address: {location.address}</Text>
            <Text style={styles.value}>City: {location.city}</Text>
            <Text style={styles.value}>
              Last Updated: {new Date(location.lastUpdated).toLocaleString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.value}>No location data</Text>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.section}>
          <Text style={styles.error}>Error: {error}</Text>
        </View>
      )}

      {/* Auth Location Status */}
      {locationStatus && (
        <View style={styles.section}>
          <Text style={styles.label}>Auth Location Status:</Text>
          <Text style={styles.value}>
            {locationStatus.success ? '✅ Connected' : '❌ Failed'}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttons}>
        <Button
          title="Get Location"
          onPress={handleGetLocation}
          disabled={loading}
        />
        
        <View style={styles.buttonSpacing} />
        
        <Button
          title="Update Location"
          onPress={handleUpdateLocation}
          disabled={loading || !location}
        />
        
        <View style={styles.buttonSpacing} />
        
        <Button
          title="Request Permission"
          onPress={requestPermission}
          disabled={hasPermission}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  loading: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  error: {
    fontSize: 14,
    color: '#d32f2f',
  },
  buttons: {
    marginTop: 20,
  },
  buttonSpacing: {
    height: 10,
  },
});

export default LocationExample;
