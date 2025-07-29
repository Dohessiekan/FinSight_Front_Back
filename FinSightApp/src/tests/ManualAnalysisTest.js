/**
 * Manual Message Analysis Test
 * Tests the manual message analysis functionality in MessagesScreen
 */

import { scanMessages } from '../utils/api';

// Test messages with different fraud levels
const testMessages = [
  {
    id: 'test_safe',
    message: 'Your account balance is RWF 50,000. Thank you for using our service.',
    expectedType: 'safe'
  },
  {
    id: 'test_suspicious',
    message: 'Congratulations! You have won a lottery prize. Click here to claim your reward.',
    expectedType: 'suspicious'
  },
  {
    id: 'test_fraud',
    message: 'Urgent: Your account is locked. Send your PIN and password to verify your identity.',
    expectedType: 'fraud'
  },
  {
    id: 'test_transaction',
    message: 'You have received RWF 25,000 from John Doe. Your new balance is RWF 75,000.',
    expectedType: 'safe'
  }
];

export class ManualAnalysisTest {
  /**
   * Test the manual message analysis API integration
   */
  static async testManualAnalysis() {
    console.log('🧪 Starting Manual Message Analysis Test');
    console.log('=' * 50);
    
    const results = [];
    
    for (const testCase of testMessages) {
      try {
        console.log(`\n📝 Testing: ${testCase.id}`);
        console.log(`Message: "${testCase.message}"`);
        console.log(`Expected: ${testCase.expectedType}`);
        
        // Call the scanMessages API (same as manual analysis)
        const result = await scanMessages([testCase.message]);
        
        // Determine actual status based on result
        let actualStatus = 'safe';
        const confidence = result?.confidence || 0;
        const label = result?.label || 'unknown';
        
        if (label === 'spam' || label === 'fraud') {
          actualStatus = confidence > 0.8 ? 'fraud' : 'suspicious';
        } else if (label === 'error' || label === 'no_data') {
          actualStatus = 'unknown';
        }
        
        const testResult = {
          id: testCase.id,
          message: testCase.message,
          expected: testCase.expectedType,
          actual: actualStatus,
          confidence: Math.round(confidence * 100),
          label: label,
          passed: this.isResultAcceptable(testCase.expectedType, actualStatus),
          apiResult: result
        };
        
        results.push(testResult);
        
        console.log(`✅ API Result: ${actualStatus} (${testResult.confidence}% confidence)`);
        console.log(`🎯 Test ${testResult.passed ? 'PASSED' : 'FAILED'}`);
        
      } catch (error) {
        console.error(`❌ Test failed for ${testCase.id}:`, error);
        results.push({
          id: testCase.id,
          message: testCase.message,
          expected: testCase.expectedType,
          actual: 'error',
          confidence: 0,
          label: 'error',
          passed: false,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n📊 Test Summary');
    console.log('=' * 50);
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const successRate = Math.round((passed / total) * 100);
    
    console.log(`✅ Passed: ${passed}/${total} (${successRate}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (successRate >= 75) {
      console.log('🎉 Manual analysis feature is working well!');
    } else {
      console.log('⚠️  Manual analysis may need improvement');
    }
    
    return {
      success: successRate >= 75,
      passed,
      total,
      successRate,
      results
    };
  }
  
  /**
   * Check if the result is acceptable given the expected type
   */
  static isResultAcceptable(expected, actual) {
    // Exact match is always good
    if (expected === actual) return true;
    
    // Some acceptable mismatches
    if (expected === 'suspicious' && actual === 'fraud') return true; // Over-detection is safer
    if (expected === 'safe' && actual === 'suspicious') return false; // False positive
    if (expected === 'fraud' && actual === 'safe') return false; // Dangerous miss
    
    return false;
  }
  
  /**
   * Test the manual input UI workflow simulation
   */
  static simulateManualWorkflow() {
    console.log('\n🎭 Simulating Manual Analysis Workflow');
    console.log('=' * 50);
    
    const workflow = [
      '1. User opens Messages Screen',
      '2. User clicks "Manual" button in header',
      '3. Manual input section appears with text input',
      '4. User pastes suspicious message',
      '5. User clicks "Analyze" button',
      '6. Loading indicator shows',
      '7. API analyzes message via scanMessages()',
      '8. Results displayed with risk status',
      '9. Message saved to Firebase if fraud detected',
      '10. User can clear input for next analysis'
    ];
    
    workflow.forEach((step, index) => {
      setTimeout(() => {
        console.log(`${index + 1 < 10 ? ' ' : ''}${step}`);
      }, index * 100);
    });
    
    console.log('\n✨ Manual analysis workflow is ready for user testing!');
  }
}

// Export for use in tests
export default ManualAnalysisTest;
