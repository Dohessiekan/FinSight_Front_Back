/**
 * AdminNotificationCenter - Admin dashboard component for handling user review requests
 * Displays pending user requests and allows admin to approve/reject them
 */

import React, { useState, useEffect } from 'react';
import { AdminNotificationManager } from '../utils/AdminNotificationManager';
import { getSession } from '../utils/auth';
import './AdminNotificationCenter.css';

const AdminNotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const result = await AdminNotificationManager.getPendingNotifications();
      if (result.success) {
        setNotifications(result.notifications);
        console.log(`📧 Loaded ${result.notifications.length} pending notifications`);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (notificationId, reason = 'Admin confirmed message is safe') => {
    setProcessingId(notificationId);
    try {
      const session = await getSession();
      const adminEmail = session?.user?.email || 'admin@finsight.com';
      
      const result = await AdminNotificationManager.approveUserSafetyRequest(
        notificationId, 
        adminEmail, 
        reason
      );

      if (result.success) {
        await loadNotifications(); // Refresh the list
        setShowModal(false);
        setSelectedNotification(null);
        
        // Show success message
        alert('✅ User request approved! Message marked as safe and user notified.');
      } else {
        alert('❌ Failed to approve request: ' + result.message);
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('❌ Failed to approve request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (notificationId, reason = 'Admin confirmed message is fraudulent') => {
    setProcessingId(notificationId);
    try {
      const session = await getSession();
      const adminEmail = session?.user?.email || 'admin@finsight.com';
      
      const result = await AdminNotificationManager.rejectUserSafetyRequest(
        notificationId, 
        adminEmail, 
        reason
      );

      if (result.success) {
        await loadNotifications(); // Refresh the list
        setShowModal(false);
        setSelectedNotification(null);
        
        // Show success message
        alert('❌ User request rejected. Original status maintained and user notified.');
      } else {
        alert('❌ Failed to reject request: ' + result.message);
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('❌ Failed to reject request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const openModal = (notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNotification(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fraud': return '#dc3545';
      case 'suspicious': return '#fd7e14';
      case 'safe': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="notification-center-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin notifications...</p>
      </div>
    );
  }

  return (
    <div className="admin-notification-center">
      <div className="notification-header">
        <h2>📧 User Review Requests</h2>
        <div className="notification-stats">
          <span className="notification-count">
            {notifications.length} pending
          </span>
          <button 
            className="refresh-button"
            onClick={loadNotifications}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="no-notifications">
          <div className="no-notifications-icon">✅</div>
          <h3>No Pending Requests</h3>
          <p>All user requests have been processed.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-card priority-${notification.priority}`}
            >
              <div className="notification-priority-indicator" 
                   style={{ backgroundColor: getPriorityColor(notification.priority) }}>
              </div>
              
              <div className="notification-content">
                <div className="notification-header-info">
                  <div className="user-info">
                    <strong>{notification.userEmail}</strong>
                    <span className="user-phone">📱 {notification.userPhone}</span>
                  </div>
                  <div className="request-time">
                    {notification.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                  </div>
                </div>

                <div className="message-info">
                  <div className="message-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(notification.message.currentStatus) }}
                    >
                      {notification.message.currentStatus.toUpperCase()}
                    </span>
                    <span className="confidence-score">
                      {Math.round((notification.message.confidence || 0) * 100)}% confidence
                    </span>
                  </div>
                  
                  <div className="message-preview">
                    <strong>From:</strong> {notification.message.sender} <br />
                    <strong>Message:</strong> {notification.message.text?.substring(0, 100)}
                    {notification.message.text?.length > 100 && '...'}
                  </div>

                  <div className="message-analysis">
                    <strong>Analysis:</strong> {notification.message.analysis || 'No analysis available'}
                  </div>
                </div>

                <div className="notification-actions">
                  <button
                    className="view-details-button"
                    onClick={() => openModal(notification)}
                  >
                    👁️ View Details
                  </button>
                  
                  <button
                    className="approve-button"
                    onClick={() => handleApprove(notification.id)}
                    disabled={processingId === notification.id}
                  >
                    {processingId === notification.id ? '⏳' : '✅'} Approve
                  </button>
                  
                  <button
                    className="reject-button"
                    onClick={() => handleReject(notification.id)}
                    disabled={processingId === notification.id}
                  >
                    {processingId === notification.id ? '⏳' : '❌'} Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedNotification && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📧 User Request Details</h3>
              <button className="close-button" onClick={closeModal}>✖️</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>👤 User Information</h4>
                <p><strong>Email:</strong> {selectedNotification.userEmail}</p>
                <p><strong>Phone:</strong> {selectedNotification.userPhone}</p>
                <p><strong>Request Time:</strong> {selectedNotification.createdAt?.toDate?.()?.toLocaleString()}</p>
              </div>

              <div className="detail-section">
                <h4>📱 Message Details</h4>
                <p><strong>Sender:</strong> {selectedNotification.message.sender}</p>
                <p><strong>Current Status:</strong> 
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedNotification.message.currentStatus) }}
                  >
                    {selectedNotification.message.currentStatus.toUpperCase()}
                  </span>
                </p>
                <p><strong>Confidence:</strong> {Math.round((selectedNotification.message.confidence || 0) * 100)}%</p>
                <p><strong>Message:</strong></p>
                <div className="message-full-text">
                  {selectedNotification.message.text}
                </div>
              </div>

              <div className="detail-section">
                <h4>🔍 Analysis</h4>
                <div className="analysis-text">
                  {selectedNotification.message.analysis || 'No analysis available'}
                </div>
              </div>

              <div className="detail-section">
                <h4>📝 User Request</h4>
                <p><strong>Reason:</strong> {selectedNotification.request.reason}</p>
                <p><strong>Action:</strong> {selectedNotification.request.action}</p>
                <p><strong>Priority:</strong> 
                  <span style={{ color: getPriorityColor(selectedNotification.priority) }}>
                    {selectedNotification.priority.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="approve-button"
                onClick={() => handleApprove(selectedNotification.id)}
                disabled={processingId === selectedNotification.id}
              >
                {processingId === selectedNotification.id ? '⏳ Processing...' : '✅ Approve Request'}
              </button>
              
              <button
                className="reject-button"
                onClick={() => handleReject(selectedNotification.id)}
                disabled={processingId === selectedNotification.id}
              >
                {processingId === selectedNotification.id ? '⏳ Processing...' : '❌ Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationCenter;
