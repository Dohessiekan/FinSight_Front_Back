/**
 * Test script to verify reject functionality
 * Run this in the browser console on the FinSight web app
 */

// Test function to check notification structure
async function testNotificationStructure() {
  try {
    console.log('🔍 Testing notification structure...');
    
    // Get a sample notification to see its structure
    const { collection, getDocs, query, orderBy, limit } = window.firebase.firestore;
    const db = window.firebase.firestore();
    
    const notificationsRef = collection(db, 'adminNotifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ No notifications found');
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('📄 Sample notification structure:', data);
    console.log('📄 Sample notification ID:', doc.id);
    console.log('🔍 Fields available:', Object.keys(data));
    console.log('🔍 messageId field:', data.messageId);
    console.log('🔍 userId field:', data.userId);
    console.log('🔍 currentStatus field:', data.currentStatus);
    
    return { id: doc.id, data };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test the reject function with a sample notification
async function testRejectFunction(notificationId) {
  try {
    console.log('🧪 Testing reject function with notification:', notificationId);
    
    // Import the AdminNotificationManager
    const { AdminNotificationManager } = await import('./src/utils/AdminNotificationManager.js');
    
    const result = await AdminNotificationManager.rejectUserSafetyRequest(
      notificationId,
      'test@admin.com',
      'Testing reject functionality'
    );
    
    console.log('✅ Reject result:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Reject test failed:', error);
    throw error;
  }
}

// Run the tests
console.log('🚀 Starting reject function tests...');
console.log('1. First run: testNotificationStructure()');
console.log('2. Then run: testRejectFunction("notification-id-here")');
