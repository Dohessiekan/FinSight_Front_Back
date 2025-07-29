/**
 * Mobile Admin Request Manager
 * 
 * Handles sending user requests to admin for review in the web app
 * Works with the web app's AdminNotificationCenter component
 */

import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserLocationManager } from './UserLocationManager';
import { LocationService } from '../services/LocationService';

export class MobileAdminRequestManager {
  
  /**
   * Send fraud review request to admin (for disputed fraud detection)
   */
  static async sendFraudReviewRequest(userId, messageData, disputeReason = 'User believes message is legitimate') {
    try {
      console.log(`🚨 Sending fraud review request from user ${userId} for message ${messageData.id}`);
      
      // Get current location for mapping in web app
      let locationData = null;
      try {
        const gpsResult = await LocationService.getGPSLocation();
        if (gpsResult.success) {
          locationData = {
            latitude: gpsResult.location.latitude,
            longitude: gpsResult.location.longitude,
            accuracy: gpsResult.location.accuracy,
            isRealGPS: gpsResult.location.isGPSAccurate,
            source: gpsResult.location.source,
            address: `Location Accuracy: ${gpsResult.location.accuracyLevel}`,
            city: 'Rwanda'
          };
        } else {
          // Fallback to default Rwanda location
          locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
          locationData.isRealGPS = false;
          locationData.source = 'default_location';
        }
      } catch (locationError) {
        console.warn('⚠️ Could not get location for fraud review:', locationError);
        locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
        locationData.isRealGPS = false;
        locationData.source = 'default_location';
      }
      
      // Create admin notification for fraud review
      const fraudReviewData = {
        // User information
        userId: userId,
        userPhone: messageData.userPhone || 'Unknown',
        
        // Message details that admin needs to review
        messageId: messageData.id || messageData.messageId,
        messageText: messageData.text || messageData.content || messageData.messageText,
        messageFrom: messageData.sender || messageData.from || messageData.address,
        messageTimestamp: messageData.timestamp || messageData.date || new Date().toISOString(),
        
        // Current fraud detection data
        currentStatus: messageData.status || 'fraud',
        fraudConfidence: messageData.spamData?.confidence || 0,
        fraudType: messageData.spamData?.label || 'fraud',
        aiAnalysis: messageData.analysis || 'Fraud detected by mobile app',
        
        // Location data for web app map display (matching FraudAlerts.js format)
        location: {
          coordinates: {
            latitude: locationData?.latitude || -1.9441,
            longitude: locationData?.longitude || 30.0619,
            address: locationData?.address || 'Rwanda',
            city: locationData?.city || 'Unknown',
            accuracy: locationData?.accuracy || null,
            isDefault: locationData?.isRealGPS === false,
            source: locationData?.source || 'mobile_app'
          },
          address: {
            formattedAddress: locationData?.address || `${locationData?.city || 'Unknown'}, Rwanda`
          },
          formattedLocation: locationData?.address || locationData?.city || 'Mobile Device',
          quality: {
            hasRealGPS: locationData?.isRealGPS === true,
            accuracy: locationData?.accuracy || null,
            source: locationData?.source || 'mobile_app'
          }
        },
        
        // Dispute details
        request: {
          type: 'fraud_review_dispute',
          reason: disputeReason,
          userDispute: 'User claims this message is legitimate and not fraud',
          requestedAction: 'Please review fraud classification and reclassify if necessary',
          requestedAt: serverTimestamp(),
          priority: 'high' // Fraud disputes are high priority
        },
        
        // Status and metadata
        status: 'pending', // 'pending', 'approved_as_fraud', 'marked_as_safe', 'rejected'
        type: 'fraud_review_request',
        priority: 'high',
        source: 'mobile_app',
        
        // Timestamps
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        
        // Additional context for admin decision
        disputeInfo: {
          originalDetection: messageData.status,
          mlConfidence: messageData.spamData?.confidence || 0,
          userClaim: 'Message is legitimate',
          reviewNeeded: true
        },
        
        // Device context
        deviceInfo: {
          platform: 'react-native',
          appVersion: '2.0',
          source: 'FinSight Mobile'
        }
      };
      
      // Save to adminNotifications collection
      const notificationsRef = collection(db, 'adminNotifications');
      const notificationDoc = await addDoc(notificationsRef, fraudReviewData);
      
      console.log(`✅ Fraud review request created with ID: ${notificationDoc.id}`);
      
      // Mark the original message as under review
      await this.markMessageUnderReview(userId, messageData.id, notificationDoc.id);
      
      // Update dashboard stats
      await this.updateDashboardStats('fraud_review_requested');
      
      return {
        success: true,
        notificationId: notificationDoc.id,
        message: 'Fraud review request sent to admin. You will be notified of the decision.'
      };
      
    } catch (error) {
      console.error('❌ Failed to send fraud review request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * User blocks/confirms a message as fraud
   */
  static async blockMessage(userId, messageData, blockReason = 'User confirmed as fraud/spam') {
    try {
      console.log(`🚫 User ${userId} blocking message ${messageData.id}`);
      
      // Get current location for fraud tracking
      let locationData = null;
      try {
        const gpsResult = await LocationService.getGPSLocation();
        if (gpsResult.success) {
          locationData = {
            latitude: gpsResult.location.latitude,
            longitude: gpsResult.location.longitude,
            accuracy: gpsResult.location.accuracy,
            isRealGPS: gpsResult.location.isGPSAccurate,
            source: gpsResult.location.source,
            address: `Location Accuracy: ${gpsResult.location.accuracyLevel}`,
            city: 'Rwanda'
          };
        } else {
          locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
          locationData.isRealGPS = false;
          locationData.source = 'default_location';
        }
      } catch (locationError) {
        console.warn('⚠️ Could not get location for message blocking:', locationError);
        locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
        locationData.isRealGPS = false;
        locationData.source = 'default_location';
      }
      
      // Update the message status to blocked
      const messageRef = doc(db, 'users', userId, 'messages', messageData.id);
      await updateDoc(messageRef, {
        status: 'blocked',
        blockedBy: 'user',
        blockedAt: serverTimestamp(),
        blockReason: blockReason,
        previousStatus: messageData.status || 'fraud',
        userAction: 'confirmed_fraud'
      });
      
      // Create admin notification for user action (informational)
      const blockNotificationData = {
        userId: userId,
        messageId: messageData.id,
        messageText: messageData.text || messageData.content || '',
        messageFrom: messageData.sender || messageData.from || 'Unknown',
        
        // Location data for web app tracking
        location: {
          coordinates: {
            latitude: locationData?.latitude || -1.9441,
            longitude: locationData?.longitude || 30.0619,
            address: locationData?.address || 'Rwanda',
            city: locationData?.city || 'Unknown',
            accuracy: locationData?.accuracy || null,
            isDefault: locationData?.isRealGPS === false,
            source: locationData?.source || 'mobile_app'
          },
          address: {
            formattedAddress: locationData?.address || `${locationData?.city || 'Unknown'}, Rwanda`
          },
          formattedLocation: locationData?.address || locationData?.city || 'Mobile Device',
          quality: {
            hasRealGPS: locationData?.isRealGPS === true,
            accuracy: locationData?.accuracy || null,
            source: locationData?.source || 'mobile_app'
          }
        },
        
        request: {
          type: 'message_blocked_by_user',
          reason: blockReason,
          userAction: 'User confirmed fraud detection and blocked message',
          requestedAt: serverTimestamp(),
          priority: 'normal'
        },
        
        status: 'completed', // This is just informational
        type: 'user_action_notification',
        priority: 'normal',
        source: 'mobile_app',
        
        createdAt: serverTimestamp(),
        
        deviceInfo: {
          platform: 'react-native',
          appVersion: '2.0',
          source: 'FinSight Mobile'
        }
      };
      
      // Save notification
      const notificationsRef = collection(db, 'adminNotifications');
      await addDoc(notificationsRef, blockNotificationData);
      
      // Update dashboard stats
      await this.updateDashboardStats('message_blocked');
      
      console.log(`✅ Message blocked and admin notified`);
      
      return {
        success: true,
        message: 'Message blocked successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to block message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Mark message as under admin review
   */
  static async markMessageUnderReview(userId, messageId, reviewRequestId) {
    try {
      const messageRef = doc(db, 'users', userId, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'under_review',
        reviewRequestId: reviewRequestId,
        requestedReviewAt: serverTimestamp(),
        previousStatus: 'fraud'
      });
      
      console.log(`📋 Message ${messageId} marked as under admin review`);
    } catch (error) {
      console.error('❌ Failed to mark message under review:', error);
    }
  }
  
  /**
   * Check if user can request fraud review for this message
   */
  static canRequestFraudReview(message) {
    const fraudStatuses = ['fraud', 'suspicious'];
    const blockedStatuses = ['under_review', 'blocked', 'safe'];
    
    return fraudStatuses.includes(message.status) && 
           !blockedStatuses.includes(message.status) &&
           !message.reviewRequestId; // Not already under review
  }
  
  /**
   * Check if message is under review
   */
  static isMessageUnderReview(message) {
    return message.status === 'under_review' || 
           message.reviewRequestId !== undefined;
  }
  
  /**
   * Send a user request to admin for message review
   * This creates a notification that appears in the web app "User Requests" page
   */
  static async sendMessageReviewRequest(userId, messageData, requestReason, requestType = 'mark_as_safe') {
    try {
      console.log(`📨 Sending admin request from user ${userId} for message review`);
      
      // Create admin notification for web app review
      const adminNotificationData = {
        // User information
        userId: userId,
        userPhone: messageData.userPhone || 'Unknown',
        
        // Message details that admin needs to see
        messageId: messageData.id || messageData.messageId,
        messageText: messageData.text || messageData.content || messageData.messageText,
        messageFrom: messageData.sender || messageData.from || messageData.address,
        messageTimestamp: messageData.timestamp || messageData.date || new Date().toISOString(),
        
        // Current analysis data
        currentStatus: messageData.status || 'unknown',
        spamConfidence: messageData.spamData?.confidence || 0,
        aiAnalysis: messageData.analysis || 'No analysis available',
        
        // Request details
        request: {
          type: requestType, // 'mark_as_safe', 'reanalyze', 'report_error'
          reason: requestReason,
          userComment: requestReason,
          requestedAt: serverTimestamp(),
          priority: this.calculateRequestPriority(messageData, requestType)
        },
        
        // Status and metadata
        status: 'pending', // 'pending', 'approved', 'rejected'
        type: 'user_message_review',
        priority: this.calculateRequestPriority(messageData, requestType),
        source: 'mobile_app',
        
        // Timestamps
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        
        // Additional context for admin
        deviceInfo: {
          platform: 'react-native',
          appVersion: '2.0',
          source: 'FinSight Mobile'
        }
      };
      
      // Save to adminNotifications collection (monitored by web app)
      const notificationsRef = collection(db, 'adminNotifications');
      const notificationDoc = await addDoc(notificationsRef, adminNotificationData);
      
      console.log(`✅ Admin notification created with ID: ${notificationDoc.id}`);
      
      // Update dashboard stats
      await this.updateDashboardStats('request_created');
      
      return {
        success: true,
        notificationId: notificationDoc.id,
        message: 'Your request has been sent to administrators for review'
      };
      
    } catch (error) {
      console.error('❌ Failed to send admin request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send a general support request to admin
   */
  static async sendSupportRequest(userId, subject, description, urgency = 'normal') {
    try {
      console.log(`📞 Sending support request from user ${userId}`);
      
      const supportRequestData = {
        userId: userId,
        
        // Support request details
        request: {
          type: 'support_request',
          subject: subject,
          description: description,
          urgency: urgency, // 'low', 'normal', 'high', 'urgent'
          category: 'general_support',
          requestedAt: serverTimestamp()
        },
        
        // Status and metadata
        status: 'pending',
        type: 'user_support_request',
        priority: urgency === 'urgent' ? 'high' : urgency === 'high' ? 'medium' : 'normal',
        source: 'mobile_app',
        
        // Timestamps
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        
        // Device context
        deviceInfo: {
          platform: 'react-native',
          appVersion: '2.0',
          source: 'FinSight Mobile'
        }
      };
      
      // Save to adminNotifications collection
      const notificationsRef = collection(db, 'adminNotifications');
      const notificationDoc = await addDoc(notificationsRef, supportRequestData);
      
      console.log(`✅ Support request created with ID: ${notificationDoc.id}`);
      
      // Update dashboard stats
      await this.updateDashboardStats('support_request_created');
      
      return {
        success: true,
        notificationId: notificationDoc.id,
        message: 'Your support request has been sent to administrators'
      };
      
    } catch (error) {
      console.error('❌ Failed to send support request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Report a false positive/negative from ML analysis
   */
  static async reportAnalysisError(userId, messageData, errorType, userExplanation) {
    try {
      console.log(`🚨 Reporting analysis error from user ${userId}`);
      
      const errorReportData = {
        userId: userId,
        
        // Message and analysis details
        messageId: messageData.id || messageData.messageId,
        messageText: messageData.text || messageData.content,
        messageFrom: messageData.sender || messageData.from,
        
        // Current analysis
        currentStatus: messageData.status,
        aiAnalysis: messageData.analysis,
        confidence: messageData.spamData?.confidence || 0,
        
        // Error report details
        request: {
          type: 'analysis_error_report',
          errorType: errorType, // 'false_positive', 'false_negative', 'incorrect_classification'
          userExplanation: userExplanation,
          correctClassification: this.getCorrectClassification(errorType),
          reportedAt: serverTimestamp(),
          priority: 'high' // Analysis errors are high priority
        },
        
        // Status and metadata
        status: 'pending',
        type: 'analysis_error_report',
        priority: 'high',
        source: 'mobile_app',
        
        // Timestamps
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        
        // Device context
        deviceInfo: {
          platform: 'react-native',
          appVersion: '2.0',
          source: 'FinSight Mobile'
        }
      };
      
      // Save to adminNotifications collection
      const notificationsRef = collection(db, 'adminNotifications');
      const notificationDoc = await addDoc(notificationsRef, errorReportData);
      
      console.log(`✅ Analysis error report created with ID: ${notificationDoc.id}`);
      
      // Update dashboard stats
      await this.updateDashboardStats('error_report_created');
      
      return {
        success: true,
        notificationId: notificationDoc.id,
        message: 'Analysis error reported to administrators for review'
      };
      
    } catch (error) {
      console.error('❌ Failed to report analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Request admin review for a fraud message (button on fraud messages)
   */
  static async requestFraudReview(messageId, messageData, userId, reason = 'User disputes fraud classification') {
    try {
      console.log(`📝 Creating fraud review request for message: ${messageId}`);
      
      // Get current location for mapping context
      let locationData = null;
      try {
        const gpsResult = await LocationService.getGPSLocation();
        if (gpsResult.success) {
          locationData = {
            latitude: gpsResult.location.latitude,
            longitude: gpsResult.location.longitude,
            accuracy: gpsResult.location.accuracy,
            isRealGPS: gpsResult.location.isGPSAccurate,
            source: gpsResult.location.source,
            address: `Location Accuracy: ${gpsResult.location.accuracyLevel}`,
            city: 'Rwanda'
          };
        } else {
          locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
          locationData.isRealGPS = false;
          locationData.source = 'default_location';
        }
      } catch (locationError) {
        console.warn('⚠️ Could not get location for fraud review:', locationError);
        locationData = UserLocationManager.getRwandaRegionCoordinates('kigali');
        locationData.isRealGPS = false;
        locationData.source = 'default_location';
      }
      
      const notification = {
        // User info
        userId: userId,
        userDisplayName: `User ${userId.slice(-6)}`,
        
        // Message details
        messageId: messageId,
        messageText: messageData.text || messageData.content || messageData.body,
        messageFrom: messageData.sender || messageData.address || messageData.from,
        originalStatus: messageData.status,
        confidence: messageData.spamData?.confidence || messageData.confidence || 0,
        
        // Location data for web app map display
        location: {
          coordinates: {
            latitude: locationData?.latitude || -1.9441,
            longitude: locationData?.longitude || 30.0619,
            address: locationData?.address || 'Rwanda',
            city: locationData?.city || 'Unknown',
            accuracy: locationData?.accuracy || null,
            isDefault: locationData?.isRealGPS === false,
            source: locationData?.source || 'mobile_app'
          },
          address: {
            formattedAddress: locationData?.address || `${locationData?.city || 'Unknown'}, Rwanda`
          },
          formattedLocation: locationData?.address || locationData?.city || 'Mobile Device',
          quality: {
            hasRealGPS: locationData?.isRealGPS === true,
            accuracy: locationData?.accuracy || null,
            source: locationData?.source || 'mobile_app'
          }
        },
        
        // Request details
        title: 'Fraud Message Review Request',
        message: `User is requesting review of message classified as fraud: "${(messageData.text || '').substring(0, 100)}..."`,
        description: reason,
        
        // Type and status
        type: 'fraud_review_request',
        priority: 'high',
        status: 'pending',
        
        // Metadata
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString(),
        source: 'mobile_app_fraud_review',
        requiresResponse: true,
        category: 'fraud_verification'
      };
      
      // Save to admin notifications
      const notificationsRef = collection(db, 'adminNotifications');
      const docRef = await addDoc(notificationsRef, notification);
      
      console.log(`✅ Fraud review request created: ${docRef.id}`);
      
      // Mark message as pending review
      await this.updateMessageReviewStatus(messageId, userId, 'pending_review');
      
      // Update dashboard stats
      await this.updateDashboardStats('fraud_review_requested');
      
      return {
        success: true,
        requestId: docRef.id,
        message: 'Review request sent to admin. You will be notified of the decision.'
      };
      
    } catch (error) {
      console.error('❌ Failed to create fraud review request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * User blocks a message themselves (button on fraud messages)
   */
  static async blockMessage(messageId, messageData, userId) {
    try {
      console.log(`🚫 User blocking message: ${messageId}`);
      
      // Update message status to blocked
      await this.updateMessageStatus(messageId, userId, 'blocked');
      
      // Create notification for admin awareness (low priority)
      const notification = {
        userId: userId,
        userDisplayName: `User ${userId.slice(-6)}`,
        
        messageId: messageId,
        messageText: (messageData.text || '').substring(0, 100),
        messageFrom: messageData.sender || messageData.address,
        
        title: 'User Blocked Fraud Message',
        message: `User has blocked a fraud message: "${(messageData.text || '').substring(0, 50)}..."`,
        description: 'User chose to block this message without admin review',
        
        type: 'user_message_block',
        priority: 'low',
        status: 'info',
        
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString(),
        source: 'mobile_app_block',
        requiresResponse: false,
        category: 'user_action'
      };
      
      const notificationsRef = collection(db, 'adminNotifications');
      await addDoc(notificationsRef, notification);
      
      console.log(`✅ Message blocked and admin notified`);
      
      // Update dashboard stats
      await this.updateDashboardStats('message_blocked');
      
      return {
        success: true,
        message: 'Message has been blocked'
      };
      
    } catch (error) {
      console.error('❌ Failed to block message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Update message status in user's collection
   */
  static async updateMessageStatus(messageId, userId, newStatus) {
    try {
      const messageRef = doc(db, 'users', userId, 'messages', messageId);
      await updateDoc(messageRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        lastStatusChange: new Date().toISOString(),
        actionTakenBy: 'user'
      });
      
      console.log(`✅ Message ${messageId} status updated to: ${newStatus}`);
    } catch (error) {
      console.error('❌ Failed to update message status:', error);
      throw error;
    }
  }
  
  /**
   * Update message review status
   */
  static async updateMessageReviewStatus(messageId, userId, reviewStatus) {
    try {
      const messageRef = doc(db, 'users', userId, 'messages', messageId);
      await updateDoc(messageRef, {
        reviewStatus: reviewStatus,
        reviewRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Message ${messageId} review status: ${reviewStatus}`);
    } catch (error) {
      console.error('❌ Failed to update review status:', error);
      throw error;
    }
  }
  
  /**
   * Calculate request priority based on message data and request type
   */
  static calculateRequestPriority(messageData, requestType) {
    // High priority conditions
    if (messageData.status === 'fraud' && requestType === 'mark_as_safe') {
      return 'high'; // User thinks fraud message is safe - needs review
    }
    
    if (messageData.spamData?.confidence > 0.9) {
      return 'high'; // High confidence classification being questioned
    }
    
    if (requestType === 'analysis_error_report') {
      return 'high'; // ML errors are high priority
    }
    
    // Medium priority
    if (messageData.status === 'suspicious') {
      return 'medium';
    }
    
    // Normal priority
    return 'normal';
  }
  
  /**
   * Get correct classification based on error type
   */
  static getCorrectClassification(errorType) {
    switch (errorType) {
      case 'false_positive':
        return 'safe'; // Message classified as fraud/suspicious but is actually safe
      case 'false_negative':
        return 'fraud'; // Message classified as safe but is actually fraud
      case 'incorrect_classification':
        return 'needs_review'; // Classification is wrong but not sure what's correct
      default:
        return 'unknown';
    }
  }
  
  /**
   * Update dashboard statistics for admin requests
   */
  static async updateDashboardStats(action) {
    try {
      const dashboardRef = doc(db, 'dashboard', 'stats');
      const today = new Date().toISOString().split('T')[0];
      
      const updateData = {
        lastUpdated: serverTimestamp()
      };
      
      switch (action) {
        case 'request_created':
          updateData.pendingAdminReviews = increment(1);
          updateData.totalUserRequests = increment(1);
          updateData[`daily_${today}.userRequests`] = increment(1);
          break;
          
        case 'fraud_review_requested':
          updateData.pendingFraudReviews = increment(1);
          updateData.totalFraudReviews = increment(1);
          updateData[`daily_${today}.fraudReviews`] = increment(1);
          break;
          
        case 'message_blocked':
          updateData.userBlockedMessages = increment(1);
          updateData.totalBlockedMessages = increment(1);
          updateData[`daily_${today}.blockedMessages`] = increment(1);
          break;
          
        case 'support_request_created':
          updateData.pendingSupportRequests = increment(1);
          updateData.totalSupportRequests = increment(1);
          updateData[`daily_${today}.supportRequests`] = increment(1);
          break;
          
        case 'error_report_created':
          updateData.pendingErrorReports = increment(1);
          updateData.totalErrorReports = increment(1);
          updateData[`daily_${today}.errorReports`] = increment(1);
          break;
      }
      
      updateData[`daily_${today}.date`] = today;
      
      await updateDoc(dashboardRef, updateData);
      console.log(`📊 Dashboard stats updated for action: ${action}`);
      
    } catch (error) {
      console.warn('⚠️ Failed to update dashboard stats:', error);
    }
  }
}

export default MobileAdminRequestManager;
