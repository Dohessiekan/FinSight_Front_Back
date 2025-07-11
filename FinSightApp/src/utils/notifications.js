// Enhanced notification logic with Firebase integration
import * as Notifications from 'expo-notifications';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function scheduleNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: { 
      title, 
      body,
      data
    },
    trigger: null,
  });
}

export async function scheduleDelayedNotification(title, body, delaySeconds = 60, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: { 
      title, 
      body,
      data
    },
    trigger: { seconds: delaySeconds },
  });
}

export async function scheduleFraudAlert(userId, transactionDetails) {
  const title = "🚨 Suspicious Transaction Detected";
  const body = `Potential fraud alert: ${transactionDetails.amount} to ${transactionDetails.recipient}`;
  
  // Send immediate notification
  await scheduleNotification(title, body, {
    type: 'fraud_alert',
    transactionId: transactionDetails.id
  });
  
  // Save notification to Firebase for history
  if (userId) {
    try {
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        title,
        body,
        type: 'fraud_alert',
        transactionDetails,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error saving notification to Firebase:', error);
    }
  }
}

export async function scheduleFinancialAdvice(userId, adviceText) {
  const title = "💡 Financial Tip";
  const body = adviceText;
  
  // Schedule for later today
  await scheduleDelayedNotification(title, body, 3600, {
    type: 'financial_advice'
  });
  
  // Save to Firebase
  if (userId) {
    try {
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        title,
        body,
        type: 'financial_advice',
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error saving advice notification:', error);
    }
  }
}

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}
