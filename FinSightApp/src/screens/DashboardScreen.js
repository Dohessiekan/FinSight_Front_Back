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
      const alertsRef = collection(db, 'fraudAlerts');
      
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
      const alertsRef = collection(db, 'fraudAlerts');
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
      
      const scoreData = await SecurityScoreManager.getSecurityScore(user.uid, forceRefresh);
      
      if (scoreData) {
        setSecurityScoreData(scoreData);
        setFraudScore(100 - scoreData.securityScore); // Invert for fraudScore (higher fraud = lower security)
        
        console.log(`🔒 Security score loaded: ${scoreData.securityScore}/100 (${scoreData.riskLevel?.text})`);
        
        // Show recommendations if score is low
        if (scoreData.securityScore < 60 && scoreData.recommendations?.length > 0) {
          console.log('⚠️ Security recommendations available:', scoreData.recommendations);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load security score:', error);
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

  // Setup real-time alerts listener
  useEffect(() => {
    let unsubscribe;
    
    if (user) {
      console.log('🔄 Setting up real-time alerts listener for user:', user.uid);
      unsubscribe = setupRealtimeAlerts();
    } else {
      // Clear alerts state when user signs out
      console.log('🔄 User signed out - clearing alerts state');
      setRealtimeAlerts([]);
      setAlertsLoading(false);
      setAlertsListenerActive(false);
      setFirebaseError(null);
    }
    
    // Cleanup function
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
          console.log('🔄 Real-time alerts listener cleaned up');
        } catch (error) {
          console.error('⚠️ Error cleaning up alerts listener:', error);
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
      
      // Import SMS Service
      const SMSService = (await import('../services/SMSService')).default;
      
      // Check permissions with clear user messaging
      console.log('📱 Checking SMS permissions for financial analysis...');
      
      const hasPermissions = await SMSService.checkSMSPermissions();
      if (!hasPermissions) {
        console.log('📱 SMS permissions needed - requesting from user...');
        
        const granted = await SMSService.requestSMSPermissions();
        if (!granted) {
          throw new Error(`SMS permissions are required to analyze your ${currentMonthName} transactions. Please grant SMS access in your device settings and try again.`);
        }
        
        console.log('✅ SMS permissions granted for financial analysis');
      } else {
        console.log('✅ SMS permissions already available');
      }

      // Get all SMS messages
      const allMessages = await SMSService.getAllSMS({ maxCount: 1000 });
      console.log(`📱 Retrieved ${allMessages.length} total SMS messages`);
      
      // Filter to ONLY current month (same logic as MessagesScreen)
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const currentMonthMessages = allMessages.filter(message => {
        const messageDate = new Date(parseInt(message.date));
        return messageDate.getMonth() === currentMonth && 
               messageDate.getFullYear() === currentYear;
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
        if (!text) return false;
        
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

      // Extract message texts for API analysis
      const messageTexts = transactionMessages.map(msg => msg.body || msg.text || '');
      
      // Send to API for financial analysis (using getSmsSummary from api.js)
      const summary = await getSmsSummary(messageTexts);
      
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
        await saveUserFinancialSummary(user.uid, enhancedSummary);
      }
      
      // Update fraud score based on API response
      if (summary.suspicious_transactions > 0) {
        setFraudScore(Math.min(50 + (summary.suspicious_transactions * 10), 95));
        
        // Create fraud alert for admin dashboard
        if (user && summary.suspicious_transactions > 2) {
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
        }
      } else {
        setFraudScore(Math.max(5, 15 - (summary.transactions_count || 0)));
      }
      
    } catch (error) {
      console.error('❌ Error in fetchRealSummary:', error);
      setApiError(`Failed to analyze SMS: ${error.message}`);
      
      // Fallback summary
      setApiSummary({
        transactions_count: 0,
        total_sent: 0,
        total_received: 0,
        total_withdrawn: 0,
        total_airtime: 0,
        latest_balance: 0,
        monthly_summary: {},
        message: `Error: ${error.message}`
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
            
            {/* 🔒 Security Score Test Button */}
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.success, marginRight: 8 }]}
              onPress={() => {
                Alert.alert(
                  'Security Score Test',
                  `Current Score: ${securityScoreData?.securityScore || (100 - fraudScore)}/100\nRisk Level: ${risk.text}\n\nRefresh security score?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Refresh', onPress: () => loadSecurityScore(true) },
                    { text: 'Show Details', onPress: () => {
                      if (securityScoreData) {
                        console.log('🔒 Security Score Details:', securityScoreData);
                        Alert.alert(
                          'Security Details',
                          `Messages Analyzed: ${securityScoreData.messagesAnalyzed}\nFraud: ${securityScoreData.fraudMessages}\nSuspicious: ${securityScoreData.suspiciousMessages}\nSafe: ${securityScoreData.safeMessages}\nLast Updated: ${new Date(securityScoreData.lastCalculated).toLocaleString()}`
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
              <TouchableOpacity 
                onPress={() => loadSecurityScore(true)}
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
          </View>
          
          <Text style={styles.scoreDescription}>
            {securityScoreData ? (
              `Based on analysis of ${securityScoreData.messagesAnalyzed} messages. ${securityScoreData.fraudMessages + securityScoreData.suspiciousMessages} threats detected.`
            ) : (
              `Your account is ${risk.text.toLowerCase()}. ${fraudScore > 0 && `${fraudScore} potential threats detected.`}`
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
            </View>
          )}
          
          {/* Monthly Breakdown - show if we have monthly summary from API */}
          {apiSummary && apiSummary.monthly_summary && Object.keys(apiSummary.monthly_summary).length > 0 && (
            <View style={styles.monthlyBreakdown}>
              <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}>Monthly Outgoing (Sent + Payments)</Text>
              {Object.entries(apiSummary.monthly_summary).map(([month, amount]) => (
                <View key={month} style={styles.monthlyItem}>
                  <Text style={styles.monthlyMonth}>{month}</Text>
                  <Text style={styles.monthlyAmount}>RWF {amount?.toLocaleString() || '0'}</Text>
                </View>
              ))}
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
    flexDirection: 'row',
    alignItems: 'center',
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
  monthlyBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  monthlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  monthlyMonth: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  monthlyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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