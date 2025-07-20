// Notification Settings Panel - Allow users to control notification preferences
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import NotificationManager from '../utils/NotificationManager';
import SMSMonitor from '../utils/SMSMonitor';

const NotificationPanel = ({ visible, onClose, navigation, user }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    smsMonitoring: true,
    fraudAlerts: true,
    transactionAlerts: true,
    analysisReminders: true,
    testNotifications: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNotificationSettings();
    }
  }, [visible]);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      const settings = await NotificationManager.getNotificationSettings();
      setNotificationSettings(prev => ({
        ...prev,
        ...settings
      }));
    } catch (error) {
      console.error('❌ Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (settingKey, value) => {
    try {
      const newSettings = {
        ...notificationSettings,
        [settingKey]: value
      };
      
      setNotificationSettings(newSettings);
      await NotificationManager.updateNotificationSettings(newSettings);

      // Handle specific setting changes
      if (settingKey === 'smsMonitoring') {
        if (value && user?.uid) {
          await SMSMonitor.startMonitoring(user.uid);
        } else {
          await SMSMonitor.stopMonitoring();
        }
      }

      if (settingKey === 'pushNotifications' && !value) {
        // If turning off push notifications, also turn off SMS monitoring
        if (notificationSettings.smsMonitoring) {
          await SMSMonitor.stopMonitoring();
          setNotificationSettings(prev => ({
            ...prev,
            smsMonitoring: false
          }));
          await NotificationManager.updateNotificationSettings({
            ...newSettings,
            smsMonitoring: false
          });
        }
      }

    } catch (error) {
      console.error('❌ Failed to update setting:', error);
      // Revert the change if there was an error
      setNotificationSettings(prev => ({
        ...prev,
        [settingKey]: !value
      }));
      
      // Show user-friendly error message
      if (settingKey === 'smsMonitoring' && value && !user?.uid) {
        Alert.alert('Error', 'Cannot start SMS monitoring: User not authenticated');
      }
    }
  };

  const handleClearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'This will clear all notification history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationManager.clearAllNotifications();
              Alert.alert('Success', 'All notifications cleared');
            } catch (error) {
              console.error('❌ Failed to clear notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const renderSettingItem = (title, description, settingKey, icon, disabled = false) => (
    <View key={settingKey} style={[styles.settingItem, disabled && styles.disabledSetting]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color={disabled ? colors.disabled : colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
        <Text style={[styles.settingDescription, disabled && styles.disabledText]}>{description}</Text>
      </View>
      <Switch
        value={notificationSettings[settingKey]}
        onValueChange={(value) => handleSettingChange(settingKey, value)}
        trackColor={{ false: colors.disabled, true: colors.primary }}
        thumbColor={notificationSettings[settingKey] ? colors.white : colors.lightGray}
        disabled={disabled}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Settings Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Main Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Push Notifications</Text>
            
            {renderSettingItem(
              'Enable Push Notifications',
              'Receive push notifications on your device',
              'pushNotifications',
              'notifications-outline'
            )}
            
            {renderSettingItem(
              'SMS Transaction Monitoring',
              'Monitor SMS messages for transaction alerts',
              'smsMonitoring',
              'chatbubble-outline',
              !notificationSettings.pushNotifications
            )}
          </View>

          {/* Alert Types Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alert Types</Text>
            
            {renderSettingItem(
              'Fraud Alerts',
              'Get notified about potential fraud attempts',
              'fraudAlerts',
              'warning-outline',
              !notificationSettings.pushNotifications
            )}
            
            {renderSettingItem(
              'Transaction Alerts',
              'Notifications for new transaction SMS',
              'transactionAlerts',
              'card-outline',
              !notificationSettings.pushNotifications
            )}
            
            {renderSettingItem(
              'Analysis Reminders',
              'Reminders to analyze pending messages',
              'analysisReminders',
              'time-outline',
              !notificationSettings.pushNotifications
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearAllNotifications}
            >
              <Ionicons name="trash-outline" size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Clear All Notifications</Text>
            </TouchableOpacity>
          </View>

          {/* Status Information */}
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>Notification Status</Text>
            <View style={styles.statusItem}>
              <Ionicons 
                name={notificationSettings.pushNotifications ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={notificationSettings.pushNotifications ? colors.success : colors.danger} 
              />
              <Text style={styles.statusText}>
                Push Notifications: {notificationSettings.pushNotifications ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons 
                name={notificationSettings.smsMonitoring ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={notificationSettings.smsMonitoring ? colors.success : colors.danger} 
              />
              <Text style={styles.statusText}>
                SMS Monitoring: {notificationSettings.smsMonitoring ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>About Notifications</Text>
            <Text style={styles.helpText}>
              • Push notifications help you stay informed about important transaction activities
            </Text>
            <Text style={styles.helpText}>
              • SMS monitoring scans your messages for transaction-related content
            </Text>
            <Text style={styles.helpText}>
              • You can disable specific types of alerts while keeping others active
            </Text>
            <Text style={styles.helpText}>
              • Test notifications help verify your settings are working correctly
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same as close button
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledSetting: {
    opacity: 0.5,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  disabledText: {
    color: colors.disabled,
  },
  actionSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  statusSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  helpSection: {
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default NotificationPanel;
