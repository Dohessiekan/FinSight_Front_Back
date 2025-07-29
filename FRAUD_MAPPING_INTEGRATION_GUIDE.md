/**
 * FRAUD MAPPING SYSTEM INTEGRATION GUIDE
 * 
 * This document explains how the FinSight mobile app collects fraud information
 * and integrates with the web app's mapping system for real-time fraud tracking.
 */

# FRAUD DATA COLLECTION SYSTEM

## Overview
The mobile app collects fraud information with precise GPS location data and sends it to Firebase for real-time display in the web app's admin dashboard.

## Data Flow Architecture

### 1. Mobile App Collection (FinSightApp)
```
User receives SMS → AI Analysis → Fraud Detection → Location Collection → Firebase Storage
```

### 2. Web App Display (finsight)
```
Firebase Listener → Real-time Updates → Map Display → Admin Actions
```

## Mobile App Components

### A. MobileAlertSystem.js
**Purpose**: Creates fraud alerts with location data
**Collection**: `fraud_alerts`
**Data Structure**:
```javascript
{
  // Alert Information
  type: 'Fraud Detected',
  severity: 'high',
  status: 'active',
  
  // Message Details
  content: messageText,
  sender: phoneNumber,
  confidence: 95,
  
  // Location Data (GPS Satellite)
  location: {
    coordinates: {
      latitude: -1.9441,
      longitude: 30.0619,
      accuracy: 5,
      isDefault: false,         // Real GPS vs Default
      source: 'GPS_SATELLITE'
    },
    quality: {
      hasRealGPS: true,         // GPS verification flag
      accuracy: 5,
      source: 'mobile_app'
    }
  },
  
  // Timestamps
  createdAt: serverTimestamp(),
  detectedAt: serverTimestamp()
}
```

### B. MobileAdminRequestManager.js
**Purpose**: Handles admin requests with location context
**Collections**: `adminNotifications`
**Enhanced Features**:
- GPS location collection for dispute context
- Real-time location accuracy verification
- Fallback to default Rwanda coordinates if GPS unavailable

### C. LocationService.js
**Purpose**: High-accuracy GPS collection
**Method**: `getGPSLocation()`
**Configuration**:
```javascript
{
  accuracy: Location.Accuracy.BestForNavigation,
  enableHighAccuracy: true,
  timeout: 45000,           // Extended for satellite fix
  maximumAge: 0,           // Force fresh reading
  distanceInterval: 1      // High precision
}
```

### D. UserLocationManager.js
**Purpose**: Location management and fallbacks
**Features**:
- Rwanda region coordinates for fallback
- User location profile maintenance
- Location quality verification

## Web App Components

### A. FraudAlerts.js
**Purpose**: Real-time fraud alert dashboard
**Firebase Listener**: `fraud_alerts` collection
**Display Features**:
- GPS quality indicators (🛰️ GPS vs 📶 Network)
- Location accuracy display
- Real-time filtering by GPS type
- Map view buttons for location visualization

### B. Map Integration Points
**View on Map Button**: Links to mapping service with coordinates
**GPS Filtering**: 
- Real GPS alerts (accuracy < 15m)
- Default/Network location alerts
- No location data alerts

## Firebase Collections

### 1. fraud_alerts
```javascript
{
  // Required by web app FraudAlerts.js
  type: "Fraud Detected",
  severity: "high", 
  status: "active",
  content: "Fraud message content",
  phone: "+250788123456",
  userId: "user123",
  confidence: 95,
  
  // Location for mapping
  location: {
    coordinates: {
      latitude: -1.9441,
      longitude: 30.0619,
      accuracy: 5,
      isDefault: false,
      source: "GPS_SATELLITE"
    },
    quality: {
      hasRealGPS: true,
      accuracy: 5
    }
  },
  
  // Timestamps
  createdAt: Timestamp,
  detectedAt: Timestamp
}
```

### 2. adminNotifications
```javascript
{
  // Admin request details
  type: "fraud_review_request",
  userId: "user123",
  messageText: "Disputed message",
  
  // Location context for admin
  location: {
    coordinates: {
      latitude: -1.9441,
      longitude: 30.0619,
      isDefault: false,
      source: "GPS_SATELLITE"
    }
  },
  
  status: "pending",
  createdAt: Timestamp
}
```

## Location Data Standards

### GPS Quality Levels
- **HIGH**: Accuracy ≤ 5 meters (GPS satellites)
- **GOOD**: Accuracy ≤ 10 meters (GPS satellites)
- **MEDIUM**: Accuracy ≤ 20 meters (Mixed GPS/Network)
- **LOW**: Accuracy > 20 meters (Network approximation)

### Source Types
- **GPS_SATELLITE**: Real GPS with satellite positioning
- **default_location**: Fallback Rwanda coordinates
- **mobile_app**: General mobile app location

### Fallback Coordinates (Rwanda)
```javascript
const rwandaRegions = {
  kigali: { lat: -1.9441, lng: 30.0619 },
  northern: { lat: -1.6940, lng: 29.9187 },
  southern: { lat: -2.6040, lng: 29.7348 },
  eastern: { lat: -1.9536, lng: 30.0908 },
  western: { lat: -2.0469, lng: 29.2654 }
};
```

## Web App Map Display

### FraudAlerts.js Features
1. **Real-time Listener**: Monitors `fraud_alerts` collection
2. **GPS Filtering**: Filter by GPS quality
3. **Location Display**: Shows coordinates with accuracy
4. **Map Integration**: "View on Map" buttons
5. **GPS Indicators**: Visual indicators for GPS vs Network location

### Location Display Format
```
📍 GPS: Real GPS (-1.9441, 30.0619) ±5m
📍 GPS: Default Location (-1.9441, 30.0619)
📍 GPS: No location data
```

## Integration Steps Completed

### ✅ Mobile App Enhancements
1. Added GPS location collection to MobileAdminRequestManager
2. Enhanced LocationService with satellite positioning
3. Integrated real-time location verification
4. Added fallback location systems

### ✅ Data Structure Alignment
1. Matched web app's expected location format
2. Added GPS quality indicators
3. Implemented accuracy verification
4. Created consistent data schema

### ✅ Web App Compatibility
1. FraudAlerts.js already supports location display
2. GPS filtering functionality implemented
3. Map integration points ready
4. Real-time updates working

## Testing the System

### 1. Mobile App Testing
```javascript
// Test fraud alert creation with GPS
const result = await MobileAlertSystem.createFraudAlert(
  fraudMessage, 
  userId, 
  analysisResult
);
console.log('Alert created:', result.alertId);
```

### 2. Admin Request Testing
```javascript
// Test admin request with location
const result = await MobileAdminRequestManager.sendFraudReviewRequest(
  userId, 
  messageData, 
  'User disputes fraud'
);
console.log('Request sent:', result.notificationId);
```

### 3. Web App Monitoring
- Open FraudAlerts.js in web app
- Monitor real-time updates from mobile app
- Check GPS quality indicators
- Use "View on Map" functionality

## Deployment Configuration

### Firebase Rules
Ensure collections are accessible:
```javascript
// fraud_alerts collection
match /fraud_alerts/{document} {
  allow read, write: if request.auth != null;
}

// adminNotifications collection  
match /adminNotifications/{document} {
  allow read, write: if request.auth != null;
}
```

### Mobile App Permissions
```xml
<!-- Android permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Summary

The fraud mapping system is now fully integrated:

1. **Mobile App**: Collects high-accuracy GPS data with fraud alerts
2. **Firebase**: Stores location data in consistent format
3. **Web App**: Displays fraud alerts with GPS indicators and map integration
4. **Admin Tools**: Enhanced with location context for better decision making

The system provides real-time fraud tracking with precise location data for effective admin monitoring and community protection.
