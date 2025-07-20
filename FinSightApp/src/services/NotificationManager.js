import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationManager {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Request permissions
      const permission = await this.requestPermissions();
      if (!permission) {
        console.log('Notification permissions denied');
        return false;
      }

      // Set up listeners
      this.setupListeners();
      this.isInitialized = true;
      
      console.log('NotificationManager initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing NotificationManager:', error);
      return false;
    }
  }

  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // For Android, set up notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('transaction-alerts', {
          name: 'Transaction Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4285F4',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  setupListeners() {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  async handleNotificationReceived(notification) {
    try {
      // Store notification in local history
      await this.saveNotificationToHistory(notification);
      
      // Update badge count
      await this.updateBadgeCount();
    } catch (error) {
      console.error('Error handling received notification:', error);
    }
  }

  async handleNotificationResponse(response) {
    try {
      const notificationData = response.notification.request.content.data;
      
      // Mark notification as read
      if (notificationData.id) {
        await this.markNotificationAsRead(notificationData.id);
      }

      // Handle navigation based on notification type
      if (notificationData.type === 'transaction_sms') {
        // Navigate to SMS inbox or specific message
        console.log('Navigate to SMS inbox for transaction:', notificationData);
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  async sendNotification(title, body, data = {}) {
    try {
      const notificationId = Date.now().toString();
      
      const notificationContent = {
        title,
        body,
        data: {
          id: notificationId,
          timestamp: new Date().toISOString(),
          ...data
        },
        sound: true,
        priority: Notifications.AndroidImportance.HIGH,
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });

      console.log('Notification sent:', title);
      return notificationId;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  async sendTransactionSMSNotification(smsData) {
    try {
      const title = "New Transaction Detected";
      const body = `SMS from ${smsData.sender}: ${smsData.preview}`;
      
      const notificationId = await this.sendNotification(title, body, {
        type: 'transaction_sms',
        smsId: smsData.id,
        sender: smsData.sender,
        amount: smsData.amount,
        category: smsData.category
      });

      return notificationId;
    } catch (error) {
      console.error('Error sending transaction SMS notification:', error);
      return null;
    }
  }

  async saveNotificationToHistory(notification) {
    try {
      const historyKey = 'notification_history';
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const notificationRecord = {
        id: notification.request.content.data.id || Date.now().toString(),
        title: notification.request.content.title,
        body: notification.request.content.body,
        timestamp: new Date().toISOString(),
        data: notification.request.content.data,
        read: false
      };

      history.unshift(notificationRecord);
      
      // Keep only last 50 notifications
      if (history.length > 50) {
        history.splice(50);
      }

      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
      console.log('Notification saved to history');
    } catch (error) {
      console.error('Error saving notification to history:', error);
    }
  }

  async getNotificationHistory() {
    try {
      const historyKey = 'notification_history';
      const history = await AsyncStorage.getItem(historyKey);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const historyKey = 'notification_history';
      const history = await this.getNotificationHistory();
      
      const updatedHistory = history.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      );

      await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      await this.updateBadgeCount();
      
      console.log('Notification marked as read:', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllNotificationsAsRead() {
    try {
      const historyKey = 'notification_history';
      const history = await this.getNotificationHistory();
      
      const updatedHistory = history.map(notification => ({
        ...notification,
        read: true
      }));

      await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      await this.updateBadgeCount();
      
      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async clearNotificationHistory() {
    try {
      const historyKey = 'notification_history';
      await AsyncStorage.removeItem(historyKey);
      await Notifications.setBadgeCountAsync(0);
      
      console.log('Notification history cleared');
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }

  async getUnreadCount() {
    try {
      const history = await this.getNotificationHistory();
      return history.filter(notification => !notification.read).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async updateBadgeCount() {
    try {
      const unreadCount = await this.getUnreadCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  async sendTestNotification() {
    try {
      const testData = {
        type: 'test',
        timestamp: new Date().toISOString()
      };

      const notificationId = await this.sendNotification(
        "Test Notification",
        "This is a test notification from FinSight",
        testData
      );

      console.log('Test notification sent with ID:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return null;
    }
  }

  cleanup() {
    try {
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener);
        this.notificationListener = null;
      }

      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener);
        this.responseListener = null;
      }

      this.isInitialized = false;
      console.log('NotificationManager cleaned up');
    } catch (error) {
      console.error('Error cleaning up NotificationManager:', error);
    }
  }
}

// Export singleton instance
export default new NotificationManager();
