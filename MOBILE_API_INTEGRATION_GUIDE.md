# Mobile App API Integration Guide

## Overview
This guide provides the API endpoints and implementation details for integrating the mobile app with the Firebase backend for SMS analysis.

## Authentication
The mobile app should use Firebase Authentication with the user's unique identifier.

## API Functions

### 1. First Connection - Monthly Analysis

**Function**: `analyzeCurrentMonthMessages(userId, monthlyMessages)`

**Purpose**: Analyze all messages from the current month when user first uses the app

**Parameters**:
- `userId` (string): Unique identifier for the user
- `monthlyMessages` (array): Array of all SMS messages from current month

**Message Object Structure**:
```javascript
{
  messageText: "Your message content here",
  phoneNumber: "+1234567890",
  timestamp: "2024-01-15T10:30:00.000Z",
  analysis: {
    isFraud: true,
    confidence: 0.85,
    category: "phishing",
    riskLevel: "high"
  }
}
```

**Response**:
```javascript
{
  success: true,
  totalAnalyzed: 25,
  fraudsDetected: 3,
  results: [...]
}
```

**Mobile App Implementation**:
```javascript
// Check if user is new (first time using app)
const isFirstTime = await AsyncStorage.getItem('hasCompletedInitialAnalysis');

if (!isFirstTime) {
  // Get all SMS messages from current month
  const monthlyMessages = await getCurrentMonthSMSMessages();
  
  // Send to Firebase for analysis
  const result = await analyzeCurrentMonthMessages(userId, monthlyMessages);
  
  if (result.success) {
    // Mark as completed
    await AsyncStorage.setItem('hasCompletedInitialAnalysis', 'true');
    console.log(`Initial analysis complete: ${result.totalAnalyzed} messages analyzed`);
  }
}
```

### 2. New Message Analysis

**Function**: `analyzeNewIncomingMessage(userId, message)`

**Purpose**: Analyze new incoming SMS messages in real-time

**Parameters**:
- `userId` (string): Unique identifier for the user
- `message` (object): Single new SMS message object

**Response**:
```javascript
{
  success: true,
  messageId: "msg_123456789",
  isFraud: false,
  confidence: 0.15
}
```

**Mobile App Implementation**:
```javascript
// Listen for new SMS messages
const subscription = DeviceEventEmitter.addListener(
  'onSMSReceived',
  async (message) => {
    try {
      // Analyze the new message
      const result = await analyzeNewIncomingMessage(userId, {
        messageText: message.body,
        phoneNumber: message.address,
        timestamp: new Date().toISOString(),
        analysis: await runMLAnalysis(message.body) // Your ML analysis
      });
      
      if (result.success && result.isFraud) {
        // Show fraud alert to user
        showFraudAlert(result);
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
    }
  }
);
```

## Implementation Flow

### Step 1: App Initialization
```javascript
import { analyzeCurrentMonthMessages, analyzeNewIncomingMessage } from './firebaseMessages';

// On app startup
const userId = await getCurrentUserId();
const hasCompletedInitial = await AsyncStorage.getItem('hasCompletedInitialAnalysis');

if (!hasCompletedInitial) {
  // First time user - analyze current month
  const monthlyMessages = await getCurrentMonthSMSMessages();
  await analyzeCurrentMonthMessages(userId, monthlyMessages);
  await AsyncStorage.setItem('hasCompletedInitialAnalysis', 'true');
}
```

### Step 2: Real-time Message Processing
```javascript
// Set up SMS listener for new messages
const setupSMSListener = () => {
  const subscription = DeviceEventEmitter.addListener(
    'onSMSReceived',
    async (message) => {
      const analysisResult = await runMLAnalysis(message.body);
      
      await analyzeNewIncomingMessage(userId, {
        messageText: message.body,
        phoneNumber: message.address,
        timestamp: new Date().toISOString(),
        analysis: analysisResult
      });
    }
  );
  
  return subscription;
};
```

## Data Structure

### User Document Structure
```javascript
{
  userId: "user_123",
  createdAt: Timestamp,
  lastActive: Timestamp,
  initialAnalysisCompleted: true,
  initialAnalysisDate: Timestamp,
  stats: {
    totalMessages: 150,
    fraudMessages: 12,
    lastAnalyzed: Timestamp
  }
}
```

### Message Document Structure
```javascript
{
  messageId: "msg_123456789",
  userId: "user_123",
  messageText: "Congratulations! You've won $1000...",
  phoneNumber: "+1234567890",
  timestamp: "2024-01-15T10:30:00.000Z",
  createdAt: Timestamp,
  source: "mobile_app",
  isNewMessage: false, // true for real-time, false for historical
  isHistorical: true,  // true for monthly bulk import
  analysis: {
    isFraud: true,
    confidence: 0.85,
    category: "lottery_scam",
    riskLevel: "high"
  },
  processed: true
}
```

## Error Handling

### Duplicate Message Prevention
The system automatically prevents duplicate messages using a hash of:
- Message text
- Phone number  
- Timestamp

### Incomplete Initial Analysis
If a user tries to analyze new messages before completing initial analysis:
```javascript
{
  success: false,
  error: "Please complete initial month analysis first",
  requiresInitialAnalysis: true
}
```

## Mobile App Requirements

### Permissions
```xml
<!-- Android Manifest -->
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

### Dependencies
```javascript
// React Native
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
```

## Testing

### Test Initial Analysis
```javascript
// Test with sample monthly messages
const testMessages = [
  {
    messageText: "Your bank account has been suspended. Click here to verify.",
    phoneNumber: "+1234567890",
    timestamp: "2024-01-15T10:30:00.000Z",
    analysis: { isFraud: true, confidence: 0.9, category: "phishing" }
  }
];

const result = await analyzeCurrentMonthMessages("test_user", testMessages);
console.log('Test result:', result);
```

### Test New Message
```javascript
const newMessage = {
  messageText: "Hello, how are you?",
  phoneNumber: "+0987654321", 
  timestamp: new Date().toISOString(),
  analysis: { isFraud: false, confidence: 0.1, category: "legitimate" }
};

const result = await analyzeNewIncomingMessage("test_user", newMessage);
console.log('New message result:', result);
```

## Dashboard Integration

All messages analyzed through these functions will automatically appear in the admin dashboard with:
- Real-time statistics updates
- Fraud alert notifications
- Cumulative tracking
- User activity monitoring

## Security Considerations

1. **Authentication**: Always ensure proper Firebase authentication
2. **Data Validation**: Validate message structure before sending
3. **Rate Limiting**: Implement reasonable limits on API calls
4. **Privacy**: Hash sensitive data when possible
5. **Error Logging**: Log errors for debugging without exposing sensitive data

## Support

For technical support or questions about integration:
- Check the Firebase console for error logs
- Review the admin dashboard for data verification
- Test with sample data before production deployment
