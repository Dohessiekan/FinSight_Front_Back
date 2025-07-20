import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing, SafeAreaView, StatusBar, TouchableOpacity, Alert } from 'react-native';
import Card from '../components/Card';
import colors from '../theme/colors';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  getDocs
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdviceScreen() {
  const { user } = useAuth();
  const [userPreferences, setUserPreferences] = useState(null);
  const [personalizedAdvice, setPersonalizedAdvice] = useState([]);
  const [savedAdvice, setSavedAdvice] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineError, setOfflineError] = useState(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(20)).current;

  // Keys for AsyncStorage
  const CACHE_KEYS = {
    USER_PREFERENCES: `advice_preferences_${user?.uid}`,
    PERSONALIZED_ADVICE: `personalized_advice_${user?.uid}`,
    SAVED_ADVICE: `saved_advice_${user?.uid}`,
    LAST_SYNC: `advice_last_sync_${user?.uid}`,
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
  const saveAdvicePreferences = async (preferences) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        advicePreferences: preferences,
        lastUpdated: serverTimestamp()
      });
      
      // Cache the preferences for offline use
      await saveToCache(CACHE_KEYS.USER_PREFERENCES, preferences);
      setOfflineError(null);
    } catch (error) {
      console.error('Error saving preferences:', error);
      
      if (isFirebaseOfflineError(error)) {
        // Save to cache for offline access
        await saveToCache(CACHE_KEYS.USER_PREFERENCES, preferences);
        setIsOffline(true);
        setOfflineError('Preferences saved locally. Will sync when online.');
      }
    }
  };

  const saveAdviceToFavorites = async (advice) => {
    if (!user) return;
    
    try {
      const adviceRef = doc(collection(db, 'users', user.uid, 'savedAdvice'));
      await setDoc(adviceRef, {
        ...advice,
        savedAt: serverTimestamp(),
        userId: user.uid
      });
      Alert.alert('Success', 'Advice saved to your favorites!');
    } catch (error) {
      console.error('Error saving advice:', error);
      
      if (isFirebaseOfflineError(error)) {
        // Queue advice for later sync when online
        const queuedAdvice = await loadFromCache('queued_advice') || [];
        queuedAdvice.push({
          ...advice,
          savedAt: new Date(),
          userId: user.uid,
          queuedAt: new Date().toISOString()
        });
        await saveToCache('queued_advice', queuedAdvice);
        
        Alert.alert(
          'Offline Mode',
          'Advice saved locally. It will sync when you are back online.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to save advice');
      }
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      setOfflineError(null);
      setIsOffline(false);
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().advicePreferences) {
        const preferences = userDoc.data().advicePreferences;
        setUserPreferences(preferences);
        generatePersonalizedAdvice(preferences);
        
        // Cache the preferences for offline use
        await saveToCache(CACHE_KEYS.USER_PREFERENCES, preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      
      if (isFirebaseOfflineError(error)) {
        setIsOffline(true);
        setOfflineError('You are currently offline. Showing cached data.');
        await loadCachedData();
      } else {
        setOfflineError('Failed to load preferences. Please try again.');
      }
    }
  };

  // Helper function to get user's financial data
  const getUserFinancialData = async () => {
    try {
      if (!user) throw new Error('No user found');
      
      // Get user's financial summary from Firebase
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().financialSummary) {
        const summary = userDoc.data().financialSummary;
        return {
          transactionCount: summary.transactions_count || 0,
          totalSent: summary.total_sent || 0,
          totalReceived: summary.total_received || 0,
          totalWithdrawn: summary.total_withdrawn || 0,
          totalAirtime: summary.total_airtime || 0,
          latestBalance: summary.latest_balance || 0,
          suspiciousTransactions: summary.suspicious_transactions || 0,
          analysisMonth: summary.analysis_month || 'Current Month'
        };
      }
      
      // Fallback: Try to get from recent alerts/fraud data
      const alertsRef = collection(db, 'users', user.uid, 'fraudAlerts');
      const alertsQuery = query(alertsRef, orderBy('createdAt', 'desc'), limit(10));
      const alertsSnapshot = await getDocs(alertsQuery);
      
      const suspiciousCount = alertsSnapshot.docs.length;
      
      return {
        transactionCount: 0,
        totalSent: 0,
        totalReceived: 0,
        totalWithdrawn: 0,
        totalAirtime: 0,
        latestBalance: 0,
        suspiciousTransactions: suspiciousCount,
        analysisMonth: 'Current Month'
      };
      
    } catch (error) {
      console.error('Error getting user financial data:', error);
      return {
        transactionCount: 0,
        totalSent: 0,
        totalReceived: 0,
        totalWithdrawn: 0,
        totalAirtime: 0,
        latestBalance: 0,
        suspiciousTransactions: 0,
        analysisMonth: 'Current Month'
      };
    }
  };

  // Helper function to format amounts
  const formatAmount = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('en-RW').format(amount);
  };

  // Helper function to get icon color
  const getIconColor = (color) => {
    switch (color) {
      case 'primary': return colors.primary;
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'danger': return colors.danger;
      case 'info': return colors.info;
      default: return colors.primary;
    }
  };

  // Helper function to get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return colors.danger;
      case 'high': return colors.warning;
      case 'medium': return colors.info;
      case 'low': return colors.success;
      default: return colors.textSecondary;
  };

  const loadCachedData = async () => {
    try {
      // Load cached preferences
      const cachedPreferences = await loadFromCache(CACHE_KEYS.USER_PREFERENCES);
      if (cachedPreferences) {
        setUserPreferences(cachedPreferences);
        generatePersonalizedAdvice(cachedPreferences);
      }

      // Load cached advice
      const cachedAdvice = await loadFromCache(CACHE_KEYS.PERSONALIZED_ADVICE);
      if (cachedAdvice) {
        setPersonalizedAdvice(cachedAdvice);
      }

      const cachedSavedAdvice = await loadFromCache(CACHE_KEYS.SAVED_ADVICE);
      if (cachedSavedAdvice) {
        setSavedAdvice(cachedSavedAdvice);
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

  const loadSavedAdvice = () => {
    if (!user) return;
    
    try {
      const savedAdviceRef = collection(db, 'users', user.uid, 'savedAdvice');
      const q = query(savedAdviceRef, orderBy('savedAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const advice = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSavedAdvice(advice);
          
          // Cache saved advice for offline use
          saveToCache(CACHE_KEYS.SAVED_ADVICE, advice);
        },
        (error) => {
          console.error('Error in saved advice listener:', error);
          if (isFirebaseOfflineError(error)) {
            loadCachedData();
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error loading saved advice:', error);
      if (isFirebaseOfflineError(error)) {
        loadCachedData();
      }
    }
  };

  const generatePersonalizedAdvice = async (preferences) => {
    try {
      // Get user's financial data for analysis-based advice
      const userFinancialData = await getUserFinancialData();
      
      // Generate advice based on user's actual financial patterns
      const personalizedAdvice = [];

      // 1. SPENDING PATTERN ADVICE
      if (userFinancialData.totalSent > userFinancialData.totalReceived) {
        personalizedAdvice.push({
          id: 'spending_control',
          title: '💸 Control Your Spending',
          description: `You've sent RWF ${formatAmount(userFinancialData.totalSent)} but only received RWF ${formatAmount(userFinancialData.totalReceived)} this month. Consider reducing unnecessary expenses.`,
          category: 'budgeting',
          priority: 'high',
          actionable: true,
          icon: 'trending-down',
          color: 'warning'
        });
      } else if (userFinancialData.totalReceived > userFinancialData.totalSent) {
        personalizedAdvice.push({
          id: 'save_surplus',
          title: '💰 Save Your Surplus',
          description: `Great! You received RWF ${formatAmount(userFinancialData.totalReceived - userFinancialData.totalSent)} more than you spent. Consider saving this amount.`,
          category: 'saving',
          priority: 'medium',
          actionable: true,
          icon: 'wallet',
          color: 'success'
        });
      }

      // 2. TRANSACTION FREQUENCY ADVICE
      if (userFinancialData.transactionCount > 30) {
        personalizedAdvice.push({
          id: 'transaction_frequency',
          title: '📊 High Transaction Activity',
          description: `You had ${userFinancialData.transactionCount} transactions this month. Track expenses closely to avoid overspending.`,
          category: 'monitoring',
          priority: 'medium',
          actionable: true,
          icon: 'analytics',
          color: 'info'
        });
      }

      // 3. BALANCE OPTIMIZATION ADVICE
      if (userFinancialData.latestBalance) {
        if (userFinancialData.latestBalance < 50000) {
          personalizedAdvice.push({
            id: 'low_balance',
            title: '⚠️ Low Account Balance',
            description: `Your balance is RWF ${formatAmount(userFinancialData.latestBalance)}. Build an emergency fund of at least RWF 150,000.`,
            category: 'emergency',
            priority: 'high',
            actionable: true,
            icon: 'alert-circle',
            color: 'danger'
          });
        } else if (userFinancialData.latestBalance > 500000) {
          personalizedAdvice.push({
            id: 'investment_opportunity',
            title: '📈 Investment Opportunity',
            description: `With RWF ${formatAmount(userFinancialData.latestBalance)}, consider investing part of your funds for growth.`,
            category: 'investment',
            priority: 'low',
            actionable: true,
            icon: 'trending-up',
            color: 'primary'
          });
        }
      }

      // 4. AIRTIME/DATA SPENDING ADVICE
      if (userFinancialData.totalAirtime > 20000) {
        personalizedAdvice.push({
          id: 'airtime_optimization',
          title: '📱 Optimize Communication Costs',
          description: `You spent RWF ${formatAmount(userFinancialData.totalAirtime)} on airtime/data. Consider monthly bundles for savings.`,
          category: 'optimization',
          priority: 'low',
          actionable: true,
          icon: 'phone',
          color: 'info'
        });
      }

      // 5. SECURITY ADVICE (based on suspicious activity)
      if (userFinancialData.suspiciousTransactions > 0) {
        personalizedAdvice.push({
          id: 'security_alert',
          title: '🛡️ Security Alert',
          description: `${userFinancialData.suspiciousTransactions} suspicious transactions detected. Review your SMS messages and secure your accounts.`,
          category: 'security',
          priority: 'critical',
          actionable: true,
          icon: 'shield',
          color: 'danger'
        });
      } else {
        personalizedAdvice.push({
          id: 'security_good',
          title: '✅ Good Security Practices',
          description: 'No suspicious transactions detected. Keep monitoring your SMS for fraud attempts.',
          category: 'security',
          priority: 'low',
          actionable: false,
          icon: 'shield-checkmark',
          color: 'success'
        });
      }

      // 6. MONTHLY GOALS ADVICE
      const avgTransaction = userFinancialData.transactionCount > 0 ? 
        (userFinancialData.totalSent + userFinancialData.totalReceived) / userFinancialData.transactionCount : 0;
      
      if (avgTransaction > 50000) {
        personalizedAdvice.push({
          id: 'large_transactions',
          title: '🎯 Large Transaction Pattern',
          description: `Your average transaction is RWF ${formatAmount(avgTransaction)}. Budget carefully for these amounts.`,
          category: 'budgeting',
          priority: 'medium',
          actionable: true,
          icon: 'calculator',
          color: 'warning'
        });
      }

      // Add default advice if no personalized advice generated
      if (personalizedAdvice.length === 0) {
        personalizedAdvice.push({
          id: 'default_advice',
          title: '📊 Start Tracking Your Finances',
          description: 'Begin monitoring your SMS transactions to get personalized financial advice.',
          category: 'getting_started',
          priority: 'medium',
          actionable: true,
          icon: 'bar-chart',
          color: 'primary'
        });
      }

      setPersonalizedAdvice(personalizedAdvice);
      
      // Cache the generated advice
      await saveToCache(CACHE_KEYS.PERSONALIZED_ADVICE, personalizedAdvice);
      await saveToCache(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
      
    } catch (error) {
      console.error('Error generating personalized advice:', error);
      
      // Fallback to basic advice
      const fallbackAdvice = [
        {
          id: 'budget',
          title: 'Smart Budgeting',
          description: 'Create a monthly budget to track your spending',
          category: 'budgeting',
          priority: 'high',
          icon: 'calculator',
          color: 'primary'
        },
        {
          id: 'emergency',
          title: 'Emergency Fund',
          description: 'Build an emergency fund with 3-6 months of expenses',
          category: 'saving',
          priority: 'high',
          icon: 'shield',
          color: 'success'
        },
        {
          id: 'fraud',
          title: 'Fraud Prevention',
          description: 'Always verify suspicious transactions before responding',
          category: 'security',
          priority: 'critical',
          icon: 'warning',
          color: 'danger'
        }
      ];
      
      setPersonalizedAdvice(fallbackAdvice);
    }
  };

  useEffect(() => {
    if (user) {
      // First load cached data immediately for better UX
      loadCachedData();
      
      // Then try to load fresh data from Firebase
      loadUserPreferences();
      const unsubscribe = loadSavedAdvice();
      return () => unsubscribe && unsubscribe();
    }
  }, [user]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp)
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp)
      })
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Standardized Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Advice</Text>
          <Text style={styles.subtitle}>Financial tips & security guidance</Text>
        </View>
        <View style={styles.headerRight}>
          {isOffline && (
            <View style={styles.offlineIndicator}>
              <MaterialIcons name="cloud-off" size={16} color={colors.warning} />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
          <View style={styles.headerIcon}>
            <Ionicons name="bulb" size={24} color={colors.warning} />
          </View>
        </View>
      </View>
      
      {/* Offline Error Banner */}
      {offlineError && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="info" size={16} color={colors.warning} />
          <Text style={styles.offlineBannerText}>{offlineError}</Text>
        </View>
      )}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.cardContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }] 
            }
          ]}
        >
          {/* Financial Analysis Banner */}
          {personalizedAdvice.length > 0 && (
            <Card style={[styles.card, styles.bannerCard]}>
              <View style={styles.bannerContent}>
                <MaterialIcons name="analytics" size={20} color={colors.primary} />
                <Text style={styles.bannerText}>
                  Advice based on your SMS financial analysis
                </Text>
              </View>
            </Card>
          )}

          {/* Personalized Advice Cards */}
          {personalizedAdvice.map((advice) => (
            <Card key={advice.id} style={[styles.card, styles.cardElevated]}>
              <View style={styles.row}>
                <View style={[
                  styles.iconContainer, 
                  { backgroundColor: `${getIconColor(advice.color)}20` }
                ]}>
                  <Ionicons 
                    name={advice.icon} 
                    size={24} 
                    color={getIconColor(advice.color)} 
                  />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.adviceTitle}>{advice.title}</Text>
                    {advice.priority && (
                      <View style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(advice.priority) }
                      ]}>
                        <Text style={styles.priorityText}>{advice.priority.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.advice}>{advice.description}</Text>
                  {advice.actionable && (
                    <TouchableOpacity 
                      style={[styles.actionButton, { borderColor: getIconColor(advice.color) }]}
                      onPress={() => saveAdviceToFavorites(advice)}
                    >
                      <Text style={[styles.actionButtonText, { color: getIconColor(advice.color) }]}>
                        Save Advice
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          ))}

          {/* Fallback if no personalized advice */}
          {personalizedAdvice.length === 0 && (
            <>
              <Card style={[styles.card, styles.cardElevated]}>
                <View style={styles.row}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                    <MaterialIcons name="insights" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.adviceTitle}>Track Your Spending</Text>
                    <Text style={styles.advice}>Monitor your weekly expenses to avoid overspending and identify saving opportunities.</Text>
                  </View>
                </View>
              </Card>
              
              <Card style={[styles.card, styles.cardElevated]}>
                <View style={styles.row}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.warningLight }]}>
                    <MaterialIcons name="warning" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.adviceTitle}>Beware of Scams</Text>
                    <Text style={styles.advice}>Be cautious of suspicious messages asking for money or personal information.</Text>
                  </View>
                </View>
              </Card>
              
              <Card style={[styles.card, styles.cardElevated]}>
                <View style={styles.row}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.successLight }]}>
                    <MaterialIcons name="verified-user" size={24} color={colors.success} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.adviceTitle}>Verify Senders</Text>
                    <Text style={styles.advice}>Always confirm the identity of recipients before making transactions.</Text>
                  </View>
                </View>
              </Card>
              
              <Card style={[styles.card, styles.cardElevated]}>
                <View style={styles.row}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.infoLight }]}>
                    <MaterialIcons name="savings" size={24} color={colors.info} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.adviceTitle}>Build an Emergency Fund</Text>
                    <Text style={styles.advice}>Aim to save 3-6 months of living expenses for unexpected situations.</Text>
                  </View>
                </View>
              </Card>
            </>
          )}
        </Animated.View>
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
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  cardContainer: {
    gap: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  advice: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bannerCard: {
    backgroundColor: colors.primaryLight,
    marginBottom: 12,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  bannerText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: 'bold',
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});