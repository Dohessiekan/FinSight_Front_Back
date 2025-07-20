// Data Recovery and Persistence Utility for FinSight Mobile App
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

class DataRecoveryService {
  constructor() {
    this.userId = null;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  // Generate cache keys for user-specific data
  getCacheKeys() {
    if (!this.userId) return {};
    
    return {
      messages: `messages_${this.userId}`,
      lastScan: `last_scan_${this.userId}`,
      userProfile: `user_profile_${this.userId}`,
      analysisResults: `analysis_results_${this.userId}`,
      fraudAlerts: `fraud_alerts_${this.userId}`,
      financialSummary: `financial_summary_${this.userId}`
    };
  }

  // Save all user data to local cache
  async saveUserDataToCache(data) {
    if (!this.userId) return false;

    try {
      const keys = this.getCacheKeys();
      
      const savePromises = [];
      
      if (data.messages) {
        savePromises.push(AsyncStorage.setItem(keys.messages, JSON.stringify(data.messages)));
      }
      
      if (data.scanInfo) {
        savePromises.push(AsyncStorage.setItem(keys.lastScan, JSON.stringify(data.scanInfo)));
      }
      
      if (data.userProfile) {
        savePromises.push(AsyncStorage.setItem(keys.userProfile, JSON.stringify(data.userProfile)));
      }
      
      if (data.analysisResults) {
        savePromises.push(AsyncStorage.setItem(keys.analysisResults, JSON.stringify(data.analysisResults)));
      }
      
      if (data.fraudAlerts) {
        savePromises.push(AsyncStorage.setItem(keys.fraudAlerts, JSON.stringify(data.fraudAlerts)));
      }
      
      if (data.financialSummary) {
        savePromises.push(AsyncStorage.setItem(keys.financialSummary, JSON.stringify(data.financialSummary)));
      }
      
      await Promise.all(savePromises);
      
      // Save timestamp of last cache update
      await AsyncStorage.setItem(`last_cache_update_${this.userId}`, new Date().toISOString());
      
      console.log(`✅ Saved all user data to cache for user: ${this.userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error saving user data to cache:', error);
      return false;
    }
  }

  // Load all user data from local cache
  async loadUserDataFromCache() {
    if (!this.userId) return null;

    try {
      const keys = this.getCacheKeys();
      
      const [
        messages,
        scanInfo,
        userProfile,
        analysisResults,
        fraudAlerts,
        financialSummary,
        lastCacheUpdate
      ] = await Promise.all([
        this.getFromCache(keys.messages),
        this.getFromCache(keys.lastScan),
        this.getFromCache(keys.userProfile),
        this.getFromCache(keys.analysisResults),
        this.getFromCache(keys.fraudAlerts),
        this.getFromCache(keys.financialSummary),
        AsyncStorage.getItem(`last_cache_update_${this.userId}`)
      ]);

      const userData = {
        userId: this.userId,
        messages: messages || [],
        scanInfo: scanInfo || null,
        userProfile: userProfile || null,
        analysisResults: analysisResults || [],
        fraudAlerts: fraudAlerts || [],
        financialSummary: financialSummary || null,
        lastCacheUpdate: lastCacheUpdate ? new Date(lastCacheUpdate) : null,
        hasCache: !!(messages || scanInfo || userProfile)
      };

      console.log(`📱 Loaded cached data for user ${this.userId}:`, {
        messagesCount: userData.messages.length,
        hasScanInfo: !!userData.scanInfo,
        hasProfile: !!userData.userProfile,
        fraudAlertsCount: userData.fraudAlerts.length,
        lastUpdate: userData.lastCacheUpdate?.toLocaleString()
      });

      return userData;
    } catch (error) {
      console.error('❌ Error loading user data from cache:', error);
      return null;
    }
  }

  // Helper function to get data from cache
  async getFromCache(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error loading from cache key ${key}:`, error);
      return null;
    }
  }

  // Load data from Firebase (fallback when cache is empty or outdated)
  async loadUserDataFromFirebase() {
    if (!this.userId) return null;

    try {
      console.log(`🔥 Loading fresh data from Firebase for user: ${this.userId}`);
      
      // Load messages from Firebase
      const messagesRef = collection(db, 'users', this.userId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1000));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate()?.toLocaleString() || doc.data().timestamp
      }));

      // Load user profile
      const userProfileRef = collection(db, 'users');
      const userQuery = query(userProfileRef, where('__name__', '==', this.userId), limit(1));
      const userSnapshot = await getDocs(userQuery);
      
      const userProfile = userSnapshot.docs.length > 0 ? {
        id: userSnapshot.docs[0].id,
        ...userSnapshot.docs[0].data()
      } : null;

      const firebaseData = {
        messages,
        userProfile,
        source: 'firebase',
        loadedAt: new Date().toISOString()
      };

      console.log(`🔥 Loaded from Firebase:`, {
        messagesCount: messages.length,
        hasProfile: !!userProfile
      });

      // Save to cache for next time
      await this.saveUserDataToCache(firebaseData);

      return firebaseData;
    } catch (error) {
      console.error('❌ Error loading data from Firebase:', error);
      return null;
    }
  }

  // Complete data recovery process - checks cache first, then Firebase
  async recoverUserData() {
    if (!this.userId) {
      console.error('❌ Cannot recover data: No user ID provided');
      return null;
    }

    console.log(`🔄 Starting data recovery for user: ${this.userId}`);

    // Step 1: Try to load from cache
    const cachedData = await this.loadUserDataFromCache();
    
    if (cachedData && cachedData.hasCache) {
      // Check if cache is recent (less than 24 hours old)
      const cacheAge = cachedData.lastCacheUpdate ? 
        (new Date() - cachedData.lastCacheUpdate) / (1000 * 60 * 60) : Infinity;
      
      if (cacheAge < 24) {
        console.log(`✅ Using cached data (${cacheAge.toFixed(1)} hours old)`);
        return {
          ...cachedData,
          source: 'cache',
          cacheAgeHours: cacheAge
        };
      } else {
        console.log(`⚠️ Cache is old (${cacheAge.toFixed(1)} hours), fetching fresh data...`);
      }
    }

    // Step 2: Load fresh data from Firebase
    const firebaseData = await this.loadUserDataFromFirebase();
    
    if (firebaseData) {
      return {
        ...firebaseData,
        userId: this.userId,
        source: 'firebase'
      };
    }

    // Step 3: Fallback to cached data even if old
    if (cachedData && cachedData.hasCache) {
      console.log(`⚠️ Using old cached data as fallback`);
      return {
        ...cachedData,
        source: 'cache_fallback'
      };
    }

    console.log(`❌ No data found for user: ${this.userId}`);
    return null;
  }

  // Clear all cached data for user (useful for logout)
  async clearUserCache() {
    if (!this.userId) return;

    try {
      const keys = this.getCacheKeys();
      const keyNames = Object.values(keys);
      keyNames.push(`last_cache_update_${this.userId}`);
      
      await AsyncStorage.multiRemove(keyNames);
      console.log(`🗑️ Cleared all cached data for user: ${this.userId}`);
    } catch (error) {
      console.error('❌ Error clearing user cache:', error);
    }
  }

  // Check cache status
  async getCacheStatus() {
    if (!this.userId) return null;

    const keys = this.getCacheKeys();
    const status = {};

    for (const [dataType, key] of Object.entries(keys)) {
      try {
        const data = await AsyncStorage.getItem(key);
        status[dataType] = {
          exists: !!data,
          size: data ? data.length : 0,
          itemCount: data ? JSON.parse(data).length || 1 : 0
        };
      } catch (error) {
        status[dataType] = { exists: false, error: error.message };
      }
    }

    const lastUpdate = await AsyncStorage.getItem(`last_cache_update_${this.userId}`);
    status.lastUpdate = lastUpdate ? new Date(lastUpdate) : null;

    return status;
  }
}

// Singleton instance
const dataRecoveryService = new DataRecoveryService();

export default dataRecoveryService;
