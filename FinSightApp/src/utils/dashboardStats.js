// Dashboard Statistics Utility
// This utility helps initialize and manage dashboard statistics for the FinSight app

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

export const DashboardStatsManager = {
  
  // Initialize dashboard stats document if it doesn't exist
  initializeDashboardStats: async () => {
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      const dashboardSnapshot = await getDoc(dashboardRef);
      
      if (!dashboardSnapshot.exists()) {
        console.log('📊 Initializing dashboard stats document...');
        
        const today = new Date().toISOString().split('T')[0];
        const initialStats = {
          // Core counters
          activeFraudAlerts: 0,
          actualUserCount: 0,
          totalUsers: 0,
          totalMessagesAnalyzed: 0,
          smsAnalyzedToday: 0,
          totalSmsAnalyzedToday: 0,
          smsCount: 0,
          fraudsPrevented: 0,
          
          // Accuracy tracking
          mlAccuracy: 94.7,
          
          // Timestamps
          lastUpdated: serverTimestamp(),
          lastSync: serverTimestamp(),
          lastUserCountUpdate: serverTimestamp(),
          lastCleanup: serverTimestamp(),
          cleanupDate: new Date().toISOString(),
          
          // Daily tracking
          [`daily_${today}`]: {
            date: today,
            smsCount: 0,
            fraudCount: 0,
            suspiciousCount: 0,
            safeCount: 0,
            lastScan: serverTimestamp()
          },
          
          // Metadata
          syncMethod: 'initialization',
          note: 'Dashboard stats initialized by mobile app'
        };
        
        await setDoc(dashboardRef, initialStats);
        console.log('✅ Dashboard stats document created successfully');
        return true;
      } else {
        console.log('📊 Dashboard stats document already exists');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize dashboard stats:', error);
      throw error;
    }
  },
  
  // Update user count
  updateUserCount: async (userId) => {
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      await updateDoc(dashboardRef, {
        actualUserCount: increment(0), // This will set to current if not exists
        totalUsers: increment(0),
        lastUserCountUpdate: serverTimestamp(),
        [`users.${userId}.lastActive`]: serverTimestamp()
      });
      console.log('📊 User count updated in dashboard');
    } catch (error) {
      console.warn('⚠️ Failed to update user count:', error);
    }
  },
  
  // Update SMS statistics
  updateSmsStats: async (messageCount, fraudCount = 0, suspiciousCount = 0, safeCount = 0) => {
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      const today = new Date().toISOString().split('T')[0];
      
      const updateData = {
        totalMessagesAnalyzed: increment(messageCount),
        smsAnalyzedToday: increment(messageCount),
        totalSmsAnalyzedToday: increment(messageCount),
        smsCount: increment(messageCount),
        fraudsPrevented: increment(fraudCount),
        activeFraudAlerts: increment(fraudCount),
        lastUpdated: serverTimestamp(),
        lastSync: serverTimestamp(),
        syncMethod: 'mobile_scan',
        
        // Daily tracking
        [`daily_${today}.smsCount`]: increment(messageCount),
        [`daily_${today}.fraudCount`]: increment(fraudCount),
        [`daily_${today}.suspiciousCount`]: increment(suspiciousCount),
        [`daily_${today}.safeCount`]: increment(safeCount),
        [`daily_${today}.date`]: today,
        [`daily_${today}.lastScan`]: serverTimestamp()
      };
      
      await updateDoc(dashboardRef, updateData);
      console.log(`📊 Dashboard SMS stats updated: ${messageCount} messages, ${fraudCount} fraud`);
    } catch (error) {
      console.warn('⚠️ Failed to update SMS stats:', error);
      throw error;
    }
  },
  
  // Get current dashboard stats
  getDashboardStats: async () => {
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      const dashboardSnapshot = await getDoc(dashboardRef);
      
      if (dashboardSnapshot.exists()) {
        return dashboardSnapshot.data();
      } else {
        console.log('📊 Dashboard stats document does not exist, initializing...');
        await DashboardStatsManager.initializeDashboardStats();
        return await DashboardStatsManager.getDashboardStats();
      }
    } catch (error) {
      console.error('❌ Failed to get dashboard stats:', error);
      throw error;
    }
  },
  
  // Test dashboard connectivity
  testDashboardConnection: async () => {
    try {
      console.log('🧪 Testing dashboard connection...');
      
      // Check if document exists
      const stats = await DashboardStatsManager.getDashboardStats();
      
      // Test update capability
      const dashboardRef = doc(db, 'dashboard', 'stats');
      await updateDoc(dashboardRef, {
        lastUpdated: serverTimestamp(),
        testConnection: new Date().toISOString()
      });
      
      console.log('✅ Dashboard connection test successful');
      return {
        success: true,
        stats,
        message: 'Dashboard connection working properly'
      };
    } catch (error) {
      console.error('❌ Dashboard connection test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Dashboard connection failed'
      };
    }
  }
};

export default DashboardStatsManager;
