/**
 * User Location Manager for FinSight App
 * 
 * Handles user location data for fraud alert mapping
 */

import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import LocationPermissionManager from './LocationPermissionManager';

export class UserLocationManager {
  
  /**
   * Update user's location in Firebase for fraud alert mapping
   */
  static async updateUserLocation(userId, locationData) {
    try {
      console.log('📍 Updating user location for mapping...');
      
      const userRef = doc(db, 'users', userId);
      
      const locationUpdate = {
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address || 'Rwanda',
          city: locationData.city || 'Unknown',
          lastUpdated: serverTimestamp(),
          accuracy: locationData.accuracy || null,
          source: 'mobile_app'
        },
        lastLocationUpdate: serverTimestamp()
      };
      
      await updateDoc(userRef, locationUpdate);
      
      console.log('✅ User location updated for fraud mapping');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to update user location:', error);
      
      // Try to create the document if it doesn't exist
      try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            address: locationData.address || 'Rwanda',
            city: locationData.city || 'Unknown',
            lastUpdated: serverTimestamp(),
            accuracy: locationData.accuracy || null,
            source: 'mobile_app'
          },
          lastLocationUpdate: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
        
        console.log('✅ User location created for fraud mapping');
        return { success: true };
        
      } catch (createError) {
        console.error('❌ Failed to create user location:', createError);
        return { success: false, error: createError.message };
      }
    }
  }
  
  /**
   * Get Rwanda region approximation based on city/district name
   */
  static getRwandaRegionCoordinates(cityName) {
    const rwandaRegions = {
      'kigali': { lat: -1.9441, lng: 30.0619, name: 'Kigali City' },
      'huye': { lat: -2.5970, lng: 29.7390, name: 'Huye District' },
      'musanze': { lat: -1.4830, lng: 29.6350, name: 'Musanze District' },
      'rubavu': { lat: -1.6790, lng: 29.2660, name: 'Rubavu District' },
      'kayonza': { lat: -1.8830, lng: 30.6230, name: 'Kayonza District' },
      'muhanga': { lat: -2.0854, lng: 29.7390, name: 'Muhanga District' },
      'ngoma': { lat: -2.1500, lng: 30.8330, name: 'Ngoma District' },
      'nyagatare': { lat: -1.2890, lng: 30.3250, name: 'Nyagatare District' },
      'rwamagana': { lat: -1.9480, lng: 30.4350, name: 'Rwamagana District' },
      'gitarama': { lat: -2.0854, lng: 29.7390, name: 'Gitarama (Muhanga)' }
    };
    
    const cityKey = cityName?.toLowerCase() || 'kigali';
    const region = rwandaRegions[cityKey] || rwandaRegions['kigali'];
    
    // Add small random variation to avoid exact overlap
    return {
      latitude: region.lat + (Math.random() - 0.5) * 0.05,
      longitude: region.lng + (Math.random() - 0.5) * 0.05,
      address: region.name,
      city: region.name,
      isRealGPS: false, // Mark as approximation, not real GPS
      source: 'region_approximation'
    };
  }
  
  /**
   * Request device location with proper permission handling
   */
  static async requestDeviceLocation() {
    try {
      console.log('📍 Requesting device location with permission...');
      
      // Try to get location with proper permission handling
      const locationData = await LocationPermissionManager.requestLocationWithPermission();
      
      if (locationData) {
        console.log('✅ Real GPS location obtained');
        return locationData;
      }
      
      // Fallback to default location if GPS fails
      console.warn('⚠️ GPS failed, using default Rwanda location');
      const defaultLocation = this.getRwandaRegionCoordinates('kigali');
      return {
        ...defaultLocation,
        source: 'default',
        isRealGPS: false
      };
      
    } catch (error) {
      console.error('❌ Error getting device location:', error);
      
      // Fallback to default location
      const defaultLocation = this.getRwandaRegionCoordinates('kigali');
      return {
        ...defaultLocation,
        source: 'error_fallback',
        isRealGPS: false
      };
    }
  }
}

export default UserLocationManager;
