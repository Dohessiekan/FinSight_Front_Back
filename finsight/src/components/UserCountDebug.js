import React, { useState, useEffect } from 'react';
import { fetchAllUserIds, syncUserCount, fetchDashboardStats } from '../utils/firebaseMessages';

const UserCountDebug = () => {
  const [userIds, setUserIds] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Auto-sync user count first to ensure accuracy
      await syncUserCount();
      
      const [ids, stats] = await Promise.all([
        fetchAllUserIds(),
        fetchDashboardStats()
      ]);
      setUserIds(ids);
      setDashboardStats(stats);
      console.log('Debug - User IDs:', ids);
      console.log('Debug - Dashboard Stats:', stats);
    } catch (error) {
      console.error('Debug - Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load immediately on mount
    loadData();
    
    // Auto-refresh every 10 seconds for debug purposes
    const interval = setInterval(loadData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', margin: '20px', borderRadius: '8px' }}>
      <h3>🧪 User Count Debug {loading && '(Auto-refreshing...)'}</h3>
      
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
        ⚡ Auto-syncing every 10 seconds - No manual action needed
      </div>
      
      <hr />
      
      <div style={{ marginTop: '15px' }}>
        <h4>📊 Actual Users in Firebase:</h4>
        <p><strong>Count:</strong> {userIds.length}</p>
        <details>
          <summary>User IDs ({userIds.length} users)</summary>
          <ul>
            {userIds.map((id, index) => (
              <li key={index} style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                {id}
              </li>
            ))}
          </ul>
        </details>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h4>📈 Dashboard Stats:</h4>
        {dashboardStats ? (
          <div>
            <p><strong>Total Users (Dashboard):</strong> {dashboardStats.totalUsers}</p>
            <p><strong>SMS Analyzed Today:</strong> {dashboardStats.smsAnalyzedToday}</p>
            <p><strong>Frauds Prevented:</strong> {dashboardStats.fraudsPrevented}</p>
            <p><strong>Last Updated:</strong> {dashboardStats.lastUpdated?.toString()}</p>
            {dashboardStats._debug && (
              <details>
                <summary>Debug Info</summary>
                <pre style={{ fontSize: '10px' }}>
                  {JSON.stringify(dashboardStats._debug, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ) : (
          <p>Loading dashboard stats...</p>
        )}
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h4>🔍 Analysis:</h4>
        {userIds.length === 0 ? (
          <p style={{ color: 'red' }}>❌ No users found in Firebase - user creation might be failing</p>
        ) : (
          <p style={{ color: 'green' }}>✅ Found {userIds.length} users in Firebase</p>
        )}
        
        {dashboardStats && (
          <p>
            {dashboardStats.totalUsers === userIds.length ? (
              <span style={{ color: 'green' }}>✅ Dashboard count matches actual count</span>
            ) : (
              <span style={{ color: 'orange' }}>⚠️ Dashboard count ({dashboardStats.totalUsers}) differs from actual count ({userIds.length})</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserCountDebug;
