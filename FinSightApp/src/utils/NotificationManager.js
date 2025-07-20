// Enhanced Push Notification System for FinSight
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationManager {
  constructor() {
    this.notificationListeners = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the notification system
   */
  async initialize(userId) {
    if (this.isInitialized) return;
    
    try {
      console.log('🔔 Initializing notification system...');
      
      // Request permissions
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        console.warn('⚠️ Notification permissions not granted');
        return false;
      }

      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Load existing notifications for user
      await this.loadNotificationHistory(userId);
      
      this.isInitialized = true;
      console.log('✅ Notification system initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permission denied');
        return false;
      }

      // Get push token for later use (for remote notifications)
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        try {
          const token = await Notifications.getExpoPushTokenAsync();
          console.log('📱 Push token:', token.data);
          // Store token for server-side notifications if needed
          await AsyncStorage.setItem('expo_push_token', token.data);
        } catch (tokenError) {
          console.warn('⚠️ Could not get push token:', tokenError);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Set up notification event listeners
   */
  setupNotificationListeners() {
    // Listener for when notification is received while app is open
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationTapped(response);
    });

    this.notificationListeners = [receivedListener, responseListener];
  }

  /**
   * Handle notification received while app is open
   */
  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    console.log(`📨 Received: ${title} - ${body}`);
    
    // Update badge count
    this.updateBadgeCount();
    
    // Trigger any UI updates needed
    if (data?.type === 'new_sms') {
      // Could trigger SMS screen refresh or other UI updates
      console.log('📱 New SMS notification received');
    }
  }

  /**
   * Handle notification tap
   */
  handleNotificationTapped(response) {
    const { data } = response.notification.request.content;
    console.log('👆 Notification tapped with data:', data);
    
    // Navigate based on notification type
    if (data?.type === 'new_sms') {
      // Navigate to Messages screen
      console.log('📱 Navigating to Messages screen');
    } else if (data?.type === 'fraud_alert') {
      // Navigate to Alerts screen
      console.log('🚨 Navigating to Alerts screen');
    }
  }

  /**
   * Send immediate push notification
   */
  async sendPushNotification(title, body, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: null, // Send immediately
      });

      console.log(`✅ Push notification sent: ${title}`);
      
      // Save to notification history
      await this.saveNotificationToHistory({
        id: notificationId,
        title,
        body,
        data,
        timestamp: new Date().toISOString(),
        read: false,
        type: data.type || 'general'
      });

      return notificationId;
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      return null;
    }
  }

  /**
   * Send delayed push notification
   */
  async sendDelayedPushNotification(title, body, delaySeconds, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: { seconds: delaySeconds },
      });

      console.log(`⏰ Delayed notification scheduled: ${title} (${delaySeconds}s)`);
      return notificationId;
    } catch (error) {
      console.error('❌ Failed to schedule delayed notification:', error);
      return null;
    }
  }

  /**
   * Send SMS detection notification
   */
  async notifyNewTransactionSMS(smsDetails) {
    const title = "📱 New Transaction SMS";
    const body = `From ${smsDetails.sender} - Tap to analyze`;
    
    await this.sendPushNotification(title, body, {
      type: 'new_sms',
      smsId: smsDetails.id,
      sender: smsDetails.sender,
      priority: 'high'
    });
  }

  /**
   * Send fraud alert notification
   */
  async notifyFraudAlert(alertDetails) {
    const title = "🚨 FRAUD ALERT";
    const body = `Suspicious transaction detected - ${alertDetails.amount}`;
    
    await this.sendPushNotification(title, body, {
      type: 'fraud_alert',
      alertId: alertDetails.id,
      severity: 'high',
      priority: 'critical'
    });
  }

  /**
   * Send analysis reminder
   */
  async notifyAnalysisReminder(pendingCount) {
    const title = "🔍 Analysis Reminder";
    const body = `${pendingCount} messages waiting for analysis`;
    
    // Send after 30 minutes
    await this.sendDelayedPushNotification(title, body, 1800, {
      type: 'analysis_reminder',
      pendingCount,
      priority: 'normal'
    });
  }

  /**
   * Save notification to local history
   */
  async saveNotificationToHistory(notification) {
    try {
      const existingHistory = await AsyncStorage.getItem('notification_history') || '[]';
      const history = JSON.parse(existingHistory);
      
      history.unshift(notification);
      
      // Keep only last 100 notifications
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem('notification_history', JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('❌ Failed to save notification history:', error);
    }
  }

  /**
   * Load notification history
   */
  async loadNotificationHistory() {
    try {
      const history = await AsyncStorage.getItem('notification_history') || '[]';
      return JSON.parse(history);
    } catch (error) {
      console.error('❌ Failed to load notification history:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    try {
      const history = await this.loadNotificationHistory();
      return history.filter(notification => !notification.read).length;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const history = await this.loadNotificationHistory();
      const updatedHistory = history.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      
      await AsyncStorage.setItem('notification_history', JSON.stringify(updatedHistory));
      await this.updateBadgeCount();
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const history = await this.loadNotificationHistory();
      const updatedHistory = history.map(notification => ({
        ...notification,
        read: true
      }));
      
      await AsyncStorage.setItem('notification_history', JSON.stringify(updatedHistory));
      await this.updateBadgeCount();
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount() {
    try {
      const unreadCount = await this.getUnreadCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('❌ Failed to update badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    try {
      await AsyncStorage.removeItem('notification_history');
      await Notifications.setBadgeCountAsync(0);
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification() {
    await this.sendPushNotification(
      "🧪 FinSight Test",
      "Push notifications are working correctly!",
      { type: 'test', timestamp: Date.now() }
    );
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    this.notificationListeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.notificationListeners = [];
    this.isInitialized = false;
  }

  /**
   * Get notification settings from storage
   */
  async getNotificationSettings() {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        return JSON.parse(settings);
      }
      
      // Return default settings
      return {
        pushNotifications: true,
        smsMonitoring: true,
        fraudAlerts: true,
        transactionAlerts: true,
        analysisReminders: true,
        testNotifications: false
      };
    } catch (error) {
      console.error('❌ Failed to get notification settings:', error);
      return {};
    }
  }

  /**
   * Update notification settings in storage
   */
  async updateNotificationSettings(newSettings) {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(newSettings));
      console.log('✅ Notification settings updated:', newSettings);
      return true;
    } catch (error) {
      console.error('❌ Failed to update notification settings:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new NotificationManager();
