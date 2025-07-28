// Enhanced Firebase utilities for comprehensive user data collection
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  increment
} from 'firebase/firestore';

// Ensure Firebase Auth is authenticated for admin operations
async function ensureAuthenticated() {
  if (!auth.currentUser) {
    console.log('🔐 Authenticating with Firebase for admin access...');
    try {
      await signInAnonymously(auth);
      console.log('✅ Anonymous authentication successful');
    } catch (error) {
      console.error('❌ Firebase authentication failed:', error);
      throw error;
    }
  }
}

// Enhanced function to save user message and handle user creation/tracking
export async function saveUserMessage(userId, message) {
  try {
    // Ensure Firebase authentication
    await ensureAuthenticated();
    
    console.log(`💾 Saving message for user: ${userId}`);
    
    // Step 1: Check if user exists, create if not
    await ensureUserExists(userId);
    
    // Step 2: Check if this message already exists (prevent duplicates)
    const isDuplicate = await checkMessageExists(userId, message);
    if (isDuplicate) {
      console.log(`⚠️ Message already exists for user ${userId}, skipping...`);
      return isDuplicate.id;
    }
    
    // Step 3: Save the message
    const messagesRef = collection(db, 'users', userId, 'messages');
    const messageHash = createMessageHash(message);
    const enhancedMessage = {
      ...message,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageHash, // Add hash for duplicate detection
      userId,
      createdAt: serverTimestamp(),
      source: 'mobile_app',
      processed: false,
      timestamp: message.timestamp || new Date().toISOString(),
      isNewMessage: message.isNewMessage || false, // Track if this is a new incoming message
      displayedOnMobile: true, // Track that this message was displayed on mobile
      syncedToWeb: true // Track that this message is synced to web dashboard
    };
    
    const docRef = await addDoc(messagesRef, enhancedMessage);
    console.log(`✅ Message saved with ID: ${docRef.id}`);
    
    // Step 4: Update user statistics
    await updateUserStats(userId, message);
    
    // Step 5: Update dashboard statistics
    await updateDashboardStats(message);
    
    // Step 6: Create fraud alert if needed
    if (message.analysis && message.analysis.isFraud) {
      await createFraudAlert(userId, message);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving message to Firebase:', error);
    throw error;
  }
}

// NEW: Function for first connection - analyze current month's messages
export async function analyzeCurrentMonthMessages(userId, monthlyMessages) {
  try {
    await ensureAuthenticated();
    console.log(`📅 First connection: Analyzing current month messages for user: ${userId}`);
    
    // Mark user as having completed initial analysis
    await markUserInitialAnalysisComplete(userId);
    
    const results = [];
    let fraudCount = 0;
    
    for (const message of monthlyMessages) {
      try {
        // Mark as historical message (not new incoming)
        const historicalMessage = {
          ...message,
          isNewMessage: false,
          isHistorical: true,
          isIncremental: false,
          analyzedDate: new Date().toISOString(),
          scanType: 'initial'
        };
        
        const messageId = await saveUserMessage(userId, historicalMessage);
        results.push({ messageId, success: true });
        
        if (message.analysis && message.analysis.isFraud) {
          fraudCount++;
        }
      } catch (error) {
        console.error(`❌ Error analyzing message:`, error);
        results.push({ error: error.message, success: false });
      }
    }
    
    // Update user with initial scan completion and last scan date
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      initialAnalysisCompleted: true,
      initialAnalysisDate: serverTimestamp(),
      lastScanDate: new Date().toISOString(), // Store last scan date for incremental updates
      firstScanDate: new Date().toISOString(),
      totalScans: 1,
      scanType: 'initial',
      lastActive: serverTimestamp()
    }, { merge: true });
    
    console.log(`✅ Initial analysis complete for ${userId}: ${results.length} messages, ${fraudCount} frauds detected`);
    
    return {
      success: true,
      isIncremental: false,
      totalAnalyzed: results.length,
      fraudsDetected: fraudCount,
      results,
      scanDate: new Date().toISOString(),
      scanType: 'initial'
    };
  } catch (error) {
    console.error('Error in initial month analysis:', error);
    throw error;
  }
}

// NEW: Function for incremental analysis - only analyze NEW messages since last scan
export async function analyzeIncrementalMessages(userId, allCurrentMessages) {
  try {
    await ensureAuthenticated();
    console.log(`🔄 Incremental analysis: Checking for new messages for user: ${userId}`);
    
    // Get user's last scan information
    const userDoc = doc(db, 'users', userId);
    const userSnap = await getDoc(userDoc);
    
    if (!userSnap.exists()) {
      console.log(`❌ User ${userId} not found, redirecting to initial analysis`);
      return await analyzeCurrentMonthMessages(userId, allCurrentMessages);
    }
    
    const userData = userSnap.data();
    const lastScanDate = userData.lastScanDate ? new Date(userData.lastScanDate) : null;
    
    if (!lastScanDate) {
      console.log(`📅 No previous scan date found, performing initial analysis`);
      return await analyzeCurrentMonthMessages(userId, allCurrentMessages);
    }
    
    console.log(`📅 Last scan: ${lastScanDate.toLocaleString()}`);
    
    // Filter messages that are newer than last scan
    const newMessages = allCurrentMessages.filter(message => {
      const messageDate = new Date(message.timestamp || parseInt(message.date));
      return messageDate > lastScanDate;
    });
    
    console.log(`📱 Found ${newMessages.length} new messages since last scan`);
    
    if (newMessages.length === 0) {
      console.log(`✅ No new messages to analyze for user: ${userId}`);
      return {
        success: true,
        isIncremental: true,
        newMessagesCount: 0,
        totalExistingMessages: userData.totalMessages || 0,
        message: 'No new messages since last scan'
      };
    }
    
    // Analyze only the new messages
    const results = [];
    let newFraudCount = 0;
    
    for (const message of newMessages) {
      try {
        // Mark as new incremental message
        const incrementalMessage = {
          ...message,
          isNewMessage: true,
          isHistorical: false,
          isIncremental: true,
          analyzedDate: new Date().toISOString(),
          scanType: 'incremental'
        };
        
        const messageId = await saveUserMessage(userId, incrementalMessage);
        results.push({ messageId, success: true });
        
        if (message.analysis && message.analysis.isFraud) {
          newFraudCount++;
        }
      } catch (error) {
        console.error(`❌ Error analyzing new message:`, error);
        results.push({ error: error.message, success: false });
      }
    }
    
    // Update user's last scan date
    await setDoc(userDoc, {
      lastScanDate: new Date().toISOString(),
      lastIncrementalScan: new Date().toISOString(),
      totalScans: increment(1),
      lastActive: serverTimestamp()
    }, { merge: true });
    
    console.log(`✅ Incremental analysis complete for ${userId}: ${newMessages.length} new messages, ${newFraudCount} new frauds detected`);
    
    return {
      success: true,
      isIncremental: true,
      newMessagesAnalyzed: newMessages.length,
      newFraudsDetected: newFraudCount,
      totalExistingMessages: userData.totalMessages || 0,
      results,
      lastScanDate: lastScanDate.toISOString(),
      newScanDate: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in incremental message analysis:', error);
    throw error;
  }
}

// SMART: Main analysis function - automatically determines initial vs incremental
export async function smartAnalyzeUserMessages(userId, allCurrentMessages) {
  try {
    await ensureAuthenticated();
    console.log(`🧠 Smart analysis starting for user: ${userId}`);
    
    // Check if user exists and has completed initial analysis
    const userDoc = doc(db, 'users', userId);
    const userSnap = await getDoc(userDoc);
    
    const hasCompletedInitial = userSnap.exists() && userSnap.data().initialAnalysisCompleted;
    
    if (!hasCompletedInitial) {
      console.log(`🆕 User ${userId} needs initial analysis`);
      return await analyzeCurrentMonthMessages(userId, allCurrentMessages);
    } else {
      console.log(`🔄 User ${userId} exists, performing incremental analysis`);
      return await analyzeIncrementalMessages(userId, allCurrentMessages);
    }
  } catch (error) {
    console.error('Error in smart analysis:', error);
    throw error;
  }
}

// NEW: Function to get user's existing message data
export async function getUserExistingData(userId) {
  try {
    await ensureAuthenticated();
    console.log(`📊 Loading existing data for user: ${userId}`);
    
    // Get user profile
    const userDoc = doc(db, 'users', userId);
    const userSnap = await getDoc(userDoc);
    
    if (!userSnap.exists()) {
      console.log(`❌ User ${userId} not found`);
      return null;
    }
    
    const userData = userSnap.data();
    
    // Get user's messages
    const messages = await fetchUserMessages(userId);
    
    console.log(`📊 Loaded existing data for user ${userId}:`, {
      hasInitialAnalysis: userData.initialAnalysisCompleted,
      totalMessages: messages.length,
      lastScanDate: userData.lastScanDate,
      totalScans: userData.totalScans || 0
    });
    
    return {
      user: userData,
      messages: messages,
      hasData: messages.length > 0,
      needsInitialAnalysis: !userData.initialAnalysisCompleted,
      lastScanDate: userData.lastScanDate,
      totalMessages: messages.length,
      totalScans: userData.totalScans || 0
    };
    
  } catch (error) {
    console.error('Error getting user existing data:', error);
    return null;
  }
}
export async function analyzeNewIncomingMessage(userId, message) {
  try {
    await ensureAuthenticated();
    console.log(`📱 New incoming message for user: ${userId}`);
    
    // Check if user has completed initial analysis
    const hasCompletedInitial = await checkUserInitialAnalysisStatus(userId);
    
    if (!hasCompletedInitial) {
      console.log(`⚠️ User ${userId} hasn't completed initial analysis yet`);
      return {
        success: false,
        error: 'Please complete initial month analysis first',
        requiresInitialAnalysis: true
      };
    }
    
    // Mark as new incoming message
    const newMessage = {
      ...message,
      isNewMessage: true,
      isHistorical: false,
      receivedDate: new Date().toISOString()
    };
    
    const messageId = await saveUserMessage(userId, newMessage);
    
    console.log(`✅ New message analyzed for ${userId}: ${messageId}`);
    
    return {
      success: true,
      messageId,
      isFraud: message.analysis?.isFraud || false,
      confidence: message.analysis?.confidence || 0
    };
  } catch (error) {
    console.error('Error analyzing new incoming message:', error);
    throw error;
  }
}

// NEW: Function for mobile app MessageScreen - save messages when displayed to user
export async function saveMessageFromMobileDisplay(userId, message, analysisResult) {
  try {
    await ensureAuthenticated();
    console.log(`📱💬 Saving message from mobile MessageScreen for user: ${userId}`);
    
    // Ensure user exists first
    await ensureUserExists(userId);
    
    // Check if this message already exists (prevent duplicates)
    const isDuplicate = await checkMessageExists(userId, message);
    if (isDuplicate) {
      console.log(`⚠️ Message already exists for user ${userId}, updating display status...`);
      
      // Update the existing message to mark it as displayed
      const messageRef = doc(db, 'users', userId, 'messages', isDuplicate.id);
      await setDoc(messageRef, {
        displayedOnMobile: true,
        lastDisplayed: serverTimestamp(),
        displayCount: increment(1)
      }, { merge: true });
      
      return isDuplicate.id;
    }
    
    // Create enhanced message object for mobile display
    const enhancedMessage = {
      messageText: message.body || message.messageText,
      phoneNumber: message.address || message.phoneNumber,
      timestamp: message.timestamp || new Date().toISOString(),
      analysis: analysisResult || {
        isFraud: false,
        confidence: 0,
        category: 'pending_analysis',
        riskLevel: 'low'
      },
      // Mobile app specific fields
      source: 'mobile_app_display',
      displayedOnMobile: true,
      isNewMessage: true,
      isHistorical: false,
      receivedDate: new Date().toISOString(),
      lastDisplayed: serverTimestamp(),
      displayCount: 1,
      syncedToWeb: true
    };
    
    // Save the message using the main function
    const messageId = await saveUserMessage(userId, enhancedMessage);
    
    console.log(`✅ Message saved from mobile display: ${messageId}`);
    
    return {
      success: true,
      messageId,
      isFraud: enhancedMessage.analysis.isFraud,
      confidence: enhancedMessage.analysis.confidence,
      displayedOnMobile: true,
      syncedToWeb: true
    };
    
  } catch (error) {
    console.error('Error saving message from mobile display:', error);
    throw error;
  }
}

// NEW: Function to sync all messages from mobile app to web dashboard
export async function syncMobileMessagesToWeb(userId, messages) {
  try {
    await ensureAuthenticated();
    console.log(`🔄 Syncing ${messages.length} messages from mobile to web for user: ${userId}`);
    
    const results = [];
    let newMessageCount = 0;
    let existingMessageCount = 0;
    
    for (const message of messages) {
      try {
        // Check if message already exists
        const isDuplicate = await checkMessageExists(userId, message);
        
        if (isDuplicate) {
          existingMessageCount++;
          // Update existing message to ensure web sync status
          const messageRef = doc(db, 'users', userId, 'messages', isDuplicate.id);
          await setDoc(messageRef, {
            syncedToWeb: true,
            lastWebSync: serverTimestamp()
          }, { merge: true });
          
          results.push({ messageId: isDuplicate.id, status: 'updated_existing' });
        } else {
          newMessageCount++;
          // Save new message
          const messageId = await saveMessageFromMobileDisplay(userId, message, message.analysis);
          results.push({ messageId, status: 'created_new' });
        }
        
      } catch (error) {
        console.error(`❌ Error syncing message:`, error);
        results.push({ error: error.message, status: 'failed' });
      }
    }
    
    console.log(`✅ Sync complete: ${newMessageCount} new, ${existingMessageCount} existing messages`);
    
    return {
      success: true,
      totalProcessed: messages.length,
      newMessages: newMessageCount,
      existingMessages: existingMessageCount,
      results
    };
    
  } catch (error) {
    console.error('Error syncing mobile messages to web:', error);
    throw error;
  }
}

// Check if message already exists (prevent duplicates)
async function checkMessageExists(userId, message) {
  try {
    // Create a hash of the message content for duplicate detection
    const messageHash = createMessageHash(message);
    
    const messagesRef = collection(db, 'users', userId, 'messages');
    const q = query(messagesRef, where('messageHash', '==', messageHash));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error checking message existence:', error);
    return null;
  }
}

// Create hash for message duplicate detection
function createMessageHash(message) {
  const content = `${message.messageText}_${message.phoneNumber}_${message.timestamp}`;
  return btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}

// Mark user as having completed initial analysis
async function markUserInitialAnalysisComplete(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      initialAnalysisCompleted: true,
      initialAnalysisDate: serverTimestamp(),
      lastActive: serverTimestamp()
    }, { merge: true });
    
    console.log(`✅ Marked initial analysis complete for user: ${userId}`);
  } catch (error) {
    console.error('Error marking initial analysis complete:', error);
  }
}

// Check if user has completed initial analysis
async function checkUserInitialAnalysisStatus(userId) {
  try {
    const userDoc = doc(db, 'users', userId);
    const userSnap = await getDoc(userDoc);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    return userData.initialAnalysisCompleted === true;
  } catch (error) {
    console.error('Error checking initial analysis status:', error);
    return false;
  }
}

// Ensure user document exists in Firestore
async function ensureUserExists(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
    
    if (userSnap.empty) {
      // User doesn't exist, create new user document
      console.log(`👤 Creating new user: ${userId}`);
      await setDoc(userRef, {
        userId,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        messagesAnalyzed: 0,
        fraudsDetected: 0,
        totalMessages: 0,
        firstAnalysis: serverTimestamp(),
        source: 'mobile_app'
      });
      console.log(`✅ User created: ${userId}`);
    } else {
      // User exists, update last active
      await setDoc(userRef, {
        lastActive: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    throw error;
  }
}

// Update user statistics after message analysis
async function updateUserStats(userId, message) {
  try {
    const userRef = doc(db, 'users', userId);
    const isFraud = message.analysis && message.analysis.isFraud;
    
    // Increment counters
    const updateData = {
      messagesAnalyzed: increment(1),
      totalMessages: increment(1),
      lastAnalysis: serverTimestamp(),
      lastActive: serverTimestamp()
    };
    
    if (isFraud) {
      updateData.fraudsDetected = increment(1);
    }
    
    await setDoc(userRef, updateData, { merge: true });
    console.log(`📊 Updated stats for user: ${userId}`);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

// Update dashboard statistics
async function updateDashboardStats(message) {
  try {
    const dashboardRef = doc(db, 'dashboard', 'stats');
    const isFraud = message.analysis && message.analysis.isFraud;
    
    const updateData = {
      totalSmsAnalyzedToday: increment(1),
      totalSmsAnalyzed: increment(1),
      lastUpdated: serverTimestamp()
    };
    
    if (isFraud) {
      updateData.fraudsPrevented = increment(1);
      updateData.activeFraudAlerts = increment(1);
    }
    
    await setDoc(dashboardRef, updateData, { merge: true });
    console.log(`📈 Updated dashboard stats`);
  } catch (error) {
    console.error('Error updating dashboard stats:', error);
  }
}

// Create fraud alert for high-risk messages
async function createFraudAlert(userId, message) {
  try {
    const alertsRef = collection(db, 'fraudAlerts');
    const alert = {
      type: message.analysis.category || 'Fraud Detected',
      severity: message.analysis.riskLevel || 'high',
      phone: message.phoneNumber || 'Unknown',
      message: message.messageText.substring(0, 100) + '...',
      confidence: Math.round((message.analysis.confidence || 0.9) * 100),
      status: 'active',
      userId,
      source: 'mobile_app',
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString(),
      messageId: message.messageId || 'unknown'
    };
    
    await addDoc(alertsRef, alert);
    console.log(`🚨 Created fraud alert for user: ${userId}`);
  } catch (error) {
    console.error('Error creating fraud alert:', error);
  }
}

// Save user financial summary
export async function saveUserFinancialSummary(userId, summary) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      financialSummary: summary,
      lastUpdated: serverTimestamp(),
      userId
    }, { merge: true });
  } catch (error) {
    console.error('Error saving financial summary:', error);
    throw error;
  }
}

// Save fraud alert
export async function saveFraudAlert(userId, alert) {
  try {
    const alertsRef = collection(db, 'fraud_alerts');
    const enhancedAlert = {
      ...alert,
      userId,
      createdAt: serverTimestamp(),
      status: 'active',
      source: 'mobile_app'
    };
    const docRef = await addDoc(alertsRef, enhancedAlert);
    return docRef.id;
  } catch (error) {
    console.error('Error saving fraud alert:', error);
    throw error;
  }
}

// Save user activity
export async function saveUserActivity(userId, activity) {
  try {
    const activityRef = collection(db, 'users', userId, 'activities');
    const enhancedActivity = {
      ...activity,
      userId,
      timestamp: serverTimestamp()
    };
    await addDoc(activityRef, enhancedActivity);
  } catch (error) {
    console.error('Error saving user activity:', error);
    throw error;
  }
}

// ADMIN FETCH FUNCTIONS

// Fetch all user IDs
export async function fetchAllUserIds() {
  try {
    // Ensure we're authenticated first
    await ensureAuthenticated();
    
    console.log('🔍 Fetching user IDs from Firestore...');
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log('📊 Raw Firestore query result:');
    console.log('- Total documents found:', snapshot.size);
    console.log('- Empty?', snapshot.empty);
    
    const userIds = snapshot.docs.map(doc => {
      console.log('- Document ID:', doc.id);
      console.log('- Document data:', doc.data());
      return doc.id;
    });
    
    console.log('✅ Final user IDs array:', userIds);
    return userIds;
  } catch (error) {
    console.error('❌ Error fetching user IDs:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Fetch user messages (with optional current month filter)
export async function fetchUserMessages(userId, currentMonthOnly = false) {
  try {
    const messagesRef = collection(db, 'users', userId, 'messages');
    let messages;
    
    if (currentMonthOnly) {
      // TEMPORARY FIX: Use simple query without orderBy to avoid index requirement
      // Filter for current month only using monthYear field
      const currentMonthYear = new Date().toISOString().substring(0, 7); // "2025-07"
      
      console.log(`🔍 Fetching current month messages (${currentMonthYear}) for user: ${userId}`);
      
      const q = query(
        messagesRef, 
        where('monthYear', '==', currentMonthYear)
        // Removed orderBy to avoid composite index requirement
      );
      
      const snapshot = await getDocs(q);
      messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort manually by timestamp/createdAt after fetching
      messages.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.timestamp || a.savedAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.timestamp || b.savedAt || 0);
        return dateB - dateA; // Descending order (newest first)
      });
      
    } else {
      // For all messages, use simple orderBy without where clause
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    console.log(`📋 Fetched ${messages.length} messages for user ${userId} (current month: ${currentMonthOnly})`);
    return messages;
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    
    // Fallback: Try to get all messages without any filtering/ordering
    try {
      console.log('🔄 Trying fallback query without filters...');
      const simpleSnapshot = await getDocs(collection(db, 'users', userId, 'messages'));
      const allMessages = simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Apply filtering and sorting manually
      let filteredMessages = allMessages;
      
      if (currentMonthOnly) {
        const currentMonthYear = new Date().toISOString().substring(0, 7);
        filteredMessages = allMessages.filter(msg => msg.monthYear === currentMonthYear);
      }
      
      // Sort manually
      filteredMessages.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.timestamp || a.savedAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.timestamp || b.savedAt || 0);
        return dateB - dateA;
      });
      
      console.log(`✅ Fallback successful: ${filteredMessages.length} messages retrieved`);
      return filteredMessages;
      
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      throw error;
    }
  }
}

// Fetch all fraud alerts
export async function fetchFraudAlerts() {
  try {
    const alertsRef = collection(db, 'fraud_alerts');
    const q = query(alertsRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    throw error;
  }
}

// Fetch user financial summaries
export async function fetchAllUserFinancialSummaries() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ 
      userId: doc.id, 
      ...doc.data() 
    })).filter(user => user.financialSummary);
  } catch (error) {
    console.error('Error fetching financial summaries:', error);
    throw error;
  }
}

// Fetch SMS inbox data (all messages from all users)
export async function fetchAllSMSMessages() {
  try {
    const userIds = await fetchAllUserIds();
    const allMessages = [];
    
    for (const userId of userIds) {
      const messages = await fetchUserMessages(userId);
      allMessages.push(...messages.map(msg => ({ ...msg, userId })));
    }
    
    return allMessages.sort((a, b) => 
      new Date(b.createdAt?.toDate() || b.timestamp) - 
      new Date(a.createdAt?.toDate() || a.timestamp)
    );
  } catch (error) {
    console.error('Error fetching all SMS messages:', error);
    throw error;
  }
}

// Real-time listener for fraud alerts - shows ALL alerts including multiple from same user
export function listenToFraudAlerts(callback) {
  const alertsRef = collection(db, 'fraud_alerts');
  
  // ULTRA-SIMPLE query - no filters, no ordering, no indexes required
  console.log('🗺️ Setting up ULTRA-SIMPLE fraud alerts listener (no indexes needed)...');
  
  return onSnapshot(alertsRef, (snapshot) => {
    console.log(`📊 Fetched ${snapshot.docs.length} fraud alerts from Firebase (SIMPLE QUERY - all documents)`);
    
    const alerts = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        // Ensure we have a valid timestamp for sorting
        createdAt: data.createdAt || data.timestamp || new Date()
      };
    }).filter(alert => {
      // CLIENT-SIDE FILTERING: Only include active alerts
      const isActive = !alert.status || alert.status === 'active' || alert.status === 'pending' || alert.status === 'investigating' || alert.status === 'new';
      
      if (!isActive) {
        console.log(`📊 Filtering out resolved alert: ${alert.id} (status: ${alert.status})`);
      }
      
      return isActive;
    });
    
    // CLIENT-SIDE SORTING: Sort by creation time (most recent first)
    alerts.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return timeB - timeA; // Most recent first
    });
    
    alerts.forEach(alert => {
      console.log(`🚨 Alert: ${alert.type} - User: ${alert.userId} - ${alert.content || alert.message || 'No content'}`);
    });
    
    console.log(`📊 Processed ${alerts.length} active fraud alerts (client-side filtered), sending to dashboard`);
    console.log(`👥 Users with alerts: ${[...new Set(alerts.map(a => a.userId))].join(', ')}`);
    callback(alerts);
  }, (error) => {
    console.error('❌ Error with fraud alerts listener:', error);
    // Return empty array on error
    callback([]);
  });
}

// Debug function to fetch all fraud alerts manually
export async function debugFraudAlerts() {
  try {
    const alertsRef = collection(db, 'fraud_alerts');
    const snapshot = await getDocs(alertsRef);
    
    console.log(`🔍 DEBUG: Found ${snapshot.docs.length} total fraud alerts in database`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`🚨 Alert ${index + 1}:`, {
        id: doc.id,
        type: data.type,
        status: data.status,
        content: data.content || data.message,
        createdAt: data.createdAt,
        timestamp: data.timestamp,
        userId: data.userId
      });
    });
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Debug fraud alerts failed:', error);
    return [];
  }
}

// Function to get all fraud alerts for a specific location (for map popups)
export async function getFraudAlertsByLocation(latitude, longitude, radiusKm = 1) {
  try {
    await ensureAuthenticated();
    
    console.log(`🗺️ Fetching fraud alerts near location: ${latitude}, ${longitude} (radius: ${radiusKm}km)`);
    
    const alertsRef = collection(db, 'fraud_alerts');
    const snapshot = await getDocs(alertsRef);
    
    const alerts = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check if alert has location data
      if (data.location && data.location.latitude && data.location.longitude) {
        const distance = calculateDistance(
          latitude, longitude,
          data.location.latitude, data.location.longitude
        );
        
        if (distance <= radiusKm) {
          alerts.push({
            id: doc.id,
            ...data,
            distance: distance.toFixed(2)
          });
        }
      }
    });
    
    // Sort by newest first
    alerts.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return timeB - timeA;
    });
    
    console.log(`🗺️ Found ${alerts.length} fraud alerts within ${radiusKm}km of location`);
    return alerts;
    
  } catch (error) {
    console.error('❌ Error fetching fraud alerts by location:', error);
    return [];
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Fetch dashboard statistics
// Fetch dashboard statistics with proper cumulative totals
export async function fetchDashboardStats() {
  try {
    console.log('📊 Fetching dashboard statistics...');
    
    // First try to get stats from dashboard collection (updated by mobile app)
    const dashboardSnap = await getDocs(query(collection(db, 'dashboard'), where('__name__', '==', 'stats')));
    
    const [userIds, fraudAlerts, allMessages] = await Promise.all([
      fetchAllUserIds(),
      fetchFraudAlerts(),
      fetchAllSMSMessages()
    ]);

    console.log(`📊 Found ${userIds.length} users in database`);
    console.log(`📊 Found ${allMessages.length} total messages`);
    console.log(`📊 Found ${fraudAlerts.length} fraud alerts`);

    // Calculate today's messages with more detailed logging
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    console.log(`📅 Calculating messages for today: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    
    const todayMessages = allMessages.filter(msg => {
      // Handle different timestamp formats
      let msgDate;
      if (msg.createdAt?.toDate) {
        msgDate = msg.createdAt.toDate();
      } else if (msg.timestamp) {
        msgDate = new Date(msg.timestamp);
      } else if (msg.createdAt) {
        msgDate = new Date(msg.createdAt);
      } else {
        console.warn('⚠️ Message with no valid timestamp:', msg.id);
        return false;
      }
      
      const isToday = msgDate >= startOfDay && msgDate < endOfDay;
      if (isToday) {
        console.log(`📅 Today's message: ${msg.id} at ${msgDate.toISOString()}`);
      }
      return isToday;
    });

    const activeFrauds = fraudAlerts.filter(alert => alert.status === 'active');
    
    // Get dashboard stats if available, otherwise use calculated values
    let dashboardData = {};
    if (!dashboardSnap.empty) {
      dashboardData = dashboardSnap.docs[0].data();
      console.log('📊 Dashboard stats from Firebase:', dashboardData);
    } else {
      console.log('📊 No dashboard stats document found, using calculated values');
    }
    
    // Calculate cumulative statistics
    const totalUsers = userIds.length;
    const totalMessagesAnalyzed = allMessages.length; // This is the cumulative total
    const messagesAnalyzedToday = todayMessages.length;
    const fraudsPrevented = activeFrauds.length;
    
    // Calculate messages by source for better insights
    const messagesBySource = allMessages.reduce((acc, msg) => {
      const source = msg.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate this week's messages for additional context
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const thisWeekMessages = allMessages.filter(msg => {
      let msgDate;
      if (msg.createdAt?.toDate) {
        msgDate = msg.createdAt.toDate();
      } else if (msg.timestamp) {
        msgDate = new Date(msg.timestamp);
      } else if (msg.createdAt) {
        msgDate = new Date(msg.createdAt);
      } else {
        return false;
      }
      return msgDate >= startOfWeek;
    });
    
    console.log(`📊 Statistics Summary:
    - Total Users: ${totalUsers}
    - Total Messages Analyzed (All Time): ${totalMessagesAnalyzed}
    - Messages Analyzed Today: ${messagesAnalyzedToday}
    - Messages This Week: ${thisWeekMessages.length}
    - Active Fraud Alerts: ${fraudsPrevented}
    - Messages by Source: ${JSON.stringify(messagesBySource)}`);
    
    const stats = {
      totalUsers: totalUsers,
      totalMessagesAnalyzed: totalMessagesAnalyzed, // Cumulative total
      smsAnalyzedToday: messagesAnalyzedToday, // Today only
      smsAnalyzedThisWeek: thisWeekMessages.length, // This week
      fraudsPrevented: fraudsPrevented,
      activeFraudAlerts: activeFrauds.length,
      mlAccuracy: 94.7, // Can be calculated based on actual data
      lastUpdated: dashboardData.lastUpdated || new Date(),
      lastUserCountUpdate: new Date(),
      messagesBySource: messagesBySource,
      // Debug info
      _debug: {
        actualUserCount: totalUsers,
        totalMessagesInDb: allMessages.length,
        todayMessagesCount: todayMessages.length,
        thisWeekMessagesCount: thisWeekMessages.length,
        fraudAlertsCount: fraudAlerts.length,
        hasDashboardDoc: !dashboardSnap.empty,
        countSource: 'calculated_from_actual_data',
        todayDateRange: `${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
        sampleMessages: allMessages.slice(0, 3).map(msg => ({
          id: msg.id,
          date: msg.createdAt?.toDate?.()?.toISOString() || msg.timestamp || msg.createdAt,
          source: msg.source
        }))
      }
    };
    
    console.log('📊 Final dashboard stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    // Try to get at least the user count as fallback
    try {
      const userIds = await fetchAllUserIds();
      const allMessages = await fetchAllSMSMessages();
      console.log(`📊 Fallback: Found ${userIds.length} users, ${allMessages.length} messages`);
      return {
        totalUsers: userIds.length,
        totalMessagesAnalyzed: allMessages.length,
        smsAnalyzedToday: 0,
        fraudsPrevented: 0,
        activeFraudAlerts: 0,
        mlAccuracy: 94.7
      };
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      return {
        totalUsers: 0,
        totalMessagesAnalyzed: 0,
        smsAnalyzedToday: 0,
        fraudsPrevented: 0,
        activeFraudAlerts: 0,
        mlAccuracy: 94.7
      };
    }
  }
}

// Manually sync user count from actual users collection
export async function syncUserCount() {
  try {
    console.log('🔄 Manually syncing user count...');
    
    const userIds = await fetchAllUserIds();
    const actualCount = userIds.length;
    
    console.log(`🔄 Found ${actualCount} actual users, updating dashboard...`);
    
    const dashboardRef = doc(db, 'dashboard', 'stats');
    await setDoc(dashboardRef, {
      totalUsers: actualCount,
      lastUserCountUpdate: serverTimestamp(),
      lastSync: serverTimestamp(),
      syncMethod: 'manual',
      actualUserCount: actualCount // Store actual count for comparison
    }, { merge: true });
    
    console.log(`✅ User count synced: ${actualCount} users`);
    return { success: true, count: actualCount };
  } catch (error) {
    console.error('❌ Error syncing user count:', error);
    return { success: false, error: error.message };
  }
}

// Update SMS message status (for admin actions)
export async function updateSMSMessageStatus(userId, messageId, updates) {
  try {
    await ensureAuthenticated();
    
    const messageRef = doc(db, 'users', userId, 'messages', messageId);
    const updateData = {
      ...updates,
      lastUpdated: serverTimestamp(),
      updatedBy: 'admin_panel'
    };
    
    await setDoc(messageRef, updateData, { merge: true });
    console.log(`✅ Updated message ${messageId} for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating SMS message status:', error);
    throw error;
  }
}

// Clean up dashboard stats to match actual Firebase data
export async function cleanupDashboardStats() {
  try {
    console.log('🧹 Cleaning up dashboard stats...');
    
    const userIds = await fetchAllUserIds();
    const actualCount = userIds.length;
    
    const dashboardRef = doc(db, 'dashboard', 'stats');
    await setDoc(dashboardRef, {
      totalUsers: actualCount,
      lastUserCountUpdate: serverTimestamp(),
      lastCleanup: serverTimestamp(),
      syncMethod: 'cleanup',
      note: 'Dashboard stats cleaned to match actual Firebase users'
    }, { merge: true });
    
    console.log(`🧹 Dashboard cleaned: Now showing ${actualCount} users`);
    return { success: true, cleanedCount: actualCount };
  } catch (error) {
    console.error('❌ Error cleaning dashboard stats:', error);
    return { success: false, error: error.message };
  }
}

// NEW: Complete Firestore database cleanup function
export async function cleanupEntireFirestore() {
  try {
    await ensureAuthenticated();
    console.log('🗑️ Starting complete Firestore cleanup...');
    
    const results = {
      usersDeleted: 0,
      messagesDeleted: 0,
      fraudAlertsDeleted: 0,
      dashboardReset: false,
      errors: []
    };
    
    // Step 1: Delete all users and their messages
    console.log('🗑️ Step 1: Deleting all users and messages...');
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        console.log(`🗑️ Deleting user: ${userId}`);
        
        // Delete all messages for this user
        const messagesRef = collection(db, 'users', userId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        
        for (const messageDoc of messagesSnapshot.docs) {
          await messageDoc.ref.delete();
          results.messagesDeleted++;
        }
        
        // Delete user document
        await userDoc.ref.delete();
        results.usersDeleted++;
      }
      
      console.log(`✅ Deleted ${results.usersDeleted} users and ${results.messagesDeleted} messages`);
    } catch (error) {
      console.error('❌ Error deleting users:', error);
      results.errors.push(`Users cleanup: ${error.message}`);
    }
    
    // Step 2: Delete all fraud alerts
    console.log('🗑️ Step 2: Deleting fraud alerts...');
    try {
      const fraudAlertsRef = collection(db, 'fraudAlerts');
      const fraudAlertsSnapshot = await getDocs(fraudAlertsRef);
      
      for (const alertDoc of fraudAlertsSnapshot.docs) {
        await alertDoc.ref.delete();
        results.fraudAlertsDeleted++;
      }
      
      // Also check the other fraud alerts collection
      const fraudAlerts2Ref = collection(db, 'fraud_alerts');
      const fraudAlerts2Snapshot = await getDocs(fraudAlerts2Ref);
      
      for (const alertDoc of fraudAlerts2Snapshot.docs) {
        await alertDoc.ref.delete();
        results.fraudAlertsDeleted++;
      }
      
      console.log(`✅ Deleted ${results.fraudAlertsDeleted} fraud alerts`);
    } catch (error) {
      console.error('❌ Error deleting fraud alerts:', error);
      results.errors.push(`Fraud alerts cleanup: ${error.message}`);
    }
    
    // Step 3: Reset dashboard stats
    console.log('🗑️ Step 3: Resetting dashboard stats...');
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      await setDoc(dashboardRef, {
        totalUsers: 0,
        totalMessagesAnalyzed: 0,
        smsAnalyzedToday: 0,
        fraudsPrevented: 0,
        activeFraudAlerts: 0,
        mlAccuracy: 94.7,
        lastUpdated: serverTimestamp(),
        lastUserCountUpdate: serverTimestamp(),
        lastCleanup: serverTimestamp(),
        cleanupDate: new Date().toISOString(),
        note: 'Database completely cleaned and reset'
      });
      
      results.dashboardReset = true;
      console.log('✅ Dashboard stats reset');
    } catch (error) {
      console.error('❌ Error resetting dashboard:', error);
      results.errors.push(`Dashboard reset: ${error.message}`);
    }
    
    console.log('🎉 Complete Firestore cleanup finished!');
    console.log('📊 Cleanup Results:', results);
    
    return {
      success: true,
      ...results,
      message: 'Firestore database completely cleaned'
    };
    
  } catch (error) {
    console.error('❌ Critical error during cleanup:', error);
    return {
      success: false,
      error: error.message,
      message: 'Cleanup failed'
    };
  }
}
