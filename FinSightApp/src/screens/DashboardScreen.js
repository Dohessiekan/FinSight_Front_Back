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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Card from '../components/Card';
import colors from '../theme/colors';
import { getSmsSummary, analyzeMessages, getFinancialSummary } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
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
  onSnapshot 
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

  useEffect(() => {
    if (user) {
      // First load cached data immediately for better UX
      loadCachedData();
      
      // Then try to load fresh data from Firebase
      loadUserDataFromFirebase().then(() => {
        // If successful, try to sync any queued offline data
        syncQueuedData();
      });
    }
  }, [user]);

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
    alerts: [
      {
        id: '1',
        content: 'Suspicious SMS detected: Account verification request',
        timestamp: '2 mins ago',
        risk: 'High',
        type: 'phishing'
      },
      {
        id: '2',
        content: 'Unusual transaction pattern detected',
        timestamp: '1 hour ago',
        risk: 'Medium',
        type: 'transaction'
      },
      {
        id: '3',
        content: 'New login attempt from unrecognized device',
        timestamp: '3 hours ago',
        risk: 'High',
        type: 'security'
      },
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
      // Import SMS Service and dedicated analysis function
      const SMSService = (await import('../services/SMSService')).default;
      const { analyzeCurrentMonthSMS } = await import('../utils/api');
      
      console.log('Starting real SMS analysis...');
      
      // Use the dedicated analysis function
      const result = await analyzeCurrentMonthSMS(SMSService);
      
      if (result.success) {
        setApiSummary(result.data);
        console.log(`Analysis complete: ${result.transactionCount} transactions from ${result.messageCount} SMS messages`);
        
        // Update fraud score based on API response
        if (result.data.suspicious_transactions > 0) {
          setFraudScore(Math.min(50 + (result.data.suspicious_transactions * 10), 95));
        } else {
          setFraudScore(Math.max(5, 15 - (result.data.transactions_count || 0)));
        }
      } else {
        setApiError(result.error);
        setApiSummary(result.data);
      }
      
    } catch (error) {
      console.error('Error in fetchRealSummary:', error);
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
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isOffline && (
              <View style={styles.offlineIndicator}>
                <MaterialIcons name="cloud-off" size={16} color={colors.warning} />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
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
            </View>
            <View style={[styles.riskBadge, { backgroundColor: risk.color + '20' }]}>
              <Text style={[styles.riskText, { color: risk.color }]}>
                {risk.text}
              </Text>
            </View>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{100 - fraudScore}/100</Text>
            <View style={styles.scoreBar}>
              <View 
                style={[
                  styles.scoreProgress, 
                  { width: `${100 - fraudScore}%`, backgroundColor: risk.color }
                ]} 
              />
            </View>
          </View>
          
          <Text style={styles.scoreDescription}>
            Your account is {risk.text.toLowerCase()}. {fraudScore > 0 && `${fraudScore} potential threats detected.`}
          </Text>
        </Card>

        {/* Financial Summary Card */}
        <Card style={styles.summaryCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Summary</Text>
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
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <MaterialIcons name="analytics" size={48} color={colors.textSecondary} />
                <Text style={styles.placeholderText}>Click "Get Real Summary" to analyze your SMS transactions</Text>
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
                {apiLoading ? 'Analyzing SMS...' : 'Get Real Summary'}
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
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
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
});
