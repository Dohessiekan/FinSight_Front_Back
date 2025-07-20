import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import SecurityScoreManager from './SecurityScoreManager';
import { saveUserFinancialSummary } from './firebaseMessages';

/**
 * UserDataManager - Handles user data persistence and immediate display
 * 
 * Saves user data on first connection and provides instant access on return
 */
class UserDataManager {
  
  // Cache keys for different data types
  static CACHE_KEYS = {
    USER_PROFILE: 'user_profile_',
    SECURITY_SCORE: 'security_score_',
    FINANCIAL_DATA: 'financial_data_',
    MESSAGES_SUMMARY: 'messages_summary_',
    LAST_SYNC: 'last_sync_',
    FIRST_CONNECTION: 'first_connection_',
    USER_PREFERENCES: 'user_preferences_'
  };
  
  // Data freshness thresholds (in milliseconds)
  static FRESHNESS_THRESHOLDS = {
    PROFILE: 24 * 60 * 60 * 1000,      // 24 hours
    SECURITY_SCORE: 60 * 60 * 1000,    // 1 hour
    FINANCIAL_DATA: 60 * 60 * 1000,    // 1 hour
    MESSAGES_SUMMARY: 30 * 60 * 1000   // 30 minutes
  };
  
  /**
   * Initialize user on first connection
   */
  static async initializeUser(user) {
    try {
      console.log(`👋 Initializing user: ${user.uid}`);
      
      // Check if this is truly the first connection
      const isFirstConnection = await this.isFirstConnection(user.uid);
      
      if (isFirstConnection) {
        console.log('🆕 First-time user detected - creating initial profile');
        await this.createInitialUserProfile(user);
      }
      
      // Load or create complete user data
      const userData = await this.loadCompleteUserData(user.uid);
      
      // Cache all data locally for instant access
      await this.cacheUserData(user.uid, userData);
      
      console.log('✅ User initialization complete');
      return userData;
      
    } catch (error) {
      console.error('❌ User initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if this is the user's first connection
   */
  static async isFirstConnection(userId) {
    try {
      // Check local storage first
      const firstConnectionKey = this.CACHE_KEYS.FIRST_CONNECTION + userId;
      const localRecord = await AsyncStorage.getItem(firstConnectionKey);
      
      if (localRecord) {
        return false; // User has connected before
      }
      
      // Check Firebase user document
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Mark as not first connection locally
        await AsyncStorage.setItem(firstConnectionKey, JSON.stringify({
          firstConnection: false,
          timestamp: new Date().toISOString()
        }));
        return false;
      }
      
      return true; // Truly first connection
      
    } catch (error) {
      console.error('❌ Failed to check first connection:', error);
      return false; // Default to false to avoid recreating data
    }
  }
  
  /**
   * Create initial user profile and data
   */
  static async createInitialUserProfile(user) {
    try {
      console.log('🔧 Creating initial user profile...');
      
      // Create basic user profile
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        firstConnection: true,
        appVersion: '1.0.0',
        platform: 'mobile',
        
        // Initialize counters
        totalMessages: 0,
        totalScans: 0,
        fraudDetected: 0,
        suspiciousDetected: 0,
        safeMessages: 0,
        
        // Initialize security
        securityScore: 85, // Starting score
        riskLevel: 'Low Risk',
        lastSecurityUpdate: serverTimestamp(),
        
        // Initialize financial summary
        financialSummary: {
          totalSent: 0,
          totalReceived: 0,
          balance: 0,
          lastUpdated: serverTimestamp()
        },
        
        // User preferences
        preferences: {
          notifications: true,
          autoScan: false,
          securityAlerts: true,
          theme: 'light'
        }
      };
      
      // Save to Firebase
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, userProfile);
      
      // Calculate initial security score
      const initialSecurityScore = await SecurityScoreManager.calculateSecurityScore(user.uid);
      
      // Update user profile with calculated security score
      await updateDoc(userRef, {
        securityScore: initialSecurityScore.securityScore,
        riskLevel: initialSecurityScore.riskLevel.text,
        securityBreakdown: initialSecurityScore.scoreBreakdown
      });
      
      // Mark first connection complete
      const firstConnectionKey = this.CACHE_KEYS.FIRST_CONNECTION + user.uid;
      await AsyncStorage.setItem(firstConnectionKey, JSON.stringify({
        firstConnection: true,
        timestamp: new Date().toISOString(),
        profileCreated: true
      }));
      
      console.log('✅ Initial user profile created successfully');
      return userProfile;
      
    } catch (error) {
      console.error('❌ Failed to create initial user profile:', error);
      throw error;
    }
  }
  
  /**
   * Load complete user data from Firebase and cache
   */
  static async loadCompleteUserData(userId) {
    try {
      console.log('📦 Loading complete user data...');
      
      // Load user profile
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userProfile = userDoc.data();
      
      // Load security score (use cached if recent)
      let securityScore;
      try {
        securityScore = await SecurityScoreManager.getSecurityScore(userId);
      } catch (error) {
        console.warn('⚠️ Failed to load security score, using profile data');
        securityScore = {
          securityScore: userProfile.securityScore || 85,
          riskLevel: { text: userProfile.riskLevel || 'Low Risk' }
        };
      }
      
      // Create comprehensive user data object
      const completeUserData = {
        profile: userProfile,
        securityScore: securityScore,
        lastLoaded: new Date().toISOString(),
        cached: false
      };
      
      console.log('✅ Complete user data loaded');
      return completeUserData;
      
    } catch (error) {
      console.error('❌ Failed to load complete user data:', error);
      
      // Return fallback data
      return this.getFallbackUserData(userId);
    }
  }
  
  /**
   * Cache user data locally for instant access
   */
  static async cacheUserData(userId, userData) {
    try {
      console.log('💾 Caching user data locally...');
      
      // Cache profile data
      const profileKey = this.CACHE_KEYS.USER_PROFILE + userId;
      await AsyncStorage.setItem(profileKey, JSON.stringify({
        ...userData.profile,
        cachedAt: new Date().toISOString()
      }));
      
      // Cache security score
      const securityKey = this.CACHE_KEYS.SECURITY_SCORE + userId;
      await AsyncStorage.setItem(securityKey, JSON.stringify({
        ...userData.securityScore,
        cachedAt: new Date().toISOString()
      }));
      
      // Cache financial data if available
      if (userData.profile.financialSummary) {
        const financialKey = this.CACHE_KEYS.FINANCIAL_DATA + userId;
        await AsyncStorage.setItem(financialKey, JSON.stringify({
          ...userData.profile.financialSummary,
          cachedAt: new Date().toISOString()
        }));
      }
      
      // Update last sync timestamp
      const lastSyncKey = this.CACHE_KEYS.LAST_SYNC + userId;
      await AsyncStorage.setItem(lastSyncKey, new Date().toISOString());
      
      console.log('✅ User data cached successfully');
      
    } catch (error) {
      console.error('❌ Failed to cache user data:', error);
    }
  }
  
  /**
   * Load cached user data for immediate display
   */
  static async loadCachedUserData(userId) {
    try {
      console.log('⚡ Loading cached user data for immediate display...');
      
      // Load cached profile
      const profileKey = this.CACHE_KEYS.USER_PROFILE + userId;
      const cachedProfile = await AsyncStorage.getItem(profileKey);
      
      if (!cachedProfile) {
        console.log('📭 No cached profile found');
        return null;
      }
      
      const profile = JSON.parse(cachedProfile);
      
      // Check if cache is still fresh
      const cacheAge = new Date() - new Date(profile.cachedAt);
      const isProfileFresh = cacheAge < this.FRESHNESS_THRESHOLDS.PROFILE;
      
      // Load cached security score
      const securityKey = this.CACHE_KEYS.SECURITY_SCORE + userId;
      const cachedSecurity = await AsyncStorage.getItem(securityKey);
      
      let securityScore = null;
      if (cachedSecurity) {
        securityScore = JSON.parse(cachedSecurity);
        const securityAge = new Date() - new Date(securityScore.cachedAt);
        const isSecurityFresh = securityAge < this.FRESHNESS_THRESHOLDS.SECURITY_SCORE;
        
        if (!isSecurityFresh) {
          securityScore.stale = true;
        }
      }
      
      // Load cached financial data
      const financialKey = this.CACHE_KEYS.FINANCIAL_DATA + userId;
      const cachedFinancial = await AsyncStorage.getItem(financialKey);
      
      let financialData = null;
      if (cachedFinancial) {
        financialData = JSON.parse(cachedFinancial);
      }
      
      const cachedUserData = {
        profile,
        securityScore,
        financialData,
        cached: true,
        fresh: isProfileFresh,
        lastLoaded: profile.cachedAt
      };
      
      console.log(`⚡ Cached user data loaded (${isProfileFresh ? 'fresh' : 'stale'})`);
      return cachedUserData;
      
    } catch (error) {
      console.error('❌ Failed to load cached user data:', error);
      return null;
    }
  }
  
  /**
   * Update user data after significant events (SMS scan, etc.)
   */
  static async updateUserDataAfterEvent(userId, eventData) {
    try {
      console.log('🔄 Updating user data after event...');
      
      // Update Firebase user profile
      const userRef = doc(db, 'users', userId);
      
      const updateData = {
        lastLogin: serverTimestamp(),
        lastActivity: serverTimestamp()
      };
      
      // Update based on event type
      if (eventData.type === 'sms_scan') {
        updateData.totalScans = (await this.getUserScanCount(userId)) + 1;
        updateData.totalMessages = eventData.messagesAnalyzed || 0;
        updateData.fraudDetected = eventData.fraudCount || 0;
        updateData.suspiciousDetected = eventData.suspiciousCount || 0;
        updateData.safeMessages = eventData.safeCount || 0;
        updateData.lastScan = serverTimestamp();
      }
      
      if (eventData.type === 'security_update') {
        updateData.securityScore = eventData.securityScore;
        updateData.riskLevel = eventData.riskLevel;
        updateData.lastSecurityUpdate = serverTimestamp();
      }
      
      if (eventData.type === 'financial_update') {
        updateData.financialSummary = eventData.financialSummary;
      }
      
      // Update Firebase
      await updateDoc(userRef, updateData);
      
      // Update cache
      await this.updateCachedData(userId, updateData);
      
      console.log('✅ User data updated successfully');
      
    } catch (error) {
      console.error('❌ Failed to update user data:', error);
    }
  }
  
  /**
   * Update cached data locally
   */
  static async updateCachedData(userId, updateData) {
    try {
      // Update cached profile
      const profileKey = this.CACHE_KEYS.USER_PROFILE + userId;
      const cachedProfile = await AsyncStorage.getItem(profileKey);
      
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile);
        const updatedProfile = {
          ...profile,
          ...updateData,
          cachedAt: new Date().toISOString()
        };
        
        await AsyncStorage.setItem(profileKey, JSON.stringify(updatedProfile));
      }
      
      // Update security score cache if provided
      if (updateData.securityScore) {
        const securityKey = this.CACHE_KEYS.SECURITY_SCORE + userId;
        await AsyncStorage.setItem(securityKey, JSON.stringify({
          securityScore: updateData.securityScore,
          riskLevel: { text: updateData.riskLevel },
          cachedAt: new Date().toISOString()
        }));
      }
      
      // Update financial data cache if provided
      if (updateData.financialSummary) {
        const financialKey = this.CACHE_KEYS.FINANCIAL_DATA + userId;
        await AsyncStorage.setItem(financialKey, JSON.stringify({
          ...updateData.financialSummary,
          cachedAt: new Date().toISOString()
        }));
      }
      
    } catch (error) {
      console.error('❌ Failed to update cached data:', error);
    }
  }
  
  /**
   * Get user scan count from cache or Firebase
   */
  static async getUserScanCount(userId) {
    try {
      const profileKey = this.CACHE_KEYS.USER_PROFILE + userId;
      const cachedProfile = await AsyncStorage.getItem(profileKey);
      
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile);
        return profile.totalScans || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Failed to get user scan count:', error);
      return 0;
    }
  }
  
  /**
   * Get fallback user data when loading fails
   */
  static getFallbackUserData(userId) {
    return {
      profile: {
        uid: userId,
        displayName: 'User',
        totalMessages: 0,
        totalScans: 0,
        fraudDetected: 0,
        securityScore: 85,
        riskLevel: 'Low Risk',
        preferences: {
          notifications: true,
          autoScan: false,
          securityAlerts: true
        }
      },
      securityScore: {
        securityScore: 85,
        riskLevel: { text: 'Low Risk', color: '#28a745' }
      },
      cached: false,
      fallback: true,
      lastLoaded: new Date().toISOString()
    };
  }
  
  /**
   * Clear user cache (for logout or data reset)
   */
  static async clearUserCache(userId) {
    try {
      console.log('🗑️ Clearing user cache...');
      
      const keysToRemove = [
        this.CACHE_KEYS.USER_PROFILE + userId,
        this.CACHE_KEYS.SECURITY_SCORE + userId,
        this.CACHE_KEYS.FINANCIAL_DATA + userId,
        this.CACHE_KEYS.MESSAGES_SUMMARY + userId,
        this.CACHE_KEYS.LAST_SYNC + userId,
        this.CACHE_KEYS.USER_PREFERENCES + userId
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('✅ User cache cleared');
      
    } catch (error) {
      console.error('❌ Failed to clear user cache:', error);
    }
  }
  
  /**
   * Quick load for immediate display - uses cache first, then updates in background
   */
  static async quickLoadUserData(userId) {
    try {
      console.log('⚡ Quick loading user data...');
      
      // First, try to load from cache for immediate display
      const cachedData = await this.loadCachedUserData(userId);
      
      if (cachedData) {
        console.log('⚡ Displaying cached data immediately');
        
        // Return cached data immediately
        setTimeout(async () => {
          // Update in background if data is stale
          if (!cachedData.fresh) {
            console.log('🔄 Updating stale data in background...');
            try {
              const freshData = await this.loadCompleteUserData(userId);
              await this.cacheUserData(userId, freshData);
            } catch (error) {
              console.error('❌ Background update failed:', error);
            }
          }
        }, 100);
        
        return cachedData;
      }
      
      // No cache available, load fresh data
      console.log('📦 No cache available, loading fresh data...');
      return await this.loadCompleteUserData(userId);
      
    } catch (error) {
      console.error('❌ Quick load failed:', error);
      return this.getFallbackUserData(userId);
    }
  }
}

export default UserDataManager;
