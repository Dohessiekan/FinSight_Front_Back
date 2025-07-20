import React, { useEffect, useState } from 'react';
import { fetchAllUserIds, fetchUserMessages } from '../utils/firebaseMessages';
import MessageCountAnalyzer from '../utils/MessageCountAnalyzer';
import './AdminUserMessages.css';

const AdminUserMessages = () => {
  const [userIds, setUserIds] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentMonthOnly, setCurrentMonthOnly] = useState(true);

  // Analyze count discrepancy between mobile and web
  const analyzeCountDiscrepancy = async () => {
    if (!selectedUserId) {
      alert('Please select a user first');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Starting count discrepancy analysis...');
      
      // Ask user for mobile reported count
      const mobileCountInput = prompt('Enter the number of messages the mobile app reported analyzing (e.g., 176):');
      if (!mobileCountInput) return;
      
      const mobileCount = parseInt(mobileCountInput);
      if (isNaN(mobileCount) || mobileCount <= 0) {
        alert('Please enter a valid number');
        return;
      }
      
      console.log(`🔍 Comparing mobile count (${mobileCount}) with web stored messages...`);
      
      // Use the MessageCountAnalyzer to get the diagnostic
      const diagnostic = await MessageCountAnalyzer.quickDiagnostic(selectedUserId, mobileCount);
      
      // Show results in alert
      alert(`MESSAGE COUNT ANALYSIS RESULTS:\n\n${diagnostic}`);
      
      // Also log to console for detailed analysis
      console.log('📊 Full diagnostic results:', diagnostic);
      
    } catch (err) {
      console.error('Count analysis failed:', err);
      alert(`Count analysis error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load all user IDs when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        console.log('📋 Loading user IDs...');
        const ids = await fetchAllUserIds();
        setUserIds(ids);
        console.log(`✅ Loaded ${ids.length} user IDs`);
      } catch (err) {
        console.error('Failed to load user IDs:', err);
        setError(`Failed to load users: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Load messages when user selection changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedUserId) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log(`📋 Loading messages for user: ${selectedUserId}, current month only: ${currentMonthOnly}`);
        const msgs = await fetchUserMessages(selectedUserId, currentMonthOnly);
        setMessages(msgs || []);
        
        // Set debug info
        setDebugInfo({
          userId: selectedUserId,
          messageCount: msgs?.length || 0,
          currentMonthOnly: currentMonthOnly,
          lastLoaded: new Date().toLocaleString()
        });
        
        console.log(`✅ Loaded ${msgs?.length || 0} messages for user ${selectedUserId}`);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError(`Failed to load messages: ${err.message}`);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedUserId, currentMonthOnly]);

  // Filter messages based on status
  const filteredMessages = filterStatus === 'all' 
    ? messages 
    : messages.filter(msg => msg.status === filterStatus);

  return (
    <div className="admin-user-messages">
      <h2>📊 Admin User Messages & Count Analysis</h2>
      
      {error && (
        <div className="error-message">
          ❌ Error: {error}
        </div>
      )}

      <div className="controls">
        <div className="user-selector">
          <label htmlFor="userSelect">👤 Select User:</label>
          <select 
            id="userSelect"
            onChange={e => setSelectedUserId(e.target.value)} 
            value={selectedUserId || ''}
            disabled={loading}
          >
            <option value="">Select a user...</option>
            {userIds.map(uid => (
              <option key={uid} value={uid}>{uid}</option>
            ))}
          </select>
        </div>

        <div className="month-filter">
          <label>
            <input 
              type="checkbox" 
              checked={currentMonthOnly} 
              onChange={e => setCurrentMonthOnly(e.target.checked)}
            />
            📅 Current Month Only
          </label>
        </div>

        <div className="status-filter">
          <label htmlFor="statusFilter">🔍 Filter by Status:</label>
          <select 
            id="statusFilter"
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All Messages</option>
            <option value="safe">Safe</option>
            <option value="suspicious">Suspicious</option>
            <option value="fraud">Fraud</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* Count Analysis Button */}
      {selectedUserId && (
        <div className="analysis-section">
          <h3>🔍 Count Discrepancy Analysis</h3>
          <p>Use this to diagnose why mobile shows more messages analyzed than web displays</p>
          <button 
            onClick={analyzeCountDiscrepancy}
            disabled={loading}
            className="analyze-button"
          >
            {loading ? '🔄 Analyzing...' : '📊 Analyze Count Discrepancy'}
          </button>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div className="debug-info">
          <h3>🐛 Debug Information</h3>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      {/* Messages Display */}
      <div className="messages-section">
        <h3>📱 Messages ({filteredMessages.length})</h3>
        
        {loading && <div className="loading">🔄 Loading...</div>}
        
        {!loading && filteredMessages.length === 0 && selectedUserId && (
          <div className="no-messages">
            📭 No messages found for the selected criteria
          </div>
        )}

        {!loading && filteredMessages.length > 0 && (
          <div className="messages-list">
            {filteredMessages.map((msg, index) => (
              <div key={msg.id || index} className={`message-item ${msg.status || 'unknown'}`}>
                <div className="message-header">
                  <span className="message-id">ID: {msg.id || 'Unknown'}</span>
                  <span className={`message-status ${msg.status || 'unknown'}`}>
                    {msg.status === 'safe' && '✅ Safe'}
                    {msg.status === 'suspicious' && '⚠️ Suspicious'}
                    {msg.status === 'fraud' && '🚨 Fraud'}
                    {(!msg.status || msg.status === 'unknown') && '❓ Unknown'}
                  </span>
                  <span className="message-date">
                    {msg.timestamp || msg.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                  </span>
                </div>
                <div className="message-content">
                  <strong>From:</strong> {msg.sender || msg.address || 'Unknown'}<br/>
                  <strong>Text:</strong> {msg.text || msg.content || msg.message || 'No content'}
                  {msg.analysis && (
                    <>
                      <br/><strong>Analysis:</strong> {msg.analysis}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserMessages;
