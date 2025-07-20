import React, { useState } from 'react';
import { 
  analyzeCurrentMonthMessages, 
  analyzeNewIncomingMessage, 
  saveMessageFromMobileDisplay,
  syncMobileMessagesToWeb,
  cleanupEntireFirestore
} from '../utils/firebaseMessages';

function SMSAnalysisTest() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('test_user_' + Date.now());

  // Sample monthly messages for testing
  const sampleMonthlyMessages = [
    {
      messageText: "URGENT: Your bank account has been suspended. Click here to verify: http://fake-bank.com",
      phoneNumber: "+1234567890",
      timestamp: "2024-01-15T10:30:00.000Z",
      analysis: {
        isFraud: true,
        confidence: 0.95,
        category: "phishing",
        riskLevel: "high"
      }
    },
    {
      messageText: "Hello! How are you doing today?",
      phoneNumber: "+0987654321",
      timestamp: "2024-01-15T11:00:00.000Z",
      analysis: {
        isFraud: false,
        confidence: 0.05,
        category: "legitimate",
        riskLevel: "low"
      }
    },
    {
      messageText: "Congratulations! You've won $10,000! Claim now by calling 1-800-SCAM",
      phoneNumber: "+5555555555",
      timestamp: "2024-01-15T12:00:00.000Z",
      analysis: {
        isFraud: true,
        confidence: 0.88,
        category: "lottery_scam",
        riskLevel: "high"
      }
    }
  ];

  // Sample new message for testing
  const sampleNewMessage = {
    messageText: "Your package will be delivered tomorrow between 2-4 PM",
    phoneNumber: "+1111111111",
    timestamp: new Date().toISOString(),
    analysis: {
      isFraud: false,
      confidence: 0.12,
      category: "delivery",
      riskLevel: "low"
    }
  };

  const testMonthlyAnalysis = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing monthly analysis for:', userId);
      const result = await analyzeCurrentMonthMessages(userId, sampleMonthlyMessages);
      setResults({
        type: 'monthly',
        data: result,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Monthly analysis test completed:', result);
    } catch (error) {
      console.error('❌ Monthly analysis test failed:', error);
      setResults({
        type: 'monthly',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testNewMessageAnalysis = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing new message analysis for:', userId);
      const result = await analyzeNewIncomingMessage(userId, sampleNewMessage);
      setResults({
        type: 'new_message',
        data: result,
        timestamp: new Date().toISOString()
      });
      console.log('✅ New message analysis test completed:', result);
    } catch (error) {
      console.error('❌ New message analysis test failed:', error);
      setResults({
        type: 'new_message',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Test analysis display formatting
  const testAnalysisDisplay = () => {
    console.log('🧪 Testing analysis display formats...');
    
    sampleMonthlyMessages.forEach((message, index) => {
      const { analysis } = message;
      
      // Test the same logic used in SMSInboxClean.js
      const riskScore = (analysis?.confidence * 100) || 0;
      const status = analysis?.isFraud ? 'flagged' : 'safe';
      const category = analysis?.category || 'SMS';
      const aiAnalysis = analysis ? 
        `${analysis.isFraud ? 'FRAUD DETECTED' : 'SAFE'} - ${analysis.category || 'General SMS'} (${Math.round((analysis.confidence || 0) * 100)}% confidence)` : 
        'AI analysis pending';
      
      console.log(`📱 Test Message ${index + 1}:`);
      console.log(`   Content: ${message.messageText.substring(0, 50)}...`);
      console.log(`   Risk Score: ${riskScore}%`);
      console.log(`   Status: ${status}`);
      console.log(`   Category: ${category}`);
      console.log(`   AI Analysis: ${aiAnalysis}`);
      console.log('   Original Analysis:', analysis);
      console.log('   ---');
    });
    
    setResults({
      type: 'display_test',
      data: { message: 'Check console for analysis display test results' },
      timestamp: new Date().toISOString()
    });
  };

  const testMobileDisplaySave = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing mobile display message save for:', userId);
      
      // Simulate a message as it would appear on mobile MessageScreen
      const mobileMessage = {
        body: "Your delivery is scheduled for tomorrow. Track here: bit.ly/track123",
        address: "+1234567890",
        date: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      const analysisResult = {
        isFraud: false,
        confidence: 0.15,
        category: "delivery",
        riskLevel: "low"
      };
      
      const result = await saveMessageFromMobileDisplay(userId, mobileMessage, analysisResult);
      setResults({
        type: 'mobile_display',
        data: result,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Mobile display save test completed:', result);
    } catch (error) {
      console.error('❌ Mobile display save test failed:', error);
      setResults({
        type: 'mobile_display',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testBulkSync = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing bulk sync for:', userId);
      
      // Simulate multiple messages from mobile app
      const mobileMessages = [
        {
          body: "Hello, how are you today?",
          address: "+0987654321",
          date: Date.now() - 3600000,
          analysis: { isFraud: false, confidence: 0.05, category: "personal" }
        },
        {
          body: "URGENT: Your account will be closed! Click here immediately!",
          address: "+5555555555",
          date: Date.now() - 7200000,
          analysis: { isFraud: true, confidence: 0.92, category: "phishing" }
        },
        {
          body: "Reminder: Your appointment is tomorrow at 3 PM",
          address: "+1111111111",
          date: Date.now() - 10800000,
          analysis: { isFraud: false, confidence: 0.08, category: "appointment" }
        }
      ];
      
      const result = await syncMobileMessagesToWeb(userId, mobileMessages);
      setResults({
        type: 'bulk_sync',
        data: result,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Bulk sync test completed:', result);
    } catch (error) {
      console.error('❌ Bulk sync test failed:', error);
      setResults({
        type: 'bulk_sync',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testFirestoreCleanup = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing complete Firestore cleanup...');
      
      // Confirm with user before cleanup
      const confirmCleanup = window.confirm(
        '⚠️ WARNING: This will delete ALL data in Firestore!\n\n' +
        'This includes:\n' +
        '- All users\n' +
        '- All messages\n' +
        '- All fraud alerts\n' +
        '- Dashboard stats\n\n' +
        'Are you sure you want to continue?'
      );
      
      if (!confirmCleanup) {
        setLoading(false);
        return;
      }
      
      const result = await cleanupEntireFirestore();
      setResults({
        type: 'cleanup',
        data: result,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Firestore cleanup test completed:', result);
    } catch (error) {
      console.error('❌ Firestore cleanup test failed:', error);
      setResults({
        type: 'cleanup',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    setResults(null);
    setUserId('test_user_' + Date.now());
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>📱 SMS Analysis Test Suite</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Current Test User ID:</h3>
        <code style={{ backgroundColor: '#ddd', padding: '5px', borderRadius: '4px' }}>
          {userId}
        </code>
        <button 
          onClick={resetTest}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Generate New User ID
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={testMonthlyAnalysis}
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Testing...' : '📅 Test Monthly Analysis (First Connection)'}
        </button>

        <button 
          onClick={testNewMessageAnalysis}
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Testing...' : '📱 Test New Message Analysis'}
        </button>

        <button 
          onClick={testMobileDisplaySave}
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Testing...' : '💬 Test Mobile Display Save'}
        </button>

        <button 
          onClick={testAnalysisDisplay}
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Testing...' : '🔍 Test Analysis Display Format'}
        </button>

        <button 
          onClick={testBulkSync}
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Testing...' : '🔄 Test Bulk Sync'}
        </button>

        <button 
          onClick={testFirestoreCleanup}
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Cleaning...' : '🗑️ CLEANUP FIRESTORE'}
        </button>
      </div>

      {results && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: results.error ? '#f8d7da' : '#d4edda', 
          borderRadius: '8px',
          border: `1px solid ${results.error ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          <h3>
            {results.type === 'monthly' ? '📅 Monthly Analysis Results' : 
             results.type === 'new_message' ? '📱 New Message Results' :
             results.type === 'mobile_display' ? '💬 Mobile Display Save Results' :
             results.type === 'bulk_sync' ? '🔄 Bulk Sync Results' :
             results.type === 'cleanup' ? '🗑️ Firestore Cleanup Results' : '📊 Test Results'}
          </h3>
          
          <p><strong>Timestamp:</strong> {results.timestamp}</p>
          
          {results.error ? (
            <div>
              <strong style={{ color: '#721c24' }}>❌ Error:</strong>
              <pre style={{ color: '#721c24', marginTop: '10px' }}>{results.error}</pre>
            </div>
          ) : (
            <div>
              <strong style={{ color: '#155724' }}>✅ Success!</strong>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px', 
                marginTop: '10px',
                overflow: 'auto'
              }}>
                {JSON.stringify(results.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
        <h3>📋 Test Information</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p><strong>Monthly Analysis Test:</strong> Simulates a user's first connection, analyzing 3 sample messages from the current month (1 legitimate, 2 fraudulent).</p>
          <p><strong>New Message Test:</strong> Simulates analyzing a single new incoming message in real-time.</p>
          <p><strong>Mobile Display Save:</strong> Simulates saving a message when displayed on mobile MessageScreen (appears in web SMS Inbox).</p>
          <p><strong>Bulk Sync Test:</strong> Simulates syncing multiple messages from mobile app to web dashboard.</p>
          <p><strong style={{ color: '#dc3545' }}>🗑️ CLEANUP FIRESTORE:</strong> <strong style={{ color: '#dc3545' }}>DANGER!</strong> Deletes ALL data from Firestore database (users, messages, alerts, stats).</p>
          <p><strong>Expected Behavior:</strong> Monthly analysis should work for new users, new message analysis should require completed initial analysis.</p>
          <p><strong>Web Integration:</strong> All messages saved through these functions will appear in the web dashboard SMS Inbox in real-time.</p>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
        <h3>🔬 Recommended Test Flow</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p><strong>Step 1:</strong> Click "🗑️ CLEANUP FIRESTORE" to start with clean database</p>
          <p><strong>Step 2:</strong> Click "📅 Test Monthly Analysis" to create first user and messages</p>
          <p><strong>Step 3:</strong> Check web dashboard SMS Inbox and Analytics to see data</p>
          <p><strong>Step 4:</strong> Click "📱 Test New Message" to test real-time message processing</p>
          <p><strong>Step 5:</strong> Check web dashboard again to see cumulative updates</p>
          <p><strong>Step 6:</strong> Test "💬 Mobile Display Save" and "🔄 Bulk Sync" as needed</p>
        </div>
      </div>
    </div>
  );
}

export default SMSAnalysisTest;
