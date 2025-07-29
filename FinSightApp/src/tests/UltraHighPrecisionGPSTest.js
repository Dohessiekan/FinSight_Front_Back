/**
 * Ultra-High Precision GPS Test
 * 
 * This test verifies that our ultra-high precision GPS system can achieve
 * street-level accuracy (±2-5m) for detailed fraud location mapping.
 * 
 * Created for GPS enhancement request: "make the gps robust which can display 
 * the exact place of the user with accuracy, i can even see the street or avenue"
 */

import { LocationService } from '../services/LocationService';
import { Alert } from 'react-native';

export class UltraHighPrecisionGPSTest {
  
  /**
   * Run comprehensive GPS precision test
   */
  static async runFullTest() {
    console.log('🧪 Starting Ultra-High Precision GPS Test Suite...');
    console.log('='.repeat(60));
    
    const results = {
      standardGPS: null,
      ultraHighGPS: null,
      comparison: null,
      recommendation: null
    };
    
    try {
      // Test 1: Standard GPS
      console.log('\n📍 TEST 1: Standard GPS Performance');
      console.log('-'.repeat(40));
      results.standardGPS = await this.testStandardGPS();
      
      // Test 2: Ultra-High Precision GPS
      console.log('\n🎯 TEST 2: Ultra-High Precision GPS Performance');
      console.log('-'.repeat(40));
      results.ultraHighGPS = await this.testUltraHighPrecisionGPS();
      
      // Test 3: Compare Results
      console.log('\n⚖️ TEST 3: Performance Comparison');
      console.log('-'.repeat(40));
      results.comparison = this.compareResults(results.standardGPS, results.ultraHighGPS);
      
      // Test 4: Generate Recommendation
      results.recommendation = this.generateRecommendation(results.comparison);
      
      // Display final report
      this.displayFinalReport(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ GPS Test Suite failed:', error);
      Alert.alert('GPS Test Failed', `Test error: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Test standard GPS performance
   */
  static async testStandardGPS() {
    console.log('📍 Testing standard GPS...');
    
    const startTime = Date.now();
    
    try {
      const result = await LocationService.getGPSLocation();
      const duration = (Date.now() - startTime) / 1000;
      
      if (result.success) {
        const testResult = {
          success: true,
          duration: duration,
          accuracy: result.location.accuracy,
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          accuracyLevel: result.location.accuracyLevel,
          isGPSAccurate: result.location.isGPSAccurate
        };
        
        console.log(`✅ Standard GPS completed in ${duration.toFixed(1)}s`);
        console.log(`📍 Location: ${result.location.latitude.toFixed(6)}, ${result.location.longitude.toFixed(6)}`);
        console.log(`🎯 Accuracy: ±${result.location.accuracy.toFixed(1)}m (${result.location.accuracyLevel})`);
        
        return testResult;
      } else {
        console.log('❌ Standard GPS failed');
        return { success: false, duration: duration, error: result.message };
      }
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      console.error('❌ Standard GPS test error:', error);
      return { success: false, duration: duration, error: error.message };
    }
  }
  
  /**
   * Test ultra-high precision GPS performance
   */
  static async testUltraHighPrecisionGPS() {
    console.log('🎯 Testing ultra-high precision GPS...');
    
    const startTime = Date.now();
    const progressUpdates = [];
    
    try {
      const result = await LocationService.getUltraHighPrecisionGPS((progress, accuracy, phase) => {
        const update = {
          timestamp: Date.now() - startTime,
          progress: progress,
          accuracy: accuracy,
          phase: phase
        };
        progressUpdates.push(update);
        console.log(`📡 ${progress} (Phase: ${phase || 'Unknown'}) - Accuracy: ±${accuracy?.toFixed(1) || 'Unknown'}m`);
      });
      
      const duration = (Date.now() - startTime) / 1000;
      
      if (result.success) {
        const testResult = {
          success: true,
          duration: duration,
          accuracy: result.location.accuracy,
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          accuracyLevel: result.location.accuracyLevel,
          canSeeStreets: result.location.canSeeStreets,
          canSeeBuildings: result.location.canSeeBuildings,
          progressUpdates: progressUpdates,
          coordinateReadings: result.location.coordinateReadings || 1,
          averagingUsed: result.location.averagingUsed || false
        };
        
        console.log(`✅ Ultra-high precision GPS completed in ${duration.toFixed(1)}s`);
        console.log(`📍 Location: ${result.location.latitude.toFixed(6)}, ${result.location.longitude.toFixed(6)}`);
        console.log(`🎯 Accuracy: ±${result.location.accuracy.toFixed(1)}m (${result.location.accuracyLevel})`);
        console.log(`📊 Readings: ${testResult.coordinateReadings}, Averaging: ${testResult.averagingUsed}`);
        console.log(`🏢 Can see buildings: ${result.location.canSeeBuildings}`);
        console.log(`🛣️ Can see streets: ${result.location.canSeeStreets}`);
        
        return testResult;
      } else {
        console.log('❌ Ultra-high precision GPS failed');
        return { 
          success: false, 
          duration: duration, 
          error: result.message,
          fallbackMessage: result.fallbackMessage,
          progressUpdates: progressUpdates
        };
      }
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      console.error('❌ Ultra-high precision GPS test error:', error);
      return { 
        success: false, 
        duration: duration, 
        error: error.message,
        progressUpdates: progressUpdates
      };
    }
  }
  
  /**
   * Compare standard vs ultra-high precision results
   */
  static compareResults(standardResult, ultraResult) {
    if (!standardResult || !ultraResult) {
      return { error: 'Missing test results for comparison' };
    }
    
    const comparison = {
      accuracyImprovement: null,
      timeIncrease: null,
      streetLevelAchieved: false,
      buildingLevelAchieved: false,
      recommendation: 'UNKNOWN'
    };
    
    // Calculate accuracy improvement
    if (standardResult.success && ultraResult.success) {
      const accuracyGain = standardResult.accuracy - ultraResult.accuracy;
      const percentImprovement = (accuracyGain / standardResult.accuracy) * 100;
      
      comparison.accuracyImprovement = {
        absoluteGain: accuracyGain,
        percentImprovement: percentImprovement,
        fromAccuracy: standardResult.accuracy,
        toAccuracy: ultraResult.accuracy
      };
      
      console.log(`📊 Accuracy improvement: ${accuracyGain.toFixed(1)}m (${percentImprovement.toFixed(1)}% better)`);
      console.log(`📊 Standard: ±${standardResult.accuracy.toFixed(1)}m → Ultra: ±${ultraResult.accuracy.toFixed(1)}m`);
    }
    
    // Calculate time increase
    if (standardResult.duration && ultraResult.duration) {
      const timeIncrease = ultraResult.duration - standardResult.duration;
      const percentIncrease = (timeIncrease / standardResult.duration) * 100;
      
      comparison.timeIncrease = {
        absoluteIncrease: timeIncrease,
        percentIncrease: percentIncrease,
        standardTime: standardResult.duration,
        ultraTime: ultraResult.duration
      };
      
      console.log(`⏱️ Time increase: ${timeIncrease.toFixed(1)}s (${percentIncrease.toFixed(1)}% longer)`);
      console.log(`⏱️ Standard: ${standardResult.duration.toFixed(1)}s → Ultra: ${ultraResult.duration.toFixed(1)}s`);
    }
    
    // Check street and building level achievement
    if (ultraResult.success) {
      comparison.streetLevelAchieved = ultraResult.canSeeStreets || false;
      comparison.buildingLevelAchieved = ultraResult.canSeeBuildings || false;
      
      console.log(`🏢 Building-level accuracy: ${comparison.buildingLevelAchieved ? 'YES' : 'NO'}`);
      console.log(`🛣️ Street-level accuracy: ${comparison.streetLevelAchieved ? 'YES' : 'NO'}`);
    }
    
    return comparison;
  }
  
  /**
   * Generate recommendation based on test results
   */
  static generateRecommendation(comparison) {
    if (comparison.error) {
      return {
        decision: 'ERROR',
        reason: comparison.error,
        suggestion: 'Run tests again when GPS is available'
      };
    }
    
    // If building-level accuracy achieved
    if (comparison.buildingLevelAchieved) {
      return {
        decision: 'USE_ULTRA_HIGH_PRECISION',
        reason: 'Building-level accuracy achieved - perfect for street mapping',
        suggestion: 'Use ultra-high precision for all fraud mapping',
        accuracyBenefit: 'Can identify individual buildings and precise street locations'
      };
    }
    
    // If street-level accuracy achieved
    if (comparison.streetLevelAchieved) {
      return {
        decision: 'USE_ULTRA_HIGH_PRECISION',
        reason: 'Street-level accuracy achieved - excellent for neighborhood mapping',
        suggestion: 'Use ultra-high precision for detailed fraud analysis',
        accuracyBenefit: 'Can identify streets and major landmarks accurately'
      };
    }
    
    // If significant accuracy improvement but high time cost
    if (comparison.accuracyImprovement && 
        comparison.accuracyImprovement.percentImprovement > 50 && 
        comparison.timeIncrease.percentIncrease > 200) {
      return {
        decision: 'CONDITIONAL_USE',
        reason: 'Good accuracy improvement but takes much longer',
        suggestion: 'Offer user choice between speed and precision',
        accuracyBenefit: `${comparison.accuracyImprovement.percentImprovement.toFixed(1)}% accuracy improvement`
      };
    }
    
    // If moderate improvement
    if (comparison.accuracyImprovement && comparison.accuracyImprovement.percentImprovement > 20) {
      return {
        decision: 'USE_ULTRA_HIGH_PRECISION',
        reason: 'Meaningful accuracy improvement achieved',
        suggestion: 'Use ultra-high precision as default option',
        accuracyBenefit: `${comparison.accuracyImprovement.percentImprovement.toFixed(1)}% better accuracy`
      };
    }
    
    // Default to standard GPS
    return {
      decision: 'USE_STANDARD_GPS',
      reason: 'Ultra-high precision did not provide significant benefits',
      suggestion: 'Stick with standard GPS for speed',
      accuracyBenefit: 'Standard GPS sufficient for current needs'
    };
  }
  
  /**
   * Display comprehensive test report
   */
  static displayFinalReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 ULTRA-HIGH PRECISION GPS TEST REPORT');
    console.log('='.repeat(60));
    
    // Standard GPS Results
    console.log('\n📍 STANDARD GPS RESULTS:');
    if (results.standardGPS?.success) {
      console.log(`   ✅ Success: ${results.standardGPS.duration.toFixed(1)}s, ±${results.standardGPS.accuracy.toFixed(1)}m`);
    } else {
      console.log(`   ❌ Failed: ${results.standardGPS?.error || 'Unknown error'}`);
    }
    
    // Ultra-High Precision GPS Results
    console.log('\n🎯 ULTRA-HIGH PRECISION GPS RESULTS:');
    if (results.ultraHighGPS?.success) {
      console.log(`   ✅ Success: ${results.ultraHighGPS.duration.toFixed(1)}s, ±${results.ultraHighGPS.accuracy.toFixed(1)}m`);
      console.log(`   🏢 Building-level: ${results.ultraHighGPS.canSeeBuildings ? 'YES' : 'NO'}`);
      console.log(`   🛣️ Street-level: ${results.ultraHighGPS.canSeeStreets ? 'YES' : 'NO'}`);
    } else {
      console.log(`   ❌ Failed: ${results.ultraHighGPS?.error || 'Unknown error'}`);
    }
    
    // Recommendation
    console.log('\n💡 RECOMMENDATION:');
    if (results.recommendation) {
      console.log(`   Decision: ${results.recommendation.decision}`);
      console.log(`   Reason: ${results.recommendation.reason}`);
      console.log(`   Suggestion: ${results.recommendation.suggestion}`);
      console.log(`   Benefit: ${results.recommendation.accuracyBenefit}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Show user-friendly alert
    this.showUserFriendlyReport(results);
  }
  
  /**
   * Show user-friendly alert with test results
   */
  static showUserFriendlyReport(results) {
    if (!results.recommendation) {
      Alert.alert('GPS Test Error', 'Could not complete GPS testing.');
      return;
    }
    
    let title = 'GPS Precision Test Results';
    let message = '';
    
    if (results.recommendation.decision === 'USE_ULTRA_HIGH_PRECISION') {
      title = '🎯 Ultra-High Precision GPS Recommended';
      message = `${results.recommendation.reason}\n\n`;
      
      if (results.ultraHighGPS?.canSeeBuildings) {
        message += '🏢 Building-level accuracy achieved!\nYou can see individual buildings on the map.\n\n';
      } else if (results.ultraHighGPS?.canSeeStreets) {
        message += '🛣️ Street-level accuracy achieved!\nYou can see streets and landmarks clearly.\n\n';
      }
      
      if (results.comparison?.accuracyImprovement) {
        message += `Accuracy improved by ${results.comparison.accuracyImprovement.percentImprovement.toFixed(1)}%\n`;
        message += `(±${results.comparison.accuracyImprovement.toAccuracy.toFixed(1)}m vs ±${results.comparison.accuracyImprovement.fromAccuracy.toFixed(1)}m)`;
      }
      
    } else if (results.recommendation.decision === 'CONDITIONAL_USE') {
      title = '⚖️ Choose Your GPS Precision';
      message = `Ultra-high precision provides better accuracy but takes longer.\n\n`;
      message += `Standard GPS: ${results.standardGPS?.duration?.toFixed(1)}s, ±${results.standardGPS?.accuracy?.toFixed(1)}m\n`;
      message += `Ultra GPS: ${results.ultraHighGPS?.duration?.toFixed(1)}s, ±${results.ultraHighGPS?.accuracy?.toFixed(1)}m\n\n`;
      message += results.recommendation.suggestion;
      
    } else {
      title = '📍 Standard GPS Recommended';
      message = `${results.recommendation.reason}\n\n${results.recommendation.suggestion}`;
    }
    
    Alert.alert(title, message, [{ text: 'OK' }]);
  }
  
  /**
   * Quick test for development purposes
   */
  static async quickTest() {
    console.log('🚀 Running Quick GPS Test...');
    
    try {
      const result = await LocationService.getUltraHighPrecisionGPS((progress) => {
        console.log(`📡 ${progress}`);
      });
      
      if (result.success) {
        console.log(`✅ Quick test success: ±${result.location.accuracy.toFixed(1)}m`);
        console.log(`🏢 Can see buildings: ${result.location.canSeeBuildings}`);
        Alert.alert(
          'Quick GPS Test',
          `Accuracy: ±${result.location.accuracy.toFixed(1)}m\n` +
          `Buildings visible: ${result.location.canSeeBuildings ? 'YES' : 'NO'}\n` +
          `Streets visible: ${result.location.canSeeStreets ? 'YES' : 'NO'}`
        );
      } else {
        console.log('❌ Quick test failed:', result.message);
        Alert.alert('Quick Test Failed', result.message);
      }
      
    } catch (error) {
      console.error('❌ Quick test error:', error);
      Alert.alert('Test Error', error.message);
    }
  }
}

export default UltraHighPrecisionGPSTest;
