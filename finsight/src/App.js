import React, { useState } from 'react';
import './App.css';
import Sidebar from './Sidebar'; // Import the Sidebar component
import { Routes, Route, Navigate } from 'react-router-dom'; // Import Routes and Route
import Overview from './Overview'; // Import the Overview component
import SMSInbox from './SMSInbox'; // Import the SMSInbox component
import LoginPage from './LoginPage'; // Import the LoginPage component
import SettingsPage from './SettingsPage'; // Import the SettingsPage component
import FinancialSummary from './FinancialSummary'; // Import the real FinancialSummary component
import { getSession, clearSession, updateLastActivity, checkInactivity } from './utils/auth';

// Fraud Alerts component for admin monitoring
const FraudAlerts = () => {
  const [alerts] = useState([
    {
      id: 1,
      timestamp: '2025-07-14 10:30:22',
      type: 'High Risk SMS - Mobile App',
      severity: 'critical',
      phone: '+250 788 123 456',
      message: 'User scanned: "Urgent: Send 5000 RWF to claim your prize..."',
      confidence: 94,
      status: 'active',
      source: 'Mobile App',
      userId: 'user_4821'
    },
    {
      id: 2,
      timestamp: '2025-07-14 09:15:45',
      type: 'Multiple Fraud Attempts',
      severity: 'warning',
      phone: '+250 789 987 654',
      message: 'Same number attempted fraud on 3 different mobile users',
      confidence: 87,
      status: 'investigating',
      source: 'API Analysis',
      userId: 'multiple'
    },
    {
      id: 3,
      timestamp: '2025-07-14 08:22:33',
      type: 'Known Fraud Network',
      severity: 'high',
      phone: '+250 790 555 777',
      message: 'Mobile user reported: Part of verified scammer network',
      confidence: 91,
      status: 'blocked',
      source: 'User Report',
      userId: 'user_3392'
    },
    {
      id: 4,
      timestamp: '2025-07-14 07:45:12',
      type: 'ML Model Alert',
      severity: 'warning',
      phone: '+250 782 445 667',
      message: 'New fraud pattern detected by mobile app users',
      confidence: 78,
      status: 'active',
      source: 'ML Analysis',
      userId: 'pattern_detection'
    }
  ]);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'warning': return '#f1c40f';
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
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>🚨 Mobile App Security Alerts</h2>
        <p style={{ color: '#7f8c8d' }}>Real-time monitoring of fraud activities from FinSight mobile app users</p>
      </div>
      
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
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);

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
          <Route path="/settings" element={<SettingsPage adminInfo={adminInfo} />} />
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/login" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
