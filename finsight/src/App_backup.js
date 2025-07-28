import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './Sidebar'; // Import the Sidebar component
import { Routes, Route, Navigate } from 'react-router-dom'; // Import Routes and Route
import LoginPage from './LoginPage.jsx'; // Import the LoginPage component
import Overview from './Overview'; // Import the Overview component
import SettingsPage from './SettingsPage.jsx'; // Import the SettingsPage component
import FinancialSummary from './FinancialSummary.jsx'; // Import the real FinancialSummary component
import SMSInbox from './SMSInboxClean'; // Import SMSInbox component
import FirebaseDataTest from './components/FirebaseDataTest';
import SMSAnalysisTest from './components/SMSAnalysisTest'; // Test component
import { getSession, clearSession, updateLastActivity, checkInactivity } from './utils/auth';

import { auth, db } from './config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

// Enhanced Fraud Alerts component for comprehensive admin monitoring
const FraudAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, fraud, suspicious
  const [searchUser, setSearchUser] = useState('');

  // Set up real-time listener for fraud alerts
  useEffect(() => {
    let unsubscribe;
    
    const setupRealtimeAlerts = () => {
      try {
        setLoading(true);
        
        // Create real-time listener for fraud_alerts collection (new format)
        const alertsRef = collection(db, 'fraud_alerts');
        const q = query(
          alertsRef, 
          orderBy('createdAt', 'desc')
          // No limit - show ALL alerts including multiple from same user
        );
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const realTimeAlerts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toDate?.()?.toLocaleString() || 
                      doc.data().timestamp?.toDate?.()?.toLocaleString() || 
                      new Date().toLocaleString()
          }));
          
          console.log(`🔄 Real-time fraud alerts update: ${realTimeAlerts.length} alerts received (all users)`);
          
          // If no real alerts, show helpful placeholder
          if (realTimeAlerts.length === 0) {
            setAlerts([{
              id: 'placeholder',
              timestamp: new Date().toLocaleString(),
              type: 'No Fraud Alerts',
              severity: 'info',
              phone: 'N/A',
              message: '✨ No fraud alerts detected yet. Start analyzing SMS in your mobile app to see real-time security alerts appear here!',
              content: '✨ No fraud alerts detected yet. Start analyzing SMS in your mobile app to see real-time security alerts appear here!',
              confidence: 0,
              status: 'info',
              source: 'FinSight Security System',
              userId: 'system',
              priority: 'info'
            }]);
          } else {
            setAlerts(realTimeAlerts);
          }
          
          setLoading(false);
        }, (error) => {
          console.error('❌ Real-time alerts listener error:', error);
          
          // Fallback to old fraudAlerts collection
          const fallbackAlertsRef = collection(db, 'fraudAlerts');
          const fallbackQ = query(fallbackAlertsRef, orderBy('createdAt', 'desc'));
          
          const fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
            const fallbackAlerts = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().createdAt?.toDate?.()?.toLocaleString() || 
                        doc.data().detectedAt?.toDate?.()?.toLocaleString() || 
                        new Date().toLocaleString()
            }));
            
            console.log(`🔄 Fallback alerts: ${fallbackAlerts.length} alerts from fraudAlerts collection`);
            setAlerts(fallbackAlerts.length > 0 ? fallbackAlerts : [{
              id: 'error',
              timestamp: new Date().toLocaleString(),
              type: 'Connection Error',
              severity: 'warning',
              phone: 'N/A',
              message: '⚠️ Unable to load real-time fraud alerts. Check Firebase connection.',
              content: '⚠️ Unable to load real-time fraud alerts. Check Firebase connection.',
              confidence: 0,
              status: 'error',
              source: 'System Error',
              userId: 'error',
              priority: 'medium'
            }]);
            setLoading(false);
          });
          
          return fallbackUnsubscribe;
        });
        
      } catch (error) {
        console.error('❌ Failed to setup real-time alerts:', error);
        setLoading(false);
      }
    };
    
    setupRealtimeAlerts();
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('🔄 Real-time alerts listener cleaned up');
      }
    };
  }, []);

  // Filter alerts based on type and user search
  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'fraud' && alert.type?.toLowerCase().includes('fraud')) ||
                         (filter === 'suspicious' && alert.type?.toLowerCase().includes('suspicious'));
    
    const matchesUser = !searchUser || 
                       alert.userId?.toLowerCase().includes(searchUser.toLowerCase()) ||
                       alert.phone?.includes(searchUser);
    
    return matchesFilter && matchesUser;
  });

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'warning': return '#f1c40f';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#e74c3c';
      case 'investigating': return '#f39c12';
      case 'blocked': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>🚨 Mobile App Security Alerts ({filteredAlerts.length})</h2>
        <p style={{ color: '#7f8c8d' }}>Real-time monitoring of fraud activities from FinSight mobile app users</p>
      </div>
      
      {/* Filter Controls */}
      <div style={{ 
        background: 'white', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by Type:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">All Alerts ({alerts.length})</option>
            <option value="fraud">Fraud Only ({alerts.filter(a => a.type?.toLowerCase().includes('fraud')).length})</option>
            <option value="suspicious">Suspicious Only ({alerts.filter(a => a.type?.toLowerCase().includes('suspicious')).length})</option>
          </select>
        </div>
        
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Search User:</label>
          <input 
            type="text"
            placeholder="Enter User ID or Phone..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            style={{ 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ddd',
              minWidth: '200px'
            }}
          />
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
          <p>Loading fraud alerts from Firebase...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredAlerts.map(alert => (
            <div key={alert.id} style={{
              background: 'white',
              border: `2px solid ${getSeverityColor(alert.severity)}`,
              borderRadius: '8px',
              padding: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{alert.type}</h3>
                  <p style={{ margin: '0', fontSize: '12px', color: '#7f8c8d' }}>{alert.timestamp}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{
                    background: getSeverityColor(alert.severity),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                  }}>
                    {alert.severity}
                  </span>
                  <span style={{
                    background: getStatusColor(alert.status),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                  }}>
                    {alert.status}
                  </span>
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#34495e' }}>
                  📱 Phone: {alert.phone || 'N/A'} | 👤 User ID: {alert.userId || 'Unknown'}
                </p>
                <p style={{ margin: '0 0 5px 0', color: '#7f8c8d', fontStyle: 'italic', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  📨 "{alert.message || alert.content || 'No message content'}"
                </p>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  <span><strong>Source:</strong> {alert.source || 'Mobile App'}</span>
                  <span><strong>Priority:</strong> {alert.priority || 'Medium'}</span>
                  {alert.location && (
                    <span><strong>Location:</strong> {alert.location.latitude?.toFixed(4)}, {alert.location.longitude?.toFixed(4)}</span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Confidence:</span>
                  <div style={{
                    background: '#ecf0f1',
                    borderRadius: '10px',
                    width: '100px',
                    height: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: alert.confidence > 90 ? '#e74c3c' : alert.confidence > 80 ? '#f39c12' : '#f1c40f',
                      width: `${alert.confidence || 0}%`,
                      height: '100%'
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2c3e50' }}>{alert.confidence || 0}%</span>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    📍 View on Map
                  </button>
                  <button style={{
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    ✅ Mark Safe
                  </button>
                  <button style={{
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    🚫 Block Sender
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredAlerts.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              <p>No fraud alerts match your current filter criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
        <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
          <p>Loading fraud alerts from Firebase...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{
              background: 'white',
              border: `2px solid ${getSeverityColor(alert.severity)}`,
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{alert.type}</h3>
                <p style={{ margin: '0', fontSize: '12px', color: '#7f8c8d' }}>{alert.timestamp}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{
                  background: getSeverityColor(alert.severity),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  textTransform: 'uppercase'
                }}>
                  {alert.severity}
                </span>
                <span style={{
                  background: getStatusColor(alert.status),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  textTransform: 'uppercase'
                }}>
                  {alert.status}
                </span>
              </div>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#34495e' }}>Phone: {alert.phone}</p>
              <p style={{ margin: '0 0 5px 0', color: '#7f8c8d', fontStyle: 'italic' }}>"{alert.message}"</p>
              <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                <span><strong>Source:</strong> {alert.source}</span>
                <span><strong>User ID:</strong> {alert.userId}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Confidence:</span>
                <div style={{
                  background: '#ecf0f1',
                  borderRadius: '10px',
                  width: '100px',
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: alert.confidence > 90 ? '#e74c3c' : alert.confidence > 80 ? '#f39c12' : '#f1c40f',
                    width: `${alert.confidence}%`,
                    height: '100%'
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2c3e50' }}>{alert.confidence}%</span>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}>
                  Investigate
                </button>
                <button style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}>
                  Block
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);

  // Initialize Firebase authentication on app start
  React.useEffect(() => {
    const initializeFirebase = async () => {
      try {
        if (!auth.currentUser) {
          console.log('🔐 Initializing Firebase authentication...');
          await signInAnonymously(auth);
          console.log('✅ Firebase authentication successful');
        }
      } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
      }
    };

    initializeFirebase();
  }, []);

  // Check for existing authentication on app load
  React.useEffect(() => {
    const session = getSession();
    if (session) {
      setIsAuthenticated(true);
      setAdminInfo(session);
      updateLastActivity();
    }
    
    // Set up inactivity checker
    const inactivityChecker = setInterval(() => {
      checkInactivity(30); // 30 minutes timeout
    }, 60000); // Check every minute
    
    return () => clearInterval(inactivityChecker);
  }, []);

  // Update activity on user interaction
  React.useEffect(() => {
    const handleActivity = () => {
      if (isAuthenticated) {
        updateLastActivity();
      }
    };
    
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);
    
    return () => {
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, [isAuthenticated]);

  const handleLogin = (adminData) => {
    setIsAuthenticated(true);
    setAdminInfo(adminData);
    updateLastActivity();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminInfo(null);
    clearSession();
  };

  // If not authenticated, show only the login page
  if (!isAuthenticated) {
    return (
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  // If authenticated, show the main app with sidebar
  return (
    <div className="App">
      <Sidebar onLogout={handleLogout} adminInfo={adminInfo} />
      <main className="main-content">
        <Routes>
          <Route path="/overview" element={<Overview />} />
          <Route path="/sms-inbox" element={<SMSInbox />} />
          <Route path="/fraud-alerts" element={<FraudAlerts />} />
          <Route path="/financial-summary" element={<FinancialSummary />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/firebase-test" element={<FirebaseDataTest />} />
          <Route path="/sms-analysis-test" element={<SMSAnalysisTest />} />
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/login" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
