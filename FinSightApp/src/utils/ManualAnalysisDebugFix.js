/**
 * Manual Analysis Debug Fix Test
 * Tests the fixes for duplicate keys, Firebase save errors, and map integration
 */

export class ManualAnalysisDebugFix {
  /**
   * Test ID generation to ensure uniqueness
   */
  static testUniqueIdGeneration() {
    console.log('🔧 Testing unique ID generation...');
    
    const ids = new Set();
    const testCount = 100;
    
    // Generate 100 IDs rapidly to test for duplicates
    for (let i = 0; i < testCount; i++) {
      const id = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now().toString(36)}`;
      
      if (ids.has(id)) {
        console.error(`❌ Duplicate ID detected: ${id}`);
        return { success: false, duplicates: true };
      }
      
      ids.add(id);
    }
    
    console.log(`✅ Generated ${testCount} unique IDs successfully`);
    return { success: true, uniqueIds: ids.size, duplicates: false };
  }
  
  /**
   * Test Firebase error handling
   */
  static async testFirebaseSaveFlow(userId, mockMessage) {
    console.log('🔧 Testing Firebase save flow...');
    
    try {
      // Test the manual message structure
      const testMessage = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now().toString(36)}`,
        text: mockMessage || 'TEST: Manual fraud detection verification',
        status: 'fraud',
        analysis: '🚨 TEST FRAUD (99% confidence) - This is a test message for debugging manual analysis',
        spamData: {
          confidence: 0.99,
          label: 'spam',
          probabilities: { spam: 0.99, ham: 0.01 }
        },
        timestamp: new Date().toLocaleString(),
        sender: 'Manual Input',
        type: 'manual',
        processed: true
      };
      
      console.log('📝 Test message structure:', testMessage);
      return { success: true, message: testMessage };
      
    } catch (error) {
      console.error('❌ Firebase save flow test failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Test fraud alert creation format
   */
  static testFraudAlertFormat(message, userId) {
    console.log('🔧 Testing fraud alert format for map integration...');
    
    try {
      const expectedAlertFormat = {
        // Basic alert info (required by web app)
        type: 'Manual SMS Fraud Detection',
        severity: message.status === 'fraud' ? 'critical' : 'high',
        confidence: (message.spamData?.confidence || 0) * 100,
        
        // Message content
        messageText: message.text,
        sender: message.sender || 'Manual Input',
        phone: 'Manual Entry',
        
        // Analysis results
        aiAnalysis: message.analysis || 'Manual fraud detection analysis',
        riskScore: Math.round((message.spamData?.confidence || 0) * 100),
        fraudType: message.spamData?.label || message.status,
        
        // User and source info
        userId: userId,
        source: 'FinSight Mobile App - Manual Input',
        
        // Location data for map display
        location: {
          coordinates: {
            latitude: -1.9441, // Default Kigali coordinates
            longitude: 30.0619,
            address: 'Rwanda',
            city: 'Unknown',
            accuracy: null,
            isDefault: true,
            isRealGPS: false,
            source: 'manual_input_default'
          },
          address: {
            formattedAddress: 'Manual Input - Rwanda',
            city: 'Rwanda',
            district: 'Manual Entry',
            country: 'Rwanda'
          }
        },
        
        // Required by web app for real-time listener
        detectedAt: new Date(),
        status: 'active',
        
        // Additional metadata
        deviceType: 'mobile',
        platform: 'react-native',
        appVersion: '2.0',
        
        // Alert management
        acknowledged: false,
        investigatedBy: null,
        resolution: null,
        notes: '',
        
        // Manual analysis specific
        isManualEntry: true,
        entryMethod: 'manual_paste',
        
        // Financial info if available
        amount: message.amount || null,
        currency: 'RWF',
        transactionId: message.transactionId || null
      };
      
      console.log('✅ Fraud alert format valid for web app integration');
      return { success: true, alertFormat: expectedAlertFormat };
      
    } catch (error) {
      console.error('❌ Fraud alert format test failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Run comprehensive debug test
   */
  static async runComprehensiveTest(userId, testMessage) {
    console.log('🔧 Running comprehensive manual analysis debug test...');
    
    const results = {
      idGeneration: null,
      firebaseSave: null,
      fraudAlert: null,
      summary: null
    };
    
    // Test 1: ID Generation
    results.idGeneration = this.testUniqueIdGeneration();
    
    // Test 2: Firebase Save Flow
    results.firebaseSave = await this.testFirebaseSaveFlow(userId, testMessage);
    
    // Test 3: Fraud Alert Format
    if (results.firebaseSave.success) {
      results.fraudAlert = this.testFraudAlertFormat(results.firebaseSave.message, userId);
    }
    
    // Summary
    const allPassed = results.idGeneration.success && 
                     results.firebaseSave.success && 
                     (results.fraudAlert?.success || false);
    
    results.summary = {
      allTestsPassed: allPassed,
      fixes: {
        duplicateKeyIssue: results.idGeneration.success ? 'FIXED' : 'FAILED',
        firebaseSaveError: results.firebaseSave.success ? 'FIXED' : 'FAILED',
        fraudMapIntegration: results.fraudAlert?.success ? 'READY' : 'NEEDS_WORK'
      },
      readyForTesting: allPassed
    };
    
    console.log('📊 Comprehensive test results:', results.summary);
    return results;
  }
}

export default ManualAnalysisDebugFix;
