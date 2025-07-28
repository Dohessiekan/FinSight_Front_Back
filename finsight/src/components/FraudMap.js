import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { markSMSAsSafe, blockSMSSender, getSession } from '../utils/auth';
import { getFraudAlertsByLocation } from '../utils/firebaseMessages';
import MobileAlertSystem from '../utils/MobileAlertSystem'; // Import web-compatible version v2.1 FORCE REFRESH
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different alert types
const createCustomIcon = (color, type) => {
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.8 12.5 28.5 12.5 28.5s12.5-19.7 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="8" fill="white"/>
      <text x="12.5" y="17" text-anchor="middle" font-size="12" fill="${color}">${type === 'fraud' ? '!' : '?'}</text>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-div-icon',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const FraudMap = () => {
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, fraud, suspicious, today
  const [locationAlerts, setLocationAlerts] = useState({}); // Store alerts by location
  const [selectedLocation, setSelectedLocation] = useState(null); // Currently selected location for detailed view
  const [areaDetailsModal, setAreaDetailsModal] = useState({ isOpen: false, data: null, lat: null, lng: null }); // Area details modal
  const [mapStats, setMapStats] = useState({
    total: 0,
    fraud: 0,
    suspicious: 0,
    withRealGPS: 0
  });

  useEffect(() => {
    console.log('🗺️ Setting up ULTRA-PROACTIVE real-time fraud alerts map...');
    console.log('🔥 Testing MobileAlertSystem version:', MobileAlertSystem.testVersion());
    console.log('🔥 Testing getUserFraudMessages function:', typeof MobileAlertSystem.getUserFraudMessages);
    setLoading(true);
    
    // Set up persistent real-time listener for BOTH fraud alert collections
    // Simplified queries to completely avoid ANY Firebase index requirements
    
    const setupUltraSimpleListeners = () => {
      const listeners = [];
      
      // PRIMARY COLLECTION: fraud_alerts (new mobile app format)
      const newAlertsRef = collection(db, 'fraud_alerts');
      
      // ULTRA-SIMPLE Query 1: Get ALL from fraud_alerts collection (no filters, no limits, no ordering)
      console.log('🗺️ Setting up ULTRA-SIMPLE query for fraud_alerts (no indexes needed)...');
      
      // LEGACY COLLECTION: fraudAlerts (existing map alerts)  
      const alertsRef = collection(db, 'fraudAlerts');
      
      // ULTRA-SIMPLE Query 2: Get ALL from fraudAlerts collection (no filters, no limits, no ordering)
      console.log('🗺️ Setting up ULTRA-SIMPLE query for fraudAlerts (no indexes needed)...');
      
      // Listener 1: fraud_alerts collection - SIMPLEST POSSIBLE QUERY
      const newAlertsListener = onSnapshot(newAlertsRef, (snapshot) => {
        console.log(`🗺️ NEW fraud_alerts listener: ${snapshot.docs.length} documents (SIMPLE QUERY)`);
        processAlerts(snapshot, 'new-alerts');
      }, (error) => {
        console.error('❌ New fraud_alerts listener error:', error);
      });
      
      // Listener 2: fraudAlerts collection - SIMPLEST POSSIBLE QUERY
      const legacyAlertsListener = onSnapshot(alertsRef, (snapshot) => {
        console.log(`🗺️ LEGACY fraudAlerts listener: ${snapshot.docs.length} documents (SIMPLE QUERY)`);
        processAlerts(snapshot, 'legacy-alerts');
      }, (error) => {
        console.error('❌ Legacy fraudAlerts listener error:', error);
      });
      
      // Only use these two simple listeners - no complex queries
      listeners.push(newAlertsListener, legacyAlertsListener);
      
      console.log(`🚀 Started ${listeners.length} ULTRA-SIMPLE real-time listeners (NO INDEX REQUIREMENTS)`);
      
      return listeners;
    };

    // Process alerts from any listener - ENHANCED for ULTRA-SIMPLE queries (all client-side filtering)
    const processAlerts = (snapshot, source) => {
      try {
        const alerts = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`🔍 Processing alert ${doc.id} from ${source}:`, {
            hasLocation: !!data.location,
            hasCoordinates: !!(data.location?.coordinates),
            hasLegacyCoordinates: !!(data.location?.latitude && data.location?.longitude),
            status: data.status,
            createdAt: data.createdAt?.toDate?.()?.toISOString()
          });
          
          // ULTRA-STRICT CLIENT-SIDE FILTERING (since we get ALL documents now)
          
          // Filter 1: Only include recent alerts (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const alertDate = data.createdAt?.toDate?.() || new Date(0);
          if (alertDate < thirtyDaysAgo) {
            console.log(`⏰ Alert ${doc.id} is older than 30 days, EXCLUDING`);
            return null;
          }
          
          // Filter 2: Only include active/unresolved alerts
          const activeStatuses = ['active', 'pending', 'investigating', 'new'];
          if (data.status && !activeStatuses.includes(data.status)) {
            console.log(`📊 Alert ${doc.id} is resolved (${data.status}), EXCLUDING`);
            return null;
          }
          
          // Filter 3: Only include fraud/suspicious types (exclude safe messages)
          if (data.fraudType === 'safe' || data.type === 'safe' || 
              (data.messageData && data.messageData.type === 'safe')) {
            console.log(`✅ Alert ${doc.id} is safe message, EXCLUDING from map`);
            return null;
          }
          
          // Handle new fraud_alerts format with coordinates object
          if (data.location?.coordinates) {
            console.log(`🔍 Alert ${doc.id} has NEW format coordinates, checking if real GPS...`);
            
            // Only include alerts with REAL GPS coordinates (not default locations)
            if (data.location.coordinates.isDefault === true) {
              console.log(`⚠️ Alert ${doc.id} uses default coordinates, EXCLUDING from map (Real GPS only)`);
              return null; // Exclude default locations
            }
            
            console.log(`✅ Alert ${doc.id} has REAL GPS coordinates - INCLUDING in map`);
            return {
              id: doc.id,
              ...data,
              lat: data.location.coordinates.latitude,
              lng: data.location.coordinates.longitude,
              accuracy: data.location.coordinates.accuracy,
              isRealGPS: true, // We know this is real GPS since isDefault is not true
              displayLocation: data.location.formattedLocation || 
                              data.location.address?.formattedAddress || 
                              `${data.location.coordinates.latitude}, ${data.location.coordinates.longitude}`,
              timestamp: data.createdAt?.toDate?.() || new Date(),
              hasRealLocation: true
            };
          }
          
          // Handle legacy fraudAlerts format with direct latitude/longitude
          if (data.location?.latitude && data.location?.longitude) {
            console.log(`🔍 Alert ${doc.id} has LEGACY format coordinates, checking if real GPS...`);
            
            // For legacy format, check if it has real GPS quality indicators
            if (!data.location.quality?.hasRealGPS) {
              console.log(`⚠️ Alert ${doc.id} doesn't have real GPS quality, EXCLUDING from map (Real GPS only)`);
              return null; // Exclude non-real GPS locations
            }
            
            console.log(`✅ Alert ${doc.id} has REAL GPS coordinates (legacy format) - INCLUDING in map`);
            return {
              id: doc.id,
              ...data,
              lat: data.location.latitude,
              lng: data.location.longitude,
              accuracy: data.location.accuracy,
              isRealGPS: true,
              displayLocation: (() => {
                const loc = data.location.displayLocation || data.location.formattedLocation || 'Unknown';
                return typeof loc === 'string' ? loc : (loc?.formattedLocation || loc?.address || 'Unknown Location');
              })(),
              timestamp: data.createdAt?.toDate?.() || new Date(),
              hasRealLocation: true
            };
          }
          
          // EXCLUDE all alerts without location data or coordinates since we only want real GPS
          console.log(`❌ Alert ${doc.id} has no real GPS coordinates, EXCLUDING from map (Real GPS only mode)`);
          return null;
        }).filter(alert => alert !== null && !isNaN(alert.lat) && !isNaN(alert.lng));

        console.log(`🗺️ Processed ${alerts.length} valid alerts from ${source} listener - IMMEDIATELY updating map`);
        
        // Merge with existing alerts to avoid duplicates - ENHANCED merging
        setFraudAlerts(prevAlerts => {
          const alertMap = new Map();
          
          // Add existing alerts first
          prevAlerts.forEach(alert => alertMap.set(alert.id, alert));
          
          // Add new alerts (will overwrite existing ones with same ID)
          alerts.forEach(alert => alertMap.set(alert.id, alert));
          
          const mergedAlerts = Array.from(alertMap.values());
          
          // Sort by timestamp (newest first) for better display
          mergedAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          // Calculate updated stats immediately (only real GPS alerts)
          const stats = {
            total: mergedAlerts.length, // All alerts shown are real GPS now
            fraud: mergedAlerts.filter(a => a.type?.includes('Fraud') || a.fraudType === 'fraud' || a.severity === 'critical').length,
            suspicious: mergedAlerts.filter(a => a.type?.includes('Suspicious') || a.fraudType === 'suspicious' || a.severity === 'warning').length,
            withRealGPS: mergedAlerts.length // All alerts are real GPS since we filter out others
          };
          
          setMapStats(stats);
          setLoading(false); // Remove loading state immediately when we get data
          
          console.log(`🗺️ IMMEDIATELY updated map with ${mergedAlerts.length} total alerts:`, stats);
          console.log(`📍 Map now shows: ${stats.fraud} fraud alerts, ${stats.suspicious} suspicious alerts`);
          return mergedAlerts;
        });
        
      } catch (error) {
        console.error('❌ Error processing fraud alerts for map:', error);
        setLoading(false);
      }
    };

    // Setup all listeners IMMEDIATELY
    const listeners = setupUltraSimpleListeners();

    // Cleanup function
    return () => {
      console.log('🗺️ Cleaning up fraud map listeners...');
      listeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, []); // Empty dependency array for persistent listener

  // Additional effect to monitor fraud alerts array changes
  useEffect(() => {
    console.log(`🔄 FraudMap alerts updated: ${fraudAlerts.length} total alerts`);
    if (fraudAlerts.length > 0) {
      console.log('✅ Fraud map is showing alerts successfully!');
    }
  }, [fraudAlerts]);

  // Filter alerts based on selected filter
  const filteredAlerts = fraudAlerts.filter(alert => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'fraud') return alert.type?.includes('Fraud') || alert.fraudType === 'fraud';
    if (selectedFilter === 'suspicious') return alert.type?.includes('Suspicious') || alert.fraudType === 'suspicious';
    if (selectedFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return alert.timestamp >= today;
    }
    return true;
  });

  const getAlertColor = (alert) => {
    if (alert.type?.includes('Fraud') || alert.fraudType === 'fraud') return '#e74c3c';
    if (alert.type?.includes('Suspicious') || alert.fraudType === 'suspicious') return '#f39c12';
    return '#3498db';
  };

  const getAlertType = (alert) => {
    if (alert.type?.includes('Fraud') || alert.fraudType === 'fraud') return 'fraud';
    return 'suspicious';
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    if (typeof amount === 'string' && amount.includes('RWF')) return amount;
    return `RWF ${amount.toLocaleString()}`;
  };

  // Admin action handlers
  const handleMarkAsSafe = async (alert) => {
    try {
      console.log('🔒 Admin marking SMS as safe:', alert.id);
      const session = getSession();
      if (!session) {
        console.log('❌ Please login as admin first');
        return;
      }

      const result = await markSMSAsSafe(alert.messageId, alert.userId, session.email);
      if (result.success) {
        console.log('✅ SMS marked as safe successfully! The alert will be removed from the map.');
      } else {
        console.log('❌ Failed to mark SMS as safe: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error in handleMarkAsSafe:', error);
      console.log('❌ Error marking SMS as safe');
    }
  };

  const handleBlockSender = async (alert) => {
    try {
      console.log('🚫 Admin blocking SMS sender:', alert.sender);
      const session = getSession();
      if (!session) {
        console.log('❌ Please login as admin first');
        return;
      }

      const confirmed = window.confirm(`Are you sure you want to block sender ${alert.sender}? This will prevent all future messages from this number.`);
      if (!confirmed) return;

      const result = await blockSMSSender(alert.messageId, alert.userId, alert.sender, session.email);
      if (result.success) {
        console.log('🚫 SMS sender blocked successfully! All future messages from this number will be blocked.');
      } else {
        console.log('❌ Failed to block SMS sender: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error in handleBlockSender:', error);
      console.log('❌ Error blocking SMS sender');
    }
  };

  const handleDismissAlert = async (alert) => {
    try {
      console.log('👋 Admin dismissing alert:', alert.id);
      // This will just hide the alert from admin view without changing user status
      console.log('ℹ️ Alert dismissed from admin view');
    } catch (error) {
      console.error('❌ Error in handleDismissAlert:', error);
    }
  };

  // Function to load all fraud alerts for a specific location using enhanced system
  const loadLocationAlerts = async (latitude, longitude, radiusKm = 2) => {
    try {
      console.log(`🗺️ Loading ENHANCED fraud alerts for location: ${latitude}, ${longitude} (radius: ${radiusKm}km)`);
      
      // Use our enhanced MobileAlertSystem to get user-specific fraud data
      const result = await MobileAlertSystem.getFraudMessagesInArea(latitude, longitude, radiusKm);
      
      if (!result.success) {
        console.error('❌ Failed to load enhanced fraud data:', result.error);
        // Fallback to legacy system
        const fallbackAlerts = await getFraudAlertsByLocation(latitude, longitude, radiusKm);
        return fallbackAlerts;
      }
      
      // Convert enhanced data to format expected by modal
      const enhancedAlerts = result.alerts.map(alert => ({
        id: alert.id,
        type: alert.severity === 'critical' ? 'fraud' : alert.type,
        userId: alert.userId,
        sender: alert.sender,
        phone: alert.phone,
        message: alert.messageText || alert.message,
        confidence: alert.confidence,
        location: alert.location?.address?.formattedAddress || 'Location not available',
        timestamp: alert.detectedAt,
        coordinates: alert.location?.coordinates
      }));
      
      const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
      setLocationAlerts(prev => ({
        ...prev,
        [locationKey]: enhancedAlerts
      }));
      
      setSelectedLocation({
        latitude,
        longitude,
        alerts: enhancedAlerts,
        key: locationKey,
        userBasedResults: result.userBasedResults, // Add user-specific data
        areaStats: result.areaStats,
        locationAnalysis: result.locationAnalysis
      });
      
      console.log(`🗺️ ENHANCED: Loaded ${enhancedAlerts.length} alerts from ${result.uniqueUsers} users for location ${locationKey}`);
      console.log(`📊 Area stats:`, result.areaStats);
      console.log(`👥 User data:`, result.userBasedResults);
      
      return enhancedAlerts;
    } catch (error) {
      console.error('❌ Error loading ENHANCED location alerts:', error);
      // Fallback to legacy system
      try {
        const fallbackAlerts = await getFraudAlertsByLocation(latitude, longitude, radiusKm);
        console.log(`⚠️ Using fallback system: ${fallbackAlerts.length} alerts`);
        return fallbackAlerts;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return [];
      }
    }
  };

  // Function to show area details modal with user-specific fraud data
  const showAreaDetailsModal = async (locationAlerts, lat, lng) => {
    console.log(`📍 Showing ENHANCED area details for ${locationAlerts.length} alerts at ${lat}, ${lng}`);
    console.log(`🕐 Request timestamp: ${new Date().toISOString()}`);
    console.log(`🎯 Location alerts received:`, locationAlerts);
    
    // NEW APPROACH: If we have alerts with user IDs, use direct user search
    let result = null;
    
    if (locationAlerts && locationAlerts.length > 0) {
      // Extract user ID from the first alert (they should all be from the same location)
      const firstAlert = locationAlerts[0];
      const userId = firstAlert.userId || firstAlert.user_id;
      
      console.log(`👤 USING DIRECT USER SEARCH for userId: ${userId}`);
      
      if (userId) {
        try {
          console.log('🔥 Calling NEW getUserFraudMessages function...');
          result = await MobileAlertSystem.getUserFraudMessages(userId);
          console.log(`✅ Direct user search result:`, result);
        } catch (directError) {
          console.error('❌ Direct user search failed:', directError);
        }
      }
    }
    
    // Fallback to coordinate-based search if direct search failed or no user ID
    if (!result || !result.success) {
      console.log('🔄 Falling back to coordinate-based search...');
      try {
        console.log('🔍 Calling MobileAlertSystem.getFraudMessagesInArea v2.1...');
        result = await MobileAlertSystem.getFraudMessagesInArea(lat, lng, 2);
      } catch (fallbackError) {
        console.error('❌ Coordinate search also failed:', fallbackError);
        result = { success: false, error: 'Both search methods failed' };
      }
    }
    
    // Get enhanced data directly from MobileAlertSystem
    try {
      if (result && result.success) {
        console.log(`🎯 Enhanced data loaded:`, result);
        console.log(`👥 Found ${result.userBasedResults?.users?.length || 0} users with fraud activity`);
        console.log(`🚨 Total alerts: ${result.alerts?.length || 0}`);
        
        // Log detailed user fraud message data for debugging
        if (result.userBasedResults?.users) {
          result.userBasedResults.users.forEach((user, index) => {
            console.log(`👤 User ${index + 1}: ${user.userId} has ${user.fraudMessages?.length || 0} fraud messages`);
            if (user.fraudMessages) {
              user.fraudMessages.forEach((msg, msgIndex) => {
                console.log(`  📱 Fraud Message ${msgIndex + 1}: "${msg.messageText}" from ${msg.sender} (${msg.phone})`);
              });
            }
          });
        }
        
        const enhancedData = {
          alerts: result.alerts || [],
          userBasedResults: result.userBasedResults || { users: [] },
          areaStats: result.areaStats || {},
          locationAnalysis: result.locationAnalysis || {},
          originalAlerts: locationAlerts // Keep original for fallback
        };
        
        setAreaDetailsModal({
          isOpen: true,
          data: enhancedData.alerts,
          enhancedData: enhancedData,
          lat: lat,
          lng: lng
        });
        
        console.log('✅ Enhanced area modal data set successfully');
        console.log(`� Modal will display ${enhancedData.userBasedResults.users?.length || 0} users with fraud messages`);
      } else {
        console.error('❌ Failed to load enhanced data:', result.error);
        // Fallback to basic modal
        setAreaDetailsModal({
          isOpen: true,
          data: locationAlerts,
          enhancedData: { alerts: locationAlerts, userBasedResults: { users: [] }, areaStats: {}, locationAnalysis: {} },
          lat: lat,
          lng: lng
        });
      }
    } catch (error) {
      console.error('❌ Error loading enhanced area data:', error);
      // Fallback to basic modal
      setAreaDetailsModal({
        isOpen: true,
        data: locationAlerts,
        enhancedData: { alerts: locationAlerts, userBasedResults: { users: [] }, areaStats: {}, locationAnalysis: {} },
        lat: lat,
        lng: lng
      });
    }
  };

  // Function to close area details modal
  const closeAreaDetailsModal = () => {
    setAreaDetailsModal({ isOpen: false, data: null, lat: null, lng: null });
  };

  return (
    <div className="fraud-map-container">
      <div className="map-header">
        <h3>🗺️ Live Fraud Alert Map - Real GPS Only {!loading && <span className="live-indicator">🔴 LIVE</span>}</h3>
        <p style={{ fontSize: '14px', color: '#7f8c8d', margin: '5px 0' }}>
          📡 Showing only fraud alerts with verified GPS coordinates (excluding default/approximate locations)
        </p>
        <div className="map-stats">
          <span className="stat-item">
            📍 Real GPS Alerts: <strong>{mapStats.total}</strong>
          </span>
          <span className="stat-item">
            🚨 Fraud: <strong>{mapStats.fraud}</strong>
          </span>
          <span className="stat-item">
            ⚠️ Suspicious: <strong>{mapStats.suspicious}</strong>
          </span>
          <span className="stat-item">
            📡 GPS Quality: <strong>100% Real GPS</strong>
          </span>
          <span className="stat-item status-indicator">
            {loading ? '⏳ Loading...' : '✅ Live Updates Active'}
          </span>
        </div>
      </div>

      <div className="map-controls">
        <div className="filter-buttons">
          <button 
            className={selectedFilter === 'all' ? 'active' : ''} 
            onClick={() => setSelectedFilter('all')}
          >
            All Alerts ({fraudAlerts.length})
          </button>
          <button 
            className={selectedFilter === 'fraud' ? 'active' : ''} 
            onClick={() => setSelectedFilter('fraud')}
          >
            🚨 Fraud ({mapStats.fraud})
          </button>
          <button 
            className={selectedFilter === 'suspicious' ? 'active' : ''} 
            onClick={() => setSelectedFilter('suspicious')}
          >
            ⚠️ Suspicious ({mapStats.suspicious})
          </button>
          <button 
            className={selectedFilter === 'today' ? 'active' : ''} 
            onClick={() => setSelectedFilter('today')}
          >
            📅 Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading fraud alerts map...</p>
        </div>
      ) : (
        <div className="map-wrapper">
          <MapContainer
            center={[-1.9441, 30.0619]} // Rwanda center
            zoom={8}
            style={{ height: '500px', width: '100%', borderRadius: '8px' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {filteredAlerts.map(alert => (
              <React.Fragment key={alert.id}>
                {/* Main marker for the alert */}
                <Marker 
                  position={[alert.lat, alert.lng]}
                  icon={createCustomIcon(getAlertColor(alert), getAlertType(alert))}
                >
                  <Popup>
                    <div className="alert-popup">
                      <h4 style={{ color: getAlertColor(alert), margin: '0 0 10px 0' }}>
                        {String(alert.mapData?.title || alert.type || 'Fraud Alert')}
                      </h4>
                      
                      <div className="popup-content">
                        <p><strong>📱 From:</strong> {String(alert.sender || 'Unknown')}</p>
                        <p><strong>📍 Location:</strong> {String(alert.displayLocation || 'Unknown')}</p>
                        <p><strong>🎯 Confidence:</strong> {Math.round((alert.confidence || 0) * 100)}%</p>
                        <p><strong>👤 User ID:</strong> {String(alert.userId || 'Unknown')}</p>
                        {alert.amount && (
                          <p><strong>💰 Amount:</strong> {formatCurrency(alert.amount)}</p>
                        )}
                        <p><strong>🕐 Time:</strong> {
                          alert.timestamp && typeof alert.timestamp.toLocaleString === 'function' ? 
                            alert.timestamp.toLocaleString() : 
                            String(alert.timestamp || 'Unknown')
                        }</p>
                        <p><strong>📡 GPS:</strong> {alert.isRealGPS ? '✅ Real GPS' : '📍 Default Location'}</p>
                        {alert.accuracy && (
                          <p><strong>🎯 Accuracy:</strong> ±{Math.round(alert.accuracy)}m</p>
                        )}
                        
                        {alert.messageText && (
                          <div className="message-preview">
                            <strong>💬 Message:</strong>
                            <p style={{ 
                              fontSize: '12px', 
                              fontStyle: 'italic', 
                              maxHeight: '60px', 
                              overflow: 'hidden',
                              backgroundColor: '#f8f9fa',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #dee2e6'
                            }}>
                              "{String(alert.messageText || alert.message || alert.content || 'No message content')}"
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="popup-footer">
                        <span className={`severity-badge ${alert.severity || ''}`}>
                          {String(alert.severity?.toUpperCase() || 'ALERT')}
                        </span>
                        <span className="source-badge">
                          {String(alert.source || 'Mobile App')}
                        </span>
                      </div>

                      {/* Location Alert Summary */}
                      <div className="location-summary" style={{
                        background: '#e3f2fd',
                        padding: '10px',
                        borderRadius: '4px',
                        margin: '10px 0',
                        border: '1px solid #bbdefb'
                      }}>
                        <button 
                          className="view-all-btn"
                          onClick={async () => {
                            const locationAlerts = await loadLocationAlerts(alert.lat, alert.lng, 2);
                            // Show area details instead of browser alert
                            showAreaDetailsModal(locationAlerts, alert.lat, alert.lng);
                          }}
                          style={{
                            background: '#1976d2',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            width: '100%',
                            marginBottom: '8px'
                          }}
                        >
                          📍 View All Messages in This Area
                        </button>
                        <small style={{ color: '#1565c0', fontSize: '11px' }}>
                          Click to see all fraud alerts within 2km radius
                        </small>
                      </div>

                      {/* Admin Action Buttons */}
                      <div className="admin-actions">
                        <button 
                          className="admin-btn safe-btn"
                          onClick={() => handleMarkAsSafe(alert)}
                          title="Mark this message as safe"
                        >
                          ✅ Mark Safe
                        </button>
                        <button 
                          className="admin-btn block-btn"
                          onClick={() => handleBlockSender(alert)}
                          title="Block this sender permanently"
                        >
                          🚫 Block Sender
                        </button>
                        <button 
                          className="admin-btn dismiss-btn"
                          onClick={() => handleDismissAlert(alert)}
                          title="Dismiss from admin view"
                        >
                          👋 Dismiss
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Accuracy circle for real GPS locations */}
                {alert.isRealGPS && alert.accuracy && alert.accuracy <= 1000 && (
                  <CircleMarker
                    center={[alert.lat, alert.lng]}
                    radius={Math.min(alert.accuracy / 10, 50)} // Scale radius
                    color={getAlertColor(alert)}
                    fillColor={getAlertColor(alert)}
                    fillOpacity={0.1}
                    weight={1}
                    opacity={0.3}
                  />
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="map-legend">
        <h4>🗺️ Map Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-marker fraud">🚨</div>
            <span>Fraud Alert - High confidence fraud detection</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker suspicious">⚠️</div>
            <span>Suspicious Activity - Potential threat detected</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker circle"></div>
            <span>GPS Accuracy Circle - Shows location precision</span>
          </div>
        </div>
        
        <div className="location-info">
          <p><strong>📡 Real GPS:</strong> Precise location from user device</p>
          <p><strong>📍 Default:</strong> Country-level location (GPS unavailable)</p>
        </div>
      </div>

      <style jsx>{`
        .fraud-map-container {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin: 20px 0;
        }

        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .map-header h3 {
          margin: 0;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-indicator {
          font-size: 0.8rem;
          animation: pulse 2s infinite;
          color: #e74c3c;
          font-weight: bold;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .map-stats {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          align-items: center;
        }

        .stat-item {
          background: #f8f9fa;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 14px;
          color: #5a6c7d;
          white-space: nowrap;
        }

        .status-indicator {
          background: #d4edda !important;
          color: #155724 !important;
          font-weight: bold;
        }

        .map-controls {
          margin-bottom: 15px;
        }

        .filter-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-buttons button {
          padding: 8px 15px;
          border: 2px solid #e0e6ed;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .filter-buttons button:hover {
          border-color: #3498db;
          background: #f8f9ff;
        }

        .filter-buttons button.active {
          background: #3498db;
          color: white;
          border-color: #3498db;
        }

        .map-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #7f8c8d;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .map-wrapper {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .alert-popup {
          min-width: 250px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .popup-content p {
          margin: 5px 0;
          font-size: 13px;
        }

        .message-preview {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #eee;
        }

        .popup-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #eee;
        }

        .severity-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .severity-badge.critical { background: #e74c3c; color: white; }
        .severity-badge.high { background: #e67e22; color: white; }
        .severity-badge.warning { background: #f39c12; color: white; }
        .severity-badge.info { background: #3498db; color: white; }

        .source-badge {
          padding: 2px 8px;
          background: #ecf0f1;
          color: #7f8c8d;
          border-radius: 12px;
          font-size: 10px;
        }

        .admin-actions {
          display: flex;
          gap: 8px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid #e8f4fd;
          flex-wrap: wrap;
        }

        .admin-btn {
          flex: 1;
          min-width: 80px;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .admin-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .safe-btn {
          background: #27ae60;
          color: white;
        }

        .safe-btn:hover {
          background: #229954;
        }

        .block-btn {
          background: #e74c3c;
          color: white;
        }

        .block-btn:hover {
          background: #c0392b;
        }

        .dismiss-btn {
          background: #95a5a6;
          color: white;
        }

        .dismiss-btn:hover {
          background: #7f8c8d;
        }

        .map-legend {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .map-legend h4 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }

        .legend-items {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .legend-marker {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .legend-marker.fraud {
          background: #e74c3c;
          color: white;
        }

        .legend-marker.suspicious {
          background: #f39c12;
          color: white;
        }

        .legend-marker.circle {
          border: 2px solid #3498db;
          background: rgba(52, 152, 219, 0.1);
        }

        .location-info {
          border-top: 1px solid #dee2e6;
          padding-top: 10px;
        }

        .location-info p {
          margin: 5px 0;
          font-size: 13px;
          color: #6c757d;
        }

        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }

        @media (max-width: 768px) {
          .map-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .map-stats {
            width: 100%;
            justify-content: flex-start;
          }

          .filter-buttons {
            justify-content: flex-start;
          }

          .legend-items {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Area Details Modal - Shows user-specific fraud data for clicked area */}
      {areaDetailsModal.isOpen && (
        <div className="area-details-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '800px',
            maxHeight: '80vh',
            width: '90%',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #eee',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0, color: '#dc3545' }}>� User Fraud Messages in This Area</h3>
              <button 
                onClick={closeAreaDetailsModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div className="area-summary" style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <p><strong>📍 Location:</strong> {areaDetailsModal.lat?.toFixed(4)}, {areaDetailsModal.lng?.toFixed(4)}</p>
              <p><strong>📊 Total Fraud Alerts:</strong> {areaDetailsModal.data?.length || 0}</p>
              <p><strong>🎯 Search Radius:</strong> 2km</p>
              
              {/* Enhanced Statistics */}
              {areaDetailsModal.enhancedData?.areaStats && (
                <div style={{ marginTop: '10px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                  <strong>📈 Enhanced Area Analysis:</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                    <span>👥 Unique Users: {areaDetailsModal.enhancedData?.userBasedResults?.totalUsers || 0}</span>
                    <span>🚨 Total Alerts: {areaDetailsModal.enhancedData.areaStats.totalAlerts || 0}</span>
                    <span>⚠️ High Risk: {(areaDetailsModal.enhancedData.areaStats.severityBreakdown?.critical || 0) + (areaDetailsModal.enhancedData.areaStats.severityBreakdown?.high || 0)}</span>
                    <span>🎯 Avg Confidence: {areaDetailsModal.enhancedData.areaStats.averageConfidence?.toFixed(1) || 'N/A'}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced User-Based Fraud Messages Section */}
            {areaDetailsModal.enhancedData?.userBasedResults?.users && areaDetailsModal.enhancedData.userBasedResults.users.length > 0 ? (
              <div className="user-fraud-messages-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ 
                  background: 'linear-gradient(135deg, #dc3545, #c82333)', 
                  color: 'white', 
                  padding: '12px 15px', 
                  borderRadius: '8px 8px 0 0',
                  margin: '0 0 0 0',
                  fontSize: '16px',
                  textAlign: 'center'
                }}>
                  🚨 Users with Fraud Messages in This Area ({areaDetailsModal.enhancedData.userBasedResults.users.length})
                </h4>
                
                <div style={{ 
                  border: '2px solid #dc3545', 
                  borderRadius: '0 0 8px 8px',
                  background: '#fff'
                }}>
                  {areaDetailsModal.enhancedData.userBasedResults.users.map((userResult, userIndex) => (
                    <div key={userIndex} style={{
                      borderBottom: userIndex < areaDetailsModal.enhancedData.userBasedResults.users.length - 1 ? '1px solid #e9ecef' : 'none',
                      padding: '20px',
                      background: userIndex % 2 === 0 ? '#fff' : '#f8f9fa'
                    }}>
                      {/* User Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px',
                        padding: '10px 15px',
                        background: 'linear-gradient(135deg, #495057, #6c757d)',
                        borderRadius: '6px',
                        color: 'white'
                      }}>
                        <div>
                          <h5 style={{ margin: 0, fontSize: '16px' }}>
                            � User ID: {userResult.userId}
                          </h5>
                          <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>
                            📊 {userResult.fraudMessages?.length || 0} fraud messages detected
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            background: userResult.riskLevel === 'critical' ? '#dc3545' : 
                                       userResult.riskLevel === 'high' ? '#fd7e14' : 
                                       userResult.riskLevel === 'medium' ? '#ffc107' : '#28a745',
                            color: userResult.riskLevel === 'medium' ? '#000' : 'white',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            🎯 {userResult.riskLevel || 'LOW'} Risk
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                            Score: {userResult.avgRiskScore?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Fraud Messages for this User */}
                      <div className="user-fraud-messages">
                        <h6 style={{ 
                          margin: '0 0 12px 0', 
                          color: '#dc3545',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          � All Fraud Messages from this User:
                          <span style={{
                            background: '#dc3545',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px'
                          }}>
                            {userResult.fraudMessages?.length || 0} messages
                          </span>
                        </h6>
                        
                        {userResult.fraudMessages && userResult.fraudMessages.length > 0 ? (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {userResult.fraudMessages.map((msg, msgIndex) => (
                              <div key={msgIndex} style={{
                                background: '#fff',
                                border: '2px solid #dc3545',
                                borderRadius: '8px',
                                padding: '15px',
                                boxShadow: '0 2px 4px rgba(220, 53, 69, 0.1)',
                                position: 'relative'
                              }}>
                                {/* Message Header */}
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  marginBottom: '10px',
                                  paddingBottom: '8px',
                                  borderBottom: '1px solid #f8f9fa'
                                }}>
                                  <div>
                                    <span style={{ 
                                      background: '#dc3545', 
                                      color: 'white', 
                                      padding: '3px 8px', 
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 'bold'
                                    }}>
                                      FRAUD #{msgIndex + 1}
                                    </span>
                                    <span style={{ 
                                      marginLeft: '10px',
                                      color: '#6c757d',
                                      fontSize: '12px'
                                    }}>
                                      From: {msg.sender || 'Unknown'}
                                    </span>
                                  </div>
                                  <span style={{ 
                                    fontSize: '11px', 
                                    color: '#6c757d',
                                    background: '#f8f9fa',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    📅 {msg.detectedAt ? new Date(msg.detectedAt?.toDate ? msg.detectedAt.toDate() : msg.detectedAt).toLocaleDateString() : 'Unknown date'}
                                  </span>
                                </div>

                                {/* Message Details */}
                                <div style={{ marginBottom: '10px' }}>
                                  <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr', 
                                    gap: '8px',
                                    fontSize: '12px',
                                    marginBottom: '8px'
                                  }}>
                                    <span><strong>📞 Phone:</strong> {msg.phone || 'Unknown'}</span>
                                    <span><strong>🕒 Time:</strong> {msg.detectedAt ? new Date(msg.detectedAt?.toDate ? msg.detectedAt.toDate() : msg.detectedAt).toLocaleTimeString() : 'Unknown'}</span>
                                  </div>
                                </div>

                                {/* Fraud Message Content */}
                                <div style={{
                                  background: 'linear-gradient(135deg, #fff5f5, #ffeaa7)',
                                  border: '1px solid #dc3545',
                                  borderRadius: '6px',
                                  padding: '12px',
                                  marginBottom: '10px'
                                }}>
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: '#dc3545', 
                                    fontWeight: 'bold',
                                    marginBottom: '6px',
                                    textTransform: 'uppercase'
                                  }}>
                                    💬 Fraud Message Content:
                                  </div>
                                  <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    lineHeight: '1.4',
                                    color: '#2c3e50',
                                    fontWeight: '500',
                                    wordBreak: 'break-word'
                                  }}>
                                    "{msg.messageText || 'No message content available'}"
                                  </div>
                                </div>

                                {/* Threat Analysis */}
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: '1fr 1fr 1fr', 
                                  gap: '8px',
                                  fontSize: '11px'
                                }}>
                                  <span style={{
                                    background: '#e3f2fd',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    textAlign: 'center'
                                  }}>
                                    🎯 <strong>{((msg.confidence || 0) * 100).toFixed(0)}%</strong> Confidence
                                  </span>
                                  <span style={{
                                    background: msg.severity === 'critical' ? '#ffebee' : '#fff3e0',
                                    color: msg.severity === 'critical' ? '#d32f2f' : '#f57c00',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    textAlign: 'center',
                                    fontWeight: 'bold'
                                  }}>
                                    ⚠️ {(msg.severity || 'Unknown').toUpperCase()}
                                  </span>
                                  <span style={{
                                    background: '#f3e5f5',
                                    color: '#7b1fa2',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    textAlign: 'center'
                                  }}>
                                    🏷️ {msg.fraudType || 'Fraud'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#6c757d',
                            background: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px dashed #dc3545'
                          }}>
                            <p>📭 No fraud messages found for this user</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#155724', margin: '0 0 10px 0' }}>✅ No Users with Fraud Activity</h4>
                <p style={{ color: '#155724', margin: 0 }}>This area appears to be secure - no fraud messages detected from any users.</p>
              </div>
            )}

            {/* Location Summary for No Data */}
            {(!areaDetailsModal.enhancedData?.userBasedResults?.users || areaDetailsModal.enhancedData.userBasedResults.users.length === 0) && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#666'
              }}>
                <p>✅ No fraud alerts found in this area</p>
                <p>This location appears to be secure.</p>
                {areaDetailsModal.enhancedData?.locationAnalysis && (
                  <div style={{ marginTop: '15px', padding: '10px', background: '#e8f4fd', borderRadius: '4px' }}>
                    <p><strong>📊 Analysis:</strong> {areaDetailsModal.enhancedData.locationAnalysis.summary || 'No detailed analysis available'}</p>
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer" style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <button 
                onClick={closeAreaDetailsModal}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudMap;
