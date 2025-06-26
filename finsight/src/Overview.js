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

// Sample fraud detection points
const fraudPoints = [
  { id: 1, lat: 40.7128, lng: -74.0060, location: "New York", type: "SMS Scam", amount: "$1,200", date: "2025-06-15" },
  { id: 2, lat: 34.0522, lng: -118.2437, location: "Los Angeles", type: "Phone Fraud", amount: "$850", date: "2025-06-14" },
  { id: 3, lat: 41.8781, lng: -87.6298, location: "Chicago", type: "SMS Scam", amount: "$2,100", date: "2025-06-13" },
  { id: 4, lat: 29.7604, lng: -95.3698, location: "Houston", type: "Financial Fraud", amount: "$3,500", date: "2025-06-12" },
  { id: 5, lat: 39.9526, lng: -75.1652, location: "Philadelphia", type: "Phone Fraud", amount: "$675", date: "2025-06-11" }
];

const Overview = () => {
  return (
    <div className="overview-container">
      <PageHeader title="Overview Page" />
      
      <div className="stats-container">
        <div className="stat-card">
          <img 
            src={process.env.PUBLIC_URL + '/phone.svg'} 
            alt="Phone" 
            className="stat-icon"
          />
          <div className="stat-number">127</div>
          <div className="stat-text">Suspicious Numbers</div>
        </div>
        <div className="stat-card">
          <img 
            src={process.env.PUBLIC_URL + '/sms2.svg'} 
            alt="SMS" 
            className="stat-icon"
          />
          <div className="stat-number">43</div>
          <div className="stat-text">Messages Flagged</div>
        </div>
        <div className="stat-card">
          <img 
            src={process.env.PUBLIC_URL + '/phone.svg'} 
            alt="Phone" 
            className="stat-icon"
          />
          <div className="stat-number">18</div>
          <div className="stat-text">Scam Attempts Prevented</div>
        </div>
      </div>

      <div className="map-section">
        <div className="map-container">
          <h3 className="map-title">Fraud Activity Map</h3>
          <div className="map-wrapper">
            <MapContainer
              center={[39.8283, -98.5795]} // Center of USA
              zoom={4}
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
    </div>
  );
};

export default Overview;
