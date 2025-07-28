import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Safety Confirmations component for admin monitoring
const SafetyConfirmations = () => {
  const [confirmations, setConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, overrides, recent
  const [searchUser, setSearchUser] = useState('');
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Set up real-time listener for safety confirmations
  useEffect(() => {
    let unsubscribe;
    let authUnsubscribe;
    
    // Monitor authentication state
    authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔐 Auth state changed:', currentUser ? 'Authenticated' : 'Not authenticated');
      setUser(currentUser);
      
      if (currentUser) {
        setupRealtimeConfirmations();
      } else {
        setConfirmations([]);
        setLoading(false);
        setError('Authentication required. Please log in to view safety confirmations.');
      }
    });
    
    const setupRealtimeConfirmations = () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Setting up real-time safety confirmations listener...');
        
        // Create real-time listener for safety_confirmations collection
        const confirmationsRef = collection(db, 'safety_confirmations');
        const q = query(
          confirmationsRef, 
          orderBy('confirmedAt', 'desc')
        );
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const realTimeConfirmations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().confirmedAt?.toDate?.()?.toLocaleString() || 
                      doc.data().confirmedAtISO || 
                      new Date().toLocaleString()
          }));
          
          console.log(`🔄 Real-time safety confirmations update: ${realTimeConfirmations.length} confirmations received`);
          
          // If no confirmations, show helpful placeholder
          if (realTimeConfirmations.length === 0) {
            setConfirmations([{
              id: 'placeholder',
              timestamp: new Date().toLocaleString(),
              userAction: 'No Safety Confirmations',
              messageText: '✨ No safety confirmations yet. Users will start marking messages as safe from their mobile app!',
              userId: 'system',
              confirmationType: 'info',
              isOverride: false
            }]);
          } else {
            setConfirmations(realTimeConfirmations);
          }
          
          setLoading(false);
          setError(null);
        }, (listenerError) => {
          console.error('❌ Real-time safety confirmations listener error:', listenerError);
          setError(`Firebase Listener Error: ${listenerError.message}`);
          setLoading(false);
        });
        
      } catch (setupError) {
        console.error('❌ Failed to setup real-time safety confirmations:', setupError);
        setError(`Setup Error: ${setupError.message}`);
        setLoading(false);
      }
    };
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('🔄 Real-time safety confirmations listener cleaned up');
      }
      if (authUnsubscribe) {
        authUnsubscribe();
        console.log('🔄 Auth listener cleaned up');
      }
    };
  }, []);

  // Filter confirmations based on criteria
  const filteredConfirmations = confirmations.filter(confirmation => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'overrides' && confirmation.isOverride) ||
                         (filter === 'recent' && new Date(confirmation.confirmedAtISO) > new Date(Date.now() - 24*60*60*1000));
    
    const matchesUser = !searchUser || 
                       confirmation.userId?.toLowerCase().includes(searchUser.toLowerCase()) ||
                       confirmation.phone?.includes(searchUser);
    
    return matchesFilter && matchesUser;
  });

  const getConfirmationColor = (confirmationType) => {
    switch(confirmationType) {
      case 'user_override': return '#27ae60';
      case 'admin_review': return '#3498db';
      case 'system_correction': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getOverrideColor = (isOverride) => {
    return isOverride ? '#e74c3c' : '#95a5a6';
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>✅ User Safety Confirmations ({filteredConfirmations.length})</h2>
        <p style={{ color: '#7f8c8d' }}>Real-time monitoring of user safety confirmations from FinSight mobile app</p>
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
            <option value="all">All Confirmations ({confirmations.length})</option>
            <option value="overrides">User Overrides Only ({confirmations.filter(c => c.isOverride).length})</option>
            <option value="recent">Recent (24h) ({confirmations.filter(c => new Date(c.confirmedAtISO) > new Date(Date.now() - 24*60*60*1000)).length})</option>
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
          <p>Loading safety confirmations from Firebase...</p>
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
          {filteredConfirmations.map(confirmation => (
            <div key={confirmation.id} style={{
              background: 'white',
              border: `2px solid ${getConfirmationColor(confirmation.confirmationType)}`,
              borderRadius: '8px',
              padding: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>✅ Safety Confirmation</h3>
                  <p style={{ margin: '0', fontSize: '12px', color: '#7f8c8d' }}>{confirmation.timestamp}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{
                    background: getConfirmationColor(confirmation.confirmationType),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                  }}>
                    {confirmation.confirmationType || 'user_confirmation'}
                  </span>
                  {confirmation.isOverride && (
                    <span style={{
                      background: getOverrideColor(confirmation.isOverride),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      Override
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#34495e' }}>
                  👤 User ID: {confirmation.userId || 'Unknown'} | 📱 Phone: {confirmation.phone || 'N/A'}
                </p>
                <p style={{ margin: '0 0 5px 0', color: '#7f8c8d', fontStyle: 'italic', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  📨 "{confirmation.messageText || 'No message content'}"
                </p>
                
                {/* Original Analysis vs User Confirmation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div style={{ background: '#fff5f5', padding: '8px', borderRadius: '4px', border: '1px solid #feb2b2' }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#c53030' }}>Original System Analysis</h4>
                    <p style={{ margin: '0', fontSize: '11px', color: '#68d391' }}>
                      Status: {confirmation.originalStatus || 'Unknown'} | 
                      Confidence: {confirmation.originalAnalysis?.confidence || 0}%
                    </p>
                    <p style={{ margin: '0', fontSize: '10px', color: '#a0aec0' }}>
                      {confirmation.originalAnalysis?.analysis || 'No analysis available'}
                    </p>
                  </div>
                  
                  <div style={{ background: '#f0fff4', padding: '8px', borderRadius: '4px', border: '1px solid #9ae6b4' }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#2f855a' }}>User Confirmation</h4>
                    <p style={{ margin: '0', fontSize: '11px', color: '#2f855a' }}>
                      Action: {confirmation.userAction || 'marked_safe'} | 
                      User Confidence: {confirmation.confidence || 100}%
                    </p>
                    <p style={{ margin: '0', fontSize: '10px', color: '#68d391' }}>
                      User Override: {confirmation.isOverride ? 'Yes - Disagreed with system' : 'No - Agreed with system'}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  <span><strong>Message Type:</strong> {confirmation.messageType || 'SMS'}</span>
                  <span><strong>Source:</strong> {confirmation.messageSource || 'Mobile App'}</span>
                  <span><strong>Device:</strong> {confirmation.deviceInfo?.platform || 'Unknown'}</span>
                  {confirmation.location?.coordinates && (
                    <span style={{ 
                      color: confirmation.location.coordinates.isDefault ? '#e74c3c' : '#27ae60',
                      fontWeight: 'bold'
                    }}>
                      <strong>📍 GPS:</strong> {confirmation.location.coordinates.isDefault ? 'Default' : 'Real GPS'} 
                      ({confirmation.location.coordinates.latitude?.toFixed(4)}, {confirmation.location.coordinates.longitude?.toFixed(4)})
                    </span>
                  )}
                  {!confirmation.location && (
                    <span style={{ color: '#95a5a6' }}>
                      <strong>📍 GPS:</strong> No location data
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#7f8c8d' }}>User Feedback Quality:</span>
                  <div style={{
                    background: confirmation.isOverride ? '#fed7d7' : '#c6f6d5',
                    color: confirmation.isOverride ? '#c53030' : '#2f855a',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {confirmation.isOverride ? '⚠️ System Disagreement' : '✅ System Agreement'}
                  </div>
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
                    📍 View Location
                  </button>
                  <button style={{
                    background: '#f39c12',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    📊 View User Profile
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
                    ✅ Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredConfirmations.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              <p>No safety confirmations match your current filter criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafetyConfirmations;
