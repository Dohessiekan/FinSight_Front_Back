# 📱 Mobile App Integration Guide for Cumulative Message Tracking

## 🎯 **Problem Solved**
- ✅ **First analysis**: Automatically creates user in Firestore
- ✅ **Subsequent analyses**: Adds new messages without duplication  
- ✅ **Web app**: Shows cumulative total of ALL analyzed messages
- ✅ **Statistics tracking**: Real-time counters for users, messages, and fraud detection

## 🔧 **Enhanced Functions**

### **1. saveUserMessage() - Main Function**
```javascript
// Call this from your mobile app for EVERY message analysis
await saveUserMessage(userId, messageData);
```

**What it does automatically:**
1. **First time**: Creates user profile in Firestore
2. **Every time**: Saves message + updates counters
3. **Fraud detection**: Creates alerts for high-risk messages
4. **Statistics**: Updates dashboard totals

### **2. Message Data Format**
```javascript
const messageData = {
  messageText: "SMS content here",
  phoneNumber: "+1234567890", 
  analysis: {
    isFraud: true,           // true/false
    confidence: 0.95,        // 0.0 to 1.0
    category: "prize_scam",  // fraud type
    riskLevel: "high"        // low/medium/high/critical
  },
  timestamp: new Date().toISOString()
};
```

## 📊 **Firestore Structure**

### **User Document: `/users/{userId}`**
```json
{
  "userId": "user123",
  "createdAt": "2025-07-18T10:00:00Z",
  "lastActive": "2025-07-18T14:30:00Z",
  "messagesAnalyzed": 47,      // ⬅️ Cumulative counter
  "fraudsDetected": 3,         // ⬅️ Cumulative counter  
  "totalMessages": 47,         // ⬅️ Total messages processed
  "firstAnalysis": "2025-07-15T09:00:00Z"
}
```

### **Message Document: `/users/{userId}/messages/{messageId}`**
```json
{
  "messageId": "msg_1705392000000_abc123",
  "messageText": "Congratulations! You won $1000...",
  "phoneNumber": "+1234567890",
  "analysis": {
    "isFraud": true,
    "confidence": 0.95,
    "category": "prize_scam",
    "riskLevel": "high"
  },
  "userId": "user123",
  "createdAt": "2025-07-18T14:30:00Z",
  "source": "mobile_app",
  "processed": false
}
```

### **Dashboard Stats: `/dashboard/stats`**
```json
{
  "totalSmsAnalyzed": 1543,        // ⬅️ ALL TIME TOTAL
  "totalSmsAnalyzedToday": 47,     // ⬅️ TODAY ONLY
  "fraudsPrevented": 23,           // ⬅️ Cumulative fraud count
  "activeFraudAlerts": 5,          // ⬅️ Current active alerts
  "lastUpdated": "2025-07-18T14:30:00Z"
}
```

## 🚀 **Mobile App Implementation**

### **Step 1: Import the function**
```javascript
import { saveUserMessage } from './utils/firebaseMessages';
```

### **Step 2: Call after SMS analysis**
```javascript
// After your ML model analyzes the SMS
const analysisResult = await analyzeSMS(smsText);

// Save to Firestore (handles everything automatically)
const messageData = {
  messageText: smsText,
  phoneNumber: senderNumber,
  analysis: {
    isFraud: analysisResult.isFraud,
    confidence: analysisResult.confidence,
    category: analysisResult.category,
    riskLevel: analysisResult.riskLevel
  }
};

// This call handles user creation + message saving + counter updates
await saveUserMessage(currentUserId, messageData);
```

## 📈 **Web App Dashboard Display**

The admin dashboard now shows:

- **Total Users**: Number of unique users who have analyzed messages
- **Total Messages Analyzed**: **Cumulative count of ALL messages ever analyzed**
- **SMS Analyzed Today**: Messages analyzed in the current day only
- **Active Fraud Alerts**: Currently active fraud cases
- **Frauds Prevented**: Total fraud cases detected and blocked

## 🔄 **How Counters Work**

1. **First Analysis by User**:
   - Creates user document with counters at 1
   - Saves message
   - Updates dashboard totals (+1)

2. **Subsequent Analyses**:
   - Increments user's message counter (+1)
   - Saves new message (no duplicates)
   - Updates dashboard totals (+1)

3. **Web App Display**:
   - Fetches ALL messages from ALL users
   - Shows cumulative total: `totalMessagesAnalyzed`
   - Updates in real-time as new analyses happen

## ✅ **Expected Behavior**

- **Mobile App**: Each SMS analysis adds exactly 1 to the total count
- **Web Dashboard**: Shows increasing total that never decreases
- **No Duplicates**: Each message gets a unique ID and timestamp
- **Real-time Updates**: Dashboard reflects new analyses immediately
- **User Tracking**: Each user's individual stats are maintained

Your mobile app integration is now ready for proper cumulative message tracking! 🎉
