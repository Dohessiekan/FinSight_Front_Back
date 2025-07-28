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
import FraudAlerts from './components/FraudAlerts'; // Import enhanced FraudAlerts component
import { getSession, clearSession, updateLastActivity, checkInactivity } from './utils/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const session = getSession();
    if (session) {
      setIsAuthenticated(true);
      setAdminInfo(session);
    }

    // Set up activity monitoring
    const handleActivity = () => {
      if (isAuthenticated) {
        updateLastActivity();
        
        // Check for inactivity
        if (checkInactivity()) {
          console.log('Session expired due to inactivity');
          handleLogout();
        }
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
