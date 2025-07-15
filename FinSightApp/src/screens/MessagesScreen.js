import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, TextInput, Keyboard, SafeAreaView, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../components/Card';
import colors from '../theme/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { analyzeMessages, analyzeMessagesComprehensive, detectSpamBatch, scanMessages } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp
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

  // Firebase functions for message management
  const saveMessageToFirebase = async (message) => {
    if (!user) return;
    
    try {
      const messagesRef = collection(db, 'users', user.uid, 'messages');
      await addDoc(messagesRef, {
        ...message,
        userId: user.uid,
        createdAt: serverTimestamp(),
        processed: true
      });
      
      // Update cache after successful save
      const updatedMessages = [message, ...messages];
      await saveToCache(MESSAGES_CACHE_KEY, updatedMessages);
      
    } catch (error) {
      console.error('Error saving message:', error);
      
      if (isFirebaseOfflineError(error)) {
        setIsOffline(true);
        console.log('Firebase offline: Message will be cached for later sync');
        // For offline scenarios, just update local state
        const updatedMessages = [message, ...messages];
        setMessages(updatedMessages);
        await saveToCache(MESSAGES_CACHE_KEY, updatedMessages);
      }
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

  const loadMessagesFromFirebase = async () => {
    if (!user) return;
    
    // Load cached data first
    const cachedMessages = await loadFromCache(MESSAGES_CACHE_KEY);
    if (cachedMessages && cachedMessages.length > 0) {
      setMessages(cachedMessages);
    }
    
    try {
      const messagesRef = collection(db, 'users', user.uid, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(100));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const firebaseMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
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
    // Disabled Firebase listener - showing results directly in UI
    // if (user) {
    //   let unsubscribe;
    //   
    //   const setupMessagesListener = async () => {
    //     unsubscribe = await loadMessagesFromFirebase();
    //   };
    //   
    //   setupMessagesListener();
    //   
    //   return () => unsubscribe && unsubscribe();
    // }
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
      
      console.log(`� Starting current month SMS scan for ${currentMonthName}...`);
      
      // Step 1: Get ONLY current month messages from device
      const currentMonthMessages = await scanSmsMessages();
      console.log(`📅 Found ${currentMonthMessages.length} SMS messages from ${currentMonthName}`);
      
      if (currentMonthMessages.length === 0) {
        Alert.alert(
          'No Current Month Messages', 
          `No SMS messages found for ${currentMonthName}. Make sure you have SMS messages in the current month.`
        );
        setScanComplete(true);
        setLoading(false);
        return;
      }
      
      // Step 2: Filter for transaction messages (already current month)
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
      
      const transactionMessages = currentMonthMessages.filter(m => {
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
      
      console.log(`💰 Found ${transactionMessages.length} transaction messages from ${currentMonthName}`);
      
      if (transactionMessages.length === 0) {
        Alert.alert(
          'No Transaction Messages', 
          `No financial transaction messages found for ${currentMonthName}. The scan analyzes only transaction-related SMS.`
        );
        setScanComplete(true);
        setLoading(false);
        return;
      }
      
      // Step 3: Extract message texts and send to predict-spam endpoint
      const messageTexts = transactionMessages.map(m => m.text).filter(text => text && text.trim());
      console.log('🔍 Sending messages to spam detection API...');
      
      try {
        // Send all messages to predict-spam endpoint
        const spamAnalysisResult = await scanMessages(messageTexts);
        console.log('🛡️ Spam analysis result:', spamAnalysisResult);
        
        // Step 4: Process results and update message status
        const analyzedMessages = transactionMessages.map((message, index) => {
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
        
        // Step 5: Display analyzed messages directly in UI (no Firebase save)
        console.log('� Displaying analyzed messages in UI...');
        setMessages(analyzedMessages);
        setScanComplete(true);
        
        // Step 6: Show analysis summary
        const spamCount = analyzedMessages.filter(m => m.status === 'fraud').length;
        const suspiciousCount = analyzedMessages.filter(m => m.status === 'suspicious').length;
        const safeCount = analyzedMessages.filter(m => m.status === 'safe').length;
        
        console.log(`📊 Analysis Summary: ${safeCount} safe, ${suspiciousCount} suspicious, ${spamCount} fraud`);
        
        Alert.alert(
          'Current Month Analysis Complete', 
          `✅ Analyzed ${analyzedMessages.length} transaction messages from ${currentMonthName}:\n\n• ${safeCount} Safe transactions\n• ${suspiciousCount} Suspicious messages\n• ${spamCount} Fraud/spam detected`,
          [{ text: 'OK' }]
        );
        
      } catch (apiError) {
        console.error('❌ API analysis failed:', apiError);
        
        // Fallback: Show messages with unknown status (no Firebase save)
        const fallbackMessages = transactionMessages.map(message => ({
          ...message,
          status: 'unknown',
          analysis: 'Analysis unavailable - API error. Manual review needed.',
          timestamp: message.timestamp || new Date().toLocaleString(),
          processed: false
        }));
        
        setMessages(fallbackMessages);
        setScanComplete(true);
        
        Alert.alert(
          'Analysis Failed', 
          `❌ Could not analyze ${currentMonthName} transaction messages due to API error.\n\n${transactionMessages.length} messages displayed for manual review.`,
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
      
      // Display the analyzed message directly in UI (no Firebase save)
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
      // Display fallback result directly in UI (no Firebase save)
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* Standardized Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Messages</Text>
          <Text style={styles.subtitle}>SMS fraud detection & monitoring</Text>
          <Text style={styles.currentMonthInfo}>
            Scan analyzes current month: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  flatListContent: {
    paddingBottom: 20,
  },
});