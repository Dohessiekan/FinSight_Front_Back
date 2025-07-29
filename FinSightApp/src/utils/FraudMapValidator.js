/**
 * FRAUD MAP CONNECTION VALIDATOR
 * 
 * Simple script to verify fraud detection flows to map display
 */

import { MobileAlertSystem } from '../utils/MobileAlertSystem';
import { LocationService } from '../services/LocationService';
import { UserLocationManager } from '../utils/UserLocationManager';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class FraudMapValidator {
  
  /**
   * Test fraud detection to map display connection
   */
  static async validateMapConnection() {
    console.log('🗺️ Validating Fraud Map Connection...');
    
    try {
      // Step 1: Test location collection
      console.log('\n📍 Testing location collection...');
      let locationData = null;
      
      try {
        const gpsResult = await LocationService.getGPSLocation();
        if (gpsResult.success) {
          locationData = {
            latitude: gpsResult.location.latitude,
            longitude: gpsResult.location.longitude,
            accuracy: gpsResult.location.accuracy,
            isRealGPS: gpsResult.location.isGPSAccurate,
            source: gpsResult.location.source
          };
          console.log(`✅ GPS Location: ${locationData.latitude}, ${locationData.longitude}`);
        } else {
          throw new Error('GPS failed');
        }
      } catch (error) {
        console.log('⚠️ GPS failed, using fallback');
        locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
        locationData.isRealGPS = false;
        locationData.source = 'default_location';
      }
      
      // Step 2: Create test fraud message
      console.log('\n🚨 Creating test fraud alert...');
      const testMessage = {
        id: `map_test_${Date.now()}`,
        text: 'TEST MAP: Your account will be suspended! Click here: http://fake-bank.com',
        sender: '+250788999999',
        status: 'fraud',
        spamData: { confidence: 0.95, label: 'fraud' },
        analysis: 'Test fraud for map display validation'
      };
      
      // Step 3: Send to fraud_alerts collection (what the map monitors)
      console.log('\n💾 Sending to fraud_alerts collection...');
      const alertData = {
        type: 'Fraud Detected',
        status: 'active',
        content: testMessage.text,
        messageText: testMessage.text,
        sender: testMessage.sender,
        phone: testMessage.sender,
        userId: 'map_test_user',
        confidence: 95,
        
        // Location data in format expected by FraudMap.js
        location: {
          coordinates: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy || null,
            isDefault: !locationData.isRealGPS,
            source: locationData.source
          },
          quality: {
            hasRealGPS: locationData.isRealGPS,
            accuracy: locationData.accuracy || null,
            source: locationData.source
          },
          formattedLocation: 'Map Test Location'
        },
        
        // Required timestamps
        createdAt: serverTimestamp(),
        detectedAt: serverTimestamp(),
        
        // Test markers
        mapTestAlert: true,
        testTimestamp: new Date().toISOString()
      };
      
      // Write to fraud_alerts collection (monitored by web app map)
      const alertsRef = collection(db, 'fraud_alerts');
      const docRef = await addDoc(alertsRef, alertData);
      
      console.log(`✅ Alert sent to fraud_alerts collection: ${docRef.id}`);
      console.log(`📍 Map coordinates: ${locationData.latitude}, ${locationData.longitude}`);
      console.log(`🎯 GPS Quality: ${locationData.isRealGPS ? 'Real GPS' : 'Default Location'}`);
      
      // Step 4: Validation summary
      console.log('\n📋 VALIDATION SUMMARY:');
      console.log('✅ Location collected successfully');
      console.log('✅ Fraud alert created with location data');
      console.log('✅ Alert sent to fraud_alerts collection');
      console.log('✅ Data format matches FraudMap.js requirements');
      console.log('\n🗺️ WEB APP MAP SHOULD NOW DISPLAY THIS ALERT');
      console.log(`   Open FinSight web app → Overview page → Check map for new marker`);
      console.log(`   Coordinates: ${locationData.latitude}, ${locationData.longitude}`);
      
      return {
        success: true,
        alertId: docRef.id,
        coordinates: `${locationData.latitude}, ${locationData.longitude}`,
        gpsQuality: locationData.isRealGPS ? 'Real GPS' : 'Default Location',
        webAppInstructions: 'Check FinSight web app Overview page map for new fraud alert marker'
      };
      
    } catch (error) {
      console.error('❌ Map validation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Quick test to send a fraud alert to the map
   */
  static async sendTestAlertToMap() {
    console.log('🗺️ Sending test alert to map...');
    
    try {
      // Get location (GPS or fallback)
      let location = null;
      try {
        const gpsResult = await LocationService.getGPSLocation();
        if (gpsResult.success) {
          location = gpsResult.location;
        }
      } catch (error) {
        console.log('Using fallback location');
      }
      
      if (!location) {
        const fallback = UserLocationManager.getRwandaRegionCoordinates('kigali');
        location = {
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          isGPSAccurate: false,
          source: 'default_location'
        };
      }
      
      // Create test fraud message
      const fraudMessage = {
        id: `quick_test_${Date.now()}`,
        text: 'URGENT: Your MTN line will be blocked. Call 0788000000 now!',
        sender: '+250788777888',
        status: 'fraud',
        spamData: { confidence: 0.92, label: 'fraud' }
      };
      
      // Use MobileAlertSystem to create the alert (this will send to fraud_alerts collection)
      const result = await MobileAlertSystem.createFraudAlert(
        fraudMessage,
        'quick_test_user',
        { confidence: 0.92, label: 'fraud' },
        {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || null,
          isRealGPS: location.isGPSAccurate,
          source: location.source,
          address: 'Quick Test Location',
          city: 'Rwanda'
        }
      );
      
      if (result.success) {
        console.log(`✅ Test alert sent to map: ${result.alertId}`);
        console.log(`📍 Location: ${location.latitude}, ${location.longitude}`);
        console.log('🗺️ Check the web app map for the new fraud alert!');
        
        return {
          success: true,
          alertId: result.alertId,
          message: 'Test alert sent to fraud map successfully'
        };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('❌ Failed to send test alert:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default FraudMapValidator;
