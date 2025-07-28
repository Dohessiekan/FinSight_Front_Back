/**
 * Location Hook
 * 
 * React hook for managing user location
 */

import { useState, useEffect } from 'react';
import LocationService from '../services/LocationService';

export const useLocation = (userId) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const permission = await LocationService.hasLocationPermission();
    setHasPermission(permission);
  };

  const requestPermission = async () => {
    setLoading(true);
    try {
      const result = await LocationService.requestLocationPermission();
      setHasPermission(result.granted);
      return result;
    } catch (err) {
      setError(err.message);
      return { granted: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await LocationService.initializeUserLocation(userId);
      
      if (result.success) {
        setLocation(result.location);
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await LocationService.updateUserLocation(userId);
      
      if (result.success) {
        setLocation(result.location);
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getStoredLocation = async () => {
    if (!userId) return;

    try {
      const result = await LocationService.getStoredLocation(userId);
      if (result.success) {
        setLocation(result.location);
      }
    } catch (err) {
      console.warn('Could not get stored location:', err);
    }
  };

  return {
    location,
    loading,
    error,
    hasPermission,
    requestPermission,
    getCurrentLocation,
    updateLocation,
    getStoredLocation,
    checkPermission
  };
};

export default useLocation;
