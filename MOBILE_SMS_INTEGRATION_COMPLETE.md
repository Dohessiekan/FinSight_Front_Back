# Mobile App SMS Integration Guide

## Overview
This guide shows how to integrate your React Native mobile app with the Firebase backend to ensure SMS messages are properly saved and displayed in both the mobile app and web dashboard.

## Key Integration Points

### 1. When User Opens MessageScreen (Display Messages)

When the user opens the MessageScreen to view their SMS messages, call this function for each message displayed:

```javascript
import { saveMessageFromMobileDisplay } from './firebaseMessages';

// In your MessageScreen component
const displayMessages = async () => {
  try {
    const smsMessages = await getSMSMessages(); // Your SMS reading function
    
    for (const message of smsMessages) {
      // Run ML analysis on the message
      const analysisResult = await runMLAnalysis(message.body);
      
      // Save to Firebase (this will appear in web dashboard SMS Inbox)
      const result = await saveMessageFromMobileDisplay(userId, message, analysisResult);
      
      if (result.success) {
        console.log(`Message saved to Firebase: ${result.messageId}`);
        
        // Show fraud alert if needed
        if (result.isFraud) {
          showFraudAlert(message, analysisResult);
        }
      }
    }
  } catch (error) {
    console.error('Error displaying messages:', error);
  }
};
```

### 2. When New SMS is Received (Real-time)

When a new SMS is received in real-time, use the existing function:

```javascript
import { analyzeNewIncomingMessage } from './firebaseMessages';

// SMS Listener
const handleNewSMS = async (message) => {
  try {
    // Run ML analysis
    const analysisResult = await runMLAnalysis(message.body);
    
    // Create message object
    const smsMessage = {
      messageText: message.body,
      phoneNumber: message.address,
      timestamp: new Date().toISOString(),
      analysis: analysisResult
    };
    
    // Save to Firebase
    const result = await analyzeNewIncomingMessage(userId, smsMessage);
    
    if (result.success) {
      console.log(`New SMS analyzed: ${result.messageId}`);
      
      // Update UI to show new message
      updateMessagesList(smsMessage);
      
      // Show fraud alert if needed
      if (result.isFraud) {
        showFraudAlert(smsMessage, analysisResult);
      }
    }
  } catch (error) {
    console.error('Error handling new SMS:', error);
  }
};
```

### 3. First Time User Setup

On first app launch, analyze all current month messages:

```javascript
import { analyzeCurrentMonthMessages } from './firebaseMessages';

// First time setup
const setupFirstTimeUser = async () => {
  try {
    const isFirstTime = await AsyncStorage.getItem('hasCompletedInitialAnalysis');
    
    if (!isFirstTime) {
      // Get all SMS from current month
      const monthlyMessages = await getCurrentMonthSMSMessages();
      
      // Analyze each message
      const messagesWithAnalysis = await Promise.all(
        monthlyMessages.map(async (msg) => ({
          messageText: msg.body,
          phoneNumber: msg.address,
          timestamp: msg.timestamp,
          analysis: await runMLAnalysis(msg.body)
        }))
      );
      
      // Save all to Firebase
      const result = await analyzeCurrentMonthMessages(userId, messagesWithAnalysis);
      
      if (result.success) {
        console.log(`Initial analysis complete: ${result.totalAnalyzed} messages`);
        await AsyncStorage.setItem('hasCompletedInitialAnalysis', 'true');
      }
    }
  } catch (error) {
    console.error('Error in first time setup:', error);
  }
};
```

### 4. Bulk Sync (Optional)

To sync all existing messages to the web dashboard:

```javascript
import { syncMobileMessagesToWeb } from './firebaseMessages';

const syncAllMessages = async () => {
  try {
    const allMessages = await getAllSMSMessages(); // Your function to get all SMS
    
    // Add analysis to each message
    const messagesWithAnalysis = await Promise.all(
      allMessages.map(async (msg) => ({
        ...msg,
        analysis: await runMLAnalysis(msg.body)
      }))
    );
    
    // Sync to web
    const result = await syncMobileMessagesToWeb(userId, messagesWithAnalysis);
    
    console.log(`Sync complete: ${result.newMessages} new, ${result.existingMessages} existing`);
  } catch (error) {
    console.error('Error syncing messages:', error);
  }
};
```

## Message Object Structure

Ensure your messages follow this structure:

```javascript
const messageObject = {
  // Required fields
  messageText: "SMS message content",
  phoneNumber: "+1234567890",
  timestamp: "2024-01-15T10:30:00.000Z",
  
  // Analysis result
  analysis: {
    isFraud: true,
    confidence: 0.85,
    category: "phishing",
    riskLevel: "high"
  },
  
  // Optional mobile-specific fields
  address: "+1234567890", // Alternative to phoneNumber
  body: "SMS message content", // Alternative to messageText
  date: 1705315800000 // Unix timestamp
};
```

## Complete Integration Example

Here's a complete example for your MessageScreen:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { saveMessageFromMobileDisplay, analyzeNewIncomingMessage } from './utils/firebaseMessages';
import { runMLAnalysis } from './utils/mlAnalysis';

const MessageScreen = ({ userId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndSyncMessages();
    setupSMSListener();
  }, []);

  const loadAndSyncMessages = async () => {
    try {
      setLoading(true);
      
      // Get SMS messages from device
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          maxCount: 100
        }),
        (fail) => {
          console.error('Failed to get SMS:', fail);
          setLoading(false);
        },
        async (count, smsData) => {
          try {
            const smsMessages = JSON.parse(smsData);
            const processedMessages = [];
            
            // Process each message
            for (const sms of smsMessages) {
              try {
                // Run ML analysis
                const analysisResult = await runMLAnalysis(sms.body);
                
                // Save to Firebase (will appear in web dashboard)
                const result = await saveMessageFromMobileDisplay(userId, sms, analysisResult);
                
                processedMessages.push({
                  ...sms,
                  analysis: analysisResult,
                  firebaseId: result.messageId,
                  syncedToWeb: true
                });
                
                // Show fraud alert if needed
                if (analysisResult.isFraud) {
                  Alert.alert(
                    '🚨 Fraud Alert',
                    `Suspicious message detected from ${sms.address}`,
                    [{ text: 'OK', style: 'default' }]
                  );
                }
              } catch (error) {
                console.error('Error processing message:', error);
                processedMessages.push({
                  ...sms,
                  analysis: { isFraud: false, confidence: 0, category: 'error' },
                  error: true
                });
              }
            }
            
            setMessages(processedMessages);
            setLoading(false);
            console.log(`✅ Processed ${processedMessages.length} messages`);
          } catch (error) {
            console.error('Error processing SMS data:', error);
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
    }
  };

  const setupSMSListener = () => {
    // Listen for new SMS messages
    const smsListener = (message) => {
      handleNewSMS(message);
    };
    
    // Add your SMS listener here based on your SMS library
    // Example: DeviceEventEmitter.addListener('onSMSReceived', smsListener);
  };

  const handleNewSMS = async (newMessage) => {
    try {
      // Run ML analysis
      const analysisResult = await runMLAnalysis(newMessage.body);
      
      // Create message object
      const messageObject = {
        messageText: newMessage.body,
        phoneNumber: newMessage.address,
        timestamp: new Date().toISOString(),
        analysis: analysisResult
      };
      
      // Save to Firebase using the new message function
      const result = await analyzeNewIncomingMessage(userId, messageObject);
      
      if (result.success) {
        // Add to local state
        setMessages(prev => [{
          ...newMessage,
          analysis: analysisResult,
          firebaseId: result.messageId,
          syncedToWeb: true
        }, ...prev]);
        
        // Show fraud alert if needed
        if (result.isFraud) {
          Alert.alert(
            '🚨 New Fraud Alert',
            `Suspicious message detected from ${newMessage.address}`,
            [{ text: 'OK', style: 'default' }]
          );
        }
      }
    } catch (error) {
      console.error('Error handling new SMS:', error);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={{
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      backgroundColor: item.analysis?.isFraud ? '#ffebee' : 'white'
    }}>
      <Text style={{ fontWeight: 'bold' }}>{item.address}</Text>
      <Text style={{ marginVertical: 5 }}>{item.body}</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>
        {new Date(item.date).toLocaleString()}
      </Text>
      {item.analysis?.isFraud && (
        <Text style={{ color: 'red', fontWeight: 'bold', marginTop: 5 }}>
          ⚠️ FRAUD DETECTED ({Math.round(item.analysis.confidence * 100)}% confidence)
        </Text>
      )}
      {item.syncedToWeb && (
        <Text style={{ fontSize: 10, color: 'green' }}>
          ✅ Synced to Web Dashboard
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ padding: 20, fontSize: 18, fontWeight: 'bold' }}>
        SMS Messages
      </Text>
      {loading ? (
        <Text style={{ textAlign: 'center', marginTop: 50 }}>
          Loading and analyzing messages...
        </Text>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => `${item.date}-${index}`}
        />
      )}
    </View>
  );
};

export default MessageScreen;
```

## Web Dashboard Integration

With this implementation:

1. **SMS Inbox on Web**: Will show all messages from mobile users in real-time
2. **Fraud Alerts**: Will display fraud alerts for suspicious messages
3. **Analytics**: Dashboard statistics will update automatically
4. **Real-time Sync**: Messages appear on web dashboard immediately when processed on mobile

## Testing

1. Open your mobile app and navigate to MessageScreen
2. Check the web dashboard SMS Inbox - you should see messages appearing
3. Send a test SMS to your phone - it should appear in both mobile and web
4. Check fraud alerts for suspicious messages

This ensures complete integration between mobile app and web dashboard! 🚀
