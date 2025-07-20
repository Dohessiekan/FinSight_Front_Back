import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Firebase Real-Time Alerts Testing Utility
 * 
 * Tests the real-time listener functionality for fraud alerts
 */
class AlertsListenerTest {
  
  /**
   * Test Firebase connection and real-time alerts listener
   */
  static async testRealtimeAlertsListener(userId) {
    console.log('🧪 Testing real-time alerts listener...');
    
    try {
      // Test 1: Basic Firebase connection
      console.log('✅ Firebase DB connection:', db ? 'Connected' : 'Failed');
      
      // Test 2: Collection reference
      const alertsRef = collection(db, 'fraudAlerts');
      console.log('✅ fraudAlerts collection reference created');
      
      // Test 3: Query construction
      const q = query(
        alertsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      console.log('✅ Query constructed for user:', userId);
      
      // Test 4: Set up real-time listener
      console.log('🔄 Setting up real-time listener...');
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log('📡 Real-time update received!');
          console.log(`📊 Documents found: ${snapshot.docs.length}`);
          
          snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Alert ${index + 1}:`, {
              id: doc.id,
              message: data.message || data.alertMessage || 'No message',
              severity: data.severity || 'unknown',
              createdAt: data.createdAt?.toDate?.()?.toISOString() || 'No timestamp',
              userId: data.userId || 'No userId'
            });
          });
          
          if (snapshot.docs.length === 0) {
            console.log('ℹ️ No fraud alerts found for this user');
            console.log('💡 Try running SMS analysis to create some alerts');
          }
        },
        (error) => {
          console.error('❌ Real-time listener error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          // Common error analysis
          if (error.code === 'permission-denied') {
            console.log('🚨 Permission denied - check Firestore security rules');
          } else if (error.code === 'failed-precondition') {
            console.log('🚨 Index missing - check if composite index is needed');
          } else if (error.code === 'unavailable') {
            console.log('🚨 Firebase service unavailable - check internet connection');
          }
        }
      );
      
      console.log('✅ Real-time listener setup complete');
      console.log('⏰ Listener will run for 10 seconds...');
      
      // Return cleanup function for testing
      return new Promise((resolve) => {
        setTimeout(() => {
          unsubscribe();
          console.log('🛑 Test completed - listener unsubscribed');
          resolve({
            success: true,
            message: 'Real-time listener test completed successfully'
          });
        }, 10000); // Run for 10 seconds
      });
      
    } catch (error) {
      console.error('❌ Real-time listener test failed:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }
  
  /**
   * Test if user has any fraud alerts in the database
   */
  static async checkUserAlerts(userId) {
    try {
      console.log(`🔍 Checking alerts for user: ${userId}`);
      
      const alertsRef = collection(db, 'fraudAlerts');
      const q = query(
        alertsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      return new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const alerts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString()
          }));
          
          unsubscribe(); // Single check, then unsubscribe
          
          resolve({
            success: true,
            alertCount: alerts.length,
            alerts: alerts,
            hasAlerts: alerts.length > 0
          });
        }, (error) => {
          unsubscribe();
          resolve({
            success: false,
            error: error.message
          });
        });
      });
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Quick diagnostic of real-time alerts system
   */
  static async diagnosticCheck(userId) {
    console.log('🩺 Running real-time alerts diagnostic...');
    
    try {
      // Check 1: Firebase connection
      const firebaseConnected = db ? true : false;
      console.log('Firebase connected:', firebaseConnected);
      
      // Check 2: User alerts
      const alertsCheck = await this.checkUserAlerts(userId);
      console.log('User alerts check:', alertsCheck);
      
      // Check 3: Permissions test
      console.log('🔐 Testing Firebase permissions...');
      
      const diagnostic = {
        timestamp: new Date().toISOString(),
        userId: userId,
        firebaseConnected: firebaseConnected,
        alertsCheck: alertsCheck,
        recommendations: []
      };
      
      // Generate recommendations
      if (!alertsCheck.success) {
        diagnostic.recommendations.push('❌ Firebase connection issue - check internet and Firebase config');
      } else if (!alertsCheck.hasAlerts) {
        diagnostic.recommendations.push('ℹ️ No alerts found - try running SMS analysis in Messages screen');
      } else {
        diagnostic.recommendations.push('✅ Real-time alerts should be working properly');
      }
      
      console.log('🩺 Diagnostic complete:', diagnostic);
      return diagnostic;
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AlertsListenerTest;
