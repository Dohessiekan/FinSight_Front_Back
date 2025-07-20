// Complete Firebase Message Flow Debugger
import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

export const MessageFlowDebugger = {
  // Check if messages are properly saved in Firebase
  async checkMessageStorage(userId) {
    try {
      console.log('🔍 Checking message storage in Firebase...');
      
      const messagesRef = collection(db, 'users', userId, 'messages');
      
      // Get all messages
      const allSnapshot = await getDocs(messagesRef);
      console.log(`📊 Total messages in Firebase: ${allSnapshot.docs.length}`);
      
      // Get current month messages
      const currentMonthYear = new Date().toISOString().substring(0, 7);
      const currentMonthQuery = query(
        messagesRef,
        where('monthYear', '==', currentMonthYear),
        orderBy('createdAt', 'desc')
      );
      const currentSnapshot = await getDocs(currentMonthQuery);
      console.log(`📅 Current month messages: ${currentSnapshot.docs.length}`);
      
      // Analyze message structure
      const messages = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sampleMessage = messages[0];
      
      if (sampleMessage) {
        console.log('📝 Sample message structure:', sampleMessage);
        
        // Check for text content
        const textFields = ['text', 'body', 'message', 'content', 'messageText', 'smsContent'];
        const availableTextFields = textFields.filter(field => sampleMessage[field]);
        console.log('📄 Available text fields:', availableTextFields);
        
        // Check for required fields
        const requiredFields = ['userId', 'createdAt', 'monthYear', 'processed'];
        const missingFields = requiredFields.filter(field => !sampleMessage[field]);
        console.log('⚠️ Missing required fields:', missingFields);
      }
      
      return {
        success: true,
        totalMessages: allSnapshot.docs.length,
        currentMonthMessages: currentSnapshot.docs.length,
        messages: messages,
        sampleMessage: sampleMessage,
        analysis: {
          hasTextContent: sampleMessage && (sampleMessage.text || sampleMessage.body || sampleMessage.message),
          hasUserId: sampleMessage && sampleMessage.userId,
          hasTimestamp: sampleMessage && (sampleMessage.createdAt || sampleMessage.timestamp),
          hasMonthYear: sampleMessage && sampleMessage.monthYear,
          isProcessed: sampleMessage && sampleMessage.processed
        }
      };
      
    } catch (error) {
      console.error('❌ Error checking message storage:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  },

  // Test saving a message with proper structure
  async testMessageSave(userId) {
    try {
      console.log('💾 Testing message save to Firebase...');
      
      const messagesRef = collection(db, 'users', userId, 'messages');
      const testMessage = {
        // Core message data
        text: 'TEST MESSAGE: Complete Firebase flow verification - This message tests the entire pipeline from mobile app to web dashboard',
        sender: '+250123456789',
        
        // Analysis data
        status: 'safe',
        analysis: '✅ Test message for debugging Firebase flow - This should appear in web dashboard',
        spamData: {
          label: 'ham',
          confidence: 0.95,
          probabilities: { ham: 0.95, spam: 0.05 }
        },
        
        // Financial data (if applicable)
        amount: 'RWF 1,000',
        type: 'test_transaction',
        balance: 'RWF 100,000',
        transactionId: 'TEST_TXN_123',
        
        // Required Firebase fields
        userId: userId,
        createdAt: serverTimestamp(),
        monthYear: new Date().toISOString().substring(0, 7),
        processed: true,
        
        // Additional metadata
        source: 'flow_debugger',
        timestamp: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        version: '2.0'
      };
      
      const docRef = await addDoc(messagesRef, testMessage);
      console.log(`✅ Test message saved with ID: ${docRef.id}`);
      
      // Verify the saved message
      const verifySnapshot = await getDocs(messagesRef);
      const savedMessage = verifySnapshot.docs.find(doc => doc.id === docRef.id);
      
      if (savedMessage) {
        console.log('🔍 Saved message verification:', savedMessage.data());
        return {
          success: true,
          messageId: docRef.id,
          savedMessage: savedMessage.data(),
          verification: {
            hasText: !!savedMessage.data().text,
            hasUserId: savedMessage.data().userId === userId,
            hasMonthYear: !!savedMessage.data().monthYear,
            isProcessed: savedMessage.data().processed === true
          }
        };
      } else {
        return {
          success: false,
          error: 'Message was not found after saving'
        };
      }
      
    } catch (error) {
      console.error('❌ Error testing message save:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  },

  // Test fetching messages (simulating web app)
  async testMessageFetch(userId, currentMonthOnly = true) {
    try {
      console.log('📥 Testing message fetch from Firebase...');
      
      const messagesRef = collection(db, 'users', userId, 'messages');
      let q;
      
      if (currentMonthOnly) {
        const currentMonthYear = new Date().toISOString().substring(0, 7);
        q = query(
          messagesRef,
          where('monthYear', '==', currentMonthYear),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(messagesRef, orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log(`📋 Fetched ${messages.length} messages`);
      
      // Analyze fetched messages
      const analysis = {
        totalFetched: messages.length,
        withText: messages.filter(m => m.text || m.body || m.message).length,
        withStatus: messages.filter(m => m.status).length,
        processed: messages.filter(m => m.processed).length,
        currentMonth: messages.filter(m => m.monthYear === new Date().toISOString().substring(0, 7)).length
      };
      
      console.log('📊 Fetch analysis:', analysis);
      
      return {
        success: true,
        messages: messages,
        analysis: analysis,
        sampleMessage: messages[0] || null
      };
      
    } catch (error) {
      console.error('❌ Error testing message fetch:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  },

  // Complete flow test: Save → Fetch → Verify
  async testCompleteFlow(userId) {
    console.log('🚀 Starting complete message flow test...');
    
    const results = {
      timestamp: new Date().toISOString(),
      userId: userId,
      tests: {}
    };
    
    // Step 1: Check existing storage
    console.log('📊 Step 1: Checking existing message storage...');
    results.tests.storage = await this.checkMessageStorage(userId);
    
    // Step 2: Test saving a new message
    console.log('💾 Step 2: Testing message save...');
    results.tests.save = await this.testMessageSave(userId);
    
    // Step 3: Test fetching messages
    console.log('📥 Step 3: Testing message fetch...');
    results.tests.fetch = await this.testMessageFetch(userId, true);
    
    // Step 4: Overall analysis
    const allTestsPassed = Object.values(results.tests).every(test => test.success);
    results.summary = {
      allTestsPassed: allTestsPassed,
      totalTests: Object.keys(results.tests).length,
      passedTests: Object.values(results.tests).filter(test => test.success).length,
      issues: []
    };
    
    // Identify issues
    if (!results.tests.storage.success) {
      results.summary.issues.push('Cannot access Firebase storage');
    }
    if (!results.tests.save.success) {
      results.summary.issues.push('Cannot save messages to Firebase');
    }
    if (!results.tests.fetch.success) {
      results.summary.issues.push('Cannot fetch messages from Firebase');
    }
    
    // Check data integrity
    if (results.tests.storage.success && results.tests.storage.messages.length > 0) {
      const hasTextContent = results.tests.storage.analysis.hasTextContent;
      if (!hasTextContent) {
        results.summary.issues.push('Messages missing text content');
      }
    }
    
    console.log('📋 Complete flow test summary:', results.summary);
    
    return results;
  }
};

export default MessageFlowDebugger;
