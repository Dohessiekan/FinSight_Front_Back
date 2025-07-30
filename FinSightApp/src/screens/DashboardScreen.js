import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Card from '../components/Card';
import ScreenWrapper from '../components/ScreenWrapper';
import colors from '../theme/colors';
import { getSmsSummary, analyzeMessages, getFinancialSummary } from '../utils/api';
import { saveUserFinancialSummary, saveFraudAlert, createOrUpdateUserProfile } from '../utils/firebaseMessages';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import AlertsListenerTest from '../utils/AlertsListenerTest';
import SecurityScoreManager from '../utils/SecurityScoreManager';
import UserDataManager from '../utils/UserDataManager';
import FirebaseErrorHandler from '../utils/FirebaseErrorHandler';
import NotificationManager from '../utils/NotificationManager';
import SMSMonitor from '../utils/SMSMonitor';
import NotificationPanel from '../components/NotificationPanel';
import SMSService from '../services/SMSService';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [fraudScore, setFraudScore] = useState(15);
  const [loading, setLoading] = useState(false);
  const [apiSummary, setApiSummary] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [userFinancialData, setUserFinancialData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineError, setOfflineError] = useState(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [securityScoreData, setSecurityScoreData] = useState(null);
  const [securityScoreLoading, setSecurityScoreLoading] = useState(false);
  
  // Firebase error handling state
  const [firebaseError, setFirebaseError] = useState(null);
  const [alertsListenerActive, setAlertsListenerActive] = useState(false);
  const [securityScoreListenerActive, setSecurityScoreListenerActive] = useState(false);
  
  // User data state
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [isFirstConnection, setIsFirstConnection] = useState(false);
  const [cacheStatus, setCacheStatus] = useState({ cached: false, fresh: false });
  
  // Notification state
  const [pendingSMSCount, setPendingSMSCount] = useState(0);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [totalNotificationCount, setTotalNotificationCount] = useState(0);

  // Keys for AsyncStorage
  const CACHE_KEYS = {
    FINANCIAL_DATA: `financial_data_${user?.uid}`,
    TRANSACTIONS: `transactions_${user?.uid}`,
    LAST_SYNC: `last_sync_${user?.uid}`,
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

  const isFirebaseOfflineError = (error) => {
    return error?.code === 'unavailable' || 
           error?.message?.includes('offline') ||
           error?.message?.includes('Failed to get document because the client is offline');
  };

  // Firebase functions
  const saveTransactionToFirebase = async (transaction) => {
    if (!user) return;
    
    try {
      const transactionRef = doc(collection(db, 'users', user.uid, 'transactions'));
      await setDoc(transactionRef, {
        ...transaction,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
      
      if (isFirebaseOfflineError(error)) {
        // Queue transaction for later sync when online
        const queuedTransactions = await loadFromCache('queued_transactions') || [];
        queuedTransactions.push({
          ...transaction,
          userId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          queuedAt: new Date().toISOString()
        });
        await saveToCache('queued_transactions', queuedTransactions);
        
        Alert.alert(
          'Offline Mode',
          'Transaction saved locally. It will sync when you are back online.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const updateUserFinancialSummary = async (summary) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        financialSummary: summary,
        lastUpdated: new Date()
      });
      
      // Update cached data as well
      await saveToCache(CACHE_KEYS.FINANCIAL_DATA, summary);
    } catch (error) {
      console.error('Error updating financial summary:', error);
      
      if (isFirebaseOfflineError(error)) {
        // Save to cache for offline access
        await saveToCache(CACHE_KEYS.FINANCIAL_DATA, summary);
        setOfflineError('Changes saved locally. Will sync when online.');
      }
    }
  };

  const loadUserDataFromFirebase = async () => {
    if (!user) return;
    
    try {
      setOfflineError(null);
      setIsOffline(false);
      
      // Try to load user financial summary
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const financialData = userDoc.data().financialSummary;
        setUserFinancialData(financialData);
        
        // Cache the data for offline use
        if (financialData) {
          await saveToCache(CACHE_KEYS.FINANCIAL_DATA, financialData);
        }
      }

      // Try to load recent transactions
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(10));
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          // Check if user is still authenticated when snapshot arrives
          if (!user) {
            console.log('⚠️ User no longer authenticated, ignoring transactions snapshot');
            return;
          }
          
          const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRecentTransactions(transactions);
          
          // Cache transactions for offline use
          saveToCache(CACHE_KEYS.TRANSACTIONS, transactions);
          saveToCache(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
        },
        (error) => {
          console.error('Error in transactions listener:', error);
          if (isFirebaseOfflineError(error)) {
            loadCachedData();
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error loading user data:', error);
      
      if (isFirebaseOfflineError(error)) {
        setIsOffline(true);
        setOfflineError('You are currently offline. Showing cached data.');
        await loadCachedData();
      } else {
        setOfflineError('Failed to load user data. Please try again.');
      }
    }
  };

  const loadCachedData = async () => {
    try {
      // Load cached financial data
      const cachedFinancialData = await loadFromCache(CACHE_KEYS.FINANCIAL_DATA);
      if (cachedFinancialData) {
        setUserFinancialData(cachedFinancialData);
      }

      // Load cached transactions
      const cachedTransactions = await loadFromCache(CACHE_KEYS.TRANSACTIONS);
      if (cachedTransactions) {
        setRecentTransactions(cachedTransactions);
      }

      // Check when data was last synced
      const lastSync = await loadFromCache(CACHE_KEYS.LAST_SYNC);
      if (lastSync) {
        const lastSyncDate = new Date(lastSync);
        const now = new Date();
        const hoursSinceSync = (now - lastSyncDate) / (1000 * 60 * 60);
        
        if (hoursSinceSync > 24) {
          setOfflineError('Data is more than 24 hours old. Connect to internet to sync.');
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  // Function to sync queued data when back online
  const syncQueuedData = async () => {
    try {
      const queuedTransactions = await loadFromCache('queued_transactions');
      if (queuedTransactions && queuedTransactions.length > 0) {
        console.log('Syncing queued transactions:', queuedTransactions.length);
        
        for (const transaction of queuedTransactions) {
          try {
            const transactionRef = doc(collection(db, 'users', user.uid, 'transactions'));
            await setDoc(transactionRef, transaction);
          } catch (error) {
            console.error('Error syncing transaction:', error);
          }
        }
        
        // Clear queued transactions after successful sync
        await AsyncStorage.removeItem('queued_transactions');
        setOfflineError(null);
        
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${queuedTransactions.length} offline transactions.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error syncing queued data:', error);
    }
  };

  // Function to load real-time fraud alerts from Firebase with robust error handling
  // Setup real-time security score listener
  const setupRealtimeSecurityScore = () => {
    if (!user) {
      console.log('⚠️ No user available for security score listener');
      return () => {}; // Return empty cleanup function
    }

    try {
      console.log('🔒 Setting up real-time security score listener...');
      setSecurityScoreListenerActive(false);
      
      // Debounce security score updates to avoid rapid recalculations
      let updateTimeout;
      const debounceUpdate = async (source) => {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        
        updateTimeout = setTimeout(async () => {
          if (!user) return;
          
          console.log(`🔒 Debounced security score update from ${source}`);
          try {
            const updatedScore = await SecurityScoreManager.calculateSecurityScore(user.uid);
            if (updatedScore) {
              setSecurityScoreData(updatedScore);
              setFraudScore(100 - updatedScore.securityScore);
              console.log(`🔒 Security score updated: ${updatedScore.securityScore}/100 (source: ${source})`);
            }
          } catch (error) {
            console.error(`❌ Failed to update security score from ${source}:`, error);
          }
        }, 2000); // Wait 2 seconds before updating
      };
      
      // Listen to fraud alerts changes
      const fraudAlertsRef = collection(db, 'fraud_alerts');
      const fraudAlertsQuery = query(
        fraudAlertsRef,
        where('userId', '==', user.uid)
      );

      // Listen to user messages changes
      const userMessagesRef = collection(db, 'users', user.uid, 'messages');
      
      // Create listeners for both collections
      const unsubscribeFraudAlerts = onSnapshot(
        fraudAlertsQuery,
        async (snapshot) => {
          if (!user) return;
          
          console.log(`🔒 Fraud alerts changed: ${snapshot.docs.length} alerts - scheduling security score update`);
          setSecurityScoreListenerActive(true);
          
          // Use debounced update
          await debounceUpdate('fraud alerts');
        },
        (error) => {
          console.error('❌ Fraud alerts security score listener error:', error);
          setSecurityScoreListenerActive(false);
        }
      );

      const unsubscribeUserMessages = onSnapshot(
        userMessagesRef,
        async (snapshot) => {
          if (!user) return;
          
          console.log(`🔒 User messages changed: ${snapshot.docs.length} messages - scheduling security score update`);
          setSecurityScoreListenerActive(true);
          
          // Use debounced update
          await debounceUpdate('user messages');
        },
        (error) => {
          console.error('❌ User messages security score listener error:', error);
          setSecurityScoreListenerActive(false);
        }
      );

      // Set listener as active
      setSecurityScoreListenerActive(true);
      console.log('🔒 Real-time security score listener activated');

      // Return cleanup function for both listeners
      return () => {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        if (unsubscribeFraudAlerts) {
          unsubscribeFraudAlerts();
          console.log('🔒 Fraud alerts security score listener cleaned up');
        }
        if (unsubscribeUserMessages) {
          unsubscribeUserMessages();
          console.log('🔒 User messages security score listener cleaned up');
        }
        setSecurityScoreListenerActive(false);
      };

    } catch (error) {
      console.error('❌ Failed to setup real-time security score listener:', error);
      setSecurityScoreListenerActive(false);
      return () => {}; // Return empty cleanup function
    }
  };

  const setupRealtimeAlerts = () => {
    if (!user) {
      console.log('⚠️ No user available for alerts listener');
      return () => {}; // Return empty cleanup function
    }

    try {
      console.log('🔄 Setting up real-time alerts listener...');
      setAlertsLoading(true);
      setFirebaseError(null);
      
      // Create the alerts query - temporarily without orderBy to avoid index requirement
      const alertsRef = collection(db, 'fraud_alerts');
      
      // Temporary fix: Query without orderBy to avoid index requirement
      // TODO: Create Firebase index then restore orderBy('createdAt', 'desc')
      const q = query(
        alertsRef, 
        where('userId', '==', user.uid),
        limit(20) // Get more documents to sort client-side
      );
      
      // Set up the listener with error handling
      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          // Check if user is still authenticated when snapshot arrives
          if (!user) {
            console.log('⚠️ User no longer authenticated, ignoring snapshot');
            return;
          }
          
          try {
            console.log(`📊 Alerts snapshot received: ${snapshot.docs.length} documents`);
            
            // Sort alerts by creation date (newest first) on client side
            // This is a temporary fix while Firebase index is being created
            const sortedDocs = snapshot.docs.sort((a, b) => {
              const aTime = a.data().createdAt?.toDate?.()?.getTime() || 0;
              const bTime = b.data().createdAt?.toDate?.()?.getTime() || 0;
              return bTime - aTime; // Descending order (newest first)
            });
            
            // Take only the first 10 after sorting
            const limitedDocs = sortedDocs.slice(0, 10);
            
            const alerts = limitedDocs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                content: data.message || data.alertMessage || data.description || 'Fraud alert detected',
                timestamp: data.createdAt?.toDate?.() ? formatAlertTimestamp(data.createdAt.toDate()) : 'Recent',
                risk: data.severity === 'high' ? 'High' : 
                      data.severity === 'medium' ? 'Medium' : 
                      data.severity === 'low' ? 'Low' : 'Medium',
                type: data.type || 'fraud',
                severity: data.severity || 'medium',
                status: data.status || 'active'
              };
            });
            
            console.log(`✅ Processed ${alerts.length} alerts successfully`);
            setRealtimeAlerts(alerts);
            setAlertsLoading(false);
            setAlertsListenerActive(true);
            setFirebaseError(null);
            
          } catch (processingError) {
            console.error('❌ Error processing alerts snapshot:', processingError);
            setAlertsLoading(false);
            setFirebaseError({
              message: 'Failed to process alerts data',
              code: 'processing-error',
              originalError: processingError.message
            });
          }
        },
        (listenerError) => {
          console.error('❌ Alerts listener error:', listenerError);
          setAlertsLoading(false);
          setAlertsListenerActive(false);
          
          // Check if user is still authenticated - if not, this is expected during sign out
          if (!user || !user.uid) {
            console.log('🔄 User signed out - ignoring listener error (expected behavior)');
            return;
          }
          
          // Handle specific Firebase errors
          const errorCode = listenerError?.code || 'unknown';
          let errorMessage = 'Real-time alerts listener error';
          let solution = 'Please try refreshing the app';
          
          switch (errorCode) {
            case 'permission-denied':
              errorMessage = 'Access denied to fraud alerts';
              solution = 'Check your login status and try again';
              break;
            case 'unavailable':
              errorMessage = 'Firebase service temporarily unavailable';
              solution = 'Check your internet connection';
              break;
            case 'unauthenticated':
              errorMessage = 'Authentication expired';
              solution = 'Please log out and log back in';
              break;
            case 'failed-precondition':
              errorMessage = 'Firebase index required for alerts';
              solution = 'Please create the required Firebase index (check console)';
              
              // Provide specific guidance for index creation
              Alert.alert(
                'Firebase Index Required',
                'The fraud alerts feature requires a Firebase index to be created.\n\n' +
                'Steps to fix:\n' +
                '1. Check the app console for the index creation link\n' +
                '2. Click the link to create the index automatically\n' +
                '3. Wait 1-2 minutes for the index to build\n' +
                '4. Restart the app\n\n' +
                'The app will work with limited sorting until then.',
                [
                  { text: 'OK' },
                  { 
                    text: 'Open Console', 
                    onPress: () => console.log('🔗 Check console for Firebase index creation link')
                  }
                ]
              );
              break;
            default:
              errorMessage = `Connection error: ${listenerError.message}`;
              solution = 'Check internet connection and try again';
          }
          
          setFirebaseError({
            message: errorMessage,
            code: errorCode,
            solution: solution,
            originalError: listenerError.message
          });
          
          // Only show user-facing alerts if user is still authenticated and it's not a sign-out scenario
          // Don't show alerts for permission-denied or unauthenticated during sign out
          if (user && user.uid && !['permission-denied', 'unauthenticated'].includes(errorCode)) {
            Alert.alert(
              'Connection Error',
              `${errorMessage}\n\nSolution: ${solution}`,
              [
                { text: 'Test Connection', onPress: () => testFirebaseConnection() },
                { text: 'OK' }
              ]
            );
          } else if (user && user.uid && ['permission-denied', 'unauthenticated'].includes(errorCode)) {
            // For permission/auth errors, just log them - don't show alerts as these are often expected during sign out
            console.warn(`🚨 Firebase auth error (suppressed): ${errorMessage}`);
          }
        }
      );
      
      console.log('✅ Alerts listener created successfully');
      return unsubscribe;
      
    } catch (setupError) {
      console.error('❌ Failed to setup alerts listener:', setupError);
      setFirebaseError({
        message: 'Failed to setup alerts listener',
        code: 'setup-error',
        solution: 'Check Firebase configuration',
        originalError: setupError.message
      });
      setAlertsLoading(false);
      setAlertsListenerActive(false);
      
      return () => {}; // Return dummy unsubscribe function
    }
  };

  // Setup push notification system and SMS monitoring
  const setupNotificationSystem = async () => {
    if (!user) {
      console.log('⚠️ No user available for notification setup');
      return;
    }

    try {
      console.log('🔔 Setting up push notification system...');
      
      // Initialize notification manager
      const notificationInitialized = await NotificationManager.initialize(user.uid);
      if (!notificationInitialized) {
        console.warn('⚠️ Notification manager initialization failed');
        return;
      }
      
      // Setup SMS monitoring with callback for count updates
      const smsMonitoringStarted = await SMSMonitor.startMonitoring(
        user.uid, 
        (count) => {
          setPendingSMSCount(count);
          updateTotalNotificationCount();
        }
      );
      
      if (smsMonitoringStarted) {
        console.log('✅ SMS monitoring started successfully');
        
        // Get initial pending count
        const initialCount = SMSMonitor.getPendingAnalysisCount();
        setPendingSMSCount(initialCount);
      } else {
        console.warn('⚠️ SMS monitoring could not be started');
      }
      
      // Update total notification count
      await updateTotalNotificationCount();
      
      console.log('✅ Push notification system setup complete');
      
    } catch (error) {
      console.error('❌ Failed to setup notification system:', error);
    }
  };

  // Update total notification count (alerts + SMS + push notifications)
  const updateTotalNotificationCount = async () => {
    try {
      const alertCount = realtimeAlerts.length || 0;
      const smsCount = pendingSMSCount || 0;
      const pushNotificationCount = await NotificationManager.getUnreadCount();
      
      const totalCount = alertCount + smsCount + pushNotificationCount;
      setTotalNotificationCount(totalCount);
      
    } catch (error) {
      console.error('❌ Failed to update notification count:', error);
    }
  };

  // Function to test if Firebase index is ready and restore proper query
  const testAndRestoreOptimizedQuery = async () => {
    try {
      console.log('🧪 Testing if Firebase index is ready...');
      
      // Try the optimized query with orderBy
      const alertsRef = collection(db, 'fraud_alerts');
      const testQuery = query(
        alertsRef, 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'), 
        limit(1)
      );
      
      // If this succeeds, the index is ready
      await getDocs(testQuery);
      
      console.log('✅ Firebase index is ready! Switching to optimized query...');
      
      Alert.alert(
        'Performance Improved! 🎉',
        'Firebase index is now ready. The app will use optimized queries for better performance.',
        [
          {
            text: 'Restart Alerts',
            onPress: () => {
              // Restart the alerts listener with optimized query
              setupRealtimeAlerts();
            }
          }
        ]
      );
      
      return true;
      
    } catch (error) {
      if (error.code === 'failed-precondition') {
        console.log('⏳ Firebase index still building...');
        return false;
      } else {
        console.error('❌ Index test failed with different error:', error);
        throw error;
      }
    }
  };

  // Test Firebase connection and permissions
  const testFirebaseConnection = async () => {
    try {
      console.log('🔬 Testing Firebase connection...');
      Alert.alert('Testing Connection', 'Running Firebase connectivity test...');
      
      const testResults = await FirebaseErrorHandler.testFirebaseConnection(user?.uid);
      
      if (testResults.success) {
        const { summary, tests } = testResults;
        const failedTests = tests.filter(t => t.status === 'failed');
        
        if (failedTests.length === 0) {
          Alert.alert(
            'Connection Test Passed ✅',
            `All ${summary.total} tests passed!\n\n• Firestore Connection\n• User Document Access\n• Fraud Alerts Collection\n• Real-time Listener\n\nYour Firebase connection is working correctly.`,
            [{ text: 'OK' }]
          );
        } else {
          let errorMessage = `${summary.passed}/${summary.total} tests passed.\n\nFailed tests:\n`;
          failedTests.forEach(test => {
            errorMessage += `• ${test.name}: ${test.error.userMessage}\n`;
          });
          
          Alert.alert(
            'Connection Issues Found ⚠️',
            errorMessage,
            [
              { text: 'View Details', onPress: () => console.log('Test Details:', testResults) },
              { text: 'OK' }
            ]
          );
        }
      } else {
        Alert.alert(
          'Connection Test Failed ❌',
          `Test failed: ${testResults.error.userMessage}\n\nSolution: ${testResults.error.solution}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      Alert.alert(
        'Test Error',
        'Failed to run connection test. Check console for details.',
        [{ text: 'OK' }]
      );
    }
  };

  // Helper function to format alert timestamps
  const formatAlertTimestamp = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  // Load and update security score
  const loadSecurityScore = async (forceRefresh = false) => {
    if (!user) return;
    
    try {
      setSecurityScoreLoading(true);
      console.log('🔒 Loading security score for user:', user.uid);
      console.log('🔒 Force refresh:', forceRefresh);
      
      // If we're in fallback mode and this is a forced refresh, clear cache first
      if (forceRefresh) {
        console.log('🔒 Force refresh - clearing cached data...');
        setSecurityScoreData(null);
      }
      
      const scoreData = await SecurityScoreManager.getSecurityScore(user.uid, forceRefresh);
      console.log('🔒 SecurityScoreManager returned:', scoreData);
      
      if (scoreData && scoreData.securityScore !== undefined) {
        setSecurityScoreData(scoreData);
        setFraudScore(100 - scoreData.securityScore); // Invert for fraudScore (higher fraud = lower security)
        
        console.log(`🔒 Security score loaded: ${scoreData.securityScore}/100 (${scoreData.riskLevel?.text})`);
        
        // Show recommendations if score is low
        if (scoreData.securityScore < 60 && scoreData.recommendations?.length > 0) {
          console.log('⚠️ Security recommendations available:', scoreData.recommendations);
        }
      } else {
        console.warn('🔒 SecurityScoreManager returned invalid data, forcing calculation...');
        // Force a fresh calculation
        const freshScore = await SecurityScoreManager.calculateSecurityScore(user.uid);
        console.log('🔒 Fresh calculation result:', freshScore);
        
        if (freshScore && freshScore.securityScore !== undefined) {
          setSecurityScoreData(freshScore);
          setFraudScore(100 - freshScore.securityScore);
          console.log(`🔒 Fresh security score: ${freshScore.securityScore}/100`);
        } else {
          console.error('❌ Both SecurityScoreManager methods failed. Fallback to old system.');
          // Show error to user
          Alert.alert(
            '⚠️ Security Score Issue',
            'Unable to load new security system. Using fallback calculation.\n\nTap the shield button to try "Force New Calculation" for the correct score.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Failed to load security score:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Show specific error to user
      Alert.alert(
        '❌ Security Score Error',
        `Failed to load security score: ${error.message}\n\nUsing fallback calculation. Check console for details.`,
        [{ text: 'OK' }]
      );
      
      // Use fallback values
      setFraudScore(15);
    } finally {
      setSecurityScoreLoading(false);
    }
  };

  // Update security score after SMS analysis
  const updateSecurityScoreAfterAnalysis = async (analysisResults) => {
    if (!user) return;
    
    try {
      console.log('🔄 Updating security score after analysis...');
      
      const updatedScore = await SecurityScoreManager.updateScoreAfterAnalysis(user.uid, analysisResults);
      
      if (updatedScore) {
        setSecurityScoreData(updatedScore);
        setFraudScore(100 - updatedScore.securityScore);
        
        console.log(`✅ Security score updated to: ${updatedScore.securityScore}/100`);
        
        // Show alert if security score changed significantly
        const previousScore = securityScoreData?.securityScore || 85;
        const scoreDifference = Math.abs(updatedScore.securityScore - previousScore);
        
        if (scoreDifference >= 10) {
          const isImprovement = updatedScore.securityScore > previousScore;
          Alert.alert(
            'Security Score Updated',
            `Your security score ${isImprovement ? 'improved' : 'decreased'} to ${updatedScore.securityScore}/100.\n\n${updatedScore.riskLevel.text}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Failed to update security score:', error);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('👋 User logged in - initializing dashboard data...');
      initializeUserDashboard();
    } else {
      // Clear all state when user signs out
      console.log('👋 User signed out - clearing dashboard state...');
      
      // Cleanup notification system
      SMSMonitor.stopMonitoring();
      NotificationManager.cleanup();
      setPendingSMSCount(0);
      setNotificationPanelVisible(false);
      setTotalNotificationCount(0);
      
      setUserData(null);
      setUserDataLoading(false);
      setIsFirstConnection(false);
      setCacheStatus({ cached: false, fresh: false });
      setApiSummary(null);
      setApiError(null);
      setApiLoading(false);
      setUserFinancialData(null);
      setRecentTransactions([]);
      setSecurityScoreData(null);
      setSecurityScoreLoading(false);
      setIsOffline(false);
      setOfflineError(null);
      // Note: realtimeAlerts, alertsLoading, etc. are cleared in the alerts useEffect
    }
  }, [user]);

  // Initialize user dashboard with immediate data display
  const initializeUserDashboard = async () => {
    try {
      setUserDataLoading(true);
      
      console.log('⚡ Loading user data for immediate display...');
      
      // Use UserDataManager for immediate data display
      const userData = await UserDataManager.quickLoadUserData(user.uid);
      
      if (userData) {
        console.log(`⚡ User data loaded (${userData.cached ? 'cached' : 'fresh'})`);
        
        // Set user data immediately
        setUserData(userData);
        setCacheStatus({ 
          cached: userData.cached, 
          fresh: userData.fresh !== false 
        });
        
        // Update UI components with user data
        if (userData.profile) {
          // Update financial data from profile
          if (userData.profile.financialSummary) {
            setUserFinancialData(userData.profile.financialSummary);
          }
          
          // Set fraud score from profile counters
          if (userData.profile.fraudDetected !== undefined) {
            setFraudScore(userData.profile.fraudDetected || 0);
          }
        }
        
        // Update security score data
        if (userData.securityScore) {
          setSecurityScoreData(userData.securityScore);
        }
        
        // If this is cached data, check if we need to initialize first-time user
        if (userData.cached && !userData.profile?.createdAt) {
          console.log('🆕 Initializing first-time user...');
          setIsFirstConnection(true);
          await UserDataManager.initializeUser(user);
        }
        
        // Setup real-time alerts and other data streams
        setupRealtimeAlerts();
        
        // Setup push notifications and SMS monitoring
        await setupNotificationSystem();
        
        // If data is stale, reload security score in background
        if (userData.cached && !userData.fresh) {
          loadSecurityScore();
        } else {
          // Always load security score to ensure we have the latest calculation
          loadSecurityScore();
        }
        
      } else {
        console.log('🆕 No existing user data - initializing first-time user...');
        setIsFirstConnection(true);
        
        // Initialize first-time user
        const initialUserData = await UserDataManager.initializeUser(user);
        setUserData(initialUserData);
        
        // Setup real-time components
        setupRealtimeAlerts();
        
        // Setup push notifications and SMS monitoring
        await setupNotificationSystem();
        
        loadSecurityScore();
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize user dashboard:', error);
      
      // Fallback to old loading method
      console.log('🔄 Falling back to legacy data loading...');
      loadCachedData();
      loadUserDataFromFirebase().then(() => {
        syncQueuedData();
      });
      loadSecurityScore();
      setupRealtimeAlerts();
      
    } finally {
      setUserDataLoading(false);
    }
  };

  // Handle updates after SMS scan completion
  const handleScanCompletion = async (scanResults) => {
    try {
      console.log('📱 Handling SMS scan completion - updating user data...');
      
      // Update user data after scan
      await UserDataManager.updateUserDataAfterEvent(user.uid, {
        type: 'sms_scan',
        messagesAnalyzed: scanResults.totalMessages || 0,
        fraudCount: scanResults.fraudCount || 0,
        suspiciousCount: scanResults.suspiciousCount || 0,
        safeCount: scanResults.safeCount || 0,
        scanTimestamp: new Date().toISOString()
      });
      
      // Reload user data to reflect updates
      const updatedUserData = await UserDataManager.quickLoadUserData(user.uid);
      if (updatedUserData) {
        setUserData(updatedUserData);
        
        // Update UI components
        if (updatedUserData.profile) {
          setFraudScore(updatedUserData.profile.fraudDetected || 0);
        }
        
        if (updatedUserData.securityScore) {
          setSecurityScoreData(updatedUserData.securityScore);
        }
      }
      
      console.log('✅ User data updated after scan completion');
      
    } catch (error) {
      console.error('❌ Failed to handle scan completion:', error);
    }
  };

  // Expose scan completion handler for navigation params
  useEffect(() => {
    // Check if we received scan results from navigation
    const scanResults = navigation.getState()?.routes?.find(route => route.name === 'Dashboard')?.params?.scanResults;
    
    if (scanResults) {
      handleScanCompletion(scanResults);
      
      // Clear the parameters to avoid re-processing
      navigation.setParams({ scanResults: undefined });
    }
  }, [navigation]);

  // Setup real-time alerts and security score listeners
  useEffect(() => {
    let unsubscribeAlerts;
    let unsubscribeSecurityScore;
    
    if (user) {
      console.log('🔄 Setting up real-time listeners for user:', user.uid);
      
      // Setup alerts listener
      unsubscribeAlerts = setupRealtimeAlerts();
      
      // Setup security score listener
      unsubscribeSecurityScore = setupRealtimeSecurityScore();
      
    } else {
      // Clear state when user signs out
      console.log('🔄 User signed out - clearing real-time state');
      setRealtimeAlerts([]);
      setAlertsLoading(false);
      setAlertsListenerActive(false);
      setFirebaseError(null);
      setSecurityScoreData(null);
      setSecurityScoreLoading(false);
      setSecurityScoreListenerActive(false);
    }
    
    // Cleanup function
    return () => {
      if (unsubscribeAlerts && typeof unsubscribeAlerts === 'function') {
        try {
          unsubscribeAlerts();
          console.log('🔄 Real-time alerts listener cleaned up');
        } catch (error) {
          console.error('⚠️ Error cleaning up alerts listener:', error);
        }
      }
      
      if (unsubscribeSecurityScore && typeof unsubscribeSecurityScore === 'function') {
        try {
          unsubscribeSecurityScore();
          console.log('🔒 Real-time security score listener cleaned up');
        } catch (error) {
          console.error('⚠️ Error cleaning up security score listener:', error);
        }
      }
    };
  }, [user]);

  // Listen for navigation focus to refresh alerts when returning from Messages screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        console.log('🔄 Dashboard focused - refreshing alerts');
        // The real-time listener will automatically update, but we can force a manual check
        // This is useful when returning from the Messages screen after a scan
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  // Function to get current data (Firebase, API or mock)
  const getCurrentData = () => {
    // Priority: Firebase user data > API data > Mock data
    const financialData = userFinancialData || (apiSummary ? {
      sent: `RWF ${apiSummary.total_sent?.toLocaleString() || '0'}`,
      received: `RWF ${apiSummary.total_received?.toLocaleString() || '0'}`,
      net: `${(apiSummary.total_received || 0) > (apiSummary.total_sent || 0) ? '+' : ''}RWF ${((apiSummary.total_received || 0) - (apiSummary.total_sent || 0)).toLocaleString()}`,
      flagged: apiSummary.suspicious_transactions || 0
    } : {
      sent: 'RWF 250,000',
      received: 'RWF 450,000',
      net: '+RWF 200,000',
      flagged: 3
    });

    return {
      weeklySummary: financialData,
      recentTransactions: recentTransactions.length > 0 ? recentTransactions.map(transaction => ({
        id: transaction.id,
        name: transaction.name || transaction.sender || 'Unknown',
        amount: transaction.amount || `RWF ${transaction.value || 0}`,
        date: transaction.date || new Date(transaction.createdAt?.toDate()).toLocaleDateString() || 'Recent',
        type: transaction.type || 'sent',
        flagged: transaction.flagged || false,
        icon: transaction.icon || 'phone-outline'
      })) : [
      {
        id: '1',
        name: 'MTN Mobile Money',
        amount: 'RWF 50,000',
        date: 'Today',
        type: 'sent',
        flagged: false,
        icon: 'phone-outline'
      },
      {
        id: '2',
        name: 'Online Payment',
        amount: 'RWF 120,000',
        date: 'Today',
        type: 'sent',
        flagged: true,
        icon: 'card-outline'
      },
      {
        id: '3',
        name: 'Salary Deposit',
        amount: 'RWF 450,000',
        date: 'Today',
        type: 'received',
        flagged: false,
        icon: 'business-outline'
      },
    ],
    alerts: realtimeAlerts.length > 0 ? realtimeAlerts : [
      {
        id: 'placeholder-1',
        content: '✨ No fraud alerts detected yet! Start analyzing SMS messages to see real-time security alerts.',
        timestamp: 'Welcome',
        risk: 'Low',
        type: 'info'
      },
      {
        id: 'placeholder-2',
        content: '🔍 Go to Messages screen and tap "Scan Messages" to analyze your SMS for suspicious content.',
        timestamp: 'Tip',
        risk: 'Low',
        type: 'info'
      }
    ]
    };
  };

  // Calculate notification count from alerts
  const currentData = getCurrentData();
  const notificationCount = currentData.alerts.length;

  const fetchRealSummary = async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const currentDate = new Date();
      const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      console.log(`🔍 Starting current month SMS summary for ${currentMonthName}...`);
      
      // Check if SMS Service is available
      if (!SMSService) {
        throw new Error('SMS service not available. Please restart the app.');
      }
      
      // Check permissions with clear user messaging
      console.log('📱 Checking SMS permissions for financial analysis...');
      
      let hasPermissions = false;
      try {
        hasPermissions = await SMSService.checkSMSPermissions();
      } catch (permissionError) {
        console.error('Error checking SMS permissions:', permissionError);
        throw new Error('Unable to check SMS permissions. Please restart the app.');
      }
      
      if (!hasPermissions) {
        console.log('📱 SMS permissions needed - requesting from user...');
        
        try {
          const granted = await SMSService.requestSMSPermissions();
          if (!granted) {
            throw new Error(`SMS permissions are required to analyze your ${currentMonthName} transactions. Please grant SMS access in your device settings and try again.`);
          }
          console.log('✅ SMS permissions granted for financial analysis');
        } catch (requestError) {
          console.error('Error requesting SMS permissions:', requestError);
          throw new Error('Failed to request SMS permissions. Please try again.');
        }
      } else {
        console.log('✅ SMS permissions already available');
      }

      // Get all SMS messages with timeout and error handling
      let allMessages = [];
      try {
        console.log('📱 Retrieving SMS messages...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMS fetch timeout')), 15000)
        );
        
        const smsPromise = SMSService.getAllSMS({ maxCount: 1000 });
        allMessages = await Promise.race([smsPromise, timeoutPromise]);
        
        console.log(`📱 Retrieved ${allMessages?.length || 0} total SMS messages`);
        
        if (!allMessages || !Array.isArray(allMessages)) {
          throw new Error('Invalid SMS data received');
        }
        
      } catch (smsError) {
        console.error('Error getting SMS messages:', smsError);
        if (smsError.message.includes('timeout')) {
          throw new Error('SMS retrieval timed out. Please try again.');
        } else if (smsError.message.includes('permission')) {
          throw new Error('SMS permission lost. Please restart the app.');
        } else {
          throw new Error('Failed to read SMS messages. Please try again.');
        }
      }
      
      // Filter to ONLY current month (same logic as MessagesScreen)
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const currentMonthMessages = allMessages.filter(message => {
        try {
          const messageDate = new Date(parseInt(message.date));
          return messageDate.getMonth() === currentMonth && 
                 messageDate.getFullYear() === currentYear;
        } catch (dateError) {
          console.log('Invalid date in message:', message.date);
          return false;
        }
      });
      
      console.log(`📅 Found ${currentMonthMessages.length} SMS messages from ${currentMonthName}`);
      
      if (currentMonthMessages.length === 0) {
        setApiError(`No SMS messages found for ${currentMonthName}`);
        setApiSummary({
          transactions_count: 0,
          total_sent: 0,
          total_received: 0,
          total_withdrawn: 0,
          total_airtime: 0,
          latest_balance: 0,
          monthly_summary: {},
          message: `No messages from ${currentMonthName}`
        });
        return;
      }
      
      // Enhanced transaction filtering (same as MessagesScreen scan button)
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
        const text = m.body || m.text || '';
        if (!text || typeof text !== 'string') return false;
        
        const textLower = text.toLowerCase();
        
        // Check for keywords
        const hasKeywords = transactionKeywords.some(keyword => 
          textLower.includes(keyword.toLowerCase())
        );
        
        // Check for amount patterns (numbers followed by RWF)
        const hasAmountPattern = /\d+(?:,\d{3})*\s*rwf/i.test(text) ||
                                /rwf\s*\d+(?:,\d{3})*/i.test(text);
        
        // Check for balance patterns
        const hasBalancePattern = /balance.*?\d+.*?rwf/i.test(text) ||
                                 /new balance.*?\d+/i.test(text);
        
        // Check for transaction ID patterns
        const hasTransactionId = /transaction id.*?\d+/i.test(text) ||
                                /ref.*?[a-z0-9]+/i.test(text);
        
        return hasKeywords || hasAmountPattern || hasBalancePattern || hasTransactionId;
      });
      
      console.log(`💰 Found ${transactionMessages.length} transaction messages from ${currentMonthName}`);
      
      if (transactionMessages.length === 0) {
        setApiError(`No financial transaction messages found for ${currentMonthName}`);
        setApiSummary({
          transactions_count: currentMonthMessages.length,
          amount_transactions_count: 0,
          total_sent: 0,
          total_received: 0,
          total_withdrawn: 0,
          total_airtime: 0,
          latest_balance: 0,
          monthly_summary: {},
          message: `Found ${currentMonthMessages.length} SMS messages but none appear to be transaction-related for ${currentMonthName}`
        });
        return;
      }

      // Extract message texts for API analysis with validation
      const messageTexts = transactionMessages
        .map(msg => msg.body || msg.text || '')
        .filter(text => text && typeof text === 'string' && text.trim().length > 0)
        .slice(0, 100); // Limit to 100 messages for performance
      
      if (messageTexts.length === 0) {
        throw new Error('No valid message content found for analysis');
      }
      
      // Send to API for financial analysis with timeout and retry
      let summary;
      try {
        console.log(`📊 Analyzing ${messageTexts.length} transaction messages...`);
        
        const apiTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 30000)
        );
        
        const apiCall = getSmsSummary(messageTexts);
        summary = await Promise.race([apiCall, apiTimeout]);
        
        if (!summary || typeof summary !== 'object') {
          throw new Error('Invalid API response');
        }
        
      } catch (apiError) {
        console.error('❌ API call failed with details:', apiError);
        console.error('❌ API Error name:', apiError.name);
        console.error('❌ API Error message:', apiError.message);
        console.error('❌ API Error stack:', apiError.stack);
        
        // More specific error messages for user
        let userMessage = 'Analysis failed';
        let technicalDetails = apiError.message;
        
        if (apiError.message.includes('timeout') || apiError.name === 'AbortError') {
          userMessage = 'Analysis timed out - server took too long to respond';
          technicalDetails = 'API timeout after 30 seconds';
        } else if (apiError.message.includes('Failed to fetch') || apiError.message.includes('Network request failed')) {
          userMessage = 'Network error - unable to connect to analysis server';
          technicalDetails = 'Network connection failed - check internet or server status';
        } else if (apiError.message.includes('API error: 500')) {
          userMessage = 'Server error - analysis service is temporarily down';
          technicalDetails = 'Internal server error (500)';
        } else if (apiError.message.includes('API error: 404')) {
          userMessage = 'Analysis service not found - may need app update';
          technicalDetails = 'API endpoint not found (404)';
        } else if (apiError.message.includes('API error: 403')) {
          userMessage = 'Access denied to analysis service';
          technicalDetails = 'API access forbidden (403)';
        } else {
          userMessage = `Analysis service error: ${apiError.message}`;
          technicalDetails = apiError.message;
        }
        
        // Show user-friendly error with option to see technical details
        Alert.alert(
          '❌ SMS Analysis Failed',
          `${userMessage}\n\nWould you like to see technical details for troubleshooting?`,
          [
            { text: 'Just Continue', style: 'cancel' },
            { 
              text: 'Show Details', 
              onPress: () => Alert.alert(
                'Technical Error Details',
                `Error: ${technicalDetails}\n\nAPI URL: https://finsight-front-back-2.onrender.com\n\nThis information can help developers fix the issue.`,
                [{ text: 'OK' }]
              )
            }
          ]
        );
        
        throw new Error(userMessage);
      }
      
      console.log(`📊 Analysis complete: ${transactionMessages.length} transactions from ${currentMonthMessages.length} SMS messages in ${currentMonthName}`);
      
      // Enhance summary with month information
      const enhancedSummary = {
        ...summary,
        analysis_month: currentMonthName,
        total_messages: currentMonthMessages.length,
        transaction_messages: transactionMessages.length,
        analysis_timestamp: new Date().toLocaleString()
      };
      
      setApiSummary(enhancedSummary);
      
      // Save financial summary to Firebase for admin dashboard
      if (user) {
        try {
          await saveUserFinancialSummary(user.uid, enhancedSummary);
        } catch (saveError) {
          console.error('Error saving summary to Firebase:', saveError);
          // Don't throw error here, analysis was successful
        }
      }
      
      // Update fraud score based on API response
      if (summary.suspicious_transactions > 0) {
        setFraudScore(Math.min(50 + (summary.suspicious_transactions * 10), 95));
        
        // Create fraud alert for admin dashboard
        if (user && summary.suspicious_transactions > 2) {
          try {
            await saveFraudAlert(user.uid, {
              type: 'Multiple Suspicious Transactions',
              severity: 'high',
              message: `User detected ${summary.suspicious_transactions} suspicious transactions in ${currentMonthName}`,
              confidence: Math.min(90, 60 + (summary.suspicious_transactions * 10)),
              phone: 'Mobile App User',
              details: {
                suspiciousCount: summary.suspicious_transactions,
                totalTransactions: summary.transactions_count,
                month: currentMonthName
              }
            });
          } catch (alertError) {
            console.error('Error saving fraud alert:', alertError);
            // Don't throw error here
          }
        }
      } else {
        setFraudScore(Math.max(5, 15 - (summary.transactions_count || 0)));
      }
      
    } catch (error) {
      console.error('❌ Error in fetchRealSummary:', error);
      
      // More user-friendly error messages
      let userMessage = 'Failed to analyze SMS';
      if (error.message.includes('permission')) {
        userMessage = 'SMS permission required';
      } else if (error.message.includes('not available')) {
        userMessage = 'SMS service unavailable. Please restart the app.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('network') || error.message.includes('internet')) {
        userMessage = 'Network error. Check your connection.';
      } else if (error.message.includes('service unavailable')) {
        userMessage = 'Analysis service temporarily unavailable.';
      }
      
      setApiError(userMessage);
      
      // Fallback summary
      setApiSummary({
        transactions_count: 0,
        total_sent: 0,
        total_received: 0,
        total_withdrawn: 0,
        total_airtime: 0,
        latest_balance: 0,
        monthly_summary: {},
        message: `Error: ${userMessage}`
      });
    } finally {
      setApiLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Try to refresh Firebase data first
      if (user) {
        await loadUserDataFromFirebase();
      }
      
      // Then fetch real API summary
      await fetchRealSummary();
      
      // Refresh security score
      await loadSecurityScore(true);
      
    } catch (error) {
      console.error('Error during refresh:', error);
      if (isFirebaseOfflineError(error)) {
        Alert.alert(
          'Offline Mode',
          'You are currently offline. Showing cached data.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Refresh Failed',
          'Unable to refresh data. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  // 🧪 TEST FUNCTION: API Connection Test
  const testAPIConnection = async () => {
    try {
      Alert.alert('🧪 Testing API', 'Testing connection to analysis server...');
      
      console.log('🧪 Testing API connection...');
      const testUrl = 'https://finsight-front-back-2.onrender.com';
      
      // Test 1: Basic connection
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      console.log('🧪 API Response status:', response.status);
      console.log('🧪 API Response headers:', response.headers);
      
      if (response.ok) {
        Alert.alert(
          '✅ API Connection Success',
          `Server is reachable!\n\nStatus: ${response.status}\nURL: ${testUrl}\n\nThe "Get Real Summary" should work now.`,
          [{ text: 'Try Again' }]
        );
      } else {
        Alert.alert(
          '⚠️ API Connection Issues',
          `Server responded but with error:\n\nStatus: ${response.status}\nURL: ${testUrl}\n\nThe analysis server may be having issues.`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('🧪 API Test Error:', error);
      Alert.alert(
        '❌ API Connection Failed',
        `Cannot reach analysis server:\n\nError: ${error.message}\nURL: https://finsight-front-back-2.onrender.com\n\nThis could be:\n• No internet connection\n• Server is down\n• App needs update`,
        [{ text: 'OK' }]
      );
    }
  };

  // 🧪 TEST FUNCTION: Manual Firebase User Creation Test
  const testFirebaseUserCreation = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in first to test user creation');
      return;
    }

    try {
      console.log('🧪 DASHBOARD TEST: Starting Firebase user creation test...');
      
      Alert.alert(
        'Firebase User Test 🧪',
        `Testing user profile creation for:\nUID: ${user.uid}\nEmail: ${user.email}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Test Now', 
            onPress: async () => {
              // Show immediate feedback
              Alert.alert('Testing...', 'Creating user profile in Firebase...');
              
              try {
                console.log('🧪 DASHBOARD TEST: About to call createOrUpdateUserProfile...');
                console.log('🧪 DASHBOARD TEST: User UID:', user.uid);
                console.log('🧪 DASHBOARD TEST: User email:', user.email);
                
                const result = await createOrUpdateUserProfile(user.uid, {
                  email: user.email,
                  displayName: user.displayName || user.email.split('@')[0]
                });
                
                console.log('🧪 DASHBOARD TEST: Function completed, result:', result);
                
                // Show success with more details
                setTimeout(() => {
                  Alert.alert(
                    'Test Success! ✅',
                    `User profile created successfully!\n\nUID: ${user.uid}\nEmail: ${user.email}\n\nCheck the web dashboard to see if the user count increased.`,
                    [{ text: 'OK' }]
                  );
                }, 500);
                
              } catch (error) {
                console.error('🧪 DASHBOARD TEST: Caught error:', error);
                console.error('🧪 DASHBOARD TEST: Error message:', error.message);
                console.error('🧪 DASHBOARD TEST: Error code:', error.code);
                console.error('🧪 DASHBOARD TEST: Full error:', JSON.stringify(error, null, 2));
                
                setTimeout(() => {
                  Alert.alert(
                    'Test Failed ❌',
                    `Error Details:\n${error.message}\n\nCode: ${error.code || 'No code'}\n\nCheck console for full details.`,
                    [{ text: 'OK' }]
                  );
                }, 500);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('🧪 DASHBOARD TEST: Outer error:', error);
      Alert.alert('Test Error', `Failed to start test: ${error.message}`);
    }
  };

  // Test real-time alerts listener
  const testRealtimeAlerts = async () => {
    if (!user) {
      Alert.alert('Test Error', 'No user logged in');
      return;
    }

    try {
      Alert.alert(
        'Real-Time Alerts Test 🔔',
        `Testing real-time alerts listener for:\nUID: ${user.uid}\n\nThis will check if Firebase alerts are working properly.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Test Listener', 
            onPress: async () => {
              console.log('🔔 Starting real-time alerts test...');
              
              // First check diagnostic
              const diagnostic = await AlertsListenerTest.diagnosticCheck(user.uid);
              console.log('🩺 Diagnostic result:', diagnostic);
              
              if (!diagnostic.alertsCheck?.success) {
                Alert.alert(
                  'Connection Issue', 
                  `Firebase connection failed: ${diagnostic.alertsCheck?.error || 'Unknown error'}`
                );
                return;
              }
              
              if (!diagnostic.alertsCheck?.hasAlerts) {
                Alert.alert(
                  'No Alerts Found',
                  'No fraud alerts found for your account.\n\n💡 Go to Messages screen and run SMS analysis to create some alerts, then test again.',
                  [{ text: 'OK' }]
                );
                return;
              }
              
              // Run full listener test
              Alert.alert('Testing...', 'Real-time listener running for 10 seconds...');
              
              const testResult = await AlertsListenerTest.testRealtimeAlertsListener(user.uid);
              
              if (testResult.success) {
                Alert.alert(
                  'Test Successful! ✅',
                  `Real-time alerts listener is working properly.\n\nFound ${diagnostic.alertsCheck.alertCount} alerts for your account.\n\nCheck console for detailed logs.`,
                  [{ text: 'Great!' }]
                );
              } else {
                Alert.alert(
                  'Test Failed ❌',
                  `Real-time listener test failed: ${testResult.error}`,
                  [{ text: 'OK' }]
                );
              }
            }
          },
          {
            text: 'Quick Check',
            onPress: async () => {
              console.log('🔍 Quick alerts check...');
              const alertsCheck = await AlertsListenerTest.checkUserAlerts(user.uid);
              
              if (alertsCheck.success) {
                Alert.alert(
                  'Alerts Status',
                  `Found ${alertsCheck.alertCount} fraud alerts in your account.\n\n${alertsCheck.hasAlerts ? 'Real-time updates should be working!' : 'Go to Messages screen and run SMS analysis to create alerts.'}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Check Failed', `Error: ${alertsCheck.error}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('🔔 Real-time alerts test error:', error);
      Alert.alert('Test Error', `Failed to start alerts test: ${error.message}`);
    }
  };

  const getRiskLevel = () => {
    if (fraudScore < 10) return { text: "Low Risk", color: colors.success };
    if (fraudScore < 20) return { text: "Medium Risk", color: colors.warning };
    return { text: "High Risk", color: colors.danger };
  };

  const getRiskIcon = (risk) => {
    switch(risk.toLowerCase()) {
      case 'high': return { name: 'warning', color: colors.danger };
      case 'medium': return { name: 'error-outline', color: colors.warning };
      case 'low': return { name: 'check-circle', color: colors.success };
      default: return { name: 'help-outline', color: colors.textSecondary };
    }
  };

  const risk = getRiskLevel();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <ScreenWrapper>
        {/* Header */}
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              {isFirstConnection ? 'Welcome!' : 'Hello,'}
            </Text>
            <Text style={styles.userName}>
              {userData?.profile?.displayName || 
               user?.displayName || 
               user?.email?.split('@')[0] || 
               'User'}
            </Text>
            {userData?.profile && (
              <Text style={styles.userStats}>
                {userData.profile.totalScans || 0} scans • {userData.profile.totalMessages || 0} messages
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {/* User Data Status Indicators */}
            {userDataLoading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
            
            {isFirstConnection && (
              <View style={styles.firstConnectionBadge}>
                <MaterialIcons name="celebration" size={12} color={colors.primary} />
                <Text style={styles.firstConnectionText}>Welcome!</Text>
              </View>
            )}
            
            {isOffline && (
              <View style={styles.offlineIndicator}>
                <MaterialIcons name="cloud-off" size={16} color={colors.warning} />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
            
            {firebaseError && (
              <TouchableOpacity 
                style={styles.errorIndicator}
                onPress={() => Alert.alert(
                  'Firebase Error',
                  `${firebaseError.userMessage}\n\nSolution: ${firebaseError.solution}`,
                  [
                    { text: 'Test Connection', onPress: testFirebaseConnection },
                    { text: 'OK' }
                  ]
                )}
              >
                <MaterialIcons name="error" size={16} color={colors.danger} />
                <Text style={styles.errorText}>Connection Issue</Text>
              </TouchableOpacity>
            )}
            
            {alertsListenerActive && (
              <View style={styles.activeIndicator}>
                <MaterialIcons name="wifi" size={16} color={colors.success} />
                <Text style={styles.activeText}>Live</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setNotificationPanelVisible(true)}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
              {totalNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {totalNotificationCount > 99 ? '99+' : totalNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* SMS Analysis Pending Indicator */}
            {pendingSMSCount > 0 && (
              <TouchableOpacity 
                style={[styles.notificationButton, { backgroundColor: colors.warning, marginRight: 8 }]}
                onPress={() => {
                  Alert.alert(
                    '📱 New Transaction Messages',
                    `You have ${pendingSMSCount} new transaction messages waiting for analysis.\n\nTap "Scan Messages" in the Messages screen to analyze them for fraud.`,
                    [
                      { text: 'Later', style: 'cancel' },
                      { 
                        text: 'Analyze Now', 
                        onPress: () => navigation.navigate('Messages')
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color={colors.white} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {pendingSMSCount > 99 ? '99+' : pendingSMSCount}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* 🧪 Firebase Index Test Button */}
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.warning, marginRight: 8 }]}
              onPress={() => {
                Alert.alert(
                  'Firebase Index Test',
                  'Test if the Firebase index is ready for optimized queries?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Test Index', 
                      onPress: () => testAndRestoreOptimizedQuery()
                        .then(ready => {
                          if (!ready) {
                            Alert.alert(
                              'Index Not Ready',
                              'The Firebase index is still building. Please wait a few more minutes and try again.\n\nCurrent status: Using client-side sorting as workaround.',
                              [{ text: 'OK' }]
                            );
                          }
                        })
                        .catch(error => {
                          Alert.alert('Test Failed', `Error: ${error.message}`);
                        })
                    }
                  ]
                );
              }}
            >
              <Ionicons name="flash" size={16} color={colors.white} />
            </TouchableOpacity>
            
            {/* 🧪 Firebase Test Button */}
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.warning, marginRight: 8 }]}
              onPress={testFirebaseUserCreation}
            >
              <Ionicons name="flask" size={16} color={colors.white} />
            </TouchableOpacity>
            
            {/* 🔔 Real-time Alerts Test Button */}
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.info, marginRight: 8 }]}
              onPress={testRealtimeAlerts}
            >
              <Ionicons name="notifications" size={16} color={colors.white} />
            </TouchableOpacity>
            
            {/* � Reset Scan Data Button */}
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.danger, marginRight: 8 }]}
              onPress={async () => {
                Alert.alert(
                  '🔄 Reset Scan Data',
                  'This will clear all local scan history and cached data. Your next SMS scan will analyze all messages fresh, just like a first-time user.\n\n⚠️ This is useful if:\n• Your account was deleted from admin panel\n• SMS scan shows "no new messages" incorrectly\n• You want to rescan all messages\n\nThis will NOT delete your messages from the server.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Reset Data', 
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          console.log('🔄 User requested manual data reset...');
                          
                          const result = await UserDataManager.manualResetUserData(user.uid);
                          
                          if (result.success) {
                            Alert.alert(
                              '✅ Reset Complete',
                              'All local scan data has been cleared successfully!\n\n🔄 Next SMS scan will analyze all messages fresh.\n📅 All cache and scan history cleared.\n\nYou can now go to Messages screen and scan again.',
                              [{ text: 'OK' }]
                            );
                          } else {
                            Alert.alert(
                              '❌ Reset Failed',
                              `Failed to reset data: ${result.error}\n\nPlease try again or contact support.`,
                              [{ text: 'OK' }]
                            );
                          }
                        } catch (error) {
                          console.error('❌ Manual reset error:', error);
                          Alert.alert(
                            '❌ Reset Error',
                            `Error during reset: ${error.message}\n\nPlease try again.`,
                            [{ text: 'OK' }]
                          );
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="refresh-circle" size={16} color={colors.white} />
            </TouchableOpacity>
            
            {/* �🔒 Security Score Real-time Test Button */}
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.success, marginRight: 8 }]}
              onPress={() => {
                Alert.alert(
                  '🔒 Security Score Debug',
                  `Current Score: ${securityScoreData?.securityScore || (100 - fraudScore)}/100\nRisk Level: ${risk.text}\nListener Active: ${securityScoreListenerActive ? 'Yes ✅' : 'No ❌'}\n\n⚠️ Score Source: ${securityScoreData ? 'SecurityScoreManager ✅' : 'Old fraudScore fallback ❌'}\n${!securityScoreData ? `Old fraudScore: ${fraudScore} (Score: ${100 - fraudScore})` : ''}\n\nThreat Breakdown:\n• Confirmed Fraud Alerts: ${securityScoreData?.fraudMessages || 0}\n• Suspicious Messages: ${securityScoreData?.suspiciousMessages || 0}\n• Safe Messages: ${securityScoreData?.safeMessages || 0}\n• Total Analyzed: ${securityScoreData?.messagesAnalyzed || 0}\n• Total Threats: ${(securityScoreData?.fraudMessages || 0) + (securityScoreData?.suspiciousMessages || 0)}\n\nActions:`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Refresh Score', onPress: () => loadSecurityScore(true) },
                    { 
                      text: 'Force New Calculation', 
                      onPress: async () => {
                        try {
                          setSecurityScoreLoading(true);
                          Alert.alert('🔄 Forcing Security Score Calculation...', 'Using SecurityScoreManager directly...');
                          
                          const freshScore = await SecurityScoreManager.calculateSecurityScore(user.uid);
                          console.log('🔒 Direct calculation result:', freshScore);
                          
                          if (freshScore && freshScore.securityScore !== undefined) {
                            setSecurityScoreData(freshScore);
                            setFraudScore(100 - freshScore.securityScore);
                            
                            setTimeout(() => {
                              Alert.alert(
                                '✅ Security Score Updated!',
                                `New Score: ${freshScore.securityScore}/100\n\nFraud Alerts: ${freshScore.fraudMessages}\nSuspicious: ${freshScore.suspiciousMessages}\nSafe: ${freshScore.safeMessages}\n\nCalculation: 100 - (${freshScore.fraudMessages} × 10) - (${freshScore.suspiciousMessages} × 3) = ${freshScore.securityScore}`,
                                [{ text: 'Great!' }]
                              );
                            }, 500);
                          } else {
                            Alert.alert('❌ Failed', 'SecurityScoreManager calculation failed');
                          }
                        } catch (error) {
                          Alert.alert('❌ Error', `Calculation failed: ${error.message}`);
                        } finally {
                          setSecurityScoreLoading(false);
                        }
                      }
                    },
                    { 
                      text: 'Debug Data Sources', 
                      onPress: async () => {
                        try {
                          Alert.alert('🔍 Checking Data Sources...', 'Comparing user messages vs fraud alerts...');
                          
                          // Check user messages collection
                          const userMessagesRef = collection(db, 'users', user.uid, 'messages');
                          const userMessagesSnapshot = await getDocs(userMessagesRef);
                          const userMessages = userMessagesSnapshot.docs.map(doc => doc.data());
                          
                          // Check fraud alerts collection  
                          const alertsRef = collection(db, 'fraud_alerts');
                          const alertsQuery = query(alertsRef, where('userId', '==', user.uid));
                          const alertsSnapshot = await getDocs(alertsQuery);
                          const fraudAlerts = alertsSnapshot.docs.map(doc => doc.data());
                          
                          // Count by status
                          const fraudMessages = userMessages.filter(m => m.status === 'fraud').length;
                          const suspiciousMessages = userMessages.filter(m => m.status === 'suspicious').length;
                          const safeMessages = userMessages.filter(m => m.status === 'safe').length;
                          
                          setTimeout(() => {
                            Alert.alert(
                              '🔍 Data Source Comparison',
                              `USER MESSAGES COLLECTION:\n` +
                              `• Total Messages: ${userMessages.length}\n` +
                              `• Fraud: ${fraudMessages} (not used for threat count)\n` +
                              `• Suspicious: ${suspiciousMessages} (used for threat count)\n` +
                              `• Safe: ${safeMessages}\n\n` +
                              `FRAUD ALERTS COLLECTION:\n` +
                              `• Total Alerts: ${fraudAlerts.length} (used for fraud threat count)\n\n` +
                              `SECURITY SCORE CALCULATION:\n` +
                              `• Fraud Threats: ${fraudAlerts.length} (from fraud alerts)\n` +
                              `• Suspicious Threats: ${suspiciousMessages} (from user messages)\n` +
                              `• Total Threats: ${fraudAlerts.length + suspiciousMessages}`,
                              [
                                { text: 'OK' },
                                { 
                                  text: 'View Details', 
                                  onPress: () => {
                                    console.log('🔍 USER MESSAGES:', userMessages);
                                    console.log('🔍 FRAUD ALERTS:', fraudAlerts);
                                    Alert.alert('Debug Data', 'Check console for detailed data logs');
                                  }
                                }
                              ]
                            );
                          }, 500);
                          
                        } catch (error) {
                          Alert.alert('❌ Debug Error', `Failed to check data sources: ${error.message}`);
                        }
                      }
                    },
                    { 
                      text: 'Test Real-time', 
                      onPress: async () => {
                        try {
                          // Create a test fraud alert to trigger real-time update
                          Alert.alert(
                            '🧪 Creating Test Fraud Alert',
                            'This will create a test fraud alert to demonstrate real-time security score updates. Watch the security score change automatically!',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Create Test Alert', 
                                onPress: async () => {
                                  const { MobileAlertSystem } = await import('../utils/MobileAlertSystem');
                                  const testMessage = {
                                    id: `test-${Date.now()}`,
                                    text: 'URGENT: Your account has been compromised. Send RWF 50,000 to secure it.',
                                    status: 'fraud',
                                    analysis: '🚨 Test fraud message for real-time security score demo',
                                    timestamp: new Date().toLocaleString(),
                                    sender: 'Test Fraudster',
                                    type: 'test'
                                  };
                                  
                                  const alertResult = await MobileAlertSystem.createFraudAlert(
                                    testMessage, 
                                    user.uid, 
                                    { confidence: 0.95, label: 'fraud', category: 'Test Alert' }
                                  );
                                  
                                  if (alertResult.success) {
                                    Alert.alert(
                                      '✅ Test Alert Created!',
                                      `Watch the security score update automatically!\n\nAlert ID: ${alertResult.alertId}\n\nThe real-time listener will detect this change and update your security score within 2 seconds.`,
                                      [{ text: 'OK' }]
                                    );
                                  } else {
                                    Alert.alert('❌ Test Failed', `Error: ${alertResult.error}`);
                                  }
                                }
                              }
                            ]
                          );
                        } catch (error) {
                          Alert.alert('❌ Error', `Failed to create test alert: ${error.message}`);
                        }
                      }
                    },
                    { text: 'Show Details', onPress: () => {
                      if (securityScoreData) {
                        console.log('🔒 Security Score Details:', securityScoreData);
                        Alert.alert(
                          'Security Details',
                          `Messages Analyzed: ${securityScoreData.messagesAnalyzed}\nFraud: ${securityScoreData.fraudMessages}\nSuspicious: ${securityScoreData.suspiciousMessages}\nSafe: ${securityScoreData.safeMessages}\nLast Updated: ${new Date(securityScoreData.lastCalculated).toLocaleString()}\nReal-time Listener: ${securityScoreListenerActive ? 'Active ✅' : 'Inactive ❌'}`
                        );
                      }
                    }}
                  ]
                );
              }}
            >
              <Ionicons name="shield-checkmark" size={16} color={colors.white} />
            </TouchableOpacity>
            
            {/* 📱 Push Notification Test Button */}
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.info, marginRight: 8 }]}
              onPress={async () => {
                try {
                  await NotificationManager.sendTestNotification();
                  await SMSMonitor.sendTestSMSNotification();
                  Alert.alert(
                    '📱 Test Notifications Sent!', 
                    'Check if you received the push notifications. Also check the notification panel by tapping the bell icon.',
                    [
                      { text: 'OK' },
                      { 
                        text: 'Open Notifications', 
                        onPress: () => setNotificationPanelVisible(true)
                      }
                    ]
                  );
                } catch (error) {
                  Alert.alert('Error', `Failed to send test notifications: ${error.message}`);
                }
              }}
            >
              <Ionicons name="notifications" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Offline Error Banner */}
        {offlineError && (
          <View style={styles.offlineBanner}>
            <MaterialIcons name="info" size={16} color={colors.warning} />
            <Text style={styles.offlineBannerText}>{offlineError}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Security Score Card */}
        <Card style={styles.securityCard} variant="elevated">
          <View style={styles.securityHeader}>
            <View style={styles.securityTitleContainer}>
              <MaterialIcons name="security" size={24} color={colors.primary} />
              <Text style={styles.securityTitle}>Security Score</Text>
              {securityScoreLoading && (
                <ActivityIndicator 
                  size="small" 
                  color={colors.primary} 
                  style={{ marginLeft: 8 }} 
                />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Real-time listener status indicator */}
              {securityScoreListenerActive && (
                <View style={styles.realtimeIndicator}>
                  <View style={styles.realtimeDot} />
                  <Text style={styles.realtimeText}>Live</Text>
                </View>
              )}
              
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    setSecurityScoreLoading(true);
                    
                    // Clear any cached data first
                    setSecurityScoreData(null);
                    
                    console.log('🔄 AGGRESSIVE REFRESH: Clearing all caches and forcing fresh calculation...');
                    
                    // Force fresh calculation directly
                    const freshScore = await SecurityScoreManager.calculateSecurityScore(user.uid);
                    console.log('🔒 Aggressive refresh result:', freshScore);
                    
                    if (freshScore && freshScore.securityScore !== undefined) {
                      setSecurityScoreData(freshScore);
                      setFraudScore(100 - freshScore.securityScore);
                      console.log(`🔒 Score updated to: ${freshScore.securityScore}/100`);
                    } else {
                      console.error('❌ Fresh calculation returned invalid data:', freshScore);
                      // Try the old method as fallback
                      await loadSecurityScore(true);
                    }
                  } catch (error) {
                    console.error('❌ Aggressive refresh failed:', error);
                  } finally {
                    setSecurityScoreLoading(false);
                  }
                }}
                style={styles.refreshScoreButton}
                disabled={securityScoreLoading}
              >
                <MaterialIcons 
                  name="refresh" 
                  size={20} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
              <View style={[styles.riskBadge, { backgroundColor: risk.color + '20', marginLeft: 8 }]}>
                <Text style={[styles.riskText, { color: risk.color }]}>
                  {risk.text}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>
              {securityScoreData?.securityScore || (100 - fraudScore)}/100
            </Text>
            <View style={styles.scoreBar}>
              <View 
                style={[
                  styles.scoreProgress, 
                  { 
                    width: `${securityScoreData?.securityScore || (100 - fraudScore)}%`, 
                    backgroundColor: risk.color 
                  }
                ]} 
              />
            </View>
            
            {/* Auto-load security score if not available */}
            {!securityScoreData && !securityScoreLoading && (
              <TouchableOpacity 
                style={styles.autoLoadButton}
                onPress={async () => {
                  try {
                    setSecurityScoreLoading(true);
                    Alert.alert('🔄 Loading New Security System...', 'Calculating your real security score...');
                    
                    // Direct calculation bypassing all caches
                    const directScore = await SecurityScoreManager.calculateSecurityScore(user.uid);
                    console.log('🔒 Direct score calculation result:', directScore);
                    
                    if (directScore && directScore.securityScore !== undefined) {
                      setSecurityScoreData(directScore);
                      setFraudScore(100 - directScore.securityScore);
                      
                      setTimeout(() => {
                        Alert.alert(
                          '✅ Success!',
                          `Your real security score is ${directScore.securityScore}/100\n\nBased on:\n• ${directScore.fraudMessages} fraud alerts (-${directScore.fraudMessages * 10}%)\n• ${directScore.suspiciousMessages} suspicious messages (-${directScore.suspiciousMessages * 3}%)\n\nFinal: 100 - ${(directScore.fraudMessages * 10) + (directScore.suspiciousMessages * 3)} = ${directScore.securityScore}%`,
                          [{ text: 'Perfect!' }]
                        );
                      }, 500);
                    } else {
                      Alert.alert('❌ Failed', 'Could not calculate security score. Check console for errors.');
                    }
                  } catch (error) {
                    console.error('❌ Direct calculation error:', error);
                    Alert.alert('❌ Error', `Failed: ${error.message}`);
                  } finally {
                    setSecurityScoreLoading(false);
                  }
                }}
              >
                <Text style={styles.autoLoadText}>🔄 Tap to load new security system</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.scoreDescription}>
            {securityScoreData ? (
              `✅ Security analysis complete${securityScoreListenerActive ? ' • Real-time monitoring active' : ''}`
            ) : (
              `⚠️ Calculating your security score...${securityScoreListenerActive ? ' • Real-time monitoring active' : ''}`
            )}
          </Text>
          
          {securityScoreData?.recommendations?.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>🛡️ Security Tips:</Text>
              {securityScoreData.recommendations.slice(0, 2).map((rec, index) => (
                <Text key={index} style={styles.recommendationText}>
                  • {rec.message}
                </Text>
              ))}
            </View>
          )}
        </Card>

        {/* Financial Summary Card */}
        <Card style={styles.summaryCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {apiSummary && apiSummary.analysis_month 
                ? `Financial Summary - ${apiSummary.analysis_month}`
                : 'Financial Summary'
              }
            </Text>
            {apiSummary && apiSummary.analysis_timestamp && (
              <Text style={styles.timestampText}>
                Last updated: {apiSummary.analysis_timestamp}
              </Text>
            )}
          </View>
          
          <View style={styles.summaryGrid}>
            {apiSummary ? (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {`RWF ${apiSummary.total_sent?.toLocaleString() || '0'}`}
                  </Text>
                  <Text style={styles.summaryLabel}>Sent</Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {`RWF ${apiSummary.total_received?.toLocaleString() || '0'}`}
                  </Text>
                  <Text style={styles.summaryLabel}>Received</Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {apiSummary.transactions_count || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    {apiSummary.amount_transactions_count ? 
                      `Messages (${apiSummary.amount_transactions_count} with amounts)` : 
                      'Messages'
                    }
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {`RWF ${apiSummary.latest_balance?.toLocaleString() || '0'}`}
                  </Text>
                  <Text style={styles.summaryLabel}>Balance</Text>
                </View>
                
                {apiSummary.total_withdrawn > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.warning }]}>
                      {`RWF ${apiSummary.total_withdrawn?.toLocaleString() || '0'}`}
                    </Text>
                    <Text style={styles.summaryLabel}>Withdrawn</Text>
                  </View>
                )}
                
                {apiSummary.total_airtime > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#8b5cf6' }]}>
                      {`RWF ${apiSummary.total_airtime?.toLocaleString() || '0'}`}
                    </Text>
                    <Text style={styles.summaryLabel}>Payment</Text>
                  </View>
                )}
                
                {/* Analysis Info */}
                {(apiSummary.total_messages || apiSummary.transaction_messages) && (
                  <View style={styles.analysisInfo}>
                    <Text style={styles.analysisInfoText}>
                      📊 Analyzed {apiSummary.transaction_messages || apiSummary.transactions_count} transaction messages 
                      {apiSummary.total_messages && ` from ${apiSummary.total_messages} total SMS messages`}
                      {apiSummary.analysis_month && ` in ${apiSummary.analysis_month}`}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <MaterialIcons name="analytics" size={48} color={colors.textSecondary} />
                <Text style={styles.placeholderText}>
                  Click "Get Real Summary" to analyze your current month ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}) SMS transactions
                </Text>
              </View>
            )}
          </View>
          
          {!apiSummary && (
            <TouchableOpacity 
              style={[styles.fetchButton, apiLoading && styles.fetchButtonDisabled]} 
              onPress={fetchRealSummary}
              disabled={apiLoading}
            >
              <MaterialIcons name="refresh" size={20} color={colors.white} />
              <Text style={styles.fetchButtonText}>
                {apiLoading ? `Analyzing ${new Date().toLocaleString('default', { month: 'long' })}...` : 'Get Real Summary'}
              </Text>
            </TouchableOpacity>
          )}
          
          {apiSummary && (
            <TouchableOpacity 
              style={[styles.refreshButton, apiLoading && styles.fetchButtonDisabled]} 
              onPress={fetchRealSummary}
              disabled={apiLoading}
            >
              <MaterialIcons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.refreshButtonText}>
                {apiLoading ? 'Updating...' : 'Refresh Data'}
              </Text>
            </TouchableOpacity>
          )}
          
          {apiError && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="info" size={16} color={colors.warning} />
              <Text style={styles.errorText}>{apiError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchRealSummary}
                disabled={apiLoading}
              >
                <MaterialIcons name="refresh" size={14} color={colors.primary} />
                <Text style={styles.retryButtonText}>
                  {apiLoading ? 'Retrying...' : 'Retry'}
                </Text>
              </TouchableOpacity>
              
              {/* API Test Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#007AFF',
                  padding: 8,
                  borderRadius: 6,
                  marginTop: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={testAPIConnection}
              >
                <MaterialIcons name="wifi-protected-setup" size={16} color="white" />
                <Text style={{
                  color: 'white',
                  marginLeft: 4,
                  fontSize: 12,
                  fontWeight: '600'
                }}>
                  Test API Connection
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryLight }]}>
                <MaterialIcons name="message" size={20} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Advice')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.successLight }]}>
                <MaterialIcons name="lightbulb" size={20} color={colors.success} />
              </View>
              <Text style={styles.quickActionText}>Advice</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.warningLight }]}>
                <MaterialIcons name="analytics" size={20} color={colors.warning} />
              </View>
              <Text style={styles.quickActionText}>Scan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.infoLight }]}>
                <MaterialIcons name="person" size={20} color={colors.info} />
              </View>
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Recent Alerts</Text>
              {alertsLoading && (
                <ActivityIndicator 
                  size="small" 
                  color={colors.primary} 
                  style={{ marginLeft: 8 }} 
                />
              )}
              {realtimeAlerts.length > 0 && !alertsLoading && (
                <View style={styles.realtimeBadge}>
                  <Text style={styles.realtimeBadgeText}>🔴 Live</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {currentData.alerts.slice(0, 2).map((alert) => {
            const alertIcon = getRiskIcon(alert.risk);
            return (
              <Card key={alert.id} style={styles.alertCard}>
                <View style={styles.alertContent}>
                  <View style={[styles.alertIcon, { backgroundColor: alertIcon.color + '20' }]}>
                    <MaterialIcons name={alertIcon.name} size={20} color={alertIcon.color} />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertText} numberOfLines={2}>
                      {alert.content}
                    </Text>
                    <Text style={styles.alertTime}>{alert.timestamp}</Text>
                  </View>
                  <TouchableOpacity style={styles.alertArrow}>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
      </ScreenWrapper>
      
      {/* Notification Panel Modal */}
      <NotificationPanel
        visible={notificationPanelVisible}
        onClose={() => setNotificationPanelVisible(false)}
        navigation={navigation}
        user={user}
      />
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 8,
    gap: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  
  // Firebase Error Styles
  errorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Connection Status Styles
  connectionStatusGood: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  connectionStatusBad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
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
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
    paddingHorizontal: 2,
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 60, // Reduced padding for bottom navigation
  },
  securityCard: {
    marginTop: 20,
    marginBottom: 16,
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  analysisInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  refreshText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  fetchButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fetchButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  fetchButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  refreshButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  placeholderContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  apiSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  apiSummaryItem: {
    width: '50%',
    marginBottom: 12,
  },
  apiSummaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  apiSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  refreshApiButton: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshApiButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  connectApiButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  connectApiButtonLoading: {
    backgroundColor: colors.primary + '80',
  },
  connectApiButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  apiErrorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  analysisInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  alertCard: {
    marginBottom: 8,
    padding: 16,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  alertArrow: {
    padding: 4,
  },
  summaryCard: {
    padding: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  transactionCard: {
    marginBottom: 8,
    padding: 16,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  realtimeBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  realtimeBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  refreshScoreButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  realtimeText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
  },
  recommendationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
    lineHeight: 16,
  },
  
  // User Data Status Styles
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  loadingText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  cacheText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  firstConnectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  firstConnectionText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  userStats: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  
  // Error and Status Indicators
  errorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    fontWeight: '500',
    marginLeft: 4,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  activeText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '500',
    marginLeft: 4,
  },
});