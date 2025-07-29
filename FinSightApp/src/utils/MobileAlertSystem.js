/**
 *import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserLocationManager } from './UserLocationManager';
import { LocationService } from '../services/LocationService';al-time Alert System for Mobile App Fraud Detection
 * 
 * Automatically creates fraud alerts when suspicious/fraud messages 
 * are detected during mobile app scans
 */

import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import UserLocationManager from './UserLocationManager';

export class MobileAlertSystem {
  
  /**
   * Create a fraud alert when a suspicious/fraud message is detected
   */
  static async createFraudAlert(message, userId, analysisResult, userLocation = null) {
    try {
      console.log(`🚨 Creating fraud alert for message from ${message.sender}`);
      
      // Only create alerts for suspicious or fraud messages
      if (!message.status || (message.status !== 'suspicious' && message.status !== 'fraud')) {
        console.log(`ℹ️ Skipping alert for safe message (status: ${message.status})`);
        return { success: true, skipped: true, reason: 'safe_message' };
      }
      
      // Try to get current location or use provided location
      let locationData = userLocation;
      
      // If userLocation is provided and has real GPS, use it directly
      if (locationData && locationData.isRealGPS) {
        console.log(`✅ Using provided REAL GPS location: ${locationData.latitude}, ${locationData.longitude} (±${locationData.accuracy}m)`);
        console.log(`🗺️ This alert WILL appear on the web app map with REAL GPS coordinates`);
      } else if (!locationData) {
        // Try to get high-accuracy GPS location
        try {
          const gpsResult = await LocationService.getGPSLocation();
          if (gpsResult.success) {
            locationData = {
              latitude: gpsResult.location.latitude,
              longitude: gpsResult.location.longitude,
              accuracy: gpsResult.location.accuracy,
              isRealGPS: gpsResult.location.isGPSAccurate,
              source: gpsResult.location.source,
              address: `GPS Accuracy: ${gpsResult.location.accuracyLevel}`,
              city: 'Rwanda'
            };
            console.log(`📍 Using real GPS location: ${locationData.latitude}, ${locationData.longitude} (±${locationData.accuracy}m)`);
          } else {
            // Fallback to device location or Rwanda region
            locationData = await UserLocationManager.requestDeviceLocation();
            console.log('📍 Using device location as fallback');
          }
        } catch (locationError) {
          console.warn('⚠️ Could not get location:', locationError);
          // Use default Rwanda location
          locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
          locationData.isRealGPS = false;
          locationData.source = 'default_location';
          console.log('📍 Using default Rwanda location');
        }
      } else {
        console.log('📍 Using provided location data (fallback)');
      }
      
      // Update user's location in their profile for future mapping
      try {
        await UserLocationManager.updateUserLocation(userId, locationData);
      } catch (updateError) {
        console.warn('⚠️ Could not update user location profile:', updateError);
      }
      
      // Create the fraud alert document (matching web app format)
      const alertData = {
        // Basic alert info (required by web app Overview.js)
        type: message.status === 'fraud' ? 'Fraud Detected' : 'Suspicious Activity',
        severity: this.calculateSeverity(message, analysisResult),
        status: 'active',
        
        // Message details (required by web app display)
        content: (message.text || '').substring(0, 200), // Web app looks for 'content' field
        message: (message.text || '').substring(0, 100), // Also provide 'message' field as fallback
        messageText: (message.text || '').substring(0, 200),
        sender: message.sender || message.address || 'Unknown',
        phone: message.phone || message.sender || 'Unknown',
        
        // Analysis details
        confidence: analysisResult?.confidence || message.spamData?.confidence || 0,
        aiAnalysis: message.analysis || 'Mobile app fraud detection',
        riskScore: this.calculateRiskScore(message, analysisResult),
        fraudType: analysisResult?.label || message.spamData?.label || message.status,
        
        // User and source info (required by web app)
        userId: userId,
        source: 'FinSight Mobile App',
        
        // Location data for map display (matching web app format)
        location: {
          coordinates: {
            latitude: locationData?.latitude || -1.9441,
            longitude: locationData?.longitude || 30.0619,
            address: locationData?.realAddress || locationData?.address || 'Rwanda',
            city: locationData?.city || 'Unknown',
            district: locationData?.district || '',
            street: locationData?.street || '',
            country: locationData?.country || 'Rwanda',
            accuracy: locationData?.accuracy || null,
            isDefault: locationData?.isRealGPS !== true, // TRUE if NOT real GPS (default location)
            isRealGPS: locationData?.isRealGPS === true, // TRUE if real GPS
            source: locationData?.source || 'mobile_app'
          },
          address: {
            formattedAddress: locationData?.realAddress || locationData?.adminDisplayName || locationData?.address || `${locationData?.city || 'Unknown'}, Rwanda`,
            street: locationData?.street || '',
            district: locationData?.district || '',
            city: locationData?.city || 'Unknown',
            country: locationData?.country || 'Rwanda'
          },
          formattedLocation: locationData?.realAddress || locationData?.adminDisplayName || locationData?.address || locationData?.city || 'Mobile Device',
          quality: {
            hasRealGPS: locationData?.isRealGPS === true, // Track if this is real GPS
            accuracy: locationData?.accuracy || null,
            source: locationData?.source || 'mobile_app',
            precisionLevel: locationData?.precisionLevel || 'standard',
            canSeeStreets: locationData?.canSeeStreets || false,
            canSeeBuildings: locationData?.canSeeBuildings || false
          }
        },
        
        // Timestamps
        detectedAt: serverTimestamp(),
        messageTimestamp: message.timestamp || message.date || new Date().toISOString(),
        createdAt: serverTimestamp(),
        
        // Additional metadata
        deviceType: 'mobile',
        platform: 'react-native',
        appVersion: '2.0',
        
        // Alert management
        acknowledged: false,
        investigatedBy: null,
        resolution: null,
        notes: '',
        
        // Financial info if available
        amount: message.amount || null,
        currency: 'RWF',
        transactionId: message.transactionId || null,
        
        // For dashboard display
        message: this.generateAlertMessage(message, analysisResult),
        priority: this.calculatePriority(message, analysisResult)
      };
      
      // Save to fraud_alerts collection (monitored by web app)
      const alertsRef = collection(db, 'fraud_alerts');
      
      // Log the alert data structure for debugging
      console.log('🔍 Final alert data structure:', JSON.stringify({
        location: {
          coordinates: {
            isDefault: alertData.location.coordinates.isDefault,
            isRealGPS: alertData.location.coordinates.isRealGPS,
            hasRealGPS: alertData.location.quality.hasRealGPS,
            source: alertData.location.coordinates.source,
            accuracy: alertData.location.coordinates.accuracy,
            realAddress: alertData.location.coordinates.address
          },
          formattedLocation: alertData.location.formattedLocation
        },
        messageText: alertData.messageText.substring(0, 50) + '...'
      }, null, 2));
      
      if (alertData.location.coordinates.isRealGPS) {
        console.log(`🗺️ ALERT WILL BE VISIBLE ON MAP with REAL ADDRESS: ${alertData.location.formattedLocation}`);
        console.log(`📍 Admin will see: ${alertData.location.coordinates.address}`);
      } else {
        console.log('⚠️ ALERT WILL BE FILTERED OUT - Using default location (isDefault: true)');
      }
      
      const alertDoc = await addDoc(alertsRef, alertData);
      
      console.log(`✅ Fraud alert created with ID: ${alertDoc.id}`);
      
      // Update dashboard stats
      await this.updateDashboardStats(alertData);
      
      return {
        success: true,
        alertId: alertDoc.id,
        alertType: alertData.type,
        severity: alertData.severity
      };
      
    } catch (error) {
      console.error('❌ Failed to create fraud alert:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Calculate alert severity based on message analysis
   */
  static calculateSeverity(message, analysisResult) {
    const confidence = analysisResult?.confidence || message.spamData?.confidence || 0;
    const riskScore = message.riskScore || (confidence * 100);
    
    if (message.status === 'fraud' && confidence > 0.9) return 'critical';
    if (message.status === 'fraud' && confidence > 0.7) return 'high';
    if (message.status === 'suspicious' || riskScore > 60) return 'warning';
    return 'info';
  }
  
  /**
   * Calculate risk score for the alert
   */
  static calculateRiskScore(message, analysisResult) {
    const confidence = analysisResult?.confidence || message.spamData?.confidence || 0;
    const baseScore = confidence * 100;
    
    // Boost score for certain keywords
    const text = (message.text || '').toLowerCase();
    let boost = 0;
    
    if (text.includes('urgent') || text.includes('immediately')) boost += 10;
    if (text.includes('click') || text.includes('link')) boost += 15;
    if (text.includes('verify') || text.includes('confirm')) boost += 10;
    if (text.includes('account') && text.includes('suspend')) boost += 20;
    
    return Math.min(100, Math.round(baseScore + boost));
  }
  
  /**
   * Calculate alert priority
   */
  static calculatePriority(message, analysisResult) {
    const confidence = analysisResult?.confidence || message.spamData?.confidence || 0;
    
    if (message.status === 'fraud' && confidence > 0.8) return 'high';
    if (message.status === 'fraud' || confidence > 0.6) return 'medium';
    return 'low';
  }
  
  /**
   * Generate human-readable alert message
   */
  static generateAlertMessage(message, analysisResult) {
    const sender = message.sender || 'Unknown';
    const confidence = Math.round((analysisResult?.confidence || message.spamData?.confidence || 0) * 100);
    const type = message.status === 'fraud' ? 'fraudulent' : 'suspicious';
    
    return `${type.charAt(0).toUpperCase() + type.slice(1)} SMS detected from ${sender} with ${confidence}% confidence. Message: "${(message.text || '').substring(0, 100)}${message.text?.length > 100 ? '...' : ''}"`;
  }
  
  /**
   * Update dashboard statistics when alert is created
   */
  static async updateDashboardStats(alertData) {
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      const today = new Date().toISOString().split('T')[0];
      
      const updateData = {
        // Overall stats
        totalFraudDetected: increment(1),
        activeFraudAlerts: increment(1),
        lastAlertTime: serverTimestamp(),
        
        // Daily stats
        [`daily_${today}.fraudAlerts`]: increment(1),
        [`daily_${today}.alertsCreated`]: increment(1),
        
        // Severity-based stats
        [`alertsBySeverity.${alertData.severity}`]: increment(1),
        
        // Last update
        lastUpdated: serverTimestamp(),
        lastSync: serverTimestamp()
      };
      
      // Add priority-based increments
      if (alertData.priority === 'high') {
        updateData.highPriorityAlerts = increment(1);
      }
      
      await updateDoc(dashboardRef, updateData);
      console.log(`📊 Dashboard stats updated for new ${alertData.severity} alert`);
      
    } catch (error) {
      console.error('❌ Failed to update dashboard stats:', error);
    }
  }
  
  /**
   * Process a batch of analyzed messages and create alerts for fraud/suspicious ones
   */
  static async processScanResults(analyzedMessages, userId) {
    try {
      console.log(`🔍 Processing ${analyzedMessages.length} analyzed messages for alerts`);
      
      const alerts = [];
      let alertsCreated = 0;
      let alertsSkipped = 0;
      
      for (const message of analyzedMessages) {
        try {
          const result = await this.createFraudAlert(message, userId, message.analysisResult);
          
          if (result.success && !result.skipped) {
            alerts.push(result);
            alertsCreated++;
          } else if (result.skipped) {
            alertsSkipped++;
          }
          
        } catch (error) {
          console.error(`❌ Failed to create alert for message ${message.id}:`, error);
        }
      }
      
      console.log(`✅ Alert processing complete: ${alertsCreated} alerts created, ${alertsSkipped} skipped`);
      
      return {
        success: true,
        alertsCreated,
        alertsSkipped,
        alerts
      };
      
    } catch (error) {
      console.error('❌ Failed to process scan results for alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Create a summary alert for a scan session
   */
  static async createScanSummaryAlert(scanSummary, userId) {
    try {
      // Only create summary if there were significant findings
      if (scanSummary.fraudCount === 0 && scanSummary.suspiciousCount === 0) {
        return { success: true, skipped: true, reason: 'no_threats_found' };
      }
      
      const alertData = {
        type: 'Scan Summary',
        severity: scanSummary.fraudCount > 0 ? 'high' : 'warning',
        status: 'active',
        
        messageText: `Scan completed: ${scanSummary.totalAnalyzed} messages analyzed`,
        sender: 'FinSight Security System',
        phone: 'System',
        
        confidence: 100,
        aiAnalysis: `Mobile scan detected ${scanSummary.fraudCount} fraud and ${scanSummary.suspiciousCount} suspicious messages`,
        riskScore: scanSummary.fraudCount > 0 ? 90 : 60,
        fraudType: 'scan_summary',
        
        userId: userId,
        source: 'FinSight Mobile App - Scan Summary',
        location: 'Mobile Device',
        
        detectedAt: serverTimestamp(),
        messageTimestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
        
        // Scan-specific data
        scanData: {
          totalAnalyzed: scanSummary.totalAnalyzed,
          fraudCount: scanSummary.fraudCount,
          suspiciousCount: scanSummary.suspiciousCount,
          safeCount: scanSummary.safeCount,
          scanDuration: scanSummary.duration || 'Unknown'
        },
        
        deviceType: 'mobile',
        platform: 'react-native',
        appVersion: '2.0',
        
        acknowledged: false,
        message: `Mobile scan alert: ${scanSummary.fraudCount + scanSummary.suspiciousCount} potential threats detected out of ${scanSummary.totalAnalyzed} messages analyzed`,
        priority: scanSummary.fraudCount > 0 ? 'high' : 'medium'
      };
      
      const alertsRef = collection(db, 'fraudAlerts');
      const alertDoc = await addDoc(alertsRef, alertData);
      
      console.log(`✅ Scan summary alert created: ${alertDoc.id}`);
      
      return {
        success: true,
        alertId: alertDoc.id,
        type: 'scan_summary'
      };
      
    } catch (error) {
      console.error('❌ Failed to create scan summary alert:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default MobileAlertSystem;
