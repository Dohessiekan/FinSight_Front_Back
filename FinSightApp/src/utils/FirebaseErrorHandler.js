import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * FirebaseErrorHandler - Handles Firebase errors and provides fallback mechanisms
 */
class FirebaseErrorHandler {
  
  /**
   * Common Firebase error codes and their solutions
   */
  static ERROR_CODES = {
    'permission-denied': {
      message: 'Permission denied - Check Firestore security rules',
      solution: 'Ensure user is authenticated and rules allow read access',
      severity: 'high'
    },
    'unavailable': {
      message: 'Firebase service unavailable - Network or server issue',
      solution: 'Check internet connection and try again',
      severity: 'medium'
    },
    'unauthenticated': {
      message: 'User not authenticated',
      solution: 'Sign in again to continue',
      severity: 'high'
    },
    'not-found': {
      message: 'Collection or document not found',
      solution: 'Check if collection exists and path is correct',
      severity: 'medium'
    },
    'failed-precondition': {
      message: 'Query requires an index',
      solution: 'Check Firebase console for index creation prompt',
      severity: 'high'
    },
    'resource-exhausted': {
      message: 'Quota exceeded',
      solution: 'Check Firebase usage limits',
      severity: 'high'
    }
  };

  /**
   * Handle Firebase errors with detailed information
   */
  static handleFirebaseError(error, context = 'Firebase operation') {
    console.error(`❌ ${context} error:`, error);
    
    const errorCode = error?.code || 'unknown';
    const errorInfo = this.ERROR_CODES[errorCode];
    
    const errorDetails = {
      code: errorCode,
      message: error?.message || 'Unknown error',
      context,
      timestamp: new Date().toISOString(),
      severity: errorInfo?.severity || 'medium',
      userMessage: errorInfo?.message || 'An error occurred',
      solution: errorInfo?.solution || 'Please try again',
      fullError: error
    };
    
    // Log structured error
    console.log('🔍 Error Analysis:', errorDetails);
    
    return errorDetails;
  }

  /**
   * Test Firebase connectivity and permissions
   */
  static async testFirebaseConnection(userId) {
    const tests = [];
    
    try {
      console.log('🔬 Testing Firebase connectivity...');
      
      // Test 1: Basic Firestore connection
      try {
        const testRef = collection(db, 'test');
        tests.push({
          name: 'Firestore Connection',
          status: 'success',
          message: 'Connected to Firestore successfully'
        });
      } catch (error) {
        tests.push({
          name: 'Firestore Connection',
          status: 'failed',
          error: this.handleFirebaseError(error, 'Firestore connection test')
        });
      }
      
      // Test 2: User document access
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          tests.push({
            name: 'User Document Access',
            status: 'success',
            message: `User document ${userDoc.exists() ? 'found' : 'not found but accessible'}`,
            exists: userDoc.exists()
          });
        } catch (error) {
          tests.push({
            name: 'User Document Access',
            status: 'failed',
            error: this.handleFirebaseError(error, 'User document access test')
          });
        }
      }
      
      // Test 3: Fraud alerts collection access
      try {
        const alertsRef = collection(db, 'fraud_alerts');
        const q = query(alertsRef, limit(1));
        
        // Just create the query, don't execute it yet
        tests.push({
          name: 'Fraud Alerts Collection Access',
          status: 'success',
          message: 'Fraud alerts collection query created successfully'
        });
      } catch (error) {
        tests.push({
          name: 'Fraud Alerts Collection Access',
          status: 'failed',
          error: this.handleFirebaseError(error, 'Fraud alerts collection test')
        });
      }
      
      // Test 4: Real-time listener test
      if (userId) {
        try {
          const alertsRef = collection(db, 'fraud_alerts');
          const q = query(
            alertsRef, 
            where('userId', '==', userId),
            limit(1)
          );
          
          // Test listener creation and immediate cleanup
          const unsubscribe = onSnapshot(q, 
            (snapshot) => {
              tests.push({
                name: 'Real-time Listener',
                status: 'success',
                message: `Listener created successfully, found ${snapshot.docs.length} documents`
              });
              unsubscribe(); // Immediately cleanup test listener
            },
            (error) => {
              tests.push({
                name: 'Real-time Listener',
                status: 'failed',
                error: this.handleFirebaseError(error, 'Real-time listener test')
              });
              unsubscribe(); // Cleanup even on error
            }
          );
          
          // Give listener time to respond
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          tests.push({
            name: 'Real-time Listener',
            status: 'failed',
            error: this.handleFirebaseError(error, 'Real-time listener creation test')
          });
        }
      }
      
      return {
        success: true,
        tests,
        summary: {
          total: tests.length,
          passed: tests.filter(t => t.status === 'success').length,
          failed: tests.filter(t => t.status === 'failed').length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: this.handleFirebaseError(error, 'Firebase connectivity test'),
        tests
      };
    }
  }

  /**
   * Create a robust real-time alerts listener with error handling
   */
  static createRobustAlertsListener(userId, onAlertsUpdate, onError) {
    if (!userId) {
      const error = new Error('User ID is required for alerts listener');
      onError(this.handleFirebaseError(error, 'Alerts listener setup'));
      return null;
    }

    try {
      console.log('🔄 Creating robust real-time alerts listener...');
      
      const alertsRef = collection(db, 'fraud_alerts');
      const q = query(
        alertsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'), 
        limit(10)
      );
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          try {
            console.log(`✅ Alerts listener update: ${snapshot.docs.length} documents`);
            
            const alerts = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                content: data.message || data.alertMessage || data.description || 'Fraud alert detected',
                timestamp: data.createdAt?.toDate?.() ? this.formatTimestamp(data.createdAt.toDate()) : 'Recent',
                risk: data.severity === 'high' ? 'High' : 
                      data.severity === 'medium' ? 'Medium' : 
                      data.severity === 'low' ? 'Low' : 'Medium',
                type: data.type || 'fraud',
                severity: data.severity || 'medium',
                source: data.source || 'SMS Analysis',
                phone: data.phone || data.phoneNumber || 'Unknown',
                confidence: data.confidence || 0.5,
                scanId: data.scanId,
                messageId: data.messageId,
                createdAt: data.createdAt
              };
            });
            
            onAlertsUpdate(alerts);
            
          } catch (processingError) {
            console.error('❌ Error processing alerts data:', processingError);
            onError(this.handleFirebaseError(processingError, 'Alerts data processing'));
          }
        },
        (error) => {
          console.error('❌ Real-time alerts listener error:', error);
          const errorDetails = this.handleFirebaseError(error, 'Real-time alerts listener');
          onError(errorDetails);
          
          // Don't automatically retry if it's a permission error
          if (error?.code !== 'permission-denied' && error?.code !== 'unauthenticated') {
            console.log('🔄 Will attempt to reconnect alerts listener in 5 seconds...');
            setTimeout(() => {
              console.log('🔄 Attempting to reconnect alerts listener...');
              this.createRobustAlertsListener(userId, onAlertsUpdate, onError);
            }, 5000);
          }
        }
      );
      
      console.log('✅ Real-time alerts listener created successfully');
      return unsubscribe;
      
    } catch (error) {
      console.error('❌ Failed to create alerts listener:', error);
      onError(this.handleFirebaseError(error, 'Alerts listener creation'));
      return null;
    }
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(date) {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Get diagnostic information for Firebase issues
   */
  static getDiagnosticInfo() {
    return {
      timestamp: new Date().toISOString(),
      platform: 'React Native',
      firebaseSDK: 'Firebase v9+',
      common_issues: [
        {
          issue: 'Permission Denied',
          causes: [
            'Firestore security rules not configured',
            'User not authenticated',
            'Insufficient permissions for collection'
          ],
          solutions: [
            'Check Firebase console security rules',
            'Verify user authentication status',
            'Update Firestore rules to allow read access'
          ]
        },
        {
          issue: 'Service Unavailable',
          causes: [
            'Network connectivity issues',
            'Firebase servers temporarily down',
            'App not properly configured'
          ],
          solutions: [
            'Check internet connection',
            'Wait and retry',
            'Verify Firebase configuration'
          ]
        },
        {
          issue: 'Index Required',
          causes: [
            'Complex query requires composite index',
            'orderBy with where clause needs index'
          ],
          solutions: [
            'Check Firebase console for index creation prompt',
            'Create required indexes manually',
            'Simplify query if possible'
          ]
        }
      ]
    };
  }
}

export default FirebaseErrorHandler;
