// Test Firebase data fetching for SettingsPage
import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, syncUserCount } from '../utils/firebaseMessages'; // Removed cleanupDashboardStats to fix ESLint warning
import { testAndSetupFirebase } from '../utils/firebaseSetup';

const FirebaseDataTest = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState([]);
  const [setupLoading, setSetupLoading] = useState(false);

  const addTestResult = (test, result, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      result,
      data,
      timestamp: new Date().toLocaleString()
    }]);
  };

  const handleSetupFirebase = async () => {
    setSetupLoading(true);
    try {
      const result = await testAndSetupFirebase();
      addTestResult('Manual Firebase Setup', result.success ? 'success' : 'error', result);
      if (result.success) {
        // Refresh data after setup
        const dashboardStats = await fetchDashboardStats();
        setStats(dashboardStats);
        addTestResult('Data refresh after setup', 'success', dashboardStats);
      }
    } catch (error) {
      addTestResult('Manual Firebase Setup', 'error', error.message);
    } finally {
      setSetupLoading(false);
    }
  };

  useEffect(() => {
    const runTests = async () => {
      setLoading(true);
      addTestResult('Starting Firebase Data Tests', 'info');

      // Test 0: Setup Firebase and create sample data if needed
      try {
        const setupResult = await testAndSetupFirebase();
        addTestResult('testAndSetupFirebase()', setupResult.success ? 'success' : 'error', setupResult);
      } catch (error) {
        addTestResult('testAndSetupFirebase()', 'error', error.message);
      }

      // Test 1: Fetch Dashboard Stats
      try {
        const dashboardStats = await fetchDashboardStats();
        addTestResult('fetchDashboardStats()', 'success', dashboardStats);
        setStats(dashboardStats);
      } catch (error) {
        addTestResult('fetchDashboardStats()', 'error', error.message);
      }

      // Test 2: Sync User Count
      try {
        await syncUserCount();
        addTestResult('syncUserCount()', 'success', 'User count synchronized');
      } catch (error) {
        addTestResult('syncUserCount()', 'error', error.message);
      }

      // Test 3: Check if data updated after sync
      try {
        const updatedStats = await fetchDashboardStats();
        addTestResult('fetchDashboardStats() after sync', 'success', updatedStats);
        setStats(updatedStats);
      } catch (error) {
        addTestResult('fetchDashboardStats() after sync', 'error', error.message);
      }

      setLoading(false);
    };

    runTests();
  }, []);

  return (
    <div style={{ padding: '20px', background: '#f8f9fa', minHeight: '100vh' }}>
      <h2>🔬 Firebase Data Test for SettingsPage</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleSetupFirebase}
          disabled={setupLoading}
          style={{
            background: setupLoading ? '#95a5a6' : '#27ae60',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: setupLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {setupLoading ? 'Setting up...' : '🚀 Setup Firebase & Create Sample Data'}
        </button>
        <small style={{ color: '#6c757d' }}>
          Click this if you see "Failed to fetch user IDs" or no data
        </small>
      </div>
      
      {loading && <p>Running tests...</p>}
      
      {stats && (
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>📊 Current System Stats from Firebase:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                {stats.totalUsers || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Total Users</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
                {stats.activeFraudAlerts || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Active Fraud Alerts</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                {stats.smsAnalyzedToday || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>SMS Analyzed Today</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                {stats.fraudsPrevented || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Frauds Prevented</div>
            </div>
          </div>
          
          {stats._debug && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '6px' }}>
              <h4>🐛 Debug Info:</h4>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(stats._debug, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3>🧪 Test Results:</h3>
        {testResults.map((result, index) => (
          <div 
            key={index} 
            style={{ 
              padding: '10px', 
              margin: '5px 0', 
              borderRadius: '4px',
              background: result.result === 'success' ? '#d4edda' : 
                         result.result === 'error' ? '#f8d7da' : '#d1ecf1',
              color: result.result === 'success' ? '#155724' : 
                     result.result === 'error' ? '#721c24' : '#0c5460'
            }}
          >
            <strong>{result.timestamp}</strong> - {result.test}: {result.result}
            {result.data && (
              <pre style={{ fontSize: '11px', marginTop: '5px', overflow: 'auto' }}>
                {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FirebaseDataTest;
