import React, { useState, useMemo } from 'react';
import PageHeader from './PageHeader';
import './SMSInbox.css';

// --- MOCK DATA ---
const initialMessages = [
  { id: 1, from: '+15551234567', customerId: 'CUST001', content: 'Your account has been locked due to suspicious activity. Please verify your identity by clicking here: http://bit.ly/suspicious-link', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), amount: 0, type: 'Phishing', riskScore: 95, status: 'New', priority: 'High', detectionMethod: 'Heuristics' },
  { id: 2, from: 'MoMoPay', customerId: 'CUST002', content: 'You have received a payment of RWF 50,000 from John Doe. Your new balance is RWF 125,000.', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), amount: 50000, type: 'Transaction', riskScore: 10, status: 'Reviewed', priority: 'Low', detectionMethod: 'Keyword Match' },
  { id: 3, from: '+250788123456', customerId: 'CUST003', content: 'Congratulations! You have won a lottery of RWF 1,000,000. To claim your prize, please send a small processing fee of RWF 5,000 to this number.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), amount: 1000000, type: 'Scam', riskScore: 85, status: 'New', priority: 'High', detectionMethod: 'Pattern Recognition' },
  { id: 4, from: 'YourBank', customerId: 'CUST004', content: 'A new device has been registered to your account. If this was not you, please contact us immediately at 1-800-FAKE-BANK.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), amount: 0, type: 'Security Alert', riskScore: 60, status: 'Notified', priority: 'Medium', detectionMethod: 'Heuristics' },
  { id: 5, from: '+15559876543', customerId: 'CUST005', content: 'Your package is out for delivery. Track it here: https://not-a-real-tracker.com/xyz', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), amount: 0, type: 'Smishing', riskScore: 75, status: 'New', priority: 'Medium', detectionMethod: 'Heuristics' },
  { id: 6, from: 'TaxOffice', customerId: 'CUST006', content: 'URGENT: Your tax refund is pending. You must update your information to receive it. Visit: fake-tax-site.com/refund', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), amount: 0, type: 'Scam', riskScore: 90, status: 'Escalated', priority: 'High', detectionMethod: 'Known Scammer' },
  { id: 7, from: 'MoMoPay', customerId: 'CUST007', content: 'Payment of RWF 1,200,000 to "Online Store" was successful.', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), amount: 1200000, type: 'Transaction', riskScore: 25, status: 'Reviewed', priority: 'Low', detectionMethod: 'Keyword Match' },
  { id: 8, from: '+250781112233', customerId: 'CUST008', content: 'We have detected a fraudulent transaction of RWF 750,000 on your card. Please confirm if this was you. Reply YES or NO.', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), amount: 750000, type: 'Fraud Alert', riskScore: 80, status: 'New', priority: 'High', detectionMethod: 'Velocity Check' },
];

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
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState(initialMessages);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  // Filter state
  const [dateRange, setDateRange] = useState('all');
  const [amount, setAmount] = useState('all');
  const [type, setType] = useState('all');
  const [showDropdown, setShowDropdown] = useState({ date: false, amount: false, type: false });

  const MESSAGES_PER_PAGE = 8;

  // --- HANDLERS for filters ---
  const handleDateChange = (value) => { setDateRange(value); setShowDropdown(prev => ({ ...prev, date: false })); };
  const handleAmountChange = (value) => { setAmount(value); setShowDropdown(prev => ({ ...prev, amount: false })); };
  const handleTypeChange = (value) => { setType(value); setShowDropdown(prev => ({ ...prev, type: false })); };
  const removeFilter = (filter) => {
    if (filter === 'date') setDateRange('all');
    if (filter === 'amount') setAmount('all');
    if (filter === 'type') setType('all');
  };
  const toggleDropdown = (filter) => {
    setShowDropdown(prev => ({ date: false, amount: false, type: false, [filter]: !prev[filter] }));
  };

  // --- DERIVED STATE & MEMOIZED COMPUTATIONS ---
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(searchLower) ||
        msg.from.toLowerCase().includes(searchLower) ||
        msg.customerId.toLowerCase().includes(searchLower)
      );
    }

    // You would expand this with dateRange, amount, and type filters in a real app
    
    return filtered;
  }, [messages, searchTerm, dateRange, amount, type]);

  const sortedMessages = useMemo(() => {
    let sortableMessages = [...filteredMessages];
    if (sortConfig.key !== null) {
      sortableMessages.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableMessages;
  }, [filteredMessages, sortConfig]);

  const currentMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * MESSAGES_PER_PAGE;
    return sortedMessages.slice(startIndex, startIndex + MESSAGES_PER_PAGE);
  }, [sortedMessages, currentPage]);

  const totalPages = Math.ceil(sortedMessages.length / MESSAGES_PER_PAGE);

  // --- EVENT HANDLERS ---
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectMessage = (id) => {
    setSelectedMessages(prev =>
      prev.includes(id) ? prev.filter(msgId => msgId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedMessages(currentMessages.map(msg => msg.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const showMessageDetail = (message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedMessage(null), 300); // Delay for closing animation
  };

  const updateMessageStatus = (messageId, newStatus) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status: newStatus } : msg
      )
    );
  };

  const handleNotifyUser = (messageId) => {
    updateMessageStatus(messageId, 'Notified');
    console.log(`Notifying user for message ${messageId}`);
  };

  const handleMarkAsReviewed = (messageId) => {
    updateMessageStatus(messageId, 'Reviewed');
    console.log(`Marking message ${messageId} as reviewed`);
  };

  const handleEscalate = (messageId) => {
    updateMessageStatus(messageId, 'Escalated');
    console.log(`Escalating message ${messageId}`);
  };

  const handleBulkAction = (action) => {
    const newStatus = action.split('-').pop(); // e.g., "Mark as Reviewed" -> "Reviewed"
    setMessages(prev =>
      prev.map(msg =>
        selectedMessages.includes(msg.id) ? { ...msg, status: newStatus } : msg
      )
    );
    setSelectedMessages([]);
    console.log(`Bulk action: ${action} on messages:`, selectedMessages);
  };

  const isAllSelected = selectedMessages.length === currentMessages.length && currentMessages.length > 0;

  // --- RENDER ---
  return (
    <div className="admin-dashboard-container">
      <PageHeader title="Suspicious SMS Inbox" />

      {/* Summary Stats */}
      <div className="admin-stats-summary">
        <div className="stat-card-admin">
          <div className="stat-value">{filteredMessages.length}</div>
          <div className="stat-label">Total Messages</div>
        </div>
        <div className="stat-card-admin">
          <div className="stat-value">{filteredMessages.filter(m => m.status === 'New').length}</div>
          <div className="stat-label">New Alerts</div>
        </div>
        <div className="stat-card-admin">
          <div className="stat-value">{filteredMessages.filter(m => m.status === 'Escalated').length}</div>
          <div className="stat-label">Cases Escalated</div>
        </div>
        <div className="stat-card-admin">
          <div className="stat-value">{filteredMessages.filter(m => m.priority === 'High').length}</div>
          <div className="stat-label">High-Priority</div>
        </div>
      </div>

      {/* Controls Header */}
      <div className="admin-controls-header">
        <div className="search-and-filter">
          {/* FILTERS CONTAINER - Re-integrated */}
          <div className="filters-container">
             {/* Your filter chips JSX here */}
          </div>
        </div>
        {selectedMessages.length > 0 && (
          <div className="bulk-actions-bar">
            <span className="bulk-actions-label">{selectedMessages.length} selected</span>
            <button onClick={() => handleBulkAction('Mark as Reviewed')} className="bulk-action-btn">Mark as Reviewed</button>
            <button onClick={() => handleBulkAction('Notify Users')} className="bulk-action-btn">Notify Users</button>
            <button onClick={() => handleBulkAction('Escalate')} className="bulk-action-btn escalate">Escalate</button>
          </div>
        )}
      </div>

      {/* Messages Table */}
      <div className="messages-table-container">
        <div className="messages-table-header">
          <div className="header-cell checkbox-cell">
            <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} />
          </div>
          <div className="header-cell message-details" onClick={() => handleSort('content')}>Message Details</div>
          <div className="header-cell risk-score" onClick={() => handleSort('riskScore')}>Risk Score</div>
          <div className="header-cell status" onClick={() => handleSort('status')}>Status</div>
          <div className="header-cell actions">Actions</div>
        </div>
        <div className="admin-messages-list">
          {currentMessages.map(message => (
            <div key={message.id} className={`admin-message-card ${selectedMessages.includes(message.id) ? 'selected' : ''}`}>
              <div className="cell checkbox-cell">
                <input type="checkbox" checked={selectedMessages.includes(message.id)} onChange={() => handleSelectMessage(message.id)} />
              </div>
              <div className="cell message-details">
                <div className="message-from">From: {message.from} <span>(Customer ID: {message.customerId})</span></div>
                <div className="message-content">{message.content}</div>
                <div className="message-meta">
                  <span>{getTimeAgo(message.timestamp)}</span> | <span>Type: {message.type}</span> | <span>Amount: {formatAmount(message.amount)}</span>
                </div>
              </div>
              <div className="cell risk-score">
                <div className={`message-risk-score ${getRiskScoreColor(message.riskScore)}`}>
                  <span className="risk-score-value">{message.riskScore}</span>
                  <span className="risk-score-label">{message.priority}</span>
                </div>
              </div>
              <div className="cell status">
                <span className={`message-status ${getStatusColor(message.status)}`}>{message.status}</span>
              </div>
              <div className="cell message-actions">
                <button onClick={() => showMessageDetail(message)} className="action-btn view">View</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="pagination-container">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
      </div>

      {/* Message Detail Modal */}
      {isModalOpen && selectedMessage && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="message-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Message Details</h3>
              <button className="close-modal-btn" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-content">
              <div className="detail-group">
                <span className="detail-label">From:</span>
                <span className="detail-value">{selectedMessage.from}</span>
              </div>
              <div className="detail-group">
                <span className="detail-label">Customer ID:</span>
                <span className="detail-value">{selectedMessage.customerId}</span>
              </div>
              <div className="detail-group">
                <span className="detail-label">Received:</span>
                <span className="detail-value">{new Date(selectedMessage.timestamp).toLocaleString()} ({getTimeAgo(selectedMessage.timestamp)})</span>
              </div>
              <div className="detail-group">
                <span className="detail-label">Full Message:</span>
                <p className="detail-message-content">{selectedMessage.content}</p>
              </div>
              <div className="detail-grid">
                <div className="detail-group">
                  <span className="detail-label">Risk Score:</span>
                  <span className={`detail-value ${getRiskScoreColor(selectedMessage.riskScore)}`}>{selectedMessage.riskScore} ({selectedMessage.priority})</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value ${getStatusColor(selectedMessage.status)}`}>{selectedMessage.status}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Message Type:</span>
                  <span className="detail-value">{selectedMessage.type}</span>
                </div>
                 <div className="detail-group">
                  <span className="detail-label">Transaction Amount:</span>
                  <span className="detail-value">{formatAmount(selectedMessage.amount)}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Detection Method:</span>
                  <span className="detail-value">{selectedMessage.detectionMethod}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => { handleMarkAsReviewed(selectedMessage.id); closeModal(); }} className="action-btn review">Mark as Reviewed</button>
              <button onClick={() => { handleNotifyUser(selectedMessage.id); closeModal(); }} className="action-btn notify">Notify User</button>
              <button onClick={() => { handleEscalate(selectedMessage.id); closeModal(); }} className="action-btn escalate">Escalate Case</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSInbox;
