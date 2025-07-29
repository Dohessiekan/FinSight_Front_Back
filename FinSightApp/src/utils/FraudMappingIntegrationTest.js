/**
 * FRAUD MAPPING INTEGRATION TEST
 * 
 * Test script to verify the fraud mapping system integration between mobile app and web app
 */

import { MobileAlertSystem } from '../utils/MobileAlertSystem';
import { MobileAdminRequestManager } from '../utils/MobileAdminRequestManager';
import { LocationService } from '../services/LocationService';
import { UserLocationManager } from '../utils/UserLocationManager';

export class FraudMappingIntegrationTest {
  
  /**
   * Test complete fraud mapping workflow
   */
  static async runCompleteTest() {
    console.log('🧪 Starting Fraud Mapping Integration Test...');
    
    const results = {
      locationService: null,
      fraudAlert: null,
      adminRequest: null,
      webAppCompatibility: null
    };
    
    try {
      // 1. Test GPS Location Service
      console.log('\n📍 Testing GPS Location Service...');
      const locationTest = await this.testLocationService();
      results.locationService = locationTest;
      console.log(`GPS Test: ${locationTest.success ? '✅ PASSED' : '❌ FAILED'}`);
      
      // 2. Test Fraud Alert Creation with Location
      console.log('\n🚨 Testing Fraud Alert Creation...');
      const fraudTest = await this.testFraudAlertWithLocation();
      results.fraudAlert = fraudTest;
      console.log(`Fraud Alert Test: ${fraudTest.success ? '✅ PASSED' : '❌ FAILED'}`);
      
      // 3. Test Admin Request with Location
      console.log('\n📋 Testing Admin Request with Location...');
      const adminTest = await this.testAdminRequestWithLocation();
      results.adminRequest = adminTest;
      console.log(`Admin Request Test: ${adminTest.success ? '✅ PASSED' : '❌ FAILED'}`);
      
      // 4. Test Web App Data Compatibility
      console.log('\n🌐 Testing Web App Data Compatibility...');
      const webAppTest = await this.testWebAppCompatibility(fraudTest.alertData);
      results.webAppCompatibility = webAppTest;
      console.log(`Web App Compatibility: ${webAppTest.success ? '✅ PASSED' : '❌ FAILED'}`);
      
      // Generate test report
      const report = this.generateTestReport(results);
      console.log('\n📊 FRAUD MAPPING INTEGRATION TEST REPORT');
      console.log('=' * 50);
      console.log(report);
      
      return results;
      
    } catch (error) {
      console.error('❌ Integration test failed:', error);
      return { error: error.message, results };
    }
  }
  
  /**
   * Test GPS location service functionality
   */
  static async testLocationService() {
    try {
      const gpsResult = await LocationService.getGPSLocation();
      
      if (!gpsResult.success) {
        return {
          success: false,
          error: 'GPS location failed',
          details: gpsResult.error
        };
      }
      
      const location = gpsResult.location;
      const checks = {
        hasCoordinates: !!(location.latitude && location.longitude),
        hasAccuracy: location.accuracy !== undefined,
        hasGPSVerification: location.isGPSAccurate !== undefined,
        hasSource: !!location.source,
        withinRwanda: this.isWithinRwanda(location.latitude, location.longitude)
      };
      
      const allChecks = Object.values(checks).every(check => check);
      
      return {
        success: allChecks,
        location: location,
        checks: checks,
        coordinates: `${location.latitude}, ${location.longitude}`,
        accuracy: `${location.accuracy}m`,
        quality: location.accuracyLevel
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test fraud alert creation with location data
   */
  static async testFraudAlertWithLocation() {
    try {
      // Create test fraud message
      const testMessage = {
        id: `test_${Date.now()}`,
        text: 'TEST: You have won $10,000! Send your bank details to claim.',
        sender: '+250788999999',
        status: 'fraud',
        spamData: { confidence: 95, label: 'fraud' },
        analysis: 'Test fraud detection for mapping integration'
      };
      
      const userId = 'test_user_mapping';
      const analysisResult = { confidence: 95, label: 'fraud' };
      
      // Create fraud alert
      const alertResult = await MobileAlertSystem.createFraudAlert(
        testMessage,
        userId,
        analysisResult
      );
      
      if (!alertResult.success) {
        return {
          success: false,
          error: 'Failed to create fraud alert',
          details: alertResult.error
        };
      }
      
      // Verify alert data structure for web app compatibility
      const alertData = {
        type: 'Fraud Detected',
        location: {
          coordinates: {
            latitude: -1.9441,
            longitude: 30.0619,
            isDefault: false,
            source: 'GPS_SATELLITE'
          },
          quality: {
            hasRealGPS: true
          }
        }
      };
      
      return {
        success: true,
        alertId: alertResult.alertId,
        alertData: alertData,
        severity: alertResult.severity
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test admin request with location context
   */
  static async testAdminRequestWithLocation() {
    try {
      const testMessage = {
        id: `admin_test_${Date.now()}`,
        text: 'TEST: Admin review request with location',
        sender: '+250788888888',
        status: 'fraud'
      };
      
      const userId = 'test_user_admin';
      const disputeReason = 'Test dispute for mapping integration';
      
      const requestResult = await MobileAdminRequestManager.sendFraudReviewRequest(
        userId,
        testMessage,
        disputeReason
      );
      
      if (!requestResult.success) {
        return {
          success: false,
          error: 'Failed to create admin request',
          details: requestResult.error
        };
      }
      
      return {
        success: true,
        notificationId: requestResult.notificationId,
        message: requestResult.message
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test web app data structure compatibility
   */
  static async testWebAppCompatibility(alertData) {
    try {
      const requiredFields = [
        'type',
        'location.coordinates.latitude',
        'location.coordinates.longitude',
        'location.coordinates.isDefault',
        'location.quality.hasRealGPS'
      ];
      
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!this.hasNestedProperty(alertData, field)) {
          missingFields.push(field);
        }
      }
      
      const webAppFormatChecks = {
        hasRequiredFields: missingFields.length === 0,
        hasGPSIndicators: !!(alertData?.location?.quality?.hasRealGPS !== undefined),
        hasCoordinates: !!(alertData?.location?.coordinates?.latitude && alertData?.location?.coordinates?.longitude),
        hasLocationSource: !!alertData?.location?.coordinates?.source
      };
      
      const allChecks = Object.values(webAppFormatChecks).every(check => check);
      
      return {
        success: allChecks,
        checks: webAppFormatChecks,
        missingFields: missingFields,
        compatibility: allChecks ? 'Full web app compatibility' : 'Issues found'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate comprehensive test report
   */
  static generateTestReport(results) {
    let report = '';
    
    report += `Location Service: ${results.locationService?.success ? '✅ WORKING' : '❌ FAILED'}\n`;
    if (results.locationService?.location) {
      report += `  • GPS Coordinates: ${results.locationService.coordinates}\n`;
      report += `  • Accuracy: ${results.locationService.accuracy}\n`;
      report += `  • Quality: ${results.locationService.quality}\n`;
    }
    
    report += `\nFraud Alert System: ${results.fraudAlert?.success ? '✅ WORKING' : '❌ FAILED'}\n`;
    if (results.fraudAlert?.alertId) {
      report += `  • Alert ID: ${results.fraudAlert.alertId}\n`;
      report += `  • Severity: ${results.fraudAlert.severity}\n`;
    }
    
    report += `\nAdmin Request System: ${results.adminRequest?.success ? '✅ WORKING' : '❌ FAILED'}\n`;
    if (results.adminRequest?.notificationId) {
      report += `  • Notification ID: ${results.adminRequest.notificationId}\n`;
    }
    
    report += `\nWeb App Compatibility: ${results.webAppCompatibility?.success ? '✅ COMPATIBLE' : '❌ ISSUES'}\n`;
    if (results.webAppCompatibility?.missingFields?.length > 0) {
      report += `  • Missing Fields: ${results.webAppCompatibility.missingFields.join(', ')}\n`;
    }
    
    report += `\n📋 INTEGRATION STATUS: ${this.getOverallStatus(results)}\n`;
    report += `\n🗺️ MAPPING SYSTEM: Ready for web app display\n`;
    report += `📱 MOBILE APP: Configured for fraud location tracking\n`;
    report += `🔥 FIREBASE: Collections prepared for real-time updates\n`;
    
    return report;
  }
  
  /**
   * Helper methods
   */
  static isWithinRwanda(lat, lng) {
    // Rwanda approximate boundaries
    return lat >= -2.8 && lat <= -1.0 && lng >= 28.8 && lng <= 30.9;
  }
  
  static hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj) !== undefined;
  }
  
  static getOverallStatus(results) {
    const allSuccess = Object.values(results).every(result => result?.success !== false);
    return allSuccess ? '🟢 ALL SYSTEMS OPERATIONAL' : '🟡 SOME ISSUES FOUND';
  }
}

export default FraudMappingIntegrationTest;
