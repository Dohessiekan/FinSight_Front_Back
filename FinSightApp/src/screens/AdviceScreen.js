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
  serverTimestamp
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

  const generatePersonalizedAdvice = (preferences) => {
    // Generate advice based on user's financial patterns and preferences
    const baseAdvice = [
      {
        id: 'budget',
        title: 'Smart Budgeting',
        description: 'Create a monthly budget to track your spending',
        category: 'budgeting',
        priority: 'high'
      },
      {
        id: 'emergency',
        title: 'Emergency Fund',
        description: 'Build an emergency fund with 3-6 months of expenses',
        category: 'saving',
        priority: 'high'
      },
      {
        id: 'fraud',
        title: 'Fraud Prevention',
        description: 'Always verify suspicious transactions before responding',
        category: 'security',
        priority: 'critical'
      }
    ];

    // Customize advice based on user preferences
    setPersonalizedAdvice(baseAdvice);
    
    // Cache the generated advice
    saveToCache(CACHE_KEYS.PERSONALIZED_ADVICE, baseAdvice);
    saveToCache(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
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
});