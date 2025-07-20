// Firebase Debug Utilities
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

export class FirebaseDebugger {
  static async testFirebaseConnection() {
    try {
      console.log('🔥 Testing Firebase connection...');
      
      // Test basic connection
      const testRef = collection(db, 'test');
      const testDoc = await addDoc(testRef, {
        test: true,
        timestamp: serverTimestamp(),
        source: 'mobile_debug'
      });
      
      console.log('✅ Firebase connection successful. Test doc ID:', testDoc.id);
      return { success: true, testDocId: testDoc.id };
      
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkUserCollections(userId) {
    try {
      console.log(`🔍 Checking collections for user: ${userId}`);
      
      // Check if user document exists
      const userRef = doc(db, 'users', userId);
      
      // Check messages subcollection
      const messagesRef = collection(db, 'users', userId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      console.log(`📊 Found ${messagesSnapshot.docs.length} messages in user collection`);
      
      // Get current month messages
      const currentMonthYear = new Date().toISOString().substring(0, 7);
      const currentMonthQuery = query(
        messagesRef,
        where('monthYear', '==', currentMonthYear)
      );
      const currentMonthSnapshot = await getDocs(currentMonthQuery);
      
      console.log(`📅 Found ${currentMonthSnapshot.docs.length} current month messages`);
      
      return {
        totalMessages: messagesSnapshot.docs.length,
        currentMonthMessages: currentMonthSnapshot.docs.length,
        messages: messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };
      
    } catch (error) {
      console.error('❌ Error checking user collections:', error);
      return { error: error.message };
    }
  }

  static async forceSaveTestMessage(userId) {
    try {
      console.log(`💾 Force saving test message for user: ${userId}`);
      
      const messagesRef = collection(db, 'users', userId, 'messages');
      const testMessage = {
        text: 'TEST MESSAGE: Firebase connection verification',
        sender: 'System Test',
        status: 'safe',
        analysis: 'This is a test message to verify Firebase connectivity',
        userId: userId,
        createdAt: serverTimestamp(),
        monthYear: new Date().toISOString().substring(0, 7),
        processed: true,
        isTest: true,
        timestamp: new Date().toISOString()
      };
      
      const docRef = await addDoc(messagesRef, testMessage);
      console.log(`✅ Test message saved with ID: ${docRef.id}`);
      
      return { success: true, messageId: docRef.id };
      
    } catch (error) {
      console.error('❌ Failed to save test message:', error);
      return { success: false, error: error.message };
    }
  }

  static async batchSaveMessages(userId, messages) {
    try {
      console.log(`📦 Batch saving ${messages.length} messages for user: ${userId}`);
      
      const batch = writeBatch(db);
      const messagesRef = collection(db, 'users', userId, 'messages');
      
      const savedMessages = [];
      
      for (const message of messages) {
        const docRef = doc(messagesRef);
        const enhancedMessage = {
          ...message,
          userId: userId,
          createdAt: serverTimestamp(),
          monthYear: new Date().toISOString().substring(0, 7),
          processed: true,
          batchSaved: true,
          timestamp: message.timestamp || new Date().toISOString()
        };
        
        batch.set(docRef, enhancedMessage);
        savedMessages.push({ id: docRef.id, ...enhancedMessage });
      }
      
      await batch.commit();
      console.log(`✅ Batch saved ${messages.length} messages successfully`);
      
      return { success: true, savedCount: messages.length, messages: savedMessages };
      
    } catch (error) {
      console.error('❌ Batch save failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async testIndexQuery(userId) {
    try {
      console.log('📊 Testing Firebase index query...');
      
      const messagesRef = collection(db, 'users', userId, 'messages');
      const currentMonthYear = new Date().toISOString().substring(0, 7);
      
      // Test the query that was failing (monthYear + orderBy createdAt)
      const indexQuery = query(
        messagesRef,
        where('monthYear', '==', currentMonthYear),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(indexQuery);
      console.log(`✅ Index query successful! Found ${snapshot.docs.length} current month messages`);
      
      return {
        success: true,
        messageCount: snapshot.docs.length,
        messages: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };
      
    } catch (error) {
      console.error('❌ Index query failed:', error);
      return { 
        success: false, 
        error: error.message,
        needsIndex: error.message.includes('requires an index')
      };
    }
  }

  static async verifyWebAppAccess() {
    try {
      console.log('🌐 Testing web app access to Firestore...');
      
      // Test if we can read the dashboard stats
      const dashboardRef = doc(db, 'dashboard', 'stats');
      const dashboardSnap = await getDocs(collection(db, 'dashboard'));
      
      console.log(`📊 Dashboard documents: ${dashboardSnap.docs.length}`);
      
      // Test reading users collection
      const usersSnap = await getDocs(collection(db, 'users'));
      console.log(`👥 Users found: ${usersSnap.docs.length}`);
      
      return {
        success: true,
        dashboardDocs: dashboardSnap.docs.length,
        userCount: usersSnap.docs.length
      };
      
    } catch (error) {
      console.error('❌ Web app access test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default FirebaseDebugger;
