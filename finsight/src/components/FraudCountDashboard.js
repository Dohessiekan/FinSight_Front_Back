import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Comprehensive Fraud Count Dashboard for Admin Panel
 * 
 * This component provides a real-time overview of fraud count discrepancies
 * across all system components and all users.
 */

const FraudCountDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    users: [],
    systemStats: {
      totalUsers: 0,
      usersWithDiscrepancies: 0,
      totalFraudMessages: 0,
      totalFraudAlerts: 0,
      syncStatus: 'unknown'
    },
    loading: true,
    lastUpdated: null
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [fixingUser, setFixingUser] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      console.log('📊 Loading fraud count dashboard data...');
      setDashboardData(prev => ({ ...prev, loading: true }));

      // Get all fraud alerts to identify users
      const fraudAlertsRef = collection(db, 'fraud_alerts');
      const fraudAlertsSnapshot = await getDocs(fraudAlertsRef);
      const allFraudAlerts = fraudAlertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get unique user IDs
      const userIds = [...new Set(allFraudAlerts.map(alert => alert.userId).filter(Boolean))];
      
      const userData = [];
      let totalFraudMessages = 0;
      let usersWithDiscrepancies = 0;

      // Analyze each user
      for (const userId of userIds) {
        try {
          const userAnalysis = await analyzeUserFraudCounts(userId);
          userData.push(userAnalysis);
          
          totalFraudMessages += userAnalysis.counts.userMessages?.fraud || 0;
          
          if (userAnalysis.hasDiscrepancy) {
            usersWithDiscrepancies++;
          }
        } catch (error) {
          console.error(`❌ Failed to analyze user ${userId}:`, error);
          userData.push({
            userId,
            error: error.message,
            hasDiscrepancy: true
          });
          usersWithDiscrepancies++;
        }
      }

      const systemStats = {
        totalUsers: userIds.length,
        usersWithDiscrepancies,
        totalFraudMessages,
        totalFraudAlerts: allFraudAlerts.length,
        syncStatus: usersWithDiscrepancies === 0 ? 'synchronized' : 'has-discrepancies'
      };

      setDashboardData({
        users: userData,
        systemStats,
        loading: false,
        lastUpdated: new Date().toLocaleString()
      });

      console.log('✅ Dashboard data loaded:', systemStats);

    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const analyzeUserFraudCounts = async (userId) => {
    // Get user messages
    const userMessagesRef = collection(db, 'users', userId, 'messages');
    const userMessagesSnapshot = await getDocs(userMessagesRef);
    const userMessages = userMessagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get fraud alerts for this user
    const fraudAlertsRef = collection(db, 'fraud_alerts');
    const fraudAlertsQuery = query(fraudAlertsRef, where('userId', '==', userId));
    const fraudAlertsSnapshot = await getDocs(fraudAlertsQuery);
    const userFraudAlerts = fraudAlertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get user fraud alerts collection
    const userFraudAlertsRef = collection(db, 'users', userId, 'fraud_alerts');
    const userFraudAlertsSnapshot = await getDocs(userFraudAlertsRef);
    const userFraudAlertsCollection = userFraudAlertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const counts = {
      userMessages: {
        total: userMessages.length,
        fraud: userMessages.filter(m => m.status === 'fraud').length,
        suspicious: userMessages.filter(m => m.status === 'suspicious').length,
        safe: userMessages.filter(m => m.status === 'safe').length
      },
      fraudAlerts: userFraudAlerts.length,
      userFraudAlertsCollection: userFraudAlertsCollection.length
    };

    const hasDiscrepancy = 
      counts.userMessages.fraud !== counts.fraudAlerts ||
      counts.userMessages.fraud !== counts.userFraudAlertsCollection ||
      counts.fraudAlerts !== counts.userFraudAlertsCollection;

    return {
      userId,
      counts,
      hasDiscrepancy,
      discrepancies: {
        securityScoreVsAdmin: counts.userMessages.fraud - counts.fraudAlerts,
        securityScoreVsUserAlerts: counts.userMessages.fraud - counts.userFraudAlertsCollection,
        adminVsUserAlerts: counts.fraudAlerts - counts.userFraudAlertsCollection
      },
      lastAnalyzed: new Date().toISOString()
    };
  };

  const fixUserDiscrepancies = async (userId) => {
    try {
      setFixingUser(userId);
      console.log(`🔧 Fixing discrepancies for user: ${userId}`);

      // Import the fix utility
      const { runFraudCountFix } = require('../utils/FraudCountSyncFix');
      const result = await runFraudCountFix(userId);

      if (result) {
        console.log(`✅ Fixed discrepancies for user ${userId}`);
        // Refresh dashboard data
        await loadDashboardData();
        return { success: true, result };
      } else {
        throw new Error('Fix function returned null result');
      }

    } catch (error) {
      console.error(`❌ Failed to fix user ${userId}:`, error);
      return { success: false, error: error.message };
    } finally {
      setFixingUser(null);
    }
  };

  const fixAllDiscrepancies = async () => {
    try {
      console.log('🔧 Fixing all user discrepancies...');
      const usersWithIssues = dashboardData.users.filter(u => u.hasDiscrepancy);
      
      for (const user of usersWithIssues) {
        await fixUserDiscrepancies(user.userId);
      }
      
      console.log('✅ All discrepancies fixed');
      
    } catch (error) {
      console.error('❌ Failed to fix all discrepancies:', error);
    }
  };

  const renderUserRow = (user) => {
    const statusColor = user.hasDiscrepancy ? '#ff4757' : '#2ed573';
    const statusText = user.hasDiscrepancy ? 'Issues Found' : 'Synchronized';

    return (
      <div 
        key={user.userId} 
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          borderBottom: '1px solid #eee',
          backgroundColor: user.hasDiscrepancy ? '#fff5f5' : '#f0fff4'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            User ID: {user.userId.substring(0, 8)}...
          </div>
          {user.error ? (
            <div style={{ color: '#ff4757', fontSize: '14px' }}>
              Error: {user.error}
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: '#666' }}>
              Security Score: {user.counts?.userMessages?.fraud || 0} fraud | 
              Admin Dashboard: {user.counts?.fraudAlerts || 0} alerts | 
              User Alerts: {user.counts?.userFraudAlertsCollection || 0} alerts
            </div>
          )}
        </div>
        
        <div style={{ 
          padding: '6px 12px', 
          borderRadius: '20px', 
          backgroundColor: statusColor, 
          color: 'white', 
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {statusText}
        </div>
        
        {user.hasDiscrepancy && (
          <button
            onClick={() => fixUserDiscrepancies(user.userId)}
            disabled={fixingUser === user.userId}
            style={{
              marginLeft: '12px',
              padding: '6px 12px',
              backgroundColor: '#2ed573',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: fixingUser === user.userId ? 'not-allowed' : 'pointer',
              opacity: fixingUser === user.userId ? 0.6 : 1
            }}
          >
            {fixingUser === user.userId ? 'Fixing...' : 'Fix'}
          </button>
        )}
        
        <button
          onClick={() => setSelectedUser(selectedUser === user.userId ? null : user.userId)}
          style={{
            marginLeft: '8px',
            padding: '6px 12px',
            backgroundColor: '#3742fa',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Details
        </button>
      </div>
    );
  };

  const renderUserDetails = (userId) => {
    const user = dashboardData.users.find(u => u.userId === userId);
    if (!user || !user.counts) return null;

    return (
      <div style={{
        margin: '12px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>
          Detailed Analysis: {userId.substring(0, 8)}...
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <h5>Security Score Source</h5>
            <div>Total Messages: {user.counts.userMessages.total}</div>
            <div>Fraud Messages: {user.counts.userMessages.fraud}</div>
            <div>Suspicious: {user.counts.userMessages.suspicious}</div>
            <div>Safe: {user.counts.userMessages.safe}</div>
          </div>
          
          <div>
            <h5>Admin Dashboard</h5>
            <div>Fraud Alerts: {user.counts.fraudAlerts}</div>
          </div>
          
          <div>
            <h5>User Alert Collection</h5>
            <div>User Alerts: {user.counts.userFraudAlertsCollection}</div>
          </div>
        </div>
        
        {user.hasDiscrepancy && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
            <h5 style={{ color: '#856404' }}>Discrepancies Found:</h5>
            <div>Security Score vs Admin: {user.discrepancies.securityScoreVsAdmin}</div>
            <div>Security Score vs User Alerts: {user.discrepancies.securityScoreVsUserAlerts}</div>
            <div>Admin vs User Alerts: {user.discrepancies.adminVsUserAlerts}</div>
          </div>
        )}
      </div>
    );
  };

  if (dashboardData.loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading fraud count dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Fraud Count Dashboard</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadDashboardData}
            disabled={dashboardData.loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3742fa',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
          {dashboardData.systemStats.usersWithDiscrepancies > 0 && (
            <button
              onClick={fixAllDiscrepancies}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2ed573',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Fix All ({dashboardData.systemStats.usersWithDiscrepancies})
            </button>
          )}
        </div>
      </div>

      {/* System Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Total Users</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {dashboardData.systemStats.totalUsers}
          </div>
        </div>
        
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Users with Issues</h4>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: dashboardData.systemStats.usersWithDiscrepancies > 0 ? '#ff4757' : '#2ed573'
          }}>
            {dashboardData.systemStats.usersWithDiscrepancies}
          </div>
        </div>
        
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Total Fraud Messages</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {dashboardData.systemStats.totalFraudMessages}
          </div>
        </div>
        
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Total Fraud Alerts</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {dashboardData.systemStats.totalFraudAlerts}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div style={{ 
        padding: '16px', 
        marginBottom: '24px',
        backgroundColor: dashboardData.systemStats.syncStatus === 'synchronized' ? '#d4edda' : '#f8d7da',
        borderRadius: '8px',
        border: `1px solid ${dashboardData.systemStats.syncStatus === 'synchronized' ? '#c3e6cb' : '#f5c6cb'}`
      }}>
        <h4 style={{ margin: '0 0 8px 0' }}>System Status</h4>
        <div style={{ 
          color: dashboardData.systemStats.syncStatus === 'synchronized' ? '#155724' : '#721c24',
          fontWeight: 'bold'
        }}>
          {dashboardData.systemStats.syncStatus === 'synchronized' 
            ? '✅ All fraud counts are synchronized across the system'
            : `⚠️ ${dashboardData.systemStats.usersWithDiscrepancies} users have fraud count discrepancies`
          }
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
          Last updated: {dashboardData.lastUpdated}
        </div>
      </div>

      {/* User List */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f8f9fa', 
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold'
        }}>
          User Fraud Count Analysis
        </div>
        
        {dashboardData.users.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No users with fraud data found
          </div>
        ) : (
          <>
            {dashboardData.users.map(renderUserRow)}
            {selectedUser && renderUserDetails(selectedUser)}
          </>
        )}
      </div>

      {dashboardData.error && (
        <div style={{ 
          marginTop: '16px',
          padding: '12px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          Error: {dashboardData.error}
        </div>
      )}
    </div>
  );
};

export default FraudCountDashboard;
