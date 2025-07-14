import React from 'react';
import './Overview.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PageHeader from './PageHeader';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Sample fraud detection points in Rwanda
const fraudPoints = [
  { id: 1, lat: -1.9441, lng: 30.0619, location: "Kigali", type: "SMS Scam", amount: "50,000 RWF", date: "2025-07-14" },
  { id: 2, lat: -2.6080, lng: 29.1378, location: "Butare", type: "Mobile Money Fraud", amount: "75,000 RWF", date: "2025-07-13" },
  { id: 3, lat: -1.6767, lng: 30.4375, location: "Rwamagana", type: "SMS Scam", amount: "30,000 RWF", date: "2025-07-13" },
  { id: 4, lat: -2.0280, lng: 30.0890, location: "Nyanza", type: "Financial Fraud", amount: "120,000 RWF", date: "2025-07-12" },
  { id: 5, lat: -1.7090, lng: 30.1367, location: "Kayonza", type: "Phone Fraud", amount: "25,000 RWF", date: "2025-07-12" }
];

const Overview = () => {
  return (
    <div className="overview-container">
      <PageHeader title="Admin Dashboard - FinSight Rwanda" />
      
      <div className="stats-container">
        <div className="stat-card">
          <img 
            src={process.env.PUBLIC_URL + '/phone.svg'} 
            alt="Phone" 
            className="stat-icon"
          />
          <div className="stat-number">2,847</div>
          <div className="stat-text">Mobile App Users</div>
        </div>
        <div className="stat-card">
          <img 
            src={process.env.PUBLIC_URL + '/sms2.svg'} 
            alt="SMS" 
            className="stat-icon"
          />
          <div className="stat-number">156</div>
          <div className="stat-text">SMS Analyzed Today</div>
        </div>
        <div className="stat-card">
          <img 
            src={process.env.PUBLIC_URL + '/phone.svg'} 
            alt="Phone" 
            className="stat-icon"
          />
          <div className="stat-number">1,245</div>
          <div className="stat-text">Fraud Prevented</div>
        </div>
        <div className="stat-card">
          <img 
            src={process.env.PUBLIC_URL + '/stats.svg'} 
            alt="Stats" 
            className="stat-icon"
          />
          <div className="stat-number">94.7%</div>
          <div className="stat-text">ML Model Accuracy</div>
        </div>
      </div>

      <div className="map-section">
        <div className="map-container">
          <h3 className="map-title">Fraud Activity Map - Rwanda</h3>
          <div className="map-wrapper">
            <MapContainer
              center={[-1.9403, 29.8739]} // Center of Rwanda
              zoom={8}
              style={{ height: '400px', width: '100%', borderRadius: '8px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {fraudPoints.map(point => (
                <Marker key={point.id} position={[point.lat, point.lng]}>
                  <Popup>
                    <div className="popup-content">
                      <h4>{point.location}</h4>
                      <p><strong>Type:</strong> {point.type}</p>
                      <p><strong>Amount:</strong> {point.amount}</p>
                      <p><strong>Date:</strong> {point.date}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
        
        <div className="sidebar-panels">
          <div className="legend-panel">
            <h4 className="legend-title">Legend</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-circle red"></div>
                <span className="legend-text">Fraud</span>
              </div>
              <div className="legend-item">
                <div className="legend-circle yellow"></div>
                <span className="legend-text">Suspicious</span>
              </div>
              <div className="legend-item">
                <div className="legend-circle green"></div>
                <span className="legend-text">Safe</span>
              </div>
            </div>
          </div>
          
          <div className="insights-panel">
            <h4 className="insights-title">Daily Fraud Insights</h4>
            <div className="insights-items">
              <div className="insight-item">
                <span className="insight-label">Top Fraud Type:</span>
                <span className="insight-value">Phishing</span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Most Affected Region:</span>
                <span className="insight-value">Kigali</span>
              </div>
              <div className="insight-item">
                <span className="insight-label">New Fraud Pattern Learned:</span>
                <span className="insight-value">3</span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Frauds Reported:</span>
                <span className="insight-value">20</span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Detection Accuracy Rate:</span>
                <span className="insight-value">28.4%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile App Status Section */}
      <div className="mobile-app-section" style={{ marginTop: '20px' }}>
        <div className="mobile-app-container" style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px', 
          boxShadow: '0 4px 12px rgba(40, 83, 191, 0.15)' 
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📱 Mobile App Status & Monitoring</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* App Usage Stats */}
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>📊 App Usage Analytics</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Daily Active Users:</span>
                  <strong style={{ color: '#28a745' }}>1,432</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SMS Scans Today:</span>
                  <strong style={{ color: '#007bff' }}>3,847</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>App Crashes:</span>
                  <strong style={{ color: '#dc3545' }}>2</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Avg Session Time:</span>
                  <strong>4m 32s</strong>
                </div>
              </div>
            </div>

            {/* API Performance */}
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>🚀 API Performance</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>API Uptime:</span>
                  <strong style={{ color: '#28a745' }}>99.8%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Avg Response Time:</span>
                  <strong style={{ color: '#28a745' }}>127ms</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Requests Today:</span>
                  <strong style={{ color: '#007bff' }}>28,542</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Error Rate:</span>
                  <strong style={{ color: '#ffc107' }}>0.2%</strong>
                </div>
              </div>
            </div>

            {/* ML Model Performance */}
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>🤖 ML Model Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Model Version:</span>
                  <strong>v2.1.4</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Accuracy Rate:</span>
                  <strong style={{ color: '#28a745' }}>94.7%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last Training:</span>
                  <strong>2025-07-10</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Predictions Today:</span>
                  <strong style={{ color: '#007bff' }}>3,721</strong>
                </div>
              </div>
            </div>

            {/* User Behavior */}
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>👥 User Behavior</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>New Registrations:</span>
                  <strong style={{ color: '#28a745' }}>47</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Frauds Reported:</span>
                  <strong style={{ color: '#dc3545' }}>23</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>App Rating:</span>
                  <strong style={{ color: '#ffc107' }}>4.6⭐</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Feature Usage:</span>
                  <strong>SMS Scan: 89%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Alerts */}
          <div style={{ marginTop: '20px', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
            <h4 style={{ color: '#856404', marginBottom: '10px' }}>⚠️ Real-time Mobile App Alerts</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '14px', color: '#856404' }}>
                • High SMS scanning activity detected in Kigali region (+23% from yesterday)
              </div>
              <div style={{ fontSize: '14px', color: '#856404' }}>
                • 5 new fraud patterns detected and added to ML model
              </div>
              <div style={{ fontSize: '14px', color: '#856404' }}>
                • User reported false positive decreased by 12% this week
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
