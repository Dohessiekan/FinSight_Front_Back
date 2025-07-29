/**
 * AdminNotificationManager - Web dashboard version for handling user review requests
 * Creates notifications for admin when users want to mark messages as safe
 * Manages pending review status and admin confirmation workflow
 */

import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  increment,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class AdminNotificationManager {
  
  /**
   * Admin approves user request to mark message as safe
   */
  static async approveUserSafetyRequest(notificationId, adminEmail, adminReason = 'Admin confirmed message is safe') {
    console.log(`✅ Admin ${adminEmail} approving safety request ${notificationId}`);
    
    try {
      // Step 1: Get notification details
      const notificationRef = doc(db, 'adminNotifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);
      
      if (!notificationDoc.exists()) {
        throw new Error('Notification not found');
      }

      const notificationData = notificationDoc.data();
      const { messageId, userId } = notificationData;

      // Step 2: Use AdminMessageManager to mark as safe (responsive action)
      const { AdminMessageManager } = await import('./AdminMessageManager');
      await AdminMessageManager.markFraudAsSafe(messageId, userId, adminEmail, adminReason, false);

      // Step 3: Update notification status
      await updateDoc(notificationRef, {
        status: 'approved',
        adminResponse: {
          adminEmail: adminEmail,
          action: 'approved',
          reason: adminReason,
          approvedAt: serverTimestamp()
        },
        resolvedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // Step 4: Create user notification about approval
      const userNotificationRef = collection(db, 'userNotifications');
      await addDoc(userNotificationRef, {
        userId: userId,
        type: 'admin_approval',
        title: '✅ Message Marked as Safe',
        message: `An admin has approved your request to mark the message as safe.`,
        messageId: messageId,
        originalMessage: notificationData.messageText || notificationData.content || 'Message content not available',
        adminEmail: adminEmail,
        createdAt: serverTimestamp(),
        read: false,
        priority: 'normal'
      });

      // Step 5: Update dashboard stats
      try {
        const dashboardRef = doc(db, 'dashboard', 'stats');
        const today = new Date().toISOString().split('T')[0];
        
        await updateDoc(dashboardRef, {
          pendingAdminReviews: increment(-1),
          approvedUserRequests: increment(1),
          totalAdminApprovals: increment(1),
          lastAdminApproval: serverTimestamp(),
          [`daily_${today}.adminApprovals`]: increment(1),
          [`daily_${today}.pendingReviews`]: increment(-1),
          [`daily_${today}.date`]: today,
          lastUpdated: serverTimestamp()
        });
      } catch (dashboardError) {
        console.warn('⚠️ Failed to update dashboard stats:', dashboardError);
      }

      console.log(`✅ Admin approval complete for notification ${notificationId}`);
      return { success: true, message: 'User request approved and message marked as safe' };

    } catch (error) {
      console.error('❌ Failed to approve user request:', error);
      throw error;
    }
  }

  /**
   * Admin rejects user request to mark message as safe
   */
  static async rejectUserSafetyRequest(notificationId, adminEmail, rejectionReason = 'Admin confirmed message is fraudulent') {
    console.log(`❌ Admin ${adminEmail} rejecting safety request ${notificationId}`);
    
    try {
      // Step 1: Get notification details
      const notificationRef = doc(db, 'adminNotifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);
      
      if (!notificationDoc.exists()) {
        throw new Error('Notification not found');
      }

      const notificationData = notificationDoc.data();
      const { messageId, userId } = notificationData;

      // Step 2: Restore original message status
      const messageRef = doc(db, 'users', userId, 'messages', messageId);
      await updateDoc(messageRef, {
        status: notificationData.message.currentStatus, // Restore original status
        adminReview: {
          reviewedBy: 'admin',
          adminEmail: adminEmail,
          action: 'rejected_user_request',
          timestamp: serverTimestamp(),
          reason: rejectionReason,
          originalUserRequest: notificationData.request.reason
        },
        updatedAt: serverTimestamp(),
        pendingReview: null // Remove pending review status
      });

      // Step 3: Update notification status
      await updateDoc(notificationRef, {
        status: 'rejected',
        adminResponse: {
          adminEmail: adminEmail,
          action: 'rejected',
          reason: rejectionReason,
          rejectedAt: serverTimestamp()
        },
        resolvedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // Step 4: Create user notification about rejection
      const userNotificationRef = collection(db, 'userNotifications');
      await addDoc(userNotificationRef, {
        userId: userId,
        type: 'admin_rejection',
        title: '❌ Request Denied',
        message: `An admin has reviewed your request but confirmed the message is fraudulent. Reason: ${rejectionReason}`,
        messageId: messageId,
        originalMessage: notificationData.messageText || notificationData.content || 'Message content not available',
        adminEmail: adminEmail,
        createdAt: serverTimestamp(),
        read: false,
        priority: 'high'
      });

      // Step 5: Update dashboard stats
      try {
        const dashboardRef = doc(db, 'dashboard', 'stats');
        const today = new Date().toISOString().split('T')[0];
        
        await updateDoc(dashboardRef, {
          pendingAdminReviews: increment(-1),
          rejectedUserRequests: increment(1),
          totalAdminRejections: increment(1),
          lastAdminRejection: serverTimestamp(),
          [`daily_${today}.adminRejections`]: increment(1),
          [`daily_${today}.pendingReviews`]: increment(-1),
          [`daily_${today}.date`]: today,
          lastUpdated: serverTimestamp()
        });
      } catch (dashboardError) {
        console.warn('⚠️ Failed to update dashboard stats:', dashboardError);
      }

      console.log(`❌ Admin rejection complete for notification ${notificationId}`);
      return { success: true, message: 'User request rejected and original status maintained' };

    } catch (error) {
      console.error('❌ Failed to reject user request:', error);
      throw error;
    }
  }

  /**
   * Get pending admin notifications for the admin dashboard
   */
  static async getPendingNotifications() {
    try {
      const notificationsRef = collection(db, 'adminNotifications');
      const q = query(notificationsRef, where('status', '==', 'pending'));
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by priority and creation time
      notifications.sort((a, b) => {
        // High priority first
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        
        // Then by creation time (newest first)
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      return { success: true, notifications };
    } catch (error) {
      console.error('❌ Failed to get pending notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup real-time listener for admin notifications
   */
  static setupAdminNotificationListener(callback) {
    try {
      const notificationsRef = collection(db, 'adminNotifications');
      const q = query(notificationsRef, where('status', '==', 'pending'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by priority and creation time
        notifications.sort((a, b) => {
          // High priority first
          if (a.priority === 'high' && b.priority !== 'high') return -1;
          if (b.priority === 'high' && a.priority !== 'high') return 1;
          
          // Then by creation time (newest first)
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });

        callback(notifications);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Failed to setup admin notification listener:', error);
      return null;
    }
  }
}

export default AdminNotificationManager;
