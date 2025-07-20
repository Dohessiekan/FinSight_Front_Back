// Firebase Connection Test
import { db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function testFirebaseConnection() {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    const testRef = doc(db, 'test', 'connection_test');
    await setDoc(testRef, {
      timestamp: serverTimestamp(),
      test: 'Firebase connection working',
      from: 'mobile_app'
    });
    
    console.log('✅ Firebase connection test passed');
    return { success: true, message: 'Firebase connection working' };
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return { success: false, error: error.message };
  }
}
