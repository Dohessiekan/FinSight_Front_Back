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
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class AdminNotificationManager {
  
  /**
   * Helper function to ensure dashboard stats document exists
   */
  static async ensureDashboardStatsExists() {
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      const dashboardDoc = await getDoc(dashboardRef);
      
      if (!dashboardDoc.exists()) {
        console.log('📊 Creating dashboard stats document');
        const today = new Date().toISOString().split('T')[0];
        await setDoc(dashboardRef, {
          pendingAdminReviews: 0,
          approvedUserRequests: 0,
          rejectedUserRequests: 0,
          totalAdminApprovals: 0,
          totalAdminRejections: 0,
          lastAdminApproval: null,
          lastAdminRejection: null,
          [`daily_${today}.adminApprovals`]: 0,
          [`daily_${today}.adminRejections`]: 0,
          [`daily_${today}.pendingReviews`]: 0,
          [`daily_${today}.date`]: today,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
        console.log('✅ Dashboard stats document created');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to ensure dashboard stats exists:', error);
      return false;
    }
  }
  
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
        console.error(`❌ Notification ${notificationId} not found`);
        return { success: false, message: 'Notification not found' };
      }

      const notificationData = notificationDoc.data();
      console.log('📄 Notification data:', notificationData);
      
      // Try multiple possible field names for backward compatibility
      const messageId = notificationData.messageId || notificationData.message?.id;
      const userId = notificationData.userId || notificationData.user?.id || notificationData.userPhone;
      
      console.log('🔍 Extracted IDs:', { messageId, userId, rawData: notificationData });
      
      if (!messageId || !userId) {
        console.error('❌ Missing messageId or userId in notification:', { 
          messageId, 
          userId, 
          availableFields: Object.keys(notificationData),
          notificationData 
        });
        return { success: false, message: `Invalid notification data - missing messageId (${messageId}) or userId (${userId})` };
      }

      // Step 2: Use AdminMessageManager to mark as safe (responsive action)
      try {
        console.log(`📝 Marking message ${messageId} as safe for user ${userId}`);
        const { AdminMessageManager } = await import('./AdminMessageManager');
        await AdminMessageManager.markFraudAsSafe(messageId, userId, adminEmail, adminReason, false);
        console.log('✅ Message marked as safe successfully');
      } catch (messageError) {
        console.error('❌ Failed to mark message as safe:', messageError);
        return { success: false, message: `Failed to mark message as safe: ${messageError.message}` };
      }

      // Step 3: Update notification status
      try {
        console.log(`📝 Updating notification ${notificationId} status`);
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
        console.log('✅ Notification status updated successfully');
      } catch (notificationError) {
        console.error('❌ Failed to update notification:', notificationError);
        return { success: false, message: `Failed to update notification: ${notificationError.message}` };
      }

      // Step 4: Create user notification about approval
      try {
        console.log(`📱 Creating user notification for user ${userId}`);
        const userNotificationRef = collection(db, 'userNotifications');
        await addDoc(userNotificationRef, {
          userId: userId,
          type: 'admin_approval',
          title: '✅ Message Marked as Safe',
          message: `An admin has approved your request to mark the message as safe.`,
          messageId: messageId,
          originalMessage: notificationData.messageText || notificationData.content || notificationData.message?.text || 'Message content not available',
          adminEmail: adminEmail,
          createdAt: serverTimestamp(),
          read: false,
          priority: 'normal'
        });
        console.log('✅ User notification created successfully');
      } catch (userNotificationError) {
        console.error('❌ Failed to create user notification:', userNotificationError);
        // Don't fail the entire process if user notification fails
        console.warn('⚠️ Continuing despite user notification failure');
      }

      // Step 5: Update dashboard stats (optional - don't fail if this fails)
      try {
        console.log('📊 Updating dashboard stats');
        await this.ensureDashboardStatsExists();
        
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
        console.log('✅ Dashboard stats updated successfully');
      } catch (dashboardError) {
        console.warn('⚠️ Failed to update dashboard stats (non-critical):', dashboardError);
      }

      console.log(`✅ Admin approval complete for notification ${notificationId}`);
      return { success: true, message: 'User request approved and message marked as safe' };

    } catch (error) {
      console.error('❌ Failed to approve user request:', error);
      return { success: false, message: `Approval failed: ${error.message || 'Unknown error'}` };
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
        console.error(`❌ Notification ${notificationId} not found`);
        return { success: false, message: 'Notification not found' };
      }

      const notificationData = notificationDoc.data();
      console.log('📄 Notification data:', notificationData);
      
      // Try multiple possible field names for backward compatibility
      const messageId = notificationData.messageId || notificationData.message?.id;
      const userId = notificationData.userId || notificationData.user?.id || notificationData.userPhone;
      
      console.log('🔍 Extracted IDs:', { messageId, userId, rawData: notificationData });
      
      if (!messageId || !userId) {
        console.error('❌ Missing messageId or userId in notification:', { 
          messageId, 
          userId, 
          availableFields: Object.keys(notificationData),
          notificationData 
        });
        return { success: false, message: `Invalid notification data - missing messageId (${messageId}) or userId (${userId})` };
      }

      // Step 2: Restore original message status
      try {
        console.log(`📝 Updating message ${messageId} for user ${userId}`);
        const messageRef = doc(db, 'users', userId, 'messages', messageId);
        
        // Check if message exists first
        const messageDoc = await getDoc(messageRef);
        if (!messageDoc.exists()) {
          console.error(`❌ Message ${messageId} not found for user ${userId}`);
          return { success: false, message: 'Original message not found' };
        }
        
        await updateDoc(messageRef, {
          status: notificationData.currentStatus || notificationData.message?.currentStatus || notificationData.message?.status || 'fraud', // Restore original status
          adminReview: {
            reviewedBy: 'admin',
            adminEmail: adminEmail,
            action: 'rejected_user_request',
            timestamp: serverTimestamp(),
            reason: rejectionReason,
            originalUserRequest: notificationData.request?.reason || 'User requested safety review'
          },
          updatedAt: serverTimestamp(),
          pendingReview: null // Remove pending review status
        });
        console.log('✅ Message status restored successfully');
      } catch (messageError) {
        console.error('❌ Failed to update message:', messageError);
        return { success: false, message: `Failed to update message: ${messageError.message}` };
      }

      // Step 3: Update notification status
      try {
        console.log(`📝 Updating notification ${notificationId} status`);
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
        console.log('✅ Notification status updated successfully');
      } catch (notificationError) {
        console.error('❌ Failed to update notification:', notificationError);
        return { success: false, message: `Failed to update notification: ${notificationError.message}` };
      }

      // Step 4: Create user notification about rejection
      try {
        console.log(`📱 Creating user notification for user ${userId}`);
        const userNotificationRef = collection(db, 'userNotifications');
        await addDoc(userNotificationRef, {
          userId: userId,
          type: 'admin_rejection',
          title: '❌ Request Denied',
          message: `An admin has reviewed your request but confirmed the message is fraudulent. Reason: ${rejectionReason}`,
          messageId: messageId,
          originalMessage: notificationData.messageText || notificationData.content || notificationData.message?.text || 'Message content not available',
          adminEmail: adminEmail,
          createdAt: serverTimestamp(),
          read: false,
          priority: 'high'
        });
        console.log('✅ User notification created successfully');
      } catch (userNotificationError) {
        console.error('❌ Failed to create user notification:', userNotificationError);
        // Don't fail the entire process if user notification fails
        console.warn('⚠️ Continuing despite user notification failure');
      }

      // Step 5: Update dashboard stats (optional - don't fail if this fails)
      try {
        console.log('📊 Updating dashboard stats');
        await this.ensureDashboardStatsExists();
        
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
        console.log('✅ Dashboard stats updated successfully');
      } catch (dashboardError) {
        console.warn('⚠️ Failed to update dashboard stats (non-critical):', dashboardError);
      }

      console.log(`✅ Admin rejection complete for notification ${notificationId}`);
      return { success: true, message: 'User request rejected and original status maintained' };

    } catch (error) {
      console.error('❌ Failed to reject user request:', error);
      return { success: false, message: `Rejection failed: ${error.message || 'Unknown error'}` };
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
