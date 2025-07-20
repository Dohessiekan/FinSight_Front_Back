import React, { useState, useEffect } from 'react';
import './SettingsPage.css';
import { logout } from './utils/auth';
import { useNavigate } from 'react-router-dom';
import PageHeader from './PageHeader';
import { fetchDashboardStats, syncUserCount, cleanupDashboardStats } from './utils/api';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [systemStats, setSystemStats] = useState(null);
  
  // Form states
  const [profileData, setProfileData] = useState({
    name: 'Admin User',
    email: 'admin@finsight.com',
    phone: '+1234567890',
    role: 'Administrator',
    lastLogin: new Date().toLocaleString()
  });

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      const stats = await fetchDashboardStats();
      setSystemStats(stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setMessage('Error logging out. Please try again.');
    }
  };

  const handleSaveSettings = () => {
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSyncUserCount = async () => {
    setLoading(true);
    try {
      await syncUserCount();
      await loadSystemStats();
      setMessage('User count synchronized successfully!');
    } catch (error) {
      console.error('Error syncing user count:', error);
      setMessage('Error syncing user count. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCleanupStats = async () => {
    setLoading(true);
    try {
      await cleanupDashboardStats();
      await loadSystemStats();
      setMessage('Dashboard stats cleaned up successfully!');
    } catch (error) {
      console.error('Error cleaning up stats:', error);
      setMessage('Error cleaning up stats. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderProfileTab = () => (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>👤 Profile Information</h3>
      
      <div style={{ display: 'grid', gap: '20px', maxWidth: '500px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#2c3e50', fontWeight: 'bold' }}>
            Name
          </label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => handleProfileChange('name', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#2c3e50', fontWeight: 'bold' }}>
            Email
          </label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => handleProfileChange('email', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#2c3e50', fontWeight: 'bold' }}>
            Phone
          </label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleProfileChange('phone', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#2c3e50', fontWeight: 'bold' }}>
            Role
          </label>
          <input
            type="text"
            value={profileData.role}
            disabled
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#f8f9fa',
              color: '#6c757d'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: '#2c3e50', fontWeight: 'bold' }}>
            Last Login
          </label>
          <input
            type="text"
            value={profileData.lastLogin}
            disabled
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#f8f9fa',
              color: '#6c757d'
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderSystemManagementTab = () => (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>⚙️ System Management</h3>
      
      {/* System Stats */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>📊 System Statistics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {systemStats?.totalUsers || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Total Users</div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
              {systemStats?.activeFraudAlerts || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Active Fraud Alerts</div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
              {systemStats?.smsAnalyzedToday || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>SMS Analyzed Today</div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
              {systemStats?.fraudsPrevented || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Frauds Prevented</div>
          </div>
        </div>
      </div>

      {/* System Actions */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>🔧 System Actions</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <button
            onClick={handleSyncUserCount}
            disabled={loading}
            style={{
              background: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🔄 {loading ? 'Syncing...' : 'Sync User Count'}
          </button>
          <button
            onClick={handleCleanupStats}
            disabled={loading}
            style={{
              background: loading ? '#95a5a6' : '#f39c12',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🧹 {loading ? 'Cleaning...' : 'Cleanup Dashboard Stats'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="overview-container">
      <PageHeader title="Admin Settings" />
      
      <div style={{ padding: '20px' }}>
        {/* Message Display */}
        {message && (
          <div style={{
            background: message.includes('Error') ? '#fee' : '#efe',
            color: message.includes('Error') ? '#c33' : '#363',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: `1px solid ${message.includes('Error') ? '#fcc' : '#cfc'}`
          }}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px' }}>
            {[
              { id: 'profile', label: '👤 Profile' },
              { id: 'system', label: '⚙️ System' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? '#3498db' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#2c3e50',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'system' && renderSystemManagementTab()}

        {/* Action Buttons */}
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleLogout}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🚪 Logout
          </button>
          
          <button
            onClick={handleSaveSettings}
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            💾 Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
