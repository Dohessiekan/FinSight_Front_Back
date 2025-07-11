import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, TextInput, Keyboard, SafeAreaView, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../components/Card';
import colors from '../theme/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { analyzeMessages, analyzeMessagesComprehensive, detectSpamBatch } from '../utils/api';
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

// Mock API service (replace with actual SMS scanning implementation)
const scanSmsMessages = async () => {
  if (Platform.OS !== 'android' || !SmsAndroid) {
    // fallback to mock for non-android or dev
    return new Promise(resolve => setTimeout(() => resolve([
      { 
        id: '1', 
        text: 'Received RWF 50,000 from John Doe. Ref: TXN123456', 
        status: 'safe', 
        timestamp: '2 hours ago',
        amount: 'RWF 50,000',
        type: 'received',
        sender: 'MTN Mobile',
        analysis: 'Verified transaction from known contact'
      },
      { 
        id: '2', 
        text: 'URGENT: Your account will be suspended. Click here to verify: scam.link', 
        status: 'fraud', 
        timestamp: '1 hour ago',
        amount: '',
        type: 'alert',
        sender: 'Unknown',
        analysis: 'Phishing attempt - contains suspicious link'
      },
      { 
        id: '3', 
        text: 'Sent RWF 120,000 to Amazon. Ref: TXN789012', 
        status: 'safe', 
        timestamp: 'Yesterday',
        amount: 'RWF 120,000',
        type: 'sent',
        sender: 'Bank of Kigali',
        analysis: 'Recipient verified through official channels'
      },
      { 
        id: '4', 
        text: 'You won RWF 5,000,000! Claim your prize: prize.fake', 
        status: 'suspicious', 
        timestamp: 'May 15',
        amount: '',
        type: 'alert',
        sender: 'Contest',
        analysis: 'Unverified lottery notification - high fraud probability'
      },
    ]), 1500));
  }
  // Request permission
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
  // Read SMS
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox' }),
      fail => reject(fail),
      (count, smsList) => {
        const messages = JSON.parse(smsList).map((msg, idx) => ({
          id: String(msg._id || idx),
          text: msg.body,
          status: 'safe', // TODO: Call your model API to analyze
          timestamp: new Date(msg.date).toLocaleString(),
          amount: '',
          type: 'received',
          sender: msg.address,
          analysis: 'Not analyzed',
        }));
        resolve(messages);
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
    if (user) {
      let unsubscribe;
      
      const setupMessagesListener = async () => {
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
      const scannedMessages = await scanSmsMessages();
      // Only keep messages that look like transactions (sent/received/withdrawn/airtime)
      const transactionKeywords = [
        'sent', 'received', 'withdrawn', 'bought airtime', 'buy airtime', 'payment', 'paid', 'deposit', 'credited', 'debited', 'transfer'
      ];
      const transactionMessages = scannedMessages.filter(m =>
        transactionKeywords.some(keyword => m.text && m.text.toLowerCase().includes(keyword))
      );
      
      // Analyze messages with comprehensive API (financial + spam detection)
      try {
        console.log('🔍 Analyzing messages with unified API...');
        
        // Use comprehensive analysis API for both financial and spam detection
        const messageTexts = transactionMessages.map(m => m.text);
        const comprehensiveResult = await analyzeMessagesComprehensive(messageTexts, user?.uid);
        
        if (comprehensiveResult.success) {
          console.log('✅ Comprehensive analysis successful');
          
          // Process results from comprehensive analysis
          const analyzedMessages = transactionMessages.map((message, index) => {
            const spamResult = comprehensiveResult.data.spam_analysis.results.find(r => r.message_index === index);
            const financialData = comprehensiveResult.data.financial_summary;
            
            // Determine status based on spam detection
            let status = 'safe';
            if (spamResult?.prediction.is_spam) {
              status = spamResult.prediction.confidence > 0.8 ? 'fraud' : 'suspicious';
            }
            
            return {
              ...message,
              status,
              analysis: spamResult 
                ? `${spamResult.prediction.is_spam ? '🚨 SPAM detected' : '✅ Legitimate'} (${Math.round(spamResult.prediction.confidence * 100)}% confidence)`
                : 'Analysis completed',
              spamData: spamResult?.prediction,
              financialData: financialData
            };
          });
          
          // Save analyzed messages to Firebase
          for (const message of analyzedMessages) {
            await saveMessageToFirebase(message);
          }
          
          // Update dashboard with financial summary
          console.log('💰 Financial Summary:', comprehensiveResult.data.financial_summary);
          console.log('🛡️ Spam Analysis:', comprehensiveResult.data.spam_analysis);
          
        } else {
          console.log('⚠️ Comprehensive analysis failed, falling back to individual analysis');
          
          // Fallback to individual message analysis
          const analyzedMessages = await analyzeMessages(transactionMessages);
          
          // Save analyzed messages to Firebase
          for (const message of analyzedMessages) {
            await saveMessageToFirebase(message);
          }
        }
        
        setScanComplete(true);
      } catch (apiError) {
        console.log('API analysis failed, using basic analysis:', apiError);
        
        // Save unanalyzed messages to Firebase as fallback
        for (const message of transactionMessages) {
          await saveMessageToFirebase({
            ...message,
            status: 'unknown',
            analysis: 'Analysis unavailable - manual review needed'
          });
        }
        
        setScanComplete(true);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Failed', 'SMS scan failed. Please try again.');
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
      const analyzed = await analyzeMessages([{ id: 'ios', text: iosInput }]);
      const analyzedMessage = analyzed[0];
      
      // Save the analyzed message to Firebase
      await saveMessageToFirebase(analyzedMessage);
      
      setIosResult(analyzedMessage);
    } catch (e) {
      const fallbackResult = { status: 'suspicious', analysis: 'API error' };
      await saveMessageToFirebase({ id: 'ios', text: iosInput, ...fallbackResult });
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
        </View>
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
          <Text style={styles.scanStatusText}>Last scan: {new Date().toLocaleTimeString()}</Text>
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
              {scanComplete ? 'No messages match filter' : 'Ready to scan SMS'}
            </Text>
            <Text style={styles.emptyText}>
              {scanComplete 
                ? 'Try changing your filter settings' 
                : 'Scan your messages to detect fraud attempts'
              }
            </Text>
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