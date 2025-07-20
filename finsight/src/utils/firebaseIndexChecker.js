// Firebase Index Status Checker
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';

export const FirebaseIndexChecker = {
  // Test if the composite index exists and is working
  async testCompositeIndex(userId) {
    try {
      console.log('🔍 Testing Firebase composite index...');
      
      const messagesRef = collection(db, 'users', userId, 'messages');
      const currentMonthYear = new Date().toISOString().substring(0, 7);
      
      // This query requires the composite index (monthYear + createdAt)
      const indexQuery = query(
        messagesRef,
        where('monthYear', '==', currentMonthYear),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(indexQuery);
      
      console.log('✅ Composite index is working! Query successful.');
      console.log(`📊 Found ${snapshot.docs.length} messages using indexed query`);
      
      return {
        indexExists: true,
        messageCount: snapshot.docs.length,
        status: 'Index is working correctly'
      };
      
    } catch (error) {
      console.log('❌ Composite index not ready yet:', error.message);
      
      if (error.message.includes('requires an index')) {
        return {
          indexExists: false,
          error: error.message,
          status: 'Index needs to be created',
          indexUrl: extractIndexUrl(error.message)
        };
      }
      
      return {
        indexExists: false,
        error: error.message,
        status: 'Unknown index error'
      };
    }
  },

  // Check index status for the web dashboard
  async checkWebDashboardIndex() {
    try {
      console.log('🌐 Checking web dashboard index status...');
      
      // Get all users first
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userIds = usersSnapshot.docs.map(doc => doc.id);
      
      if (userIds.length === 0) {
        return {
          status: 'No users found',
          userCount: 0
        };
      }
      
      // Test the index with the first user
      const firstUserId = userIds[0];
      const indexTest = await this.testCompositeIndex(firstUserId);
      
      return {
        ...indexTest,
        userCount: userIds.length,
        userIds: userIds
      };
      
    } catch (error) {
      console.error('❌ Web dashboard index check failed:', error);
      return {
        indexExists: false,
        error: error.message,
        status: 'Dashboard check failed'
      };
    }
  },

  // Simple check without using indexes
  async basicMessageCheck(userId) {
    try {
      console.log('📊 Doing basic message count check...');
      
      // Get all messages without any filtering
      const messagesRef = collection(db, 'users', userId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter current month messages manually
      const currentMonthYear = new Date().toISOString().substring(0, 7);
      const currentMonthMessages = messages.filter(msg => msg.monthYear === currentMonthYear);
      
      console.log(`📋 Basic check results:`);
      console.log(`   Total messages: ${messages.length}`);
      console.log(`   Current month: ${currentMonthMessages.length}`);
      
      return {
        totalMessages: messages.length,
        currentMonthMessages: currentMonthMessages.length,
        currentMonth: currentMonthYear,
        status: 'Basic check successful'
      };
      
    } catch (error) {
      console.error('❌ Basic message check failed:', error);
      return {
        error: error.message,
        status: 'Basic check failed'
      };
    }
  }
};

// Helper function to extract index creation URL from error message
function extractIndexUrl(errorMessage) {
  const urlMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
  return urlMatch ? urlMatch[0] : null;
}

export default FirebaseIndexChecker;
