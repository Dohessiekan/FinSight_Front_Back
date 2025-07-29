/**
 * UserNotificationListener - Mobile App Component
 * 
 * Listens for admin decisions and displays notifications to users
 * when admins approve/reject their requests
 */

import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';

export const useUserNotifications = (onMessageStatusUpdate) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sessionStartTime] = useState(new Date()); // Track when this session started

  // Memoize the callback to prevent infinite re-renders
  const stableMessageStatusUpdate = useCallback((messageId, newStatus, notification) => {
    if (onMessageStatusUpdate) {
      onMessageStatusUpdate(messageId, newStatus, notification);
    }
  }, [onMessageStatusUpdate]);

  useEffect(() => {
    if (!user?.uid) return;

    console.log('🔔 Setting up user notification listener...');
    console.log('🔔 Session started at:', sessionStartTime);
    setIsInitialLoad(true);

    // Listen for user notifications from admin decisions
    const userNotificationsRef = collection(db, 'userNotifications');
    const q = query(
      userNotificationsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList = [];
      let unreadCounter = 0;

      snapshot.forEach((doc) => {
        const notification = {
          id: doc.id,
          ...doc.data()
        };
        notificationsList.push(notification);

        if (!notification.read) {
          unreadCounter++;
        }
      });

      console.log(`🔔 Received ${notificationsList.length} notifications, ${unreadCounter} unread`);
      setNotifications(notificationsList);
      setUnreadCount(unreadCounter);

      // Only show alerts for new notifications after initial load
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = {
              id: change.doc.id,
              ...change.doc.data()
            };
            
            // Check if notification was created after this session started
            const notificationTime = notification.createdAt ? 
              notification.createdAt.toDate() : new Date(0);
            const isRecentNotification = notificationTime > sessionStartTime;
            
            console.log('🔔 Checking notification timing:', {
              notificationTime: notificationTime.toISOString(),
              sessionStartTime: sessionStartTime.toISOString(),
              isRecent: isRecentNotification,
              notificationType: notification.type
            });
            
            // Only show alert for new admin decision notifications that are recent
            if ((notification.type === 'admin_approval' || notification.type === 'admin_rejection') && isRecentNotification) {
              console.log('📩 New admin decision received (after session start):', notification);
              
              // Update message status directly
              if (stableMessageStatusUpdate && notification.messageId) {
                const newStatus = notification.type === 'admin_approval' ? 'safe' : 'fraud';
                stableMessageStatusUpdate(notification.messageId, newStatus, notification);
              }
              
              // Show simple on-screen notification
              showSimpleAdminDecisionAlert(notification);
            } else if (!isRecentNotification) {
              console.log('🔔 Skipping old notification from before session started');
            }
          }
        });
      } else {
        // Mark initial load as complete after first snapshot
        setIsInitialLoad(false);
        console.log('🔔 Initial notification load complete - future notifications will show alerts');
      }
    }, (error) => {
      console.error('❌ Error listening to user notifications:', error);
    });

    return () => {
      console.log('🔔 Cleaning up user notification listener');
      setIsInitialLoad(true); // Reset for next mount
      unsubscribe();
    };
  }, [user?.uid, stableMessageStatusUpdate]); // Use stable callback in dependencies

  const showSimpleAdminDecisionAlert = (notification) => {
    const isApproval = notification.type === 'admin_approval';
    
    // Try multiple fields to get the message content
    const messagePreview = notification.originalMessage || 
                          notification.messageText || 
                          notification.message || 
                          notification.content ||
                          'your message';
    
    // If we have a messageId but no content, get it from message status update
    const displayPreview = messagePreview === 'your message' && notification.messageId 
      ? `Message ID: ${notification.messageId}` 
      : messagePreview.length > 50 
        ? messagePreview.substring(0, 50) + '...' 
        : messagePreview;
    
    const title = isApproval ? '✅ Admin Approved' : '❌ Admin Reviewed';
    const message = isApproval 
      ? `Your report has been approved!\n\nMessage: "${displayPreview}"\n\nThe message status has been updated to "Safe".`
      : `Your report has been reviewed.\n\nMessage: "${displayPreview}"\n\nAdmin decision: Message remains flagged.`;
    
    console.log(`🔔 Showing simple admin decision alert: ${notification.type}`);
    
    Alert.alert(title, message, [
      { text: 'OK', onPress: () => markAsRead(notification.id) }
    ]);
  };

  const showAdminDecisionAlert = (notification) => {
    const isApproval = notification.type === 'admin_approval';
    
    console.log(`🔔 Showing admin decision alert: ${notification.type}`);
    
    Alert.alert(
      notification.title,
      notification.message + '\n\nTap "View Details" to see more information.',
      [
        { text: 'Dismiss', onPress: () => markAsRead(notification.id) },
        { 
          text: 'View Details', 
          onPress: () => {
            markAsRead(notification.id);
            showDetailedNotification(notification);
          }
        }
      ]
    );
  };

  const showDetailedNotification = (notification) => {
    const isApproval = notification.type === 'admin_approval';
    
    const detailMessage = isApproval 
      ? `✅ ADMIN DECISION: APPROVED\n\n` +
        `Your request to mark the message as safe has been approved by an administrator.\n\n` +
        `The message status has been updated to "Safe" and will no longer appear as a fraud alert.\n\n` +
        `Admin: ${notification.adminEmail || 'System Admin'}\n` +
        `Time: ${notification.createdAt ? new Date(notification.createdAt.toDate()).toLocaleString() : 'Recent'}`
      : `❌ ADMIN DECISION: REJECTED\n\n` +
        `Your request to mark the message as safe has been rejected by an administrator.\n\n` +
        `The message remains classified as fraudulent based on admin review.\n\n` +
        `Admin: ${notification.adminEmail || 'System Admin'}\n` +
        `Time: ${notification.createdAt ? new Date(notification.createdAt.toDate()).toLocaleString() : 'Recent'}`;

    Alert.alert(
      isApproval ? '✅ Request Approved' : '❌ Request Rejected',
      detailMessage,
      [{ text: 'OK' }]
    );
  };

  const markAsRead = async (notificationId) => {
    try {
      console.log(`🔔 Marking notification ${notificationId} as read`);
      const notificationRef = doc(db, 'userNotifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('🔔 Marking all notifications as read...');
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notification =>
          updateDoc(doc(db, 'userNotifications', notification.id), {
            read: true,
            readAt: serverTimestamp()
          })
        )
      );
      
      console.log(`✅ Marked ${unreadNotifications.length} notifications as read`);
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
    }
  };

  const getLatestAdminDecision = () => {
    const adminDecisions = notifications.filter(
      n => n.type === 'admin_approval' || n.type === 'admin_rejection'
    );
    return adminDecisions.length > 0 ? adminDecisions[0] : null;
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    getLatestAdminDecision
  };
};

// Default export for easy importing
export default useUserNotifications;
