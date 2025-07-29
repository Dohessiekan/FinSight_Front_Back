import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, TextInput, Keyboard, SafeAreaView, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../components/Card';
import ScreenWrapper from '../components/ScreenWrapper';
import colors from '../theme/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { analyzeMessages, analyzeMessagesComprehensive, detectSpamBatch, scanMessages } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import DashboardStatsManager from '../utils/dashboardStats';
import SimpleIncrementalScanner from '../utils/SimpleIncrementalScanner';
import GlobalDuplicateDetector from '../utils/GlobalDuplicateDetector';
import MobileAlertSystem from '../utils/MobileAlertSystem';
import MobileAdminRequestManager from '../utils/MobileAdminRequestManager';
import SecurityScoreManager from '../utils/SecurityScoreManager';
import UserDataManager from '../utils/UserDataManager';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  increment
} from 'firebase/firestore';

let SmsAndroid;
if (Platform.OS === 'android') {
  try {
    SmsAndroid = require('react-native-get-sms-android');
  } catch (e) {
    SmsAndroid = null;
  }
}

// Utility function to extract financial information from SMS messages
const extractFinancialInfo = (messageText) => {
  if (!messageText) return {};
  
  const info = {};
  
  // Extract amount (various patterns)
  const amountPatterns = [
    /transaction of (\d+(?:,\d{3})*)\s*rwf/i,
    /amount.*?(\d+(?:,\d{3})*)\s*rwf/i,
    /rwf\s*(\d+(?:,\d{3})*)/i,
    /(\d+(?:,\d{3})*)\s*rwf/i
  ];
  
  for (const pattern of amountPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      info.amount = `RWF ${match[1].replace(',', '')}`;
      break;
    }
  }
  
  // Extract balance
  const balancePatterns = [
    /new balance.*?(\d+(?:,\d{3})*)\s*rwf/i,
    /balance.*?(\d+(?:,\d{3})*)\s*rwf/i,
    /your balance.*?(\d+(?:,\d{3})*)\s*rwf/i
  ];
  
  for (const pattern of balancePatterns) {
    const match = messageText.match(pattern);
    if (match) {
      info.balance = `RWF ${match[1]}`;
      break;
    }
  }
  
  // Extract transaction type
  if (messageText.toLowerCase().includes('data bundle')) {
    info.type = 'data_purchase';
  } else if (messageText.toLowerCase().includes('airtime')) {
    info.type = 'airtime_purchase';
  } else if (messageText.toLowerCase().includes('sent') || messageText.toLowerCase().includes('transfer')) {
    info.type = 'sent';
  } else if (messageText.toLowerCase().includes('received')) {
    info.type = 'received';
  } else if (messageText.toLowerCase().includes('withdrawn')) {
    info.type = 'withdrawal';
  } else {
    info.type = 'transaction';
  }
  
  // Extract transaction ID
  const transactionIdPatterns = [
    /financial transaction id.*?(\d+)/i,
    /external transaction id.*?(\d+)/i,
    /transaction id.*?(\d+)/i,
    /ref.*?([a-z0-9]+)/i
  ];
  
  for (const pattern of transactionIdPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      info.transactionId = match[1];
      break;
    }
  }
  
  // Extract date
  const datePattern = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;
  const dateMatch = messageText.match(datePattern);
  if (dateMatch) {
    info.date = dateMatch[1];
    info.parsedDate = new Date(dateMatch[1]);
  }
  
  return info;
};

// Mock API service (replace with actual SMS scanning implementation)
const scanSmsMessages = async () => {
  if (Platform.OS !== 'android' || !SmsAndroid) {
    // fallback to mock for non-android or dev - ONLY current month data
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Create dates within current month ONLY
    const day1 = new Date(currentYear, currentMonth, 1); // First day of current month
    const day5 = new Date(currentYear, currentMonth, 5);
    const day10 = new Date(currentYear, currentMonth, 10);
    const day12 = new Date(currentYear, currentMonth, 12);
    const day14 = new Date(currentYear, currentMonth, 14);
    
    return new Promise(resolve => setTimeout(() => {
      const mockMessages = [
        { 
          id: '1', 
          text: "*164*S*Y'ello, A transaction of 500 RWF by Data Bundle MTN on your MOMO account was successfully completed at 2025-07-10 07:51:49. Message from debit receiver: . Your new balance:287564 RWF. Fee was 0 RWF. Financial Transaction Id: 21621649217.*EN#", 
          date: day10.getTime().toString(),
          sender: 'MTN Mobile'
        },
        { 
          id: '2', 
          text: 'Received RWF 50,000 from John Doe on 2025-07-14 15:30:25. Ref: TXN123456. Your new balance: 337564 RWF.', 
          date: day14.getTime().toString(),
          sender: 'MTN Mobile'
        },
        { 
          id: '3', 
          text: 'Sent RWF 120,000 to Amazon on 2025-07-12 10:15:30. Ref: TXN789012. Your new balance: 217564 RWF.', 
          date: day12.getTime().toString(),
          sender: 'Bank of Kigali'
        },
        { 
          id: '4', 
          text: 'Airtime purchase of RWF 5,000 completed successfully on 2025-07-05 16:45:12. Your new balance: 282564 RWF.', 
          date: day5.getTime().toString(),
          sender: 'MTN Rwanda'
        },
        { 
          id: '5', 
          text: 'Transfer RWF 25,000 to savings account completed on 2025-07-01 09:30:00. New balance: 312564 RWF.', 
          date: day1.getTime().toString(),
          sender: 'Bank of Kigali'
        }
      ];
      
      // Enhance mock messages with extracted financial info
      const enhancedMessages = mockMessages.map(msg => {
        const financialInfo = extractFinancialInfo(msg.text);
        return {
          ...msg,
          amount: financialInfo.amount || '',
          type: financialInfo.type || 'transaction',
          balance: financialInfo.balance || '',
          transactionId: financialInfo.transactionId || '',
          timestamp: new Date(parseInt(msg.date)).toLocaleDateString()
        };
      });
      
      console.log(`📱 Mock data: ${enhancedMessages.length} messages from current month only`);
      resolve(enhancedMessages);
    }, 1500));
  }
  
  // For real Android SMS reading
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: 'SMS Permission',
      message: 'This app needs access to your SMS messages to detect fraud.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    },
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('SMS permission denied');
  }
  
  // Read SMS and filter for current month only
  return new Promise((resolve, reject) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getTime();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();
    
    console.log(`📅 Filtering SMS for current month: ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
    console.log(`📅 Date range: ${new Date(firstDayOfMonth).toLocaleDateString()} - ${new Date(lastDayOfMonth).toLocaleDateString()}`);
    
    SmsAndroid.list(
      JSON.stringify({ 
        box: 'inbox',
        minDate: firstDayOfMonth,
        maxDate: lastDayOfMonth
      }),
      fail => reject(fail),
      (count, smsList) => {
        const allMessages = JSON.parse(smsList);
        console.log(`📨 Retrieved ${allMessages.length} SMS messages from current month`);
        
        const currentMonthMessages = allMessages.filter(msg => {
          const msgDate = new Date(parseInt(msg.date));
          return msgDate.getMonth() === currentMonth && msgDate.getFullYear() === currentYear;
        }).map((msg, idx) => ({
          id: String(msg._id || idx),
          text: msg.body,
          date: msg.date,
          timestamp: new Date(parseInt(msg.date)).toLocaleString(),
          sender: msg.address,
        }));
        
        console.log(`✅ Filtered to ${currentMonthMessages.length} messages from current month`);
        resolve(currentMonthMessages);
      }
    );
  });
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [iosInput, setIosInput] = useState('');
  const [iosLoading, setIosLoading] = useState(false);
  const [iosResult, setIosResult] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState(null);

  // Cache keys for offline storage
  const MESSAGES_CACHE_KEY = `messages_${user?.uid || 'guest'}`;

  // Utility function to check if error is due to Firebase being offline
  const isFirebaseOfflineError = (error) => {
    return error?.message?.includes('client is offline') || 
           error?.code === 'unavailable';
  };

  // Cache management functions
  const saveToCache = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const loadFromCache = async (key) => {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  };

  // Enhanced Firebase functions for message management with global duplicate detection
  const saveMessageToFirebase = async (message) => {
    if (!user) {
      console.error('❌ Cannot save message: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      console.log(`💾 Attempting to save message for user: ${user.uid}`);
      console.log(`📝 Message text preview: ${message.text?.substring(0, 50)}...`);
      
      // Original user-level save function
      const saveToUserCollection = async (msg) => {
        const messagesRef = collection(db, 'users', user.uid, 'messages');
        
        // Check if message already exists in user's collection
        const existingQuery = query(
          messagesRef, 
          where('text', '==', msg.text),
          where('sender', '==', msg.sender || 'Unknown')
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (!existingSnapshot.empty) {
          console.log(`⚠️ Message already exists in user's collection, skipping: ${msg.id}`);
          return { exists: true, id: existingSnapshot.docs[0].id, success: true };
        }
        
        // Enhanced message object with all required fields
        const enhancedMessage = {
          ...msg,
          userId: user.uid,
          createdAt: serverTimestamp(),
          processed: true,
          monthYear: new Date().toISOString().substring(0, 7),
          savedAt: new Date().toISOString(),
          source: 'mobile_app',
          version: '2.0'
        };
        
        // Add new message
        const docRef = await addDoc(messagesRef, enhancedMessage);
        console.log(`✅ Successfully saved message to Firebase with ID: ${docRef.id}`);
        
        return { success: true, id: docRef.id, exists: false };
      };
      
      // Use global duplicate detection
      const result = await GlobalDuplicateDetector.saveMessageWithGlobalCheck(
        message, 
        user.uid, 
        saveToUserCollection
      );
      
      if (result.skipped) {
        console.log(`🌍 Global duplicate detected - message skipped for user ${user.uid}`);
        console.log(`👤 Original user: ${result.originalUser}`);
        return result;
      }
      
      // Update dashboard stats with comprehensive tracking
      try {
        const dashboardRef = doc(db, 'dashboard', 'stats');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Prepare the update data
        const updateData = {
          totalMessagesAnalyzed: increment(1),
          smsAnalyzedToday: increment(1),
          totalSmsAnalyzedToday: increment(1), // Match the field name in your dashboard
          smsCount: increment(1), // New field to track SMS count
          lastUpdated: serverTimestamp(),
          lastSync: serverTimestamp()
        };
        
        // Add daily tracking
        updateData[`daily_${today}.smsCount`] = increment(1);
        updateData[`daily_${today}.date`] = today;
        
        // Track fraud/suspicious messages based on message status
        if (message.status === 'fraud') {
          updateData.activeFraudAlerts = increment(1);
          updateData.fraudsPrevented = increment(1);
          updateData[`daily_${today}.fraudCount`] = increment(1);
        } else if (message.status === 'suspicious') {
          updateData[`daily_${today}.suspiciousCount`] = increment(1);
        } else if (message.status === 'safe') {
          updateData[`daily_${today}.safeCount`] = increment(1);
        }
        
        await updateDoc(dashboardRef, updateData);
        console.log('📈 Dashboard stats updated comprehensively:', updateData);
      } catch (dashboardError) {
        console.warn('⚠️ Failed to update dashboard stats:', dashboardError.message);
        console.warn('⚠️ Dashboard error details:', dashboardError);
      }
      
      // Return the result from the global duplicate detector
      return result;
      
    } catch (error) {
      console.error('❌ Critical error saving message to Firebase:', error);
      console.error('🔍 Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (isFirebaseOfflineError(error)) {
        setIsOffline(true);
        console.log('Firebase offline: Message will be cached for later sync');
        // For offline scenarios, just update local state
        const updatedMessages = [message, ...messages];
        setMessages(updatedMessages);
        await saveToCache(MESSAGES_CACHE_KEY, updatedMessages);
      }
      throw error;
    }
  };

  const updateMessageStatus = async (messageId, newStatus) => {
    if (!user) return;
    
    try {
      const messageRef = doc(db, 'users', user.uid, 'messages', messageId);
      await updateDoc(messageRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state and cache
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? { ...msg, status: newStatus } : msg
      );
      setMessages(updatedMessages);
      await saveToCache(MESSAGES_CACHE_KEY, updatedMessages);
      
    } catch (error) {
      console.error('Error updating message status:', error);
      
      if (isFirebaseOfflineError(error)) {
        setIsOffline(true);
        console.log('Firebase offline: Status update will be cached for later sync');
        // Update local state when offline
        const updatedMessages = messages.map(msg => 
          msg.id === messageId ? { ...msg, status: newStatus } : msg
        );
        setMessages(updatedMessages);
        await saveToCache(MESSAGES_CACHE_KEY, updatedMessages);
      }
    }
  };

  // Function to get existing messages from Firebase for current month
  const getExistingCurrentMonthMessages = async () => {
    if (!user) return [];
    
    try {
      const messagesRef = collection(db, 'users', user.uid, 'messages');
      const currentMonthYear = new Date().toISOString().substring(0, 7); // "2025-07"
      
      console.log(`🔍 Fetching existing messages for ${currentMonthYear}...`);
      
      // TEMPORARY FIX: Use simple query without orderBy to avoid index requirement
      const q = query(
        messagesRef,
        where('monthYear', '==', currentMonthYear)
        // Removed orderBy to avoid composite index requirement
      );
      
      const snapshot = await getDocs(q);
      let existingMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort manually by timestamp after fetching
      existingMessages.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.timestamp || a.savedAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.timestamp || b.savedAt || 0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      console.log(`📋 Found ${existingMessages.length} existing messages for current month in Firebase`);
      return existingMessages;
      
    } catch (error) {
      console.error('❌ Error fetching existing messages:', error);
      
      // Fallback: Try to get all messages and filter manually
      try {
        console.log('🔄 Trying fallback query for existing messages...');
        const simpleSnapshot = await getDocs(collection(db, 'users', user.uid, 'messages'));
        const allMessages = simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const currentMonthYear = new Date().toISOString().substring(0, 7);
        const currentMonthMessages = allMessages.filter(msg => msg.monthYear === currentMonthYear);
        
        // Sort manually
        currentMonthMessages.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.timestamp || a.savedAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.timestamp || b.savedAt || 0);
          return dateB - dateA;
        });
        
        console.log(`✅ Fallback successful: ${currentMonthMessages.length} existing messages`);
        return currentMonthMessages;
        
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        return [];
      }
    }
  };

  // Function to filter out already analyzed messages
  const filterUnanalyzedMessages = (newMessages, existingMessages) => {
    const existingSet = new Set(
      existingMessages.map(msg => `${msg.text}-${msg.sender || 'Unknown'}`)
    );
    
    const unanalyzed = newMessages.filter(msg => {
      const key = `${msg.text}-${msg.sender || 'Unknown'}`;
      return !existingSet.has(key);
    });
    
    console.log(`🔍 Found ${unanalyzed.length} new messages to analyze (${newMessages.length - unanalyzed.length} already exist)`);
    return unanalyzed;
  };

  const loadMessagesFromFirebase = async () => {
    if (!user) return;
    
    // Load cached data first
    const cachedMessages = await loadFromCache(MESSAGES_CACHE_KEY);
    if (cachedMessages && cachedMessages.length > 0) {
      setMessages(cachedMessages);
    }
    
    try {
      const messagesRef = collection(db, 'users', user.uid, 'messages');
      const currentMonthYear = new Date().toISOString().substring(0, 7); // "2025-07"
      
      // Query for current month messages only
      const q = query(
        messagesRef, 
        where('monthYear', '==', currentMonthYear),
        orderBy('createdAt', 'desc'), 
        limit(500)
      );
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const firebaseMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`📱 Loaded ${firebaseMessages.length} current month messages from Firebase`);
        setMessages(firebaseMessages);
        setIsOffline(false);
        
        // Cache the updated messages
        await saveToCache(MESSAGES_CACHE_KEY, firebaseMessages);
      }, (error) => {
        console.error('Error in messages listener:', error);
        
        if (isFirebaseOfflineError(error)) {
          setIsOffline(true);
          console.log('Firebase offline: Using cached messages');
          // Keep using cached data when offline
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading messages:', error);
      
      if (isFirebaseOfflineError(error)) {
        setIsOffline(true);
        console.log('Firebase offline: Using cached messages');
      }
    }
  };

  useEffect(() => {
    // Initialize dashboard stats and enable Firebase listener to load existing messages
    if (user) {
      let unsubscribe;
      
      const setupMessagesListener = async () => {
        try {
          // Initialize dashboard stats when user loads
          await DashboardStatsManager.initializeDashboardStats();
          await DashboardStatsManager.updateUserCount(user.uid);
          console.log('📊 Dashboard initialized for user:', user.uid);
        } catch (error) {
          console.warn('⚠️ Dashboard initialization failed:', error);
        }
        
        // Setup message listener
        unsubscribe = await loadMessagesFromFirebase();
      };
      
      setupMessagesListener();
      
      return () => unsubscribe && unsubscribe();
    }
  }, [user]);
  
  // Calculate statistics
  const totalMessages = messages.length;
  const verifiedCount = messages.filter(m => m.status === 'safe').length;
  const suspiciousCount = messages.filter(m => m.status === 'suspicious').length;
  const fraudCount = messages.filter(m => m.status === 'fraud').length;
  
  const filteredMessages = activeFilter === 'all' 
    ? messages 
    : messages.filter(msg => msg.status === activeFilter);
  
  const handleScanPress = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to scan messages');
      return;
    }

    setLoading(true);
    try {
      const currentDate = new Date();
      const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      console.log(`🔍 Starting incremental SMS scan for ${currentMonthName}...`);
      
      // Step 1: Get existing messages from Firebase for current month
      const existingMessages = await getExistingCurrentMonthMessages();
      
      // Step 2: Get ALL messages from device and filter for new ones only
      const allMessages = await scanSmsMessages();
      console.log(`� Found ${allMessages.length} total SMS messages on device`);
      
      // Use incremental scanning to get only new messages since last scan
      let scanResult;
      try {
        scanResult = await SimpleIncrementalScanner.filterNewMessages(user.uid, allMessages || []);
      } catch (scanError) {
        console.error('❌ Incremental scan failed:', scanError);
        Alert.alert('Scan Error', 'Failed to perform incremental scan. Please try again.');
        setLoading(false);
        return;
      }
      
      const newMessages = (scanResult && scanResult.messagesToAnalyze) ? scanResult.messagesToAnalyze : [];
      console.log(`🆕 ${scanResult ? scanResult.summary : 'Scan failed'}`);
      
      if (newMessages.length === 0) {
        // Show existing messages from Firebase
        setMessages(existingMessages);
        setScanComplete(true);
        setLoading(false);
        
        Alert.alert(
          'No New Messages', 
          `No new SMS messages found since last scan.\n\nShowing ${existingMessages.length} existing analyzed messages.`
        );
        return;
      }
      
      // Step 3: Filter new messages for transaction messages
      const transactionKeywords = [
        // Transaction types
        'sent', 'received', 'withdrawn', 'bought airtime', 'buy airtime', 
        'payment', 'paid', 'deposit', 'credited', 'debited', 'transfer',
        'transaction', 'purchase', 'completed',
        
        // Currency and amounts
        'rwf', 'frw', 'amount', 'balance', 'new balance', 'fee',
        
        // Mobile money terms
        'momo', 'mobile money', 'data bundle', 'airtime',
        
        // Transaction references
        'ref:', 'transaction id', 'external transaction id', 'financial transaction id',
        
        // Service providers
        'mtn', 'airtel', 'tigo', 'bank', 'equity', 'cogebanque', 'ecobank',
        
        // MTN specific patterns
        "y'ello", 'momo account', 'successfully completed',
        
        // Transaction indicators
        '164*s*', 'message from debit', 'message from credit'
      ];
      
      const transactionMessages = newMessages.filter(m => {
        if (!m.text) return false;
        
        const textLower = m.text.toLowerCase();
        
        // Check for keywords
        const hasKeywords = transactionKeywords.some(keyword => 
          textLower.includes(keyword.toLowerCase())
        );
        
        // Check for amount patterns (numbers followed by RWF)
        const hasAmountPattern = /\d+(?:,\d{3})*\s*rwf/i.test(m.text) ||
                                /rwf\s*\d+(?:,\d{3})*/i.test(m.text);
        
        // Check for balance patterns
        const hasBalancePattern = /balance.*?\d+.*?rwf/i.test(m.text) ||
                                 /new balance.*?\d+/i.test(m.text);
        
        // Check for transaction ID patterns
        const hasTransactionId = /transaction id.*?\d+/i.test(m.text) ||
                                /ref.*?[a-z0-9]+/i.test(m.text);
        
        return hasKeywords || hasAmountPattern || hasBalancePattern || hasTransactionId;
      });
      
      console.log(`💰 Found ${transactionMessages.length} new transaction messages to analyze`);
      
      // Step 4: Since these are truly new messages, we can skip filtering against existing
      // (the incremental scanner already ensures we only get new messages)
      const newTransactionMessages = transactionMessages;
      
      if (newTransactionMessages.length === 0) {
        // Show existing messages from Firebase
        setMessages(existingMessages);
        
        // Mark scan as complete even when no new transaction messages found
        await SimpleIncrementalScanner.completeScan(user.uid, 0);
        console.log('✅ Incremental scan completed - no new transaction messages');
        
        setScanComplete(true);
        setLoading(false);
        
        Alert.alert(
          'No New Transaction Messages', 
          `Found ${newMessages.length} new messages, but none are transaction-related.\n\nShowing ${existingMessages.length} existing analyzed messages.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log(`🔍 Analyzing ${newTransactionMessages.length} new messages...`);
      
      // Step 5: Extract message texts and send to predict-spam endpoint
      const messageTexts = newTransactionMessages.map(m => m.text).filter(text => text && text.trim());
      console.log('🔍 Sending new messages to spam detection API...');
      
      try {
        // Send new messages to predict-spam endpoint
        const spamAnalysisResult = await scanMessages(messageTexts);
        console.log('🛡️ Spam analysis result:', spamAnalysisResult);
        
        // Step 6: Process results and update message status
        const analyzedNewMessages = newTransactionMessages.map((message, index) => {
          let status = 'safe';
          let analysis = '✅ Message appears legitimate';
          let confidence = 0;
          let resultData = null;
          
          // Handle both single result and array of results
          if (Array.isArray(spamAnalysisResult)) {
            resultData = spamAnalysisResult[index];
          } else {
            // Single result for all messages
            resultData = spamAnalysisResult;
          }
          
          // Process the result data with proper null checks
          if (resultData) {
            confidence = resultData.confidence || 0;
            const label = resultData.label || 'unknown';
            
            if (label === 'spam' || label === 'fraud') {
              status = confidence > 0.8 ? 'fraud' : 'suspicious';
              analysis = `🚨 ${label.toUpperCase()} detected (${Math.round(confidence * 100)}% confidence)`;
            } else if (label === 'error' || label === 'no_data') {
              status = 'unknown';
              analysis = `❓ Analysis inconclusive (${label})`;
            } else {
              analysis = `✅ Legitimate (${Math.round(confidence * 100)}% confidence)`;
            }
          } else {
            status = 'unknown';
            analysis = '❓ Analysis failed - no result data';
          }
          
          // Extract financial information from the message
          const financialInfo = extractFinancialInfo(message.text);
          
          return {
            ...message,
            status,
            analysis,
            spamData: {
              confidence: confidence || 0,
              label: resultData?.label || 'unknown',
              probabilities: resultData?.probabilities || { unknown: 1.0 }
            },
            // Enhanced with extracted financial info
            amount: financialInfo.amount || message.amount || '',
            type: financialInfo.type || message.type || 'transaction',
            balance: financialInfo.balance || '',
            transactionId: financialInfo.transactionId || '',
            extractedDate: financialInfo.date || '',
            timestamp: message.timestamp || new Date().toLocaleString(),
            processed: true
          };
        });
        
        // Step 7: Save new analyzed messages to Firebase
        console.log('💾 Saving new analyzed messages to Firebase...');
        let savedCount = 0;
        let errorCount = 0;
        
        for (const message of analyzedNewMessages) {
          try {
            const result = await saveMessageToFirebase(message);
            if (!result.exists) {
              savedCount++;
              console.log(`✅ Saved new message ${message.id} to Firebase`);
            }
          } catch (error) {
            errorCount++;
            console.error(`❌ Failed to save message ${message.id}:`, error);
          }
        }
        
        // Step 8: Calculate statistics for the analyzed messages
        const newSafeCount = analyzedNewMessages.filter(m => m.status === 'safe').length;
        const newSuspiciousCount = analyzedNewMessages.filter(m => m.status === 'suspicious').length;
        const newSpamCount = analyzedNewMessages.filter(m => m.status === 'fraud').length;
        
        // Step 9: Update comprehensive dashboard stats for the scan session
        try {
          await DashboardStatsManager.updateSmsStats(
            savedCount,      // total messages
            newSpamCount,    // fraud count
            newSuspiciousCount, // suspicious count
            newSafeCount     // safe count
          );
          console.log(`📈 Dashboard session stats updated via manager: ${savedCount} messages processed, ${newSpamCount} fraud detected`);
        } catch (dashboardError) {
          console.warn('⚠️ Failed to update dashboard session stats via manager:', dashboardError.message);
          
          // Fallback to direct update
          try {
            const dashboardRef = doc(db, 'dashboard', 'stats');
            const today = new Date().toISOString().split('T')[0];
            
            const sessionUpdateData = {
              totalMessagesAnalyzed: increment(savedCount),
              smsAnalyzedToday: increment(savedCount),
              totalSmsAnalyzedToday: increment(savedCount),
              smsCount: increment(savedCount),
              activeFraudAlerts: increment(newSpamCount),
              fraudsPrevented: increment(newSpamCount),
              lastUpdated: serverTimestamp(),
              lastSync: serverTimestamp(),
              syncMethod: 'mobile_scan_fallback',
              [`daily_${today}.smsCount`]: increment(savedCount),
              [`daily_${today}.fraudCount`]: increment(newSpamCount),
              [`daily_${today}.suspiciousCount`]: increment(newSuspiciousCount),
              [`daily_${today}.safeCount`]: increment(newSafeCount),
              [`daily_${today}.date`]: today
            };
            
            await updateDoc(dashboardRef, sessionUpdateData);
            console.log(`📈 Dashboard session stats updated via fallback: ${savedCount} messages processed`);
          } catch (fallbackError) {
            console.error('❌ Both dashboard update methods failed:', fallbackError);
          }
        }

        // Step 9: Create fraud alerts for suspicious/fraud messages
        try {
          console.log('🚨 Processing scan results for fraud alerts...');
          const alertResult = await MobileAlertSystem.processScanResults(analyzedNewMessages, user.uid);
          
          if (alertResult.success) {
            console.log(`✅ Alert processing complete: ${alertResult.alertsCreated} alerts created`);
            
            // Create scan summary alert if there were threats detected
            if (newSpamCount > 0 || newSuspiciousCount > 0) {
              const scanSummary = {
                totalAnalyzed: analyzedNewMessages.length,
                fraudCount: newSpamCount,
                suspiciousCount: newSuspiciousCount,
                safeCount: newSafeCount,
                duration: 'Real-time scan'
              };
              
              await MobileAlertSystem.createScanSummaryAlert(scanSummary, user.uid);
              console.log('📊 Scan summary alert created');
            }
          } else {
            console.error('❌ Failed to process alerts:', alertResult.error);
          }
        } catch (alertError) {
          console.error('❌ Alert creation failed:', alertError);
          // Don't fail the entire scan if alerts fail
        }

        // Step 10: Combine new and existing messages for display
        const allCurrentMonthMessages = [...analyzedNewMessages, ...existingMessages]
          .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
        
        console.log('📱 Displaying all current month messages in UI...');
        setMessages(allCurrentMonthMessages);
        
        // Mark scan as complete in incremental scanner
        await SimpleIncrementalScanner.completeScan(user.uid, analyzedNewMessages.length);
        console.log('✅ Incremental scan timestamp updated');
        
        // Step 10.5: Update security score based on analysis results
        try {
          console.log('🔒 Updating security score after SMS analysis...');
          const analysisResults = {
            totalAnalyzed: analyzedNewMessages.length,
            fraudCount: newSpamCount,
            suspiciousCount: newSuspiciousCount,
            safeCount: newSafeCount
          };
          
          await SecurityScoreManager.updateScoreAfterAnalysis(user.uid, analysisResults);
          console.log('✅ Security score updated successfully');
        } catch (scoreError) {
          console.error('❌ Failed to update security score:', scoreError);
          // Don't fail the entire scan if security score update fails
        }
        
        // Step 10.6: Update user data after scan completion
        try {
          console.log('👤 Updating user data after scan completion...');
          await UserDataManager.updateUserDataAfterEvent(user.uid, {
            type: 'sms_scan',
            messagesAnalyzed: analyzedNewMessages.length,
            totalMessages: allCurrentMonthMessages.length,
            fraudCount: newSpamCount,
            suspiciousCount: newSuspiciousCount,
            safeCount: newSafeCount,
            scanTimestamp: new Date().toISOString(),
            monthScanned: currentMonthName
          });
          console.log('✅ User data updated successfully after scan');
        } catch (userDataError) {
          console.error('❌ Failed to update user data:', userDataError);
          // Don't fail the entire scan if user data update fails
        }
        
        setScanComplete(true);
        
        // Step 11: Show analysis summary
        const totalCount = allCurrentMonthMessages.length;
        const totalSafe = allCurrentMonthMessages.filter(m => m.status === 'safe').length;
        const totalSuspicious = allCurrentMonthMessages.filter(m => m.status === 'suspicious').length;
        const totalFraud = allCurrentMonthMessages.filter(m => m.status === 'fraud').length;
        
        console.log(`📊 New Analysis: ${newSafeCount} safe, ${newSuspiciousCount} suspicious, ${newSpamCount} fraud`);
        console.log(`📊 Total for ${currentMonthName}: ${totalSafe} safe, ${totalSuspicious} suspicious, ${totalFraud} fraud`);
        
        Alert.alert(
          'Incremental Analysis Complete', 
          `✅ Analyzed ${analyzedNewMessages.length} NEW transaction messages:\n• ${newSafeCount} Safe\n• ${newSuspiciousCount} Suspicious\n• ${newSpamCount} Fraud\n\n📊 Total displayed: ${totalCount} messages\n• ${totalSafe} Safe\n• ${totalSuspicious} Suspicious\n• ${totalFraud} Fraud\n\n🔄 Next scan will only analyze messages newer than this scan.`,
          [{ text: 'OK' }]
        );
        
      } catch (apiError) {
        console.error('❌ API analysis failed:', apiError);
        
        // Fallback: Save new messages with unknown status and combine with existing
        const fallbackNewMessages = newTransactionMessages.map(message => ({
          ...message,
          status: 'unknown',
          analysis: 'Analysis unavailable - API error. Manual review needed.',
          timestamp: message.timestamp || new Date().toLocaleString(),
          processed: false
        }));
        
        console.log('💾 Saving new fallback messages to Firebase...');
        
        for (const message of fallbackNewMessages) {
          try {
            await saveMessageToFirebase(message);
            console.log(`✅ Saved fallback message ${message.id} to Firebase`);
          } catch (error) {
            console.error(`❌ Failed to save fallback message ${message.id}:`, error);
          }
        }
        
        // Combine with existing messages
        const allMessages = [...fallbackNewMessages, ...existingMessages]
          .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
        
        setMessages(allMessages);
        
        // Mark scan as complete in incremental scanner even for fallback
        await SimpleIncrementalScanner.completeScan(user.uid, fallbackNewMessages.length);
        console.log('✅ Incremental scan timestamp updated (fallback)');
        
        setScanComplete(true);
        
        Alert.alert(
          'Analysis Failed', 
          `❌ Could not analyze ${newTransactionMessages.length} new messages due to API error.\n\nShowing ${allMessages.length} total messages (${existingMessages.length} previously analyzed + ${newTransactionMessages.length} new for manual review).`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Scan failed:', error);
      Alert.alert('Scan Failed', `SMS scan failed: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };
  
  // Add handler for manual message analysis
  const handleManualAnalysis = async () => {
    if (!manualInput.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to analyze');
      return;
    }
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to analyze messages');
      return;
    }

    // Ask user for GPS permission BEFORE analysis starts
    const useGPS = await new Promise((resolve) => {
      Alert.alert(
        'GPS Location for Fraud Mapping',
        'Would you like to use GPS location for fraud mapping?\n\n' +
        '🎯 GPS ENABLED: Ultra-high precision GPS will be used automatically for street-level accuracy\n' +
        '❌ NO GPS: Fraud analysis without location tracking',
        [
          { text: 'No GPS', onPress: () => resolve(false) },
          { text: 'Use GPS', onPress: () => resolve(true) }
        ]
      );
    });

    let realLocation = null;
    
    // If user agreed to GPS, get ultra-high precision location BEFORE analysis
    if (useGPS) {
      console.log('🎯 User agreed to GPS - starting ULTRA-HIGH PRECISION GPS...');
      
      Alert.alert(
        'Getting Ultra-High Precision GPS',
        'Acquiring street-level GPS accuracy...\n\n' +
        'This may take 30-60 seconds for optimal precision.\n\n' +
        'For best results:\n' +
        '• Go outdoors or near a window\n' +
        '• Keep device still during scanning\n\n' +
        'Analysis will start after GPS is ready.',
        [{ text: 'OK' }]
      );

      try {
        // Import LocationService for ultra-high precision GPS
        const { LocationService } = await import('../services/LocationService');
        console.log('🎯 Starting ULTRA-HIGH PRECISION GPS for street-level accuracy...');
        
        const gpsResult = await LocationService.getUltraHighPrecisionGPS((progress, accuracy, phase) => {
          console.log(`📡 GPS Progress: ${progress} (Phase: ${phase || 'Unknown'})`);
          if (accuracy) {
            console.log(`📍 Current accuracy: ±${accuracy.toFixed(1)}m`);
          }
        });
        
        if (gpsResult.success) {
          realLocation = {
            latitude: gpsResult.location.latitude,
            longitude: gpsResult.location.longitude,
            accuracy: gpsResult.location.accuracy,
            isRealGPS: true,
            source: 'ULTRA_HIGH_PRECISION_GPS',
            address: `Manual Input - Ultra Precision GPS (±${gpsResult.location.accuracy.toFixed(1)}m)`,
            city: 'Rwanda',
            canSeeStreets: gpsResult.location.canSeeStreets,
            canSeeBuildings: gpsResult.location.canSeeBuildings,
            precisionLevel: gpsResult.location.accuracyLevel
          };
          
          console.log(`🏆 Got ULTRA-HIGH PRECISION GPS: ${realLocation.latitude}, ${realLocation.longitude} (±${realLocation.accuracy.toFixed(1)}m)`);
          
          if (realLocation.canSeeBuildings) {
            console.log('🏢 STREET-LEVEL ACCURACY: You can see individual buildings!');
            Alert.alert(
              'Street-Level GPS Ready!', 
              `Location accuracy: ±${realLocation.accuracy.toFixed(1)}m\n\n` +
              'You can now see individual buildings and streets on the security map!\n\n' +
              'Starting fraud analysis...'
            );
          } else if (realLocation.canSeeStreets) {
            console.log('�️ HIGH PRECISION: You can see streets and landmarks!');
            Alert.alert(
              'High Precision GPS Ready!', 
              `Location accuracy: ±${realLocation.accuracy.toFixed(1)}m\n\n` +
              'You can see streets and major landmarks on the security map!\n\n' +
              'Starting fraud analysis...'
            );
          } else {
            Alert.alert(
              'GPS Ready!', 
              `Location accuracy: ±${realLocation.accuracy.toFixed(1)}m\n\n` +
              'Starting fraud analysis...'
            );
          }
        } else {
          console.log('❌ Ultra-high precision GPS failed');
          Alert.alert(
            'GPS Issue', 
            (gpsResult.fallbackMessage || 'Ultra-high precision GPS failed.') + '\n\nContinuing with fraud analysis...'
          );
        }
        
      } catch (gpsError) {
        console.error('❌ GPS error before analysis:', gpsError);
        Alert.alert(
          'GPS Error', 
          'GPS location failed. Continuing with fraud analysis without location.'
        );
      }
    } else {
      console.log('📍 User declined GPS - fraud analysis will proceed without location');
    }

    setManualLoading(true);
    setManualResult(null);
    try {
      console.log('�🔍 Analyzing manual message with spam detection...');
      
      // Use the predict-spam endpoint for analysis
      const spamResult = await scanMessages([manualInput]);
      console.log('🛡️ Manual spam analysis result:', spamResult);
      
      let status = 'safe';
      let analysis = '✅ Message appears legitimate';
      let confidence = spamResult?.confidence || 0;
      let label = spamResult?.label || 'unknown';
      
      if (label === 'spam' || label === 'fraud') {
        status = confidence > 0.8 ? 'fraud' : 'suspicious';
        analysis = `🚨 ${label.toUpperCase()} detected (${Math.round(confidence * 100)}% confidence)`;
      } else if (label === 'error' || label === 'no_data') {
        status = 'unknown';
        analysis = `❓ Analysis inconclusive (${label})`;
      } else {
        analysis = `✅ Legitimate (${Math.round(confidence * 100)}% confidence)`;
      }
      
      const analyzedMessage = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now().toString(36)}`,
        text: manualInput,
        status,
        analysis,
        spamData: {
          confidence: confidence || 0,
          label: label || 'unknown',
          probabilities: spamResult?.probabilities || { unknown: 1.0 }
        },
        timestamp: new Date().toLocaleString(),
        sender: 'Manual Input',
        type: 'manual',
        processed: true
      };
      
      // Save the analyzed message to Firebase and display in UI
      try {
        await saveMessageToFirebase(analyzedMessage);
        console.log('✅ Saved manual message to Firebase');
      } catch (error) {
        console.error('❌ Failed to save manual message:', error);
      }

      // Create fraud alert if fraud or suspicious message detected (for map display)
      if (status === 'fraud' || status === 'suspicious') {
        try {
          console.log('🚨 Creating fraud alert for manual analysis result...');
          
          let realLocation = null;
          if (locationChoice !== 'none') {
            console.log(`📍 User selected: ${locationChoice} GPS precision`);
            
            try {
              // Import LocationService for real GPS (FIXED PATH)
              const { LocationService } = await import('../services/LocationService');
              
              if (locationChoice === 'ultra') {
                console.log('🎯 Starting ULTRA-HIGH PRECISION GPS for street-level accuracy...');
                
                // Show progress alert for ultra-high precision
                Alert.alert(
                  'High Precision GPS',
                  'Getting street-level GPS accuracy...\n\nThis may take 30-60 seconds for optimal precision.\n\nFor best results:\n• Go outdoors or near a window\n• Keep device still during scanning',
                  [{ text: 'OK' }]
                );
                
                const gpsResult = await LocationService.getUltraHighPrecisionGPS((progress, accuracy) => {
                  console.log(`📡 GPS Progress: ${progress}`);
                  if (accuracy) {
                    console.log(`📍 Current accuracy: ±${accuracy.toFixed(1)}m`);
                  }
                });
                
                if (gpsResult.success) {
                  realLocation = {
                    latitude: gpsResult.location.latitude,
                    longitude: gpsResult.location.longitude,
                    accuracy: gpsResult.location.accuracy,
                    isRealGPS: true,
                    source: 'ULTRA_HIGH_PRECISION_GPS',
                    address: `Manual Input - Ultra Precision GPS (±${gpsResult.location.accuracy.toFixed(1)}m)`,
                    city: 'Rwanda',
                    canSeeStreets: gpsResult.location.canSeeStreets,
                    canSeeBuildings: gpsResult.location.canSeeBuildings,
                    precisionLevel: gpsResult.location.accuracyLevel
                  };
                  
                  console.log(`🏆 Got ULTRA-HIGH PRECISION GPS: ${realLocation.latitude}, ${realLocation.longitude} (±${realLocation.accuracy.toFixed(1)}m)`);
                  
                  if (realLocation.canSeeBuildings) {
                    console.log('🏢 STREET-LEVEL ACCURACY: You can see individual buildings!');
                    Alert.alert('Street-Level GPS Achieved!', `Location accuracy: ±${realLocation.accuracy.toFixed(1)}m\n\nYou can now see individual buildings and streets on the security map!`);
                  } else if (realLocation.canSeeStreets) {
                    console.log('�️ HIGH PRECISION: You can see streets and landmarks!');
                    Alert.alert('High Precision GPS Achieved!', `Location accuracy: ±${realLocation.accuracy.toFixed(1)}m\n\nYou can see streets and major landmarks on the security map!`);
                  }
                } else {
                  console.log('❌ Ultra-high precision GPS failed, falling back to standard GPS');
                  Alert.alert('GPS Issue', gpsResult.fallbackMessage || 'High precision GPS failed. Using standard GPS instead.');
                }
              }
              
              // If ultra-precision failed or user chose standard, use standard GPS
              if (!realLocation && locationChoice === 'standard') {
                console.log('📍 Using standard high-accuracy GPS...');
                const gpsResult = await LocationService.getGPSLocation();
                
                if (gpsResult.success && gpsResult.location.isGPSAccurate) {
                  realLocation = {
                    latitude: gpsResult.location.latitude,
                    longitude: gpsResult.location.longitude,
                    accuracy: gpsResult.location.accuracy,
                    isRealGPS: true,
                    source: 'GPS_SATELLITE',
                    address: `Manual Input - Standard GPS (±${gpsResult.location.accuracy.toFixed(1)}m)`,
                    city: 'Rwanda',
                    precisionLevel: gpsResult.location.accuracyLevel
                  };
                  console.log(`✅ Got STANDARD GPS: ${realLocation.latitude}, ${realLocation.longitude} (±${realLocation.accuracy.toFixed(1)}m)`);
                } else if (gpsResult.success) {
                  // GPS was obtained but accuracy is low - still mark as real GPS attempt
                  realLocation = {
                    latitude: gpsResult.location.latitude,
                    longitude: gpsResult.location.longitude,
                    accuracy: gpsResult.location.accuracy,
                    isRealGPS: true,
                    source: 'GPS_LOW_ACCURACY',
                    address: `Manual Input - GPS Low Accuracy (±${gpsResult.location.accuracy.toFixed(1)}m)`,
                    city: 'Rwanda',
                    precisionLevel: 'LOW_ACCURACY'
                  };
                  console.log(`⚠️ Got low-accuracy GPS: ${realLocation.latitude}, ${realLocation.longitude} (±${realLocation.accuracy.toFixed(1)}m)`);
                }
              }
              
              if (!realLocation) {
                console.log('❌ All GPS requests failed, manual analysis will use default location (will not appear on map)');
                Alert.alert('GPS Failed', 'Could not get GPS location. The fraud alert will not appear on the map.\n\nTry moving outdoors or near a window for better GPS reception.');
              }
              
            } catch (gpsError) {
              console.error('❌ GPS error for manual analysis:', gpsError);
              console.log('⚠️ Manual analysis will use default location (will not appear on map)');
              Alert.alert('GPS Error', 'GPS location failed. The fraud alert will not appear on the map.');
            }
          } else {
            console.log('📍 User declined location sharing - fraud alert will not appear on map');
          }
          
          const alertResult = await MobileAlertSystem.createFraudAlert(
            analyzedMessage, 
            user.uid, 
            { confidence, label, category: 'Manual Analysis' },
            realLocation  // Pass real GPS location
          );
          
          if (alertResult.success) {
            console.log(`✅ Fraud alert created for manual analysis: ${alertResult.alertId}`);
            if (realLocation) {
              console.log(`🗺️ Manual fraud alert will appear on map with REAL GPS coordinates`);
            }
          } else {
            console.warn('⚠️ Failed to create fraud alert for manual analysis:', alertResult.error);
          }
        } catch (alertError) {
          console.error('❌ Error creating fraud alert for manual analysis:', alertError);
          // Don't fail the analysis if alert creation fails
        }
      }
      
      setMessages(prevMessages => [analyzedMessage, ...prevMessages]);
      setManualResult(analyzedMessage);
      setManualInput(''); // Clear input after successful analysis
      setShowManualInput(false); // Hide input section
      
    } catch (e) {
      console.error('❌ Manual analysis failed:', e);
      const fallbackResult = { 
        id: `manual-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now().toString(36)}`,
        text: manualInput,
        status: 'unknown', 
        analysis: 'Analysis failed - API error. Manual review needed.',
        timestamp: new Date().toLocaleString(),
        sender: 'Manual Input',
        type: 'manual',
        processed: false
      };
      // Save fallback result to Firebase and display in UI
      try {
        await saveMessageToFirebase(fallbackResult);
        console.log('✅ Saved manual fallback message to Firebase');
      } catch (error) {
        console.error('❌ Failed to save manual fallback message:', error);
      }
      
      // Even for fallback results, try to create fraud alert if user requested manual analysis
      // (assumption is user suspects fraud if using manual analysis)
      try {
        console.log('🚨 Creating fraud alert for manual analysis fallback (user suspected fraud)...');
        const alertResult = await MobileAlertSystem.createFraudAlert(
          { ...fallbackResult, status: 'suspicious' }, // Mark as suspicious since API failed but user manually checked
          user.uid, 
          { confidence: 0.5, label: 'suspicious', category: 'Manual Analysis - API Failed' }
        );
        
        if (alertResult.success) {
          console.log(`✅ Fraud alert created for manual analysis fallback: ${alertResult.alertId}`);
        }
      } catch (alertError) {
        console.warn('⚠️ Could not create fraud alert for manual analysis fallback:', alertError);
      }
      
      setMessages(prevMessages => [fallbackResult, ...prevMessages]);
      setManualResult(fallbackResult);
      Alert.alert('Analysis Failed', 'Could not analyze the message. Please try again.');
    } finally {
      setManualLoading(false);
      Keyboard.dismiss();
    }
  };
  
  // Add handler for iOS paste/scan
  const handleIosScan = async () => {
    if (!iosInput.trim()) return;
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to analyze messages');
      return;
    }

    setIosLoading(true);
    setIosResult(null);
    try {
      console.log('🔍 Analyzing pasted message with spam detection...');
      
      // Use the predict-spam endpoint for analysis
      const spamResult = await scanMessages([iosInput]);
      console.log('🛡️ Spam analysis result:', spamResult);
      
      let status = 'safe';
      let analysis = '✅ Message appears legitimate';
      let confidence = spamResult?.confidence || 0;
      let label = spamResult?.label || 'unknown';
      
      if (label === 'spam' || label === 'fraud') {
        status = confidence > 0.8 ? 'fraud' : 'suspicious';
        analysis = `🚨 ${label.toUpperCase()} detected (${Math.round(confidence * 100)}% confidence)`;
      } else if (label === 'error' || label === 'no_data') {
        status = 'unknown';
        analysis = `❓ Analysis inconclusive (${label})`;
      } else {
        analysis = `✅ Legitimate (${Math.round(confidence * 100)}% confidence)`;
      }
      
      const analyzedMessage = {
        id: 'ios-' + Date.now(),
        text: iosInput,
        status,
        analysis,
        spamData: {
          confidence: confidence || 0,
          label: label || 'unknown',
          probabilities: spamResult?.probabilities || { unknown: 1.0 }
        },
        timestamp: new Date().toLocaleString(),
        sender: 'Manual Input',
        type: 'manual',
        processed: true
      };
      
      // Save the analyzed message to Firebase and display in UI
      try {
        await saveMessageToFirebase(analyzedMessage);
        console.log('✅ Saved iOS manual message to Firebase');
      } catch (error) {
        console.error('❌ Failed to save iOS manual message:', error);
      }
      
      setMessages(prevMessages => [analyzedMessage, ...prevMessages]);
      setIosResult(analyzedMessage);
      setIosInput(''); // Clear input after successful analysis
      
    } catch (e) {
      console.error('❌ iOS analysis failed:', e);
      const fallbackResult = { 
        id: 'ios-' + Date.now(),
        text: iosInput,
        status: 'unknown', 
        analysis: 'Analysis failed - API error. Manual review needed.',
        timestamp: new Date().toLocaleString(),
        sender: 'Manual Input',
        type: 'manual',
        processed: false
      };
      // Save fallback result to Firebase and display in UI
      try {
        await saveMessageToFirebase(fallbackResult);
        console.log('✅ Saved iOS fallback message to Firebase');
      } catch (error) {
        console.error('❌ Failed to save iOS fallback message:', error);
      }
      
      setMessages(prevMessages => [fallbackResult, ...prevMessages]);
      setIosResult(fallbackResult);
    } finally {
      setIosLoading(false);
      Keyboard.dismiss();
    }
  };
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'safe': 
        return <Ionicons name="shield-checkmark" size={20} color={colors.success} />;
      case 'suspicious': 
        return <Ionicons name="warning" size={20} color={colors.warning} />;
      case 'fraud': 
        return <Ionicons name="alert-circle" size={20} color={colors.danger} />;
      default: 
        return <Ionicons name="document-text" size={20} color={colors.textSecondary} />;
    }
  };
  
  const getStatusText = (status) => {
    switch(status) {
      case 'safe': return 'Verified Transaction';
      case 'suspicious': return 'Suspicious Activity';
      case 'fraud': return 'Fraud Detected';
      default: return 'Message';
    }
  };
  
  const getTypeIcon = (type) => {
    switch(type) {
      case 'received': 
        return <MaterialCommunityIcons name="arrow-bottom-left" size={20} color={colors.success} />;
      case 'sent': 
        return <MaterialCommunityIcons name="arrow-top-right" size={20} color={colors.primary} />;
      case 'alert': 
        return <Ionicons name="notifications" size={20} color={colors.warning} />;
      default: 
        return <Ionicons name="document-text" size={20} color={colors.textSecondary} />;
    }
  };
  
  // Handler for requesting admin review of fraud message
  const handleRequestAdminReview = async (message) => {
    try {
      Alert.alert(
        'Request Admin Review',
        'Do you believe this message was incorrectly classified as fraud?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Request Review',
            onPress: async () => {
              try {
                setLoading(true);
                const result = await MobileAdminRequestManager.requestFraudReview(
                  message.id,
                  message,
                  user.uid,
                  'User believes message is legitimate and not fraud'
                );
                
                if (result.success) {
                  Alert.alert(
                    'Review Requested',
                    'Your request has been sent to administrators. You will be notified of their decision.',
                    [{ text: 'OK' }]
                  );
                  
                  // Update message locally to show it's under review
                  const updatedMessages = messages.map(msg => 
                    msg.id === message.id 
                      ? { ...msg, reviewStatus: 'pending_review' }
                      : msg
                  );
                  setMessages(updatedMessages);
                  
                } else {
                  Alert.alert('Error', result.error || 'Failed to send review request');
                }
              } catch (error) {
                console.error('Failed to request review:', error);
                Alert.alert('Error', 'Failed to send review request. Please try again.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in review request handler:', error);
    }
  };
  
  // Handler for blocking a fraud message
  const handleBlockMessage = async (message) => {
    try {
      Alert.alert(
        'Block Message',
        'This will block the message and sender. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                const result = await MobileAdminRequestManager.blockMessage(
                  message.id,
                  message,
                  user.uid
                );
                
                if (result.success) {
                  Alert.alert(
                    'Message Blocked',
                    'The message has been blocked and administrators have been notified.',
                    [{ text: 'OK' }]
                  );
                  
                  // Update message locally to show it's blocked
                  const updatedMessages = messages.map(msg => 
                    msg.id === message.id 
                      ? { ...msg, status: 'blocked' }
                      : msg
                  );
                  setMessages(updatedMessages);
                  
                } else {
                  Alert.alert('Error', result.error || 'Failed to block message');
                }
              } catch (error) {
                console.error('Failed to block message:', error);
                Alert.alert('Error', 'Failed to block message. Please try again.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in block message handler:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <ScreenWrapper>
        {/* Standardized Header */}
        <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Messages</Text>
          <Text style={styles.subtitle}>SMS fraud detection & monitoring</Text>
          <Text style={styles.currentMonthInfo}>
            Scan analyzes current month: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.scanButtonContainer}>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={handleScanPress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons name="scan" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
            <Text style={styles.scanButtonLabel}>Scan Month</Text>
          </View>
          
          {/* Manual Analysis Button */}
          <View style={styles.manualButtonContainer}>
            <TouchableOpacity 
              style={styles.manualButton}
              onPress={() => setShowManualInput(!showManualInput)}
              disabled={loading}
            >
              <Ionicons 
                name={showManualInput ? "close" : "document-text"} 
                size={20} 
                color={colors.white} 
              />
            </TouchableOpacity>
            <Text style={styles.manualButtonLabel}>Manual</Text>
          </View>
        </View>
      </View>
      
      {/* Offline Indicator */}
      {isOffline && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color={colors.warning} />
          <Text style={styles.offlineText}>
            Using cached data - Some features may be limited
          </Text>
        </View>
      )}
      
      {/* Manual Message Input Section */}
      {showManualInput && (
        <View style={styles.manualInputContainer}>
          <View style={styles.manualInputHeader}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
            <Text style={styles.manualInputTitle}>Manual Message Analysis</Text>
          </View>
          <Text style={styles.manualInputSubtitle}>
            Paste or type any SMS message below to analyze it for fraud detection
          </Text>
          <TextInput
            style={styles.manualTextInput}
            placeholder="Paste your SMS message here..."
            value={manualInput}
            onChangeText={setManualInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={styles.manualInputActions}>
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setManualInput('');
                setManualResult(null);
              }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.analyzeButton} 
              onPress={handleManualAnalysis} 
              disabled={manualLoading || !manualInput.trim()}
            >
              {manualLoading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.analyzeButtonText}>Analyze Message</Text>
              )}
            </TouchableOpacity>
          </View>
          {manualResult && (
            <View style={[
              styles.manualResultCard,
              manualResult.status === 'fraud' && styles.fraudResultCard,
              manualResult.status === 'suspicious' && styles.suspiciousResultCard,
              manualResult.status === 'safe' && styles.safeResultCard
            ]}>
              <View style={styles.manualResultHeader}>
                {getStatusIcon(manualResult.status)}
                <Text style={[
                  styles.manualResultStatus,
                  manualResult.status === 'safe' && { color: colors.success },
                  manualResult.status === 'suspicious' && { color: colors.warning },
                  manualResult.status === 'fraud' && { color: colors.danger }
                ]}>
                  {manualResult.status.charAt(0).toUpperCase() + manualResult.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.manualResultText}>{manualResult.analysis}</Text>
              <Text style={styles.manualResultNote}>
                ✅ Message saved to your SMS analysis list
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalMessages}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{suspiciousCount}</Text>
          <Text style={styles.statLabel}>Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.danger }]}>{fraudCount}</Text>
          <Text style={styles.statLabel}>Fraud</Text>
        </View>
      </View>
      
      {/* Scan Status */}
      {scanComplete && (
        <View style={styles.scanStatus}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.scanStatusText}>
            Current month scan completed: {new Date().toLocaleTimeString()}
          </Text>
        </View>
      )}
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]} numberOfLines={1}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'safe' && styles.activeFilter]}
          onPress={() => setActiveFilter('safe')}
        >
          <Ionicons name="shield-checkmark" size={14} color={activeFilter === 'safe' ? colors.white : colors.success} />
          <Text style={[styles.filterText, activeFilter === 'safe' && styles.activeFilterText]} numberOfLines={1}>Safe</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'suspicious' && styles.activeFilter]}
          onPress={() => setActiveFilter('suspicious')}
        >
          <Ionicons name="warning" size={14} color={activeFilter === 'suspicious' ? colors.white : colors.warning} />
          <Text style={[styles.filterText, activeFilter === 'suspicious' && styles.activeFilterText]} numberOfLines={1}>Alert</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'fraud' && styles.activeFilter]}
          onPress={() => setActiveFilter('fraud')}
        >
          <Ionicons name="alert-circle" size={14} color={activeFilter === 'fraud' ? colors.white : colors.danger} />
          <Text style={[styles.filterText, activeFilter === 'fraud' && styles.activeFilterText]} numberOfLines={1}>Fraud</Text>
        </TouchableOpacity>
      </View>
      
      {/* Analysis Results */}
      <FlatList
        data={filteredMessages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={[
            styles.card,
            item.status === 'safe' && styles.safeCard,
            item.status === 'suspicious' && styles.suspiciousCard,
            item.status === 'fraud' && styles.fraudCard
          ]}>
            {/* Compact Header */}
            <View style={styles.messageHeader}>
              <View style={styles.statusInfo}>
                {getStatusIcon(item.status)}
                <Text style={[
                  styles.statusText,
                  item.status === 'safe' && { color: colors.success },
                  item.status === 'suspicious' && { color: colors.warning },
                  item.status === 'fraud' && { color: colors.danger }
                ]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>

            {/* Message Content */}
            <View style={styles.messageBody}>
              <View style={styles.senderRow}>
                <Text style={styles.senderName}>{item.sender || 'Unknown'}</Text>
                {item.amount && (
                  <View style={[
                    styles.amountBadge,
                    item.type === 'received' && styles.receivedBadge,
                    item.type === 'sent' && styles.sentBadge
                  ]}>
                    {getTypeIcon(item.type)}
                    <Text style={[
                      styles.amountText,
                      item.type === 'received' && { color: colors.success },
                      item.type === 'sent' && { color: colors.primary }
                    ]}>
                      {item.amount}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.messageText} numberOfLines={2}>
                {item.text}
              </Text>
              
              {/* Only show analysis for suspicious/fraud messages */}
              {item.status !== 'safe' && (
                <Text style={styles.analysisText} numberOfLines={1}>
                  {item.analysis || 'No analysis available'}
                </Text>
              )}
              
              {/* Fraud Review Buttons - Only show for fraud messages */}
              {item.status === 'fraud' && (
                <View style={styles.fraudActionButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.actionButton, 
                      styles.reviewButton,
                      item.reviewStatus === 'pending_review' && { opacity: 0.5 }
                    ]}
                    onPress={() => handleRequestAdminReview(item)}
                    disabled={item.reviewStatus === 'pending_review'}
                  >
                    <Ionicons 
                      name={item.reviewStatus === 'pending_review' ? "hourglass" : "eye"} 
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={styles.actionButtonText}>
                      {item.reviewStatus === 'pending_review' ? 'Review Pending' : 'Request Review'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.actionButton, 
                      styles.blockButton,
                      item.status === 'blocked' && { opacity: 0.5 }
                    ]}
                    onPress={() => handleBlockMessage(item)}
                    disabled={item.status === 'blocked'}
                  >
                    <Ionicons 
                      name={item.status === 'blocked' ? "checkmark-circle" : "ban"} 
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={styles.actionButtonText}>
                      {item.status === 'blocked' ? 'Blocked' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield-checkmark" size={60} color={colors.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>
              {loading 
                ? 'Scanning Current Month Messages' 
                : scanComplete 
                  ? 'No messages match filter' 
                  : 'Ready to scan SMS'
              }
            </Text>
            <Text style={styles.emptyText}>
              {loading 
                ? `Analyzing messages from ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}...`
                : scanComplete 
                  ? 'Try changing your filter settings' 
                  : 'Scan your messages to detect fraud attempts'
              }
            </Text>
            {loading && (
              <ActivityIndicator 
                size="large" 
                color={colors.primary} 
                style={{ marginTop: 16 }} 
              />
            )}
          </View>
        }
      />
      
      {/* iOS Paste SMS Section */}
      {Platform.OS === 'ios' && (
        <View style={styles.iosPasteContainer}>
          <Text style={styles.iosPasteTitle}>Paste SMS for Analysis</Text>
          <TextInput
            style={styles.iosPasteInput}
            placeholder="Paste your SMS message here"
            value={iosInput}
            onChangeText={setIosInput}
            multiline
          />
          <TouchableOpacity style={styles.iosPasteButton} onPress={handleIosScan} disabled={iosLoading}>
            {iosLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.iosPasteButtonText}>Analyze</Text>}
          </TouchableOpacity>
          {iosResult && (
            <Card style={[styles.iosResultCard, iosResult.status === 'fraud' && styles.fraudCard, iosResult.status === 'suspicious' && styles.suspiciousCard]}> 
              <Text style={styles.iosResultText}>{iosResult.analysis}</Text>
            </Card>
          )}
        </View>
      )}
      </ScreenWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Add status bar padding for Android
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  currentMonthInfo: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  scanButtonContainer: {
    alignItems: 'center',
    gap: 4,
  },
  scanButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonLabel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  manualButtonContainer: {
    alignItems: 'center',
    gap: 4,
  },
  manualButton: {
    backgroundColor: colors.secondary || '#6c757d',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.secondary || '#6c757d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  manualButtonLabel: {
    fontSize: 10,
    color: colors.secondary || '#6c757d',
    fontWeight: '600',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    paddingHorizontal: 24,
  },
  scanStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg || '#FFF3CD',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    color: colors.warning,
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    marginHorizontal: 24,
    gap: 6,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  activeFilter: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    numberOfLines: 1,
  },
  activeFilterText: {
    color: colors.white,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  safeCard: {
    backgroundColor: colors.success + '05',
    borderWidth: 1,
    borderColor: colors.success + '20',
  },
  suspiciousCard: {
    backgroundColor: colors.warning + '05',
    borderWidth: 1,
    borderColor: colors.warning + '20',
  },
  fraudCard: {
    backgroundColor: colors.danger + '05',
    borderWidth: 1,
    borderColor: colors.danger + '20',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messageBody: {
    gap: 8,
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  receivedBadge: {
    backgroundColor: colors.success + '20',
  },
  sentBadge: {
    backgroundColor: colors.primary + '20',
  },
  amountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  flatListContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  iosPasteContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  iosPasteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.primary,
  },
  iosPasteInput: {
    minHeight: 60,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.background,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text,
  },
  iosPasteButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  iosPasteButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  iosResultCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  iosResultText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  
  // Fraud Action Button Styles
  fraudActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  reviewButton: {
    backgroundColor: colors.primary,
  },
  blockButton: {
    backgroundColor: colors.error || '#DC3545',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Manual Input Styles
  manualInputContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  manualInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  manualInputTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  manualInputSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  manualTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.background,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  manualInputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  analyzeButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  manualResultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fraudResultCard: {
    backgroundColor: colors.danger + '05',
    borderColor: colors.danger + '20',
  },
  suspiciousResultCard: {
    backgroundColor: colors.warning + '05',
    borderColor: colors.warning + '20',
  },
  safeResultCard: {
    backgroundColor: colors.success + '05',
    borderColor: colors.success + '20',
  },
  manualResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  manualResultStatus: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualResultText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  manualResultNote: {
    fontSize: 12,
    color: colors.success,
    fontStyle: 'italic',
  },
});
