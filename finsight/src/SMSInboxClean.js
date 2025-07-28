import React, { useState, useEffect } from 'react';
import { fetchAllSMSMessages, updateSMSMessageStatus } from './utils/firebaseMessages';
import { AdminMessageManager } from './utils/AdminMessageManager';
import { getSession } from './utils/auth';
import SMSInboxTester from './utils/SMSInboxTester';

const SMSInbox = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showDetails, setShowDetails] = useState(null);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [fieldTestResults, setFieldTestResults] = useState(null);

  // Fetch real SMS messages from Firebase
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📱 Fetching SMS messages from Firebase...');
        const smsMessages = await fetchAllSMSMessages();
        
        console.log(`📱 Fetched ${smsMessages.length} SMS messages from Firebase`);
        
        // Enhanced content extraction with multiple field support
        const extractMessageContent = (msg) => {
          // Try multiple content fields in order of preference
          const contentFields = [
            'text',           // Most common in mobile app
            'messageContent', // Specific field name
            'content',        // Generic content
            'message',        // Alternative message field
            'body',           // Email-style body
            'smsContent',     // SMS-specific content
            'messageText',    // Alternative text field
            'originalMessage' // Backup field
          ];
          
          for (const field of contentFields) {
            if (msg[field] && typeof msg[field] === 'string' && msg[field].trim().length > 0) {
              return {
                content: msg[field].trim(),
                extractedFrom: field,
                hasContent: true
              };
            }
          }
          
          // If no standard fields, look for any string field with substantial content
          const stringFields = Object.keys(msg).filter(key => 
            typeof msg[key] === 'string' && 
            msg[key].trim().length > 10 &&
            !['id', 'userId', 'timestamp', 'createdAt', 'date', 'status', 'source'].includes(key)
          );
          
          if (stringFields.length > 0) {
            const field = stringFields[0];
            return {
              content: msg[field].trim(),
              extractedFrom: field,
              hasContent: true,
              isAlternativeField: true
            };
          }
          
          return {
            content: 'No message content available',
            extractedFrom: null,
            hasContent: false
          };
        };

        // Transform Firebase data to match our component format
        const transformedMessages = smsMessages.map(msg => {
          // Extract timestamp
          let timestamp;
          if (msg.createdAt && msg.createdAt.toDate) {
            timestamp = msg.createdAt.toDate().toISOString();
          } else if (msg.timestamp) {
            timestamp = new Date(msg.timestamp).toISOString();
          } else {
            timestamp = new Date().toISOString();
          }

          // Extract content with enhanced logic
          const contentExtraction = extractMessageContent(msg);

          return {
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            userId: msg.userId || 'unknown',
            sender: msg.senderName || msg.sender || 'Unknown Sender',
            phone: msg.senderPhone || msg.phone || msg.from || 'Unknown Number',
            content: contentExtraction.content,
            contentMeta: {
              extractedFrom: contentExtraction.extractedFrom,
              hasContent: contentExtraction.hasContent,
              isAlternativeField: contentExtraction.isAlternativeField || false
            },
            timestamp: timestamp,
            riskScore: msg.riskScore || msg.fraudScore || (msg.analysis?.confidence * 100) || 0,
            status: msg.status || (msg.analysis?.isFraud ? 'flagged' : 'safe'),
            category: msg.category || msg.analysis?.category || msg.type || 'SMS',
            fraudType: msg.fraudType || msg.analysis?.category || null,
            aiAnalysis: msg.analysis ? `${msg.analysis.isFraud ? 'FRAUD DETECTED' : 'SAFE'} - ${msg.analysis.category || 'General SMS'} (${Math.round((msg.analysis.confidence || 0) * 100)}% confidence)` : 'AI analysis pending',
            source: msg.source || 'Mobile App',
            location: (() => {
              const loc = msg.location || 'Unknown Location';
              return typeof loc === 'string' ? loc : (loc?.formattedLocation || loc?.address || 'Unknown Location');
            })(),
            isRead: msg.isRead !== undefined ? msg.isRead : true,
            actions: msg.actions || [],
            // Additional metadata from Firebase
            processed: msg.processed || false,
            originalData: msg // Keep original for debugging
          };
        });
        
        console.log('📱 Transformed messages:', transformedMessages);
        setMessages(transformedMessages);
        
        if (transformedMessages.length === 0) {
          console.log('📱 No SMS messages found in Firebase');
        }
        
      } catch (error) {
        console.error('❌ Error loading SMS messages:', error);
        setError(error.message);
        setMessages([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  // Filter and sort messages based on search and filters
  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.phone.includes(searchTerm) ||
      message.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || message.status === filterStatus;
    
    const matchesRisk = 
      filterRisk === 'all' ||
      (filterRisk === 'high' && message.riskScore >= 80) ||
      (filterRisk === 'medium' && message.riskScore >= 40 && message.riskScore < 80) ||
      (filterRisk === 'low' && message.riskScore < 40);
    
    return matchesSearch && matchesStatus && matchesRisk;
  }).sort((a, b) => {
    // Sort by timestamp: newest first (descending order)
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateB.getTime() - dateA.getTime(); // Most recent messages at the top
  });

  // Utility functions
  const getTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const minutes = Math.round((now - date) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  const getRiskColor = (score) => {
    if (score >= 80) return '#e74c3c';
    if (score >= 40) return '#f39c12';
    return '#27ae60';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'safe': return '#27ae60';
      case 'flagged': return '#e74c3c';
      case 'under_review': return '#f39c12';
      case 'blocked': return '#8e44ad';
      default: return '#95a5a6';
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Banking': return '🏦';
      case 'Phishing': return '🎣';
      case 'Scam': return '⚠️';
      case 'Utility': return '⚡';
      case 'Impersonation': return '🎭';
      default: return '📱';
    }
  };

  // Handler functions
  const handleSelectMessage = (messageId) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleMarkSafe = async (messageId) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      if (!message) {
        alert('Message not found');
        return;
      }

      // Get admin session info
      const session = getSession();
      const adminEmail = session?.email || 'admin@finsight.com';

      console.log(`🔒 Admin proactively marking message ${messageId} as safe for user ${message.userId}`);

      // Use comprehensive AdminMessageManager for system-wide updates (PROACTIVE ACTION)
      const result = await AdminMessageManager.markFraudAsSafe(
        messageId,
        message.userId,
        adminEmail,
        'Admin proactively verified message as legitimate via SMS Analysis dashboard',
        true // isProactive = true for direct admin action
      );

      if (result.success) {
        console.log('✅ Message proactively marked as safe with comprehensive updates');
        
        // Update local state to reflect the change
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                status: 'safe', 
                riskScore: Math.min(msg.riskScore, 20),
                actions: [...(msg.actions || []), 'admin_proactive_safe'],
                adminVerified: true,
                lastAdminAction: {
                  action: 'proactive_marked_safe',
                  adminEmail: adminEmail,
                  timestamp: new Date().toISOString()
                }
              }
            : msg
        ));

        alert('✅ Message proactively marked as safe! User will be notified and all systems updated including mobile app, fraud alerts, security score, and location data.');
      } else {
        console.error('❌ Failed to mark message as safe:', result.error);
        alert(`❌ Failed to update message: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error marking message as safe:', error);
      alert('❌ Failed to update message status. Please try again.');
    }
  };

  const handleFlag = async (messageId) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      if (!message) {
        alert('Message not found');
        return;
      }

      // Get admin session info
      const session = getSession();
      const adminEmail = session?.email || 'admin@finsight.com';

      console.log(`🚨 Admin proactively marking message ${messageId} as fraud for user ${message.userId}`);

      // Use comprehensive AdminMessageManager for system-wide updates (PROACTIVE ACTION)
      const result = await AdminMessageManager.markSafeAsFraud(
        messageId,
        message.userId,
        adminEmail,
        'Admin proactively flagged message as fraudulent via SMS Analysis dashboard',
        true // isProactive = true for direct admin action
      );

      if (result.success) {
        console.log('✅ Message proactively flagged as fraud with comprehensive updates');
        
        // Update local state to reflect the change
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                status: 'flagged', 
                riskScore: Math.max(msg.riskScore, 80),
                actions: [...(msg.actions || []), 'admin_proactive_flagged_fraud'],
                adminVerified: true,
                adminFlagged: true,
                lastAdminAction: {
                  action: 'proactive_flagged_fraud',
                  adminEmail: adminEmail,
                  timestamp: new Date().toISOString()
                }
              }
            : msg
        ));

        alert('🚨 Message proactively flagged as fraud! User will be notified and all systems updated including mobile app, fraud alerts, security score, and location data.');
      } else {
        console.error('❌ Failed to flag message as fraud:', result.error);
        alert(`❌ Failed to update message: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error flagging message:', error);
      alert('❌ Failed to flag message. Please try again.');
    }
  };

  const handleBlock = async (messageId) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      if (message) {
        // Update Firebase
        await updateSMSMessageStatus(message.userId, messageId, {
          status: 'blocked',
          actions: [...(message.actions || []), 'manually_blocked'],
          adminAction: 'blocked',
          adminActionTimestamp: new Date().toISOString()
        });
        
        // Update local state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                status: 'blocked', 
                actions: [...(msg.actions || []), 'manually_blocked'] 
              }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error blocking message:', error);
      alert('Failed to block message. Please try again.');
    }
  };

  const handleBulkAction = async (action) => {
    try {
      const selectedMessageObjects = messages.filter(msg => selectedMessages.includes(msg.id));
      
      if (selectedMessageObjects.length === 0) {
        alert('No messages selected');
        return;
      }

      // Get admin session info
      const session = getSession();
      const adminEmail = session?.email || 'admin@finsight.com';

      console.log(`🔄 Admin performing bulk ${action} on ${selectedMessageObjects.length} messages`);

      // Prepare bulk actions for AdminMessageManager
      const messageActions = selectedMessageObjects.map(message => ({
        messageId: message.id,
        userId: message.userId,
        action: action === 'mark_safe' ? 'fraud_to_safe' : 'safe_to_fraud',
        reason: `Bulk admin action: ${action} via SMS Analysis dashboard`
      }));

      // Use AdminMessageManager for bulk updates with comprehensive system-wide changes
      const result = await AdminMessageManager.bulkUpdateMessages(messageActions, adminEmail);

      if (result.summary.successful > 0) {
        console.log(`✅ Bulk action completed: ${result.summary.successful} successful, ${result.summary.failed} failed`);

        // Update local state for successful updates
        result.successful.forEach(({ messageId, action: actionType }) => {
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              const isMarkSafe = actionType === 'fraud_to_safe';
              return {
                ...msg,
                status: isMarkSafe ? 'safe' : 'flagged',
                riskScore: isMarkSafe ? Math.min(msg.riskScore, 20) : Math.max(msg.riskScore, 80),
                actions: [...(msg.actions || []), `bulk_admin_${isMarkSafe ? 'safe' : 'fraud'}`],
                adminVerified: true,
                adminFlagged: !isMarkSafe,
                lastAdminAction: {
                  action: isMarkSafe ? 'bulk_marked_safe' : 'bulk_flagged_fraud',
                  adminEmail: adminEmail,
                  timestamp: new Date().toISOString()
                }
              };
            }
            return msg;
          }));
        });

        // Clear selection
        setSelectedMessages([]);

        alert(`✅ Bulk action completed! ${result.summary.successful} messages updated with comprehensive system-wide changes.\n${result.summary.failed > 0 ? `${result.summary.failed} messages failed to update.` : ''}`);
      } else {
        console.error('❌ All bulk actions failed');
        alert('❌ All bulk actions failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error in bulk action:', error);
      alert('❌ Failed to perform bulk action. Please try again.');
    }
  };

  // Test message field mapping
  const testMessageFields = async () => {
    try {
      setLoading(true);
      console.log('🧪 Testing SMS message field mapping...');
      
      const results = await SMSInboxTester.testCurrentExtractionLogic();
      setFieldTestResults(results);
      
      if (results.success) {
        alert(`Field Test Complete!\n\nTotal Messages: ${results.analysis.totalMessages}\nWith Content: ${results.analysis.messagesWithContent}\nWithout Content: ${results.analysis.messagesWithoutContent}\nSuccess Rate: ${results.analysis.contentSuccessRate}\n\nCheck console for detailed results.`);
        console.log('🧪 Field test results:', results);
      } else {
        alert(`Field test failed: ${results.error}`);
      }
    } catch (error) {
      console.error('Field test error:', error);
      alert(`Field test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  // Refresh messages from Firebase
  const refreshMessages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Refreshing SMS messages from Firebase...');
      const smsMessages = await fetchAllSMSMessages();
      
      // Transform Firebase data to match our component format
      const transformedMessages = smsMessages.map(msg => {
        // Extract timestamp
        let timestamp;
        if (msg.createdAt && msg.createdAt.toDate) {
          timestamp = msg.createdAt.toDate().toISOString();
        } else if (msg.timestamp) {
          timestamp = new Date(msg.timestamp).toISOString();
        } else {
          timestamp = new Date().toISOString();
        }

        return {
          id: msg.id || `msg_${Date.now()}_${Math.random()}`,
          userId: msg.userId || 'unknown',
          sender: msg.senderName || msg.sender || 'Unknown Sender',
          phone: msg.senderPhone || msg.phone || msg.from || 'Unknown Number',
          content: msg.messageContent || msg.content || msg.message || 'No content',
          timestamp: timestamp,
          riskScore: msg.riskScore || msg.fraudScore || (msg.analysis?.confidence * 100) || 0,
          status: msg.status || (msg.analysis?.isFraud ? 'flagged' : 'safe'),
          category: msg.category || msg.analysis?.category || msg.type || 'SMS',
          fraudType: msg.fraudType || msg.analysis?.category || null,
          aiAnalysis: msg.analysis ? `${msg.analysis.isFraud ? 'FRAUD DETECTED' : 'SAFE'} - ${msg.analysis.category || 'General SMS'} (${Math.round((msg.analysis.confidence || 0) * 100)}% confidence)` : 'AI analysis pending',
          source: msg.source || 'Mobile App',
          location: (() => {
            const loc = msg.location || 'Unknown Location';
            return typeof loc === 'string' ? loc : (loc?.formattedLocation || loc?.address || 'Unknown Location');
          })(),
          isRead: msg.isRead !== undefined ? msg.isRead : true,
          actions: msg.actions || [],
          processed: msg.processed || false,
          originalData: msg
        };
      });
      
      setMessages(transformedMessages);
      console.log(`🔄 Refreshed ${transformedMessages.length} SMS messages`);
    } catch (error) {
      console.error('❌ Error refreshing messages:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const stats = {
    total: messages.length,
    safe: messages.filter(m => m.status === 'safe').length,
    flagged: messages.filter(m => m.status === 'flagged').length,
    blocked: messages.filter(m => m.status === 'blocked').length,
    highRisk: messages.filter(m => m.riskScore >= 80).length
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px' }}>
      
      {/* Admin Action Info Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '18px' }}>👮‍♂️</span>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Admin SMS Analysis Dashboard</h3>
        </div>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
          ✨ <strong>Comprehensive Admin Actions:</strong> Mark messages as Safe or Flag as Fraud with system-wide updates including:
        </p>
        <ul style={{ margin: '8px 0 0 20px', fontSize: '13px', opacity: 0.9 }}>
          <li>📱 Real-time mobile app updates & user notifications</li>
          <li>🚨 Fraud alert management & security score adjustments</li>
          <li>📍 Location map data synchronization</li>
          <li>📊 Dashboard statistics & audit trails</li>
        </ul>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ color: '#2c3e50', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📱 SMS Inbox
            <span style={{ 
              fontSize: '14px', 
              background: '#3498db', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '12px' 
            }}>
              {filteredMessages.length} messages
            </span>
            <span style={{ 
              fontSize: '12px', 
              background: '#27ae60', 
              color: 'white', 
              padding: '2px 6px', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ⏰ Recent First
            </span>
            {debugMode && (
              <span style={{ 
                fontSize: '12px', 
                background: '#e74c3c', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '8px' 
              }}>
                DEBUG
              </span>
            )}
          </h2>
          <p style={{ color: '#7f8c8d' }}>Monitor and analyze SMS messages from FinSight mobile app users for fraud detection (sorted newest to oldest)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <button
            onClick={refreshMessages}
            disabled={loading}
            style={{
              background: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={testMessageFields}
            disabled={loading}
            style={{
              background: loading ? '#95a5a6' : '#f39c12',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            🧪 Test Fields
          </button>
          <button
            onClick={toggleDebugMode}
            style={{
              background: debugMode ? '#e74c3c' : '#95a5a6',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            🔍 {debugMode ? 'Hide Debug' : 'Debug'}
          </button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#ecf0f1', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Total Messages</div>
        </div>
        <div style={{ background: '#d5f4e6', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{stats.safe}</div>
          <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Safe Messages</div>
        </div>
        <div style={{ background: '#ffeaa7', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>{stats.flagged}</div>
          <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Flagged</div>
        </div>
        <div style={{ background: '#fab1a0', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{stats.blocked}</div>
          <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Blocked</div>
        </div>
        <div style={{ background: '#fd79a8', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e84393' }}>{stats.highRisk}</div>
          <div style={{ fontSize: '12px', color: '#7f8c8d' }}>High Risk</div>
        </div>
      </div>

      {/* Debug Panel */}
      {debugMode && (
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #e74c3c' }}>
          <h3 style={{ color: '#e74c3c', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🔍 Debug Information
          </h3>
          
          {/* Field Test Results */}
          {fieldTestResults && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>📊 Field Test Results</h4>
              <div style={{ background: 'white', padding: '15px', borderRadius: '6px', marginBottom: '10px' }}>
                <p><strong>Total Messages:</strong> {fieldTestResults.analysis?.totalMessages || 0}</p>
                <p><strong>Messages with Content:</strong> {fieldTestResults.analysis?.messagesWithContent || 0}</p>
                <p><strong>Messages without Content:</strong> {fieldTestResults.analysis?.messagesWithoutContent || 0}</p>
                <p><strong>Content Success Rate:</strong> {fieldTestResults.analysis?.contentSuccessRate || 'N/A'}</p>
              </div>
              {fieldTestResults.analysis?.sampleWithoutContent?.length > 0 && (
                <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '6px', border: '1px solid #ffeaa7' }}>
                  <strong>⚠️ Messages without content detected</strong>
                  <pre style={{ fontSize: '11px', marginTop: '5px', overflow: 'auto', maxHeight: '100px' }}>
                    {JSON.stringify(fieldTestResults.analysis.sampleWithoutContent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {/* Content Field Analysis */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>📋 Content Field Analysis</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {['text', 'content', 'message', 'messageContent'].map(field => {
                const count = messages.filter(msg => msg.contentMeta?.extractedFrom === field).length;
                return (
                  <div key={field} style={{ 
                    background: count > 0 ? '#d5f4e6' : '#ffeaa7', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    textAlign: 'center' 
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{field}</div>
                    <div style={{ color: '#7f8c8d' }}>{count} messages</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Sample Message Structure */}
          {messages.length > 0 && (
            <div>
              <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>🔬 Sample Message Structure</h4>
              <details style={{ background: 'white', padding: '15px', borderRadius: '6px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Raw Message Data</summary>
                <pre style={{ fontSize: '11px', marginTop: '10px', overflow: 'auto', maxHeight: '300px' }}>
                  {JSON.stringify(messages[0]?.originalData || messages[0], null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#2c3e50' }}>
              Search Messages
            </label>
            <input
              type="text"
              placeholder="Search by content, sender, phone, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#2c3e50' }}>
              Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Status</option>
              <option value="safe">Safe</option>
              <option value="flagged">Flagged</option>
              <option value="under_review">Under Review</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#2c3e50' }}>
              Risk Level
            </label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk (80%+)</option>
              <option value="medium">Medium Risk (40-79%)</option>
              <option value="low">Low Risk (&lt;40%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedMessages.length > 0 && (
        <div style={{ background: '#3498db', color: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedMessages.length} message(s) selected</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleBulkAction('mark_safe')} 
              disabled={loading}
              style={{ 
                background: loading ? '#95a5a6' : '#27ae60', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px', 
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
              title="Mark selected messages as safe with comprehensive system-wide updates"
            >
              🛡️ Mark Safe
            </button>
            <button onClick={() => handleBulkAction('flag')} 
              disabled={loading}
              style={{ 
                background: loading ? '#95a5a6' : '#f39c12', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px', 
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
              title="Flag selected messages as fraud with comprehensive system-wide updates"
            >
              ⚠️ Flag
            </button>
            <button onClick={() => handleBulkAction('block')} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
              Block
            </button>
            <button onClick={() => setSelectedMessages([])} style={{ background: '#95a5a6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Messages List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '20px', fontSize: '48px' }}>📱</div>
          <p style={{ color: '#7f8c8d', fontSize: '18px' }}>Loading SMS messages from Firebase...</p>
          <div style={{ width: '200px', height: '4px', background: '#ecf0f1', borderRadius: '2px', margin: '20px auto', overflow: 'hidden' }}>
            <div style={{ width: '50%', height: '100%', background: '#3498db', borderRadius: '2px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
          </div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '20px', fontSize: '48px' }}>❌</div>
          <h3 style={{ color: '#e74c3c', marginBottom: '10px' }}>Error Loading Messages</h3>
          <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      ) : filteredMessages.length === 0 && messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '20px', fontSize: '48px' }}>�</div>
          <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>No SMS Messages Yet</h3>
          <p style={{ color: '#7f8c8d', marginBottom: '15px' }}>
            No SMS messages have been analyzed yet from the mobile app.
          </p>
          <div style={{ background: '#e8f4fd', padding: '15px', borderRadius: '6px', border: '1px solid #3498db', marginTop: '20px' }}>
            <p style={{ margin: '0', fontSize: '14px', color: '#2c3e50' }}>
              📲 <strong>How to get SMS data:</strong><br/>
              1. Users need to analyze SMS messages in the FinSight mobile app<br/>
              2. The AI will detect fraud and send data to Firebase<br/>
              3. Messages will appear here for admin review
            </p>
          </div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '20px', fontSize: '48px' }}>�🔍</div>
          <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>No messages found</h3>
          <p style={{ color: '#7f8c8d' }}>No SMS messages match your current search and filter criteria.</p>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginTop: '10px' }}>
            Total messages in database: <strong>{messages.length}</strong>
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {filteredMessages.map((message, index) => (
            <div key={message.id} style={{
              padding: '20px',
              borderBottom: index < filteredMessages.length - 1 ? '1px solid #eee' : 'none',
              backgroundColor: selectedMessages.includes(message.id) ? '#f8f9fa' : 'white',
              transition: 'background-color 0.2s'
            }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedMessages.includes(message.id)}
                  onChange={() => handleSelectMessage(message.id)}
                  style={{ marginTop: '5px' }}
                />
                
                {/* Message Content */}
                <div style={{ flex: 1 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{getCategoryIcon(message.category)}</span>
                      <div>
                        <strong style={{ color: '#2c3e50' }}>{message.sender}</strong>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{message.phone} • {typeof message.location === 'string' ? message.location : (message.location?.formattedLocation || message.location?.address || 'Unknown Location')}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '5px' }}>{getTimeAgo(message.timestamp)}</div>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <span style={{
                          background: getRiskColor(message.riskScore),
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}>
                          {message.riskScore}% RISK
                        </span>
                        <span style={{
                          background: getStatusColor(message.status),
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          {message.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div style={{ margin: '15px 0', padding: '15px', background: '#f8f9fa', borderRadius: '6px', borderLeft: `4px solid ${getRiskColor(message.riskScore)}` }}>
                    <p style={{ margin: '0', color: '#2c3e50', lineHeight: '1.5' }}>{message.content}</p>
                    
                    {/* Debug Content Metadata */}
                    {debugMode && message.contentMeta && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '8px', 
                        background: message.contentMeta.hasContent ? '#d5f4e6' : '#ffeaa7', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        border: '1px solid ' + (message.contentMeta.hasContent ? '#27ae60' : '#f39c12')
                      }}>
                        <strong>🔍 Content Debug:</strong>
                        <br />
                        <strong>Source Field:</strong> {message.contentMeta.extractedFrom || 'None'}
                        <br />
                        <strong>Has Content:</strong> {message.contentMeta.hasContent ? '✅ Yes' : '❌ No'}
                        {message.contentMeta.isAlternativeField && (
                          <>
                            <br />
                            <strong>⚠️ Alternative Field Used</strong>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Analysis */}
                  <div style={{ margin: '10px 0', padding: '10px', background: '#e8f4fd', borderRadius: '6px', border: '1px solid #3498db' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#3498db', marginBottom: '5px' }}>🤖 AI Analysis</div>
                    <p style={{ margin: '0', fontSize: '13px', color: '#2c3e50' }}>{message.aiAnalysis}</p>
                  </div>

                  {/* Tags and Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#ecf0f1', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', color: '#2c3e50' }}>
                        {message.category}
                      </span>
                      <span style={{ background: '#ecf0f1', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', color: '#2c3e50' }}>
                        {message.source}
                      </span>
                      {message.fraudType && (
                        <span style={{ background: '#ffebee', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', color: '#e74c3c' }}>
                          {message.fraudType}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowDetails(showDetails === message.id ? null : message.id)}
                        style={{
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {showDetails === message.id ? 'Hide Details' : 'View Details'}
                      </button>
                      <button
                        onClick={() => handleMarkSafe(message.id)}
                        disabled={message.status === 'safe' || loading}
                        style={{
                          background: message.status === 'safe' ? '#95a5a6' : '#27ae60',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: (message.status === 'safe' || loading) ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          opacity: (message.status === 'safe' || loading) ? 0.6 : 1
                        }}
                        title={message.status === 'safe' ? 'Already marked as safe' : 'Mark this message as safe (comprehensive system update)'}
                      >
                        {message.status === 'safe' ? '✅ Safe' : '🛡️ Mark Safe'}
                        {message.adminVerified && message.lastAdminAction?.action === 'marked_safe' && ' (Admin)'}
                      </button>
                      <button
                        onClick={() => handleFlag(message.id)}
                        disabled={message.status === 'flagged' || loading}
                        style={{
                          background: message.status === 'flagged' ? '#c0392b' : '#f39c12',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: (message.status === 'flagged' || loading) ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          opacity: (message.status === 'flagged' || loading) ? 0.6 : 1
                        }}
                        title={message.status === 'flagged' ? 'Already flagged as fraud' : 'Flag this message as fraud (comprehensive system update)'}
                      >
                        {message.status === 'flagged' ? '🚨 Flagged' : '⚠️ Flag as Fraud'}
                        {message.adminFlagged && message.lastAdminAction?.action === 'flagged_fraud' && ' (Admin)'}
                      </button>
                      <button
                        onClick={() => handleBlock(message.id)}
                        style={{
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Block
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {showDetails === message.id && (
                    <div style={{ marginTop: '15px', padding: '15px', background: '#f1f2f6', borderRadius: '6px', border: '1px solid #ddd' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Message Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px' }}>
                        <div><strong>User ID:</strong> {message.userId}</div>
                        <div><strong>Message ID:</strong> {message.id}</div>
                        <div><strong>Source:</strong> {message.source}</div>
                        <div><strong>Location:</strong> {typeof message.location === 'string' ? message.location : (message.location?.formattedLocation || message.location?.address || JSON.stringify(message.location) || 'Unknown Location')}</div>
                        <div><strong>Timestamp:</strong> {new Date(message.timestamp).toLocaleString()}</div>
                        <div><strong>Read Status:</strong> {message.isRead ? 'Read' : 'Unread'}</div>
                      </div>
                      {message.actions.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Actions Taken:</strong>
                          <div style={{ marginTop: '5px' }}>
                            {message.actions.map((action, idx) => (
                              <span key={idx} style={{ 
                                background: '#3498db', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '10px', 
                                fontSize: '10px', 
                                marginRight: '5px' 
                              }}>
                                {action.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Admin Action History */}
                      {(message.adminVerified || message.adminFlagged || message.lastAdminAction) && (
                        <div style={{ 
                          marginTop: '15px', 
                          padding: '12px', 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          borderRadius: '6px',
                          color: 'white'
                        }}>
                          <h5 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            👮‍♂️ Admin Action History
                          </h5>
                          
                          {message.adminVerified && (
                            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                              ✅ <strong>Admin Verified:</strong> Message verified as legitimate
                            </div>
                          )}
                          
                          {message.adminFlagged && (
                            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                              🚨 <strong>Admin Flagged:</strong> Message flagged as fraudulent
                            </div>
                          )}
                          
                          {message.lastAdminAction && (
                            <div style={{ fontSize: '12px', marginTop: '6px', padding: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                              <div><strong>Last Action:</strong> {message.lastAdminAction.action?.replace('_', ' ')}</div>
                              <div><strong>Admin:</strong> {message.lastAdminAction.adminEmail || 'Unknown'}</div>
                              <div><strong>Time:</strong> {new Date(message.lastAdminAction.timestamp).toLocaleString()}</div>
                            </div>
                          )}
                          
                          <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.9 }}>
                            📱 System-wide updates: Mobile app, fraud alerts, security score, location data
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SMSInbox;
