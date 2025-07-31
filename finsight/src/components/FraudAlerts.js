import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Enhanced Fraud Alerts component for comprehensive admin monitoring
const FraudAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, fraud, suspicious
  const [gpsFilter, setGpsFilter] = useState('all'); // all, real-gps, default
  const [searchUser, setSearchUser] = useState('');
  const [error, setError] = useState(null);
  // const [user, setUser] = useState(null); // Commented out to fix ESLint warning

  // Set up real-time listener for fraud alerts
  useEffect(() => {
    let unsubscribe;
    let authUnsubscribe;
    
    // Monitor authentication state
    authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔐 Auth state changed:', currentUser ? 'Authenticated' : 'Not authenticated');
      // setUser(currentUser); // Commented out to fix ESLint warning
      
      if (currentUser) {
        setupRealtimeAlerts();
      } else {
        setAlerts([]);
        setLoading(false);
        setError('Authentication required. Please log in to view fraud alerts.');
      }
    });
    
    const setupRealtimeAlerts = () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Setting up real-time alerts listener...');
        
        // Create real-time listener for fraud_alerts collection (correct format)
        const alertsRef = collection(db, 'fraud_alerts');
        const q = query(
          alertsRef, 
          orderBy('createdAt', 'desc')
          // No limit - show ALL alerts including multiple from same user
        );
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const realTimeAlerts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toDate?.()?.toLocaleString() || 
                      doc.data().timestamp?.toDate?.()?.toLocaleString() || 
                      new Date().toLocaleString()
          }));
          
          console.log(`🔄 Real-time fraud alerts update: ${realTimeAlerts.length} alerts received (all users)`);
          
          // If no real alerts, show helpful placeholder
          if (realTimeAlerts.length === 0) {
            setAlerts([{
              id: 'placeholder',
              timestamp: new Date().toLocaleString(),
              type: 'No Fraud Alerts',
              severity: 'info',
              phone: 'N/A',
              message: '✨ No fraud alerts detected yet. Start analyzing SMS in your mobile app to see real-time security alerts appear here!',
              content: '✨ No fraud alerts detected yet. Start analyzing SMS in your mobile app to see real-time security alerts appear here!',
              confidence: 0,
              status: 'info',
              source: 'FinSight Security System',
              userId: 'system',
              priority: 'info'
            }]);
          } else {
            setAlerts(realTimeAlerts);
          }
          
          setLoading(false);
          setError(null); // Clear any previous errors
        }, (listenerError) => {
          console.error('❌ Real-time alerts listener error:', listenerError);
          setError(`Firebase Listener Error: ${listenerError.message}`);
          
          // Fallback to legacy fraud_alerts collection if it exists
          try {
            const fallbackAlertsRef = collection(db, 'fraud_alerts');
            const fallbackQ = query(fallbackAlertsRef, orderBy('createdAt', 'desc'));
            
            const fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
              const fallbackAlerts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().createdAt?.toDate?.()?.toLocaleString() || 
                          doc.data().detectedAt?.toDate?.()?.toLocaleString() || 
                          new Date().toLocaleString()
              }));
              
              console.log(`🔄 Fallback alerts: ${fallbackAlerts.length} alerts from fraud_alerts collection`);
              setAlerts(fallbackAlerts.length > 0 ? fallbackAlerts : [{
                id: 'error',
                timestamp: new Date().toLocaleString(),
                type: 'Connection Error',
                severity: 'warning',
                phone: 'N/A',
                message: '⚠️ Unable to load real-time fraud alerts. Check Firebase connection.',
                content: '⚠️ Unable to load real-time fraud alerts. Check Firebase connection.',
                confidence: 0,
                status: 'error',
                source: 'System Error',
                userId: 'error',
                priority: 'medium'
              }]);
              setLoading(false);
            });
            
            unsubscribe = fallbackUnsubscribe; // Update the unsubscribe reference
          } catch (fallbackError) {
            console.error('❌ Fallback listener also failed:', fallbackError);
            setError(`Both primary and fallback listeners failed: ${fallbackError.message}`);
            setLoading(false);
          }
        });
        
      } catch (setupError) {
        console.error('❌ Failed to setup real-time alerts:', setupError);
        setError(`Setup Error: ${setupError.message}`);
        setLoading(false);
      }
    };
    
    // Only setup listener if not already done via auth state change
    // (auth state change will trigger setupRealtimeAlerts automatically)
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('🔄 Real-time alerts listener cleaned up');
      }
      if (authUnsubscribe) {
        authUnsubscribe();
        console.log('🔄 Auth listener cleaned up');
      }
    };
  }, []);

  // Filter alerts based on type, GPS type, and user search
  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'fraud' && alert.type?.toLowerCase().includes('fraud')) ||
                         (filter === 'suspicious' && alert.type?.toLowerCase().includes('suspicious'));
    
    const matchesGpsFilter = gpsFilter === 'all' ||
                            (gpsFilter === 'real-gps' && 
                             ((alert.location?.coordinates && !alert.location.coordinates.isDefault) ||
                              (alert.location?.quality?.hasRealGPS))) ||
                            (gpsFilter === 'default' && 
                             ((alert.location?.coordinates && alert.location.coordinates.isDefault) ||
                              (!alert.location?.quality?.hasRealGPS && alert.location)));
    
    const matchesUser = !searchUser || 
                       alert.userId?.toLowerCase().includes(searchUser.toLowerCase()) ||
                       alert.phone?.includes(searchUser);
    
    return matchesFilter && matchesGpsFilter && matchesUser;
  });

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'warning': return '#f1c40f';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#e74c3c';
      case 'investigating': return '#f39c12';
      case 'blocked': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>🚨 Mobile App Security Alerts ({filteredAlerts.length})</h2>
        <p style={{ color: '#7f8c8d' }}>Real-time monitoring of fraud activities from FinSight mobile app users</p>
      </div>
      
      {/* Filter Controls */}
      <div style={{ 
        background: 'white', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by Type:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">All Alerts ({alerts.length})</option>
            <option value="fraud">Fraud Only ({alerts.filter(a => a.type?.toLowerCase().includes('fraud')).length})</option>
            <option value="suspicious">Suspicious Only ({alerts.filter(a => a.type?.toLowerCase().includes('suspicious')).length})</option>
          </select>
        </div>
        
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>GPS Filter:</label>
          <select 
            value={gpsFilter} 
            onChange={(e) => setGpsFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">All GPS Types ({alerts.length})</option>
            <option value="real-gps">Real GPS Only ({alerts.filter(a => 
              (a.location?.coordinates && !a.location.coordinates.isDefault) ||
              (a.location?.quality?.hasRealGPS)
            ).length})</option>
            <option value="default">Default/Approximate ({alerts.filter(a => 
              (a.location?.coordinates && a.location.coordinates.isDefault) ||
              (!a.location?.quality?.hasRealGPS && a.location) ||
              (!a.location)
            ).length})</option>
          </select>
        </div>
        
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Search User:</label>
          <input 
            type="text"
            placeholder="Enter User ID or Phone..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            style={{ 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ddd',
              minWidth: '200px'
            }}
          />
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
          <p>Loading fraud alerts from Firebase...</p>
        </div>
      ) : error ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          background: '#ffe6e6', 
          border: '2px solid #e74c3c',
          borderRadius: '8px',
          color: '#c0392b',
          margin: '20px 0'
        }}>
          <h3>🚨 Firebase Connection Error</h3>
          <p>{error}</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Please check your internet connection and Firebase configuration.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredAlerts.map(alert => (
            <div key={alert.id} style={{
              background: 'white',
              border: `2px solid ${getSeverityColor(alert.severity)}`,
              borderRadius: '8px',
              padding: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{alert.type}</h3>
                  <p style={{ margin: '0', fontSize: '12px', color: '#7f8c8d' }}>{alert.timestamp}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{
                    background: getSeverityColor(alert.severity),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                  }}>
                    {alert.severity}
                  </span>
                  <span style={{
                    background: getStatusColor(alert.status),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                  }}>
                    {alert.status}
                  </span>
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#34495e' }}>
                  📱 Phone: {alert.phone || 'N/A'} | 👤 User ID: {alert.userId || 'Unknown'}
                </p>
                <p style={{ margin: '0 0 5px 0', color: '#7f8c8d', fontStyle: 'italic', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  📨 "{alert.message || alert.content || 'No message content'}"
                </p>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  <span><strong>Source:</strong> {alert.source || 'Mobile App'}</span>
                  <span><strong>Priority:</strong> {alert.priority || 'Medium'}</span>
                  {alert.source && alert.source.includes('Manual') && (
                    <span style={{ 
                      color: '#007bff',
                      fontWeight: 'bold',
                      backgroundColor: '#e3f2fd',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      📋 Manual Analysis (Same API as SMS)
                    </span>
                  )}
                  {alert.source && alert.source.includes('Unified') && (
                    <span style={{ 
                      color: '#28a745',
                      fontWeight: 'bold',
                      backgroundColor: '#e8f5e8',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      🔗 Unified Pipeline
                    </span>
                  )}
                  {alert.userAction && alert.userAction.action === 'marked_safe' && (
                    <span style={{ 
                      color: '#17a2b8',
                      fontWeight: 'bold',
                      backgroundColor: '#d1ecf1',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      ✅ User Marked Safe (Saved to Firebase)
                    </span>
                  )}
                  {alert.status === 'resolved' && (
                    <span style={{ 
                      color: '#28a745',
                      fontWeight: 'bold',
                      backgroundColor: '#d4edda',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      ✅ Alert Resolved by User
                    </span>
                  )}
                  {alert.status === 'blocked' && (
                    <span style={{ 
                      color: '#6c757d',
                      fontWeight: 'bold',
                      backgroundColor: '#e2e3e5',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      🚫 User Blocked Sender
                    </span>
                  )}
                  {alert.status === 'confirmed' && (
                    <span style={{ 
                      color: '#dc3545',
                      fontWeight: 'bold',
                      backgroundColor: '#f8d7da',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      🚨 User Confirmed Fraud
                    </span>
                  )}
                  {alert.userActions && alert.userActions.length > 1 && (
                    <span style={{ 
                      color: '#6f42c1',
                      fontWeight: 'bold',
                      backgroundColor: '#e2e3f3',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      🔄 Multiple User Actions ({alert.userActions.length})
                    </span>
                  )}
                  {alert.previouslyFlagged && (
                    <span style={{ 
                      color: '#fd7e14',
                      fontWeight: 'bold',
                      backgroundColor: '#fff3cd',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      🔄 User Override
                    </span>
                  )}
                  {alert.location?.coordinates && (
                    <span style={{ 
                      color: alert.location.coordinates.isDefault ? '#e74c3c' : '#27ae60',
                      fontWeight: 'bold'
                    }}>
                      <strong>📍 GPS:</strong> {alert.location.coordinates.isDefault ? 'Default Location' : 'Real GPS'} 
                      ({alert.location.coordinates.latitude?.toFixed(4)}, {alert.location.coordinates.longitude?.toFixed(4)})
                      {alert.location.coordinates.accuracy && !alert.location.coordinates.isDefault && 
                        ` ±${alert.location.coordinates.accuracy}m`
                      }
                    </span>
                  )}
                  {alert.location?.latitude && !alert.location?.coordinates && (
                    <span style={{ 
                      color: alert.location.quality?.hasRealGPS ? '#27ae60' : '#e74c3c',
                      fontWeight: 'bold'
                    }}>
                      <strong>📍 GPS:</strong> {alert.location.quality?.hasRealGPS ? 'Real GPS' : 'Approximate'} 
                      ({alert.location.latitude?.toFixed(4)}, {alert.location.longitude?.toFixed(4)})
                    </span>
                  )}
                  {!alert.location && (
                    <span style={{ color: '#95a5a6' }}>
                      <strong>📍 GPS:</strong> No location data
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Confidence:</span>
                  <div style={{
                    background: '#ecf0f1',
                    borderRadius: '10px',
                    width: '100px',
                    height: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: alert.confidence > 90 ? '#e74c3c' : alert.confidence > 80 ? '#f39c12' : '#f1c40f',
                      width: `${alert.confidence || 0}%`,
                      height: '100%'
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2c3e50' }}>{alert.confidence || 0}%</span>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    📍 View on Map
                  </button>
                  <button style={{
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    ✅ Mark Safe
                  </button>
                  <button style={{
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    🚫 Block Sender
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredAlerts.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              <p>No fraud alerts match your current filter criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FraudAlerts;
