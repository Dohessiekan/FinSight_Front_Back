// Test notification flow in browser console (web app)
// Run this in the FinSight web app console to test notification creation

console.log('🧪 Testing admin notification flow...');

// Test 1: Check if userNotifications collection exists and has proper structure
async function testNotificationStructure() {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('./src/config/firebase.js');
    
    const userNotificationsRef = collection(db, 'userNotifications');
    const snapshot = await getDocs(userNotificationsRef);
    
    console.log('📊 userNotifications Collection Status:');
    console.log(`Total notifications: ${snapshot.size}`);
    
    if (snapshot.size > 0) {
      const sampleNotification = snapshot.docs[0].data();
      console.log('📄 Sample notification structure:', sampleNotification);
      
      // Check required fields
      const requiredFields = ['userId', 'type', 'title', 'message', 'createdAt'];
      const missingFields = requiredFields.filter(field => !(field in sampleNotification));
      
      if (missingFields.length === 0) {
        console.log('✅ Notification structure is correct');
      } else {
        console.log('❌ Missing fields:', missingFields);
      }
    } else {
      console.log('ℹ️ No notifications found - this is normal if no admin actions have been taken yet');
    }
  } catch (error) {
    console.error('❌ Error checking notification structure:', error);
  }
}

// Test 2: Simulate creating a test notification (use carefully!)
async function createTestNotification(userId = 'test-user-id') {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./src/config/firebase.js');
    
    console.log('🧪 Creating test notification...');
    
    const userNotificationRef = collection(db, 'userNotifications');
    const testNotification = {
      userId: userId,
      type: 'admin_rejection',
      title: '❌ Test Notification',
      message: 'This is a test notification to verify the system works.',
      messageId: 'test-message-id',
      originalMessage: 'Test SMS message content',
      adminEmail: 'test-admin@example.com',
      createdAt: serverTimestamp(),
      read: false,
      priority: 'high'
    };
    
    const docRef = await addDoc(userNotificationRef, testNotification);
    console.log('✅ Test notification created with ID:', docRef.id);
    console.log('📱 Mobile app should show alert if user is logged in and matches userId:', userId);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
  }
}

// Test 3: Check AdminNotificationManager functionality
async function testAdminNotificationManager() {
  try {
    console.log('🧪 Testing AdminNotificationManager...');
    
    // Check if AdminNotificationManager exists
    if (typeof AdminNotificationManager !== 'undefined') {
      console.log('✅ AdminNotificationManager is available');
      
      // Check if required methods exist
      const requiredMethods = ['rejectUserSafetyRequest', 'approveUserSafetyRequest'];
      const availableMethods = requiredMethods.filter(method => 
        typeof AdminNotificationManager[method] === 'function'
      );
      
      console.log('✅ Available methods:', availableMethods);
      
      if (availableMethods.length === requiredMethods.length) {
        console.log('✅ All required methods are available');
      } else {
        console.log('❌ Missing methods:', requiredMethods.filter(m => !availableMethods.includes(m)));
      }
    } else {
      console.log('❌ AdminNotificationManager not found - make sure you\'re on the admin page');
    }
  } catch (error) {
    console.error('❌ Error testing AdminNotificationManager:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting notification system tests...\n');
  
  await testNotificationStructure();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testAdminNotificationManager();
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('📋 Test Summary:');
  console.log('1. ✅ Check notification structure');
  console.log('2. ✅ Check AdminNotificationManager');
  console.log('3. 🧪 To test full flow: Have user request review → Admin approve/reject');
  console.log('\n🔔 If tests pass, notification system should work properly!');
}

// Export test functions for manual use
window.testNotificationFlow = {
  runAllTests,
  testNotificationStructure,
  createTestNotification,
  testAdminNotificationManager
};

console.log('🧪 Notification test functions loaded!');
console.log('📝 Run: testNotificationFlow.runAllTests()');
console.log('📝 Or run individual tests: testNotificationFlow.testNotificationStructure()');
