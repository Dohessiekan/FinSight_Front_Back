import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Sidebar from './Sidebar'; // Import the Sidebar component
import { Routes, Route, Navigate } from 'react-router-dom'; // Import Routes and Route
import Overview from './Overview'; // Import the Overview component
import SMSInbox from './SMSInbox'; // Import the SMSInbox component
import LoginPage from './LoginPage'; // Import the LoginPage component
import SettingsPage from './SettingsPage'; // Import the SettingsPage component
import FinancialSummary from './FinancialSummary'; // Import the real FinancialSummary component

// Placeholder component for Fraud Alerts page
const FraudAlerts = () => <div>Fraud Alerts Page Content</div>;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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
      <Sidebar onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/overview" element={<Overview />} />
          <Route path="/sms-inbox" element={<SMSInbox />} />
          <Route path="/fraud-alerts" element={<FraudAlerts />} />
          <Route path="/financial-summary" element={<FinancialSummary />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/login" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
