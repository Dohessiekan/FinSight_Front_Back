/**
 * Test utility for global duplicate detection
 */

import GlobalDuplicateDetector from './GlobalDuplicateDetector';

export class DuplicateTestUtility {
  
  /**
   * Test if global duplicate detection is working
   */
  static async testGlobalDuplicateDetection(sampleMessage, userId) {
    try {
      console.log('🧪 Testing global duplicate detection...');
      
      // Test creating global ID
      const globalId = GlobalDuplicateDetector.createGlobalMessageId(sampleMessage);
      console.log(`🆔 Generated global ID: ${globalId}`);
      
      // Test checking for duplicates
      const duplicateCheck = await GlobalDuplicateDetector.checkGlobalDuplicate(sampleMessage);
      console.log(`🔍 Duplicate check result:`, duplicateCheck);
      
      // Test registering message
      if (!duplicateCheck.isDuplicate) {
        const registerResult = await GlobalDuplicateDetector.registerGlobalMessage(sampleMessage, userId);
        console.log(`📝 Registration result:`, registerResult);
      }
      
      return {
        success: true,
        globalId,
        duplicateCheck,
        testComplete: true
      };
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Create a sample message for testing
   */
  static createSampleMessage() {
    return {
      text: "Test message from MTN: You have received 1000 RWF. New balance: 5000 RWF. Transaction ID: TXN123456",
      sender: "MTN",
      date: new Date().toISOString(),
      id: `test_${Date.now()}`
    };
  }
}

export default DuplicateTestUtility;
