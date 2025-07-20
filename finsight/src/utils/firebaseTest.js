// Firebase Connection Test Script
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';

export const FirebaseConnectionTest = {
  // Test basic Firebase connectivity
  async testConnection() {
    try {
      console.log('🔥 Testing Firebase connection...');
      
      // Try to write a test document
      const testRef = collection(db, 'connection_test');
      const testDoc = await addDoc(testRef, {
        test: true,
        timestamp: serverTimestamp(),
        message: 'Firebase connection test'
      });
      
      console.log('✅ Firebase write test successful:', testDoc.id);
      
      // Try to read back the document
      const snapshot = await getDocs(testRef);
      console.log('✅ Firebase read test successful:', snapshot.docs.length, 'documents');
      
      return {
        success: true,
        writeTest: testDoc.id,
        readTest: snapshot.docs.length
      };
      
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  },

  // Test user collection access
  async testUserAccess(userId) {
    try {
      console.log(`🔍 Testing user collection access for: ${userId}`);
      
      // Check if user exists and has messages
      const messagesRef = collection(db, 'users', userId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      console.log(`📊 Found ${snapshot.docs.length} messages for user ${userId}`);
      
      // Test current month filtering
      const currentMonthYear = new Date().toISOString().substring(0, 7);
      const currentMonthQuery = query(
        messagesRef,
        where('monthYear', '==', currentMonthYear)
      );
      const currentMonthSnapshot = await getDocs(currentMonthQuery);
      
      console.log(`📅 Found ${currentMonthSnapshot.docs.length} current month messages`);
      
      return {
        success: true,
        totalMessages: snapshot.docs.length,
        currentMonthMessages: currentMonthSnapshot.docs.length,
        messages: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };
      
    } catch (error) {
      console.error('❌ User access test failed:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  },

  // Test dashboard stats access
  async testDashboardAccess() {
    try {
      console.log('📊 Testing dashboard stats access...');
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      console.log(`👥 Found ${usersSnapshot.docs.length} users in the system`);
      
      return {
        success: true,
        userCount: usersSnapshot.docs.length,
        users: usersSnapshot.docs.map(doc => doc.id)
      };
      
    } catch (error) {
      console.error('❌ Dashboard access test failed:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  },

  // Comprehensive system test
  async runFullTest(userId = null) {
    console.log('🚀 Starting comprehensive Firebase test...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test 1: Basic connection
    results.tests.connection = await this.testConnection();
    
    // Test 2: Dashboard access
    results.tests.dashboard = await this.testDashboardAccess();
    
    // Test 3: User access (if userId provided)
    if (userId) {
      results.tests.userAccess = await this.testUserAccess(userId);
    }
    
    // Summary
    const successCount = Object.values(results.tests).filter(test => test.success).length;
    const totalTests = Object.keys(results.tests).length;
    
    results.summary = {
      passed: successCount,
      total: totalTests,
      success: successCount === totalTests
    };
    
    console.log('📋 Test Summary:', results.summary);
    
    return results;
  }
};

export default FirebaseConnectionTest;
