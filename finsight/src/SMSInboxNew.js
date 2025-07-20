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

  // Mock data fallback
  const mockMessages = [
    { id: 1, from: '+15551234567', customerId: 'mobile_user_001', content: 'Your account has been locked due to suspicious activity. Please verify your identity by clicking here: http://bit.ly/suspicious-link', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), amount: 0, type: 'Phishing', riskScore: 95, status: 'New', priority: 'High', detectionMethod: 'Mobile App Scan', appSource: 'FinSight Mobile' },
    { id: 2, from: 'MoMoPay', customerId: 'mobile_user_002', content: 'You have received a payment of RWF 50,000 from John Doe. Your new balance is RWF 125,000.', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), amount: 50000, type: 'Transaction', riskScore: 10, status: 'Reviewed', priority: 'Low', detectionMethod: 'Mobile ML Analysis', appSource: 'FinSight Mobile' },
    { id: 3, from: '+250788123456', customerId: 'mobile_user_003', content: 'Congratulations! You have won a lottery of RWF 1,000,000. To claim your prize, please send a small processing fee of RWF 5,000 to this number.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), amount: 1000000, type: 'Scam', riskScore: 85, status: 'New', priority: 'High', detectionMethod: 'User Report via App', appSource: 'FinSight Mobile' }
  ];

  // Use Firebase data if available, otherwise use mock data
  const allMessages = firebaseMessages.length > 0 ? firebaseMessages.map(msg => ({
    id: msg.id,
    from: msg.sender || 'Unknown',
    customerId: msg.userId,
    content: msg.text || msg.content,
    timestamp: msg.createdAt?.toDate?.()?.toISOString() || msg.timestamp,
    amount: parseFloat(msg.amount?.replace(/[^0-9.-]/g, '') || 0),
    type: msg.type || 'SMS',
    riskScore: msg.riskScore || Math.random() * 100,
    status: msg.status || 'New',
    priority: msg.priority || 'Medium',
    detectionMethod: 'Mobile App Analysis',
    appSource: 'FinSight Mobile'
  })) : mockMessages;

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [sortBy, setSortBy] = useState('timestamp');
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let filtered = allMessages.filter(message => {
      const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <option value="New">New</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Notified">Notified</option>
            <option value="Escalated">Escalated</option>
          </select>
          
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="filter-select">
            <option value="All">All Priority</option>
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

      <div className="messages-list">
        {filteredMessages.map(message => (
          <div 
            key={message.id} 
            className={`message-item ${selectedMessage?.id === message.id ? 'selected' : ''}`}
            onClick={() => setSelectedMessage(message)}
          >
            <div className="message-header">
              <div className="message-from">
                <strong>{message.from}</strong>
                <span className="customer-id">Customer: {message.customerId}</span>
              </div>
              <div className="message-meta">
                <span className="timestamp">{getTimeAgo(message.timestamp)}</span>
                <span className={`status ${getStatusColor(message.status)}`}>{message.status}</span>
              </div>
            </div>
            
            <div className="message-content">
              {message.content}
            </div>
            
            <div className="message-footer">
              <div className="message-tags">
                <span className={`tag type-${message.type.toLowerCase()}`}>{message.type}</span>
                <span className={`tag priority-${message.priority.toLowerCase()}`}>{message.priority}</span>
                <span className={`tag ${getRiskScoreColor(message.riskScore)}`}>
                  Risk: {Math.round(message.riskScore)}%
                </span>
              </div>
              <div className="message-amount">
                {formatAmount(message.amount)}
              </div>
            </div>
            
            <div className="message-source">
              <small>{message.detectionMethod} • {message.appSource}</small>
            </div>
          </div>
        ))}
      </div>

      {selectedMessage && (
        <div className="message-details-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="message-details" onClick={(e) => e.stopPropagation()}>
            <div className="details-header">
              <h3>Message Details</h3>
              <button onClick={() => setSelectedMessage(null)} className="close-btn">×</button>
            </div>
            
            <div className="details-content">
              <div className="detail-row">
                <strong>From:</strong> {selectedMessage.from}
              </div>
              <div className="detail-row">
                <strong>Customer ID:</strong> {selectedMessage.customerId}
              </div>
              <div className="detail-row">
                <strong>Type:</strong> {selectedMessage.type}
              </div>
              <div className="detail-row">
                <strong>Status:</strong> {selectedMessage.status}
              </div>
              <div className="detail-row">
                <strong>Priority:</strong> {selectedMessage.priority}
              </div>
              <div className="detail-row">
                <strong>Risk Score:</strong> {Math.round(selectedMessage.riskScore)}%
              </div>
              <div className="detail-row">
                <strong>Amount:</strong> {formatAmount(selectedMessage.amount)}
              </div>
              <div className="detail-row">
                <strong>Detection Method:</strong> {selectedMessage.detectionMethod}
              </div>
              <div className="detail-row">
                <strong>Source:</strong> {selectedMessage.appSource}
              </div>
              <div className="detail-row">
                <strong>Timestamp:</strong> {new Date(selectedMessage.timestamp).toLocaleString()}
              </div>
              <div className="detail-row">
                <strong>Content:</strong>
                <div className="message-content-full">{selectedMessage.content}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSInbox;
