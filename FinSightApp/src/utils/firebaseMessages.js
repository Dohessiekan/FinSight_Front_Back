// Utility functions for saving user messages to Firebase Firestore
import { db } from '../config/firebase';
import { collection, addDoc, setDoc, doc, getDoc, getDocs, query, where, updateDoc, increment, serverTimestamp, writeBatch, limit } from 'firebase/firestore';

/**
 * Save a message for a user in Firestore with analysis data
 * @param {string} userId - The user's unique ID
 * @param {object} message - The message object to save
 * @returns {Promise<string>} - The document ID of the saved message
 */
export async function saveUserMessage(userId, message) {
  try {
    // Enhance message with additional metadata for admin dashboard
    const enhancedMessage = {
      ...message,
      userId,
      customerId: `mobile_user_${userId.slice(-6)}`,
      timestamp: message.timestamp || new Date().toISOString(),
      createdAt: serverTimestamp(),
      appSource: 'FinSight Mobile',
      detectionMethod: message.detectionMethod || 'Mobile App Analysis',
      // Ensure required fields for admin dashboard
      from: message.from || message.sender || 'Unknown',
      content: message.text || message.content || message.body || '',
      amount: message.amount || 0,
      type: message.type || 'SMS',
      riskScore: message.riskScore || message.confidence || 0,
      status: message.status || 'New',
      priority: message.priority || 'Medium'
    };

    // Save under users/{userId}/messages
    const messagesRef = collection(db, 'users', userId, 'messages');
    const docRef = await addDoc(messagesRef, enhancedMessage);
    
    // Update user statistics
    await updateUserStats(userId, enhancedMessage);
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving message to Firebase:', error);
    throw error;
  }
}

/**
 * Fetch all messages for a user from Firestore
 * @param {string} userId - The user's unique ID
 * @returns {Promise<Array>} - Array of message objects
 */
export async function fetchUserMessages(userId) {
  try {
    const messagesRef = collection(db, 'users', userId, 'messages');
    const snapshot = await getDocs(messagesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching messages from Firebase:', error);
    throw error;
  }
}

/**
 * Fetch all users (for admin dashboard)
 * @returns {Promise<Array>} - Array of user IDs
 */
export async function fetchAllUserIds() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching user IDs from Firebase:', error);
    throw error;
  }
}

/**
 * Create or update user profile for admin dashboard tracking
 * @param {string} userId - The user's unique ID
 * @param {object} userInfo - User information (email, displayName, etc.)
 */
/**
 * Create or update user profile for admin dashboard tracking (SIMPLIFIED)
 * @param {string} userId - The user's unique ID
 * @param {object} userInfo - User information (email, displayName, etc.)
 */
/**
 * Simple Firebase connectivity test - bypasses complex operations
 */
export async function testSimpleFirebaseWrite() {
  try {
    console.log('🔗 SIMPLE TEST: Testing basic Firebase write...');
    
    // Try to write to a simple test collection with minimal data
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Simple connection test'
    };
    
    console.log('🔗 SIMPLE TEST: Creating test document reference...');
    const testRef = doc(db, 'connection_test', 'mobile_app_test');
    
    console.log('🔗 SIMPLE TEST: Attempting simple write...');
    await setDoc(testRef, testData);
    console.log('✅ SIMPLE TEST: Basic write successful!');
    
    return { success: true, message: 'Basic Firebase write working' };
  } catch (error) {
    console.error('❌ SIMPLE TEST: Basic write failed:', error);
    return { 
      success: false, 
      error: error.message, 
      code: error.code,
      details: 'This suggests a Firebase permissions/rules issue'
    };
  }
}

/**
 * Simple Firebase connectivity test
 */
export async function testFirebaseConnection() {
  try {
    console.log('🔗 FIREBASE CONNECTION TEST: Starting...');
    console.log('🔗 FIREBASE CONNECTION TEST: Database object:', !!db);
    
    // Try a simple read operation first (less restrictive than writes)
    console.log('🔗 FIREBASE CONNECTION TEST: Attempting to read from Firestore...');
    const testRef = collection(db, 'test');
    const testQuery = query(testRef, limit(1));
    const snapshot = await getDocs(testQuery);
    console.log('✅ FIREBASE CONNECTION TEST: Read operation successful!', snapshot.size);
    
    // Now try a simple write
    const testDocRef = doc(db, 'test', 'connection_test');
    const testData = {
      timestamp: new Date().toISOString(),
      test: 'mobile_app_connection',
      userAgent: navigator.userAgent || 'mobile'
    };
    
    console.log('🔗 FIREBASE CONNECTION TEST: Attempting to write test document...');
    await setDoc(testDocRef, testData);
    console.log('✅ FIREBASE CONNECTION TEST: Successfully wrote to Firebase!');
    
    return { success: true, message: 'Firebase connection working - both read and write successful' };
  } catch (error) {
    console.error('❌ FIREBASE CONNECTION TEST: Failed:', error);
    
    // Detailed error analysis
    let errorAnalysis = 'Unknown error';
    if (error.code === 'permission-denied') {
      errorAnalysis = 'Permission denied - Check Firestore security rules';
    } else if (error.code === 'unavailable') {
      errorAnalysis = 'Firebase service unavailable - Network issue';
    } else if (error.message.includes('timeout')) {
      errorAnalysis = 'Network timeout - Check internet connection';
    } else if (error.code === 'failed-precondition') {
      errorAnalysis = 'Firebase project configuration issue';
    }
    
    return { 
      success: false, 
      error: error.message, 
      code: error.code,
      analysis: errorAnalysis
    };
  }
}

/**
 * Enhanced user profile creation with account recreation detection
 */
export async function createSimpleUserProfile(userId, userInfo = {}) {
  try {
    console.log('🔥 ENHANCED CREATE: Starting user profile creation with recreation detection...');
    console.log('🔥 ENHANCED CREATE: userId:', userId);
    console.log('🔥 ENHANCED CREATE: userInfo:', userInfo);
    
    const userDocRef = doc(db, 'users', userId);
    console.log('🔥 ENHANCED CREATE: Document reference created:', userDocRef.path);
    
    // Check if user document already exists
    console.log('🔥 ENHANCED CREATE: Checking if user already exists...');
    const userSnap = await getDoc(userDocRef);
    const userExists = userSnap.exists();
    
    const now = new Date().toISOString();
    
    if (userExists) {
      console.log('🔄 ENHANCED CREATE: User exists, updating login info...');
      const existingData = userSnap.data();
      
      // Update existing user with login info
      const updateData = {
        lastLogin: now,
        lastActive: now,
        email: userInfo.email || existingData.email,
        displayName: userInfo.displayName || existingData.displayName,
        updatedAt: now,
        loginCount: (existingData.loginCount || 0) + 1
      };
      
      await setDoc(userDocRef, updateData, { merge: true });
      console.log('✅ ENHANCED CREATE: Existing user profile updated successfully!');
      
      return { ...existingData, ...updateData, existed: true };
    } else {
      console.log('🆕 ENHANCED CREATE: Creating new user profile...');
      
      const newProfile = {
        userId,
        email: userInfo.email || 'unknown@example.com',
        displayName: userInfo.displayName || userInfo.email?.split('@')[0] || 'Mobile User',
        createdAt: now,
        lastLogin: now,
        lastActive: now,
        source: 'mobile_app',
        status: 'active',
        // Message tracking
        messagesAnalyzed: 0,
        fraudsDetected: 0,
        totalMessages: 0,
        // Scan tracking for account recreation detection
        initialAnalysisCompleted: false,
        lastScanDate: null,
        firstScanDate: null,
        totalScans: 0,
        // Account recreation tracking
        accountRecreated: true, // This is a new account
        originalCreationDate: now,
        lastRecreationDate: null,
        loginCount: 1,
        profileVersion: '2.0'
      };
      
      console.log('🔥 ENHANCED CREATE: Profile data:', JSON.stringify(newProfile, null, 2));
      
      await setDoc(userDocRef, newProfile);
      console.log('✅ ENHANCED CREATE: New user profile created successfully!');
      
      return { ...newProfile, existed: false };
    }
  } catch (error) {
    console.error('❌ ENHANCED CREATE: Error:', error);
    console.error('❌ ENHANCED CREATE: Error code:', error.code);
    console.error('❌ ENHANCED CREATE: Error message:', error.message);
    throw error;
  }
}

export async function createOrUpdateUserProfile(userId, userInfo = {}) {
  try {
    console.log('🔥 FIREBASE TEST: Starting user profile creation...');
    console.log('🔥 FIREBASE TEST: userId:', userId);
    console.log('🔥 FIREBASE TEST: userInfo:', userInfo);
    console.log('🔥 FIREBASE TEST: db object exists:', !!db);
    
    // Add timeout wrapper
    return await Promise.race([
      // Main Firebase operation
      (async () => {
        console.log('🔥 FIREBASE TEST: Creating document reference...');
        const userDocRef = doc(db, 'users', userId);
        console.log('🔥 FIREBASE TEST: Document reference created:', userDocRef.path);
        
        const simpleUserProfile = {
          userId,
          email: userInfo.email || 'unknown@example.com',
          displayName: userInfo.displayName || 'Mobile User',
          createdAt: serverTimestamp(),
          lastUpdated: new Date().toISOString(),
          source: 'mobile_app',
          testField: 'This is a test to verify Firebase write'
        };
        
        console.log('🔥 FIREBASE TEST: Profile data prepared:', JSON.stringify(simpleUserProfile, null, 2));
        
        console.log('🔥 FIREBASE TEST: About to call setDoc...');
        await setDoc(userDocRef, simpleUserProfile, { merge: true });
        console.log('✅ FIREBASE TEST: setDoc completed successfully!');
        
        console.log('🔥 FIREBASE TEST: About to update dashboard stats...');
        await updateDashboardUserCount();
        console.log('✅ FIREBASE TEST: Dashboard stats updated!');
        
        return simpleUserProfile;
      })(),
      
      // Timeout after 15 seconds
      new Promise((_, reject) => {
        setTimeout(() => {
          console.log('⏰ FIREBASE TEST: Operation timed out after 15 seconds');
          reject(new Error('Firebase operation timed out after 15 seconds'));
        }, 15000);
      })
    ]);
    
  } catch (error) {
    console.error('❌ FIREBASE TEST: Detailed error caught:', error);
    console.error('❌ FIREBASE TEST: Error name:', error.name);
    console.error('❌ FIREBASE TEST: Error message:', error.message);
    console.error('❌ FIREBASE TEST: Error code:', error.code);
    console.error('❌ FIREBASE TEST: Error stack:', error.stack);
    throw error;
  }
}

/**
 * Update global dashboard user count (optimized and reliable)
 */
async function updateDashboardUserCount() {
  try {
    console.log('📊 Updating dashboard user count...');
    
    const dashboardRef = doc(db, 'dashboard', 'stats');
    
    // First, try to read current stats to see if document exists
    const currentStats = await getDocs(query(collection(db, 'dashboard'), where('__name__', '==', 'stats')));
    
    if (currentStats.empty) {
      // Initialize dashboard stats document if it doesn't exist
      console.log('📊 Initializing dashboard stats document...');
      await setDoc(dashboardRef, {
        totalUsers: 1, // First user
        totalSmsAnalyzedToday: 0,
        fraudsPrevented: 0,
        lastUserCountUpdate: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        initialized: true
      });
      console.log('📊 Dashboard stats initialized with first user');
    } else {
      // Increment existing count
      console.log('📊 Incrementing existing user count...');
      await setDoc(dashboardRef, {
        totalUsers: increment(1),
        lastUserCountUpdate: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      console.log('📊 Dashboard user count incremented successfully');
    }
  } catch (error) {
    console.error('Error updating dashboard user count:', error);
    
    // Fallback: try a simple set operation
    try {
      console.log('📊 Trying fallback user count update...');
      const dashboardRef = doc(db, 'dashboard', 'stats');
      await setDoc(dashboardRef, {
        totalUsers: increment(1),
        lastUserCountUpdate: serverTimestamp(),
        fallbackUpdate: true
      }, { merge: true });
      console.log('📊 Fallback user count update successful');
    } catch (fallbackError) {
      console.error('❌ Fallback user count update also failed:', fallbackError);
    }
  }
}

/**
 * Save financial summary for a user
 * @param {string} userId - The user's unique ID
 * @param {object} summary - The financial summary data
 */
export async function saveUserFinancialSummary(userId, summary) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      financialSummary: {
        ...summary,
        lastUpdated: serverTimestamp(),
        userId
      }
    }, { merge: true });
  } catch (error) {
    console.error('Error saving financial summary:', error);
    throw error;
  }
}

/**
 * Update user statistics for admin dashboard
 * @param {string} userId - The user's unique ID
 * @param {object} message - The message data
 */
async function updateUserStats(userId, message) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const statsUpdate = {
      lastActivity: serverTimestamp(),
      totalMessages: increment(1)
    };

    // Count different message types
    if (message.type === 'Transaction') {
      statsUpdate.transactionCount = increment(1);
    }
    
    if (message.riskScore > 70) {
      statsUpdate.suspiciousCount = increment(1);
    }

    if (message.amount && message.amount > 0) {
      statsUpdate.totalTransactionValue = increment(parseFloat(message.amount.toString().replace(/[^0-9.-]/g, '')) || 0);
    }

    await setDoc(userDocRef, { stats: statsUpdate }, { merge: true });

    // Update global dashboard statistics
    await updateDashboardStats(message);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

/**
 * Update global dashboard statistics
 * @param {object} message - The message data
 */
async function updateDashboardStats(message) {
  try {
    const dashboardRef = doc(db, 'dashboard', 'stats');
    const today = new Date().toISOString().split('T')[0];
    
    const statsUpdate = {
      totalSmsAnalyzedToday: increment(1),
      lastUpdated: serverTimestamp(),
      [`daily_${today}`]: {
        smsCount: increment(1),
        date: today
      }
    };

    if (message.riskScore > 70) {
      statsUpdate.fraudsPrevented = increment(1);
    }

    await setDoc(dashboardRef, statsUpdate, { merge: true });
  } catch (error) {
    console.error('Error updating dashboard stats:', error);
  }
}

/**
 * Save real-time fraud alert for admin dashboard
 * @param {string} userId - The user's unique ID
 * @param {object} alertData - The alert information
 */
export async function saveFraudAlert(userId, alertData) {
  try {
    const alertsRef = collection(db, 'fraud_alerts');
    const alert = {
      ...alertData,
      userId,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
      status: 'active',
      source: 'Mobile App'
    };
    
    await addDoc(alertsRef, alert);
  } catch (error) {
    console.error('Error saving fraud alert:', error);
  }
}

/**
 * Save all analyzed SMS messages to Firebase for a user (OPTIMIZED)
 * @param {Array} messages - Array of analyzed messages
 * @param {string} userId - The user's unique ID
 */
export async function saveAllMessagesToFirebase(messages, userId) {
  if (!userId || !messages || messages.length === 0) return;
  
  console.log(`🔥 Starting optimized Firebase save for ${messages.length} messages...`);
  
  let fraudCount = 0;
  let suspiciousCount = 0;
  const BATCH_SIZE = 10; // Firebase batch limit is 500, but we'll use smaller batches for better performance
  
  try {
    // Process messages in batches
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchMessages = messages.slice(i, i + BATCH_SIZE);
      
      console.log(`🔥 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(messages.length / BATCH_SIZE)} (${batchMessages.length} messages)`);
      
      for (const msg of batchMessages) {
        // Enhanced message data for admin dashboard
        const enhancedMsg = {
          ...msg,
          userId,
          customerId: `mobile_user_${userId.slice(-6)}`,
          timestamp: msg.timestamp || new Date().toISOString(),
          createdAt: serverTimestamp(),
          appSource: 'FinSight Mobile',
          detectionMethod: msg.detectionMethod || 'Mobile App Analysis',
          // Ensure required fields for admin dashboard
          from: msg.from || msg.sender || 'Unknown',
          content: msg.text || msg.content || msg.body || '',
          amount: msg.amount || 0,
          type: msg.type || 'SMS',
          riskScore: msg.spamData?.confidence * 100 || 0,
          status: msg.status || 'safe',
          priority: msg.spamData?.confidence > 0.8 ? 'High' : msg.spamData?.confidence > 0.5 ? 'Medium' : 'Low'
        };
        
        // Count fraud/suspicious messages for alerts
        if (msg.status === 'fraud') {
          fraudCount++;
        } else if (msg.status === 'suspicious') {
          suspiciousCount++;
        }
        
        // Add to batch
        const messageRef = doc(collection(db, 'users', userId, 'messages'));
        batch.set(messageRef, enhancedMsg);
      }
      
      // Commit this batch
      await batch.commit();
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} committed successfully`);
      
      // Small delay between batches to avoid overwhelming Firebase
      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`🔥 All messages saved to Firebase successfully!`);
    
    // Update user stats in a separate batch operation
    await updateUserStatsBatch(userId, messages.length, fraudCount, suspiciousCount);
    
    // Update user profile to ensure they're counted in dashboard
    await updateUserLastActivity(userId);
    
    // Create fraud alert if significant fraud detected
    if (fraudCount > 0) {
      console.log(`🚨 Creating fraud alert for ${fraudCount} fraudulent messages`);
      await saveFraudAlert(userId, {
        type: 'SMS Fraud Detection',
        severity: fraudCount > 2 ? 'critical' : 'high',
        message: `Mobile app detected ${fraudCount} fraudulent SMS messages during scan`,
        confidence: Math.min(95, 70 + (fraudCount * 10)),
        phone: 'Mobile App Scan',
        details: {
          fraudCount,
          suspiciousCount,
          totalScanned: messages.length,
          scanTimestamp: new Date().toISOString()
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error in batch Firebase save:', error);
    throw error;
  }
}

/**
 * Update user statistics in batch (OPTIMIZED)
 * @param {string} userId - The user's unique ID
 * @param {number} totalMessages - Total messages processed
 * @param {number} fraudCount - Number of fraud messages
 * @param {number} suspiciousCount - Number of suspicious messages
 */
async function updateUserStatsBatch(userId, totalMessages, fraudCount, suspiciousCount) {
  try {
    const batch = writeBatch(db);
    
    // Update user stats
    const userDocRef = doc(db, 'users', userId);
    batch.set(userDocRef, {
      stats: {
        lastActivity: serverTimestamp(),
        totalMessages: increment(totalMessages),
        suspiciousCount: increment(fraudCount + suspiciousCount),
        transactionCount: increment(totalMessages), // Assuming all are transactions for now
      }
    }, { merge: true });
    
    // Update dashboard stats
    const dashboardRef = doc(db, 'dashboard', 'stats');
    const today = new Date().toISOString().split('T')[0];
    batch.set(dashboardRef, {
      totalSmsAnalyzedToday: increment(totalMessages),
      fraudsPrevented: increment(fraudCount),
      lastUpdated: serverTimestamp(),
      [`daily_${today}`]: {
        smsCount: increment(totalMessages),
        date: today
      }
    }, { merge: true });
    
    await batch.commit();
    console.log(`📊 User and dashboard stats updated successfully`);
  } catch (error) {
    console.error('❌ Error updating stats:', error);
  }
}

/**
 * Update user last activity and ensure they're counted in dashboard
 * @param {string} userId - The user's unique ID
 */
async function updateUserLastActivity(userId) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      lastActive: serverTimestamp(),
      isActive: true,
      stats: {
        lastActivity: serverTimestamp(),
        lastScan: serverTimestamp()
      }
    }, { merge: true });
    
    // Update global dashboard user count to ensure this user is counted
    await updateDashboardUserCount();
    
    console.log('📱 User activity updated for dashboard tracking');
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}
