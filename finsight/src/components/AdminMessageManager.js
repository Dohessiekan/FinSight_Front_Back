import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { markSMSAsSafe, markSMSAsFraud, getMessageAdminHistory } from '../utils/auth';

const AdminMessageManager = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminEmail] = useState('admin@finsight.com'); // Replace with actual admin email

  // Load users with messages
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserMessages = async (userId) => {
    try {
      setLoading(true);
      const messagesRef = collection(db, 'users', userId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUserMessages(messages);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error loading user messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSafe = async (messageId, userId) => {
    try {
      setActionLoading(true);
      const reason = prompt('Reason for marking as safe:') || 'Admin verified as legitimate';
      
      const result = await markSMSAsSafe(messageId, userId, adminEmail, reason);
      
      if (result.success) {
        alert('✅ Message marked as safe successfully!\n\n' + 
              'Updates made:\n' +
              '• Message status changed to safe\n' +
              '• Fraud alerts removed/resolved\n' +
              '• Dashboard statistics updated\n' +
              '• User security score improved\n' +
              '• Location map data updated');
        
        // Reload messages to show updated status
        loadUserMessages(userId);
      } else {
        alert('❌ Failed to mark as safe: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsFraud = async (messageId, userId) => {
    try {
      setActionLoading(true);
      const reason = prompt('Reason for marking as fraud:') || 'Admin identified as fraudulent';
      
      const result = await markSMSAsFraud(messageId, userId, adminEmail, reason);
      
      if (result.success) {
        alert('🚨 Message marked as fraud successfully!\n\n' + 
              'Updates made:\n' +
              '• Message status changed to fraud\n' +
              '• New fraud alert created\n' +
              '• Dashboard statistics updated\n' +
              '• User security score adjusted\n' +
              '• Location map data updated');
        
        // Reload messages to show updated status
        loadUserMessages(userId);
      } else {
        alert('❌ Failed to mark as fraud: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return '#28a745';
      case 'fraud': return '#dc3545';
      case 'suspicious': return '#ffc107';
      case 'blocked': return '#6c757d';
      default: return '#17a2b8';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'safe': return '✅ Safe';
      case 'fraud': return '🚨 Fraud';
      case 'suspicious': return '⚠️ Suspicious';
      case 'blocked': return '🚫 Blocked';
      default: return '❓ Unknown';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🛠️ Admin Message Management</h2>
      <p>Comprehensive message status management with system-wide updates</p>
      
      {/* Users List */}
      <div style={{ marginBottom: '30px' }}>
        <h3>📋 Users ({users.length})</h3>
        {loading && <p>Loading users...</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
          {users.map(user => (
            <div
              key={user.id}
              onClick={() => loadUserMessages(user.id)}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                cursor: 'pointer',
                backgroundColor: selectedUser === user.id ? '#e7f3ff' : '#f9f9f9',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{user.email || user.id}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Security Score: {user.securityScore || 'N/A'} | 
                Risk: {user.riskLevel || 'Unknown'}
              </div>
              {user.lastAdminReview && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                  Last admin action: {user.lastAdminReview.action} by {user.lastAdminReview.adminEmail}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Messages */}
      {selectedUser && (
        <div>
          <h3>📱 Messages for User: {selectedUser}</h3>
          {loading && <p>Loading messages...</p>}
          {actionLoading && (
            <div style={{ padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', marginBottom: '15px' }}>
              ⏳ Processing admin action... Please wait.
            </div>
          )}
          
          <div style={{ display: 'grid', gap: '15px' }}>
            {userMessages.map(message => (
              <div
                key={message.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#fff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      color: 'white', 
                      fontSize: '12px',
                      backgroundColor: getStatusColor(message.status)
                    }}>
                      {getStatusText(message.status)}
                    </span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                      From: {message.sender || 'Unknown'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    {message.createdAt?.toDate?.()?.toLocaleString() || message.timestamp}
                  </div>
                </div>
                
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <strong>Message:</strong><br />
                  {message.text || 'No message text'}
                </div>
                
                {message.analysis && (
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                    <strong>Analysis:</strong> {message.analysis}
                  </div>
                )}
                
                {message.adminReview && (
                  <div style={{ marginBottom: '15px', padding: '8px', backgroundColor: '#e8f4f8', borderRadius: '4px', fontSize: '11px' }}>
                    <strong>Admin Review:</strong><br />
                    Action: {message.adminReview.action} by {message.adminReview.adminEmail}<br />
                    Reason: {message.adminReview.reason}<br />
                    Time: {message.adminReview.timestamp?.toDate?.()?.toLocaleString()}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  {message.status !== 'safe' && (
                    <button
                      onClick={() => handleMarkAsSafe(message.id, selectedUser)}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✅ Mark as Safe
                    </button>
                  )}
                  
                  {message.status !== 'fraud' && (
                    <button
                      onClick={() => handleMarkAsFraud(message.id, selectedUser)}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🚨 Mark as Fraud
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {userMessages.length === 0 && !loading && (
            <p style={{ textAlign: 'center', color: '#666' }}>No messages found for this user.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMessageManager;
