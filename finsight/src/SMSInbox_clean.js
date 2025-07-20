import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from './PageHeader';
import './SMSInbox.css';
import { fetchAllSMSMessages } from './utils/firebaseMessages';

// --- HELPER FUNCTIONS ---
const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const formatAmount = (amount) => {
  if (amount === 0) return '-';
  return `RWF ${amount.toLocaleString()}`;
};

const getRiskScoreColor = (score) => {
  if (score > 80) return 'risk-high';
  if (score > 60) return 'risk-medium';
  return 'risk-low';
};

const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'new': return 'status-new';
    case 'reviewed': return 'status-reviewed';
    case 'notified': return 'status-notified';
    case 'escalated': return 'status-escalated';
    default: return '';
  }
};

const SMSInbox = () => {
  // State for Firebase data
  const [firebaseMessages, setFirebaseMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load messages from Firebase
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const messages = await fetchAllSMSMessages();
        setFirebaseMessages(messages);
      } catch (err) {
        setError('Failed to load messages from Firebase');
        console.error('Error loading messages:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [sortBy, setSortBy] = useState('timestamp');

  // Map Firebase messages to expected format
  const allMessages = useMemo(() => {
    return firebaseMessages.map(msg => ({
      id: msg.id || Math.random().toString(36),
      type: msg.fraudScore > 80 ? 'Phishing' : msg.fraudScore > 60 ? 'Scam' : 'Transaction',
      sender: msg.sender || 'Unknown',
      phoneNumber: msg.phoneNumber || msg.phone || 'N/A',
      message: msg.content || msg.message || '',
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
      riskScore: msg.fraudScore || 0,
      status: 'new',
      priority: msg.fraudScore > 80 ? 'High' : msg.fraudScore > 60 ? 'Medium' : 'Low',
      amount: msg.amount || 0,
      customerId: msg.userId || msg.customerId || 'Unknown'
    }));
  }, [firebaseMessages]);

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let filtered = allMessages.filter(message => {
      const matchesSearch = !searchTerm || 
        message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.customerId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'All' || message.type === filterType;
      const matchesStatus = filterStatus === 'All' || message.status === filterStatus;
      const matchesPriority = filterPriority === 'All' || message.priority === filterPriority;
      
      return matchesSearch && matchesType && matchesStatus && matchesPriority;
    });

    // Sort messages
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'riskScore':
          return b.riskScore - a.riskScore;
        case 'amount':
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allMessages, searchTerm, filterType, filterStatus, filterPriority, sortBy]);

  return (
    <div className="sms-inbox-container">
      <PageHeader title="SMS Inbox - Mobile App Messages" />
      
      {loading && <div className="loading">Loading messages from Firebase...</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="inbox-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search messages, phone numbers, or customer IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
            <option value="All">All Types</option>
            <option value="Phishing">Phishing</option>
            <option value="Scam">Scam</option>
            <option value="Transaction">Transaction</option>
            <option value="Security Alert">Security Alert</option>
            <option value="Smishing">Smishing</option>
          </select>
          
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="All">All Status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="notified">Notified</option>
            <option value="escalated">Escalated</option>
          </select>
          
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="filter-select">
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="timestamp">Sort by Time</option>
            <option value="riskScore">Sort by Risk</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      </div>
      
      <div className="stats-summary">
        <div className="stat-item">
          <span className="stat-number">{filteredMessages.length}</span>
          <span className="stat-label">Total Messages</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{filteredMessages.filter(m => m.priority === 'High').length}</span>
          <span className="stat-label">High Risk</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{filteredMessages.filter(m => m.status === 'new').length}</span>
          <span className="stat-label">Unreviewed</span>
        </div>
      </div>
      
      {filteredMessages.length === 0 ? (
        <div className="no-messages">
          {loading ? 'Loading messages...' : 'No messages found matching your criteria.'}
        </div>
      ) : (
        <div className="messages-grid">
          {filteredMessages.map(message => (
            <div key={message.id} className={`message-card ${message.priority.toLowerCase()}-priority`}>
              <div className="message-header">
                <div className="message-type">
                  <span className={`type-badge ${message.type.toLowerCase().replace(' ', '-')}`}>
                    {message.type}
                  </span>
                  <span className={`status-badge ${getStatusColor(message.status)}`}>
                    {message.status}
                  </span>
                </div>
                <div className="message-meta">
                  <span className="timestamp">{getTimeAgo(message.timestamp)}</span>
                  <span className={`risk-score ${getRiskScoreColor(message.riskScore)}`}>
                    {message.riskScore}% risk
                  </span>
                </div>
              </div>
              
              <div className="message-content">
                <div className="sender-info">
                  <strong>From:</strong> {message.sender} ({message.phoneNumber})
                  <br />
                  <strong>Customer ID:</strong> {message.customerId}
                  {message.amount > 0 && (
                    <>
                      <br />
                      <strong>Amount:</strong> {formatAmount(message.amount)}
                    </>
                  )}
                </div>
                <div className="message-text">
                  {message.message}
                </div>
              </div>
              
              <div className="message-actions">
                <button className="btn btn-primary">Review</button>
                <button className="btn btn-secondary">Mark Safe</button>
                <button className="btn btn-danger">Block Sender</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SMSInbox;
