/**
 * NotificationBell Component
 * 
 * Shows notification count and allows users to view admin decisions
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserNotifications } from '../hooks/useUserNotifications';

const NotificationBell = ({ style }) => {
  const { notifications, unreadCount, markAllAsRead, getLatestAdminDecision } = useUserNotifications();

  const handleNotificationPress = () => {
    if (unreadCount === 0) {
      Alert.alert(
        'No New Notifications',
        'You have no unread notifications from administrators.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show summary of notifications
    const adminDecisions = notifications.filter(
      n => (n.type === 'admin_approval' || n.type === 'admin_rejection') && !n.read
    );
    
    if (adminDecisions.length > 0) {
      const approvals = adminDecisions.filter(n => n.type === 'admin_approval').length;
      const rejections = adminDecisions.filter(n => n.type === 'admin_rejection').length;
      
      let message = 'Admin Decisions:\n\n';
      if (approvals > 0) {
        message += `✅ ${approvals} request${approvals > 1 ? 's' : ''} approved\n`;
      }
      if (rejections > 0) {
        message += `❌ ${rejections} request${rejections > 1 ? 's' : ''} rejected\n`;
      }
      
      message += '\nWould you like to mark all as read?';
      
      Alert.alert(
        `${unreadCount} New Notification${unreadCount > 1 ? 's' : ''}`,
        message,
        [
          { text: 'Keep Unread', style: 'cancel' },
          { text: 'Mark All Read', onPress: markAllAsRead }
        ]
      );
    } else {
      // Other types of notifications
      Alert.alert(
        `${unreadCount} New Notification${unreadCount > 1 ? 's' : ''}`,
        'You have new notifications. Would you like to mark them as read?',
        [
          { text: 'Keep Unread', style: 'cancel' },
          { text: 'Mark All Read', onPress: markAllAsRead }
        ]
      );
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handleNotificationPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="notifications" 
        size={24} 
        color={unreadCount > 0 ? '#e74c3c' : '#7f8c8d'} 
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default NotificationBell;
