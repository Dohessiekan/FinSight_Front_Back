/**
 * AdminMessageManager - Comprehensive admin message status management for Web Dashboard
 * Handles admin actions to change message status between fraud and safe
 * with complete system-wide updates
 */

import { 
  doc, 
  getDoc,
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class AdminMessageManager {
  
  /**
   * Admin marks a fraud message as safe
   * @param {string} messageId - The message ID
   * @param {string} userId - The user ID who owns the message
   * @param {string} adminEmail - Admin performing the action
   * @param {string} reason - Reason for marking as safe
   */
  static async markFraudAsSafe(messageId, userId, adminEmail, reason = 'Admin verified message as legitimate') {
    console.log(`🔒 Admin ${adminEmail} marking fraud message ${messageId} as safe for user ${userId}`);
    
    try {
      // Step 1: Check if message exists in user's messages collection, handle both locations
      let messageInUserCollection = false;
      let messageInFraudAlerts = false;
      
      try {
        const messageRef = doc(db, 'users', userId, 'messages', messageId);
        const messageDoc = await getDoc(messageRef);
        
        if (messageDoc.exists()) {
          messageInUserCollection = true;
          console.log(`✅ Message ${messageId} found in user's messages collection`);
          
          // Update message status in user's collection
          await updateDoc(messageRef, {
            status: 'safe',
            previousStatus: 'fraud',
            adminReview: {
              reviewedBy: 'admin',
              adminEmail: adminEmail,
              action: 'fraud_to_safe',
              timestamp: serverTimestamp(),
              reason: reason,
              actionType: 'status_change'
            },
            updatedAt: serverTimestamp(),
            adminVerified: true
          });
          console.log('✅ Message status updated from fraud to safe in user collection');
        } else {
          console.log(`❌ Message ${messageId} not found in user's messages collection`);
        }
      } catch (userMessageError) {
        console.warn('⚠️ Failed to check/update user message collection:', userMessageError);
      }

      // Step 1b: Check and update fraud_alerts collection (handles legacy manual messages)
      try {
        const fraudAlertsRef = collection(db, 'fraud_alerts');
        const alertQuery = query(
          fraudAlertsRef, 
          where('messageId', '==', messageId),
          where('userId', '==', userId)
        );
        const alertSnapshot = await getDocs(alertQuery);
        
        if (!alertSnapshot.empty) {
          messageInFraudAlerts = true;
          console.log(`✅ Message ${messageId} found in fraudAlerts collection`);
          
          for (const alertDoc of alertSnapshot.docs) {
            // Update fraud alert with admin resolution
            await updateDoc(alertDoc.ref, {
              status: 'admin_resolved',
              resolvedAs: 'safe', // Mark that admin resolved this as safe
              adminAction: {
                action: 'marked_safe',
                adminEmail: adminEmail,
                timestamp: serverTimestamp(),
                reason: reason,
                originalStatus: 'fraud'
              },
              resolvedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          console.log(`✅ Updated ${alertSnapshot.docs.length} fraud alerts to admin_resolved (marked as safe)`);
        } else {
          console.log(`❌ Message ${messageId} not found in fraudAlerts collection either`);
        }
      } catch (fraudAlertError) {
        console.error('❌ Failed to check/update fraud alerts:', fraudAlertError);
      }

      // Verify that we found the message somewhere
      if (!messageInUserCollection && !messageInFraudAlerts) {
        throw new Error(`Message ${messageId} not found in either user messages or fraud alerts collections`);
      }

      console.log(`📍 Message ${messageId} found in: ${messageInUserCollection ? 'user messages' : ''}${messageInUserCollection && messageInFraudAlerts ? ' and ' : ''}${messageInFraudAlerts ? 'fraud alerts' : ''}`);

      // Step 2: Remove from fraud alerts collection (this is now redundant since we handle it above, but kept for any edge cases)
      try {
        const fraudAlertsRef = collection(db, 'fraud_alerts');
        const alertQuery = query(
          fraudAlertsRef, 
          where('messageId', '==', messageId),
          where('userId', '==', userId)
        );
        const alertSnapshot = await getDocs(alertQuery);
        
        for (const alertDoc of alertSnapshot.docs) {
          // Instead of deleting, mark as resolved by admin
          await updateDoc(alertDoc.ref, {
            status: 'admin_resolved',
            adminAction: {
              action: 'marked_safe',
              adminEmail: adminEmail,
              timestamp: serverTimestamp(),
              reason: reason,
              originalStatus: 'fraud'
            },
            resolvedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        console.log(`✅ Updated ${alertSnapshot.docs.length} fraud alerts to admin_resolved`);
      } catch (alertError) {
        console.error('❌ Failed to update fraud alerts:', alertError);
      }

      // Step 3: Update dashboard statistics
      try {
        const dashboardRef = doc(db, 'dashboard', 'stats');
        const today = new Date().toISOString().split('T')[0];
        
        await updateDoc(dashboardRef, {
          activeFraudAlerts: increment(-1), // Reduce fraud count
          adminResolvedFraud: increment(1), // Track admin resolutions
          totalSafeMessages: increment(1), // Increase safe count
          lastAdminAction: {
            action: 'fraud_to_safe',
            adminEmail: adminEmail,
            messageId: messageId,
            userId: userId,
            timestamp: serverTimestamp()
          },
          lastUpdated: serverTimestamp(),
          [`daily_${today}.adminActions`]: increment(1),
          [`daily_${today}.fraudToSafe`]: increment(1)
        });
        console.log('✅ Dashboard statistics updated for fraud to safe');
      } catch (dashboardError) {
        console.error('❌ Failed to update dashboard stats:', dashboardError);
      }

      // Step 4: Update location statistics if location data exists
      try {
        const locationStatsRef = collection(db, 'locationStats');
        const locationQuery = query(
          locationStatsRef,
          where('userId', '==', userId)
        );
        const locationSnapshot = await getDocs(locationQuery);
        
        for (const locationDoc of locationSnapshot.docs) {
          await updateDoc(locationDoc.ref, {
            fraudCount: increment(-1),
            safeCount: increment(1),
            adminActions: increment(1),
            lastAdminAction: {
              action: 'fraud_to_safe',
              adminEmail: adminEmail,
              timestamp: serverTimestamp()
            },
            updatedAt: serverTimestamp()
          });
        }
        console.log('✅ Location statistics updated');
      } catch (locationError) {
        console.error('❌ Failed to update location stats:', locationError);
      }

      // Step 5: Update user's security score (marking fraud as safe improves score)
      try {
        const userStatsRef = doc(db, 'user_statistics', userId);
        await updateDoc(userStatsRef, {
          securityScore: increment(15), // Positive adjustment for false positive correction
          adminActions: increment(1),
          adminScoreAdjustments: increment(15),
          lastAdminAction: {
            action: 'admin_fraud_to_safe',
            adminEmail: adminEmail,
            messageId: messageId,
            scoreImpact: 15,
            timestamp: serverTimestamp()
          },
          lastUpdated: serverTimestamp()
        });
        
        // Also update main user document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          securityScore: increment(15),
          lastSecurityUpdate: serverTimestamp(),
          lastAdminReview: {
            adminEmail: adminEmail,
            action: 'fraud_to_safe',
            timestamp: serverTimestamp(),
            scoreImpact: 15
          }
        });
        
        console.log('✅ Security score updated after admin action');
      } catch (scoreError) {
        console.error('❌ Failed to update security score:', scoreError);
      }

      // Step 6: Create admin action log
      try {
        const adminActionsRef = collection(db, 'adminActions');
        await addDoc(adminActionsRef, {
          action: 'mark_fraud_as_safe',
          adminEmail: adminEmail,
          messageId: messageId,
          userId: userId,
          details: {
            previousStatus: 'fraud',
            newStatus: 'safe',
            reason: reason,
            impactedSystems: ['messages', 'fraudAlerts', 'dashboard', 'locationStats', 'securityScore']
          },
          timestamp: serverTimestamp(),
          metadata: {
            source: 'admin_dashboard',
            version: '1.0'
          }
        });
        console.log('✅ Admin action logged');
      } catch (logError) {
        console.error('❌ Failed to log admin action:', logError);
      }

      return {
        success: true,
        message: 'Fraud message successfully marked as safe',
        details: {
          messageId,
          userId,
          adminEmail,
          action: 'fraud_to_safe',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Failed to mark fraud as safe:', error);
      return {
        success: false,
        error: error.message,
        action: 'fraud_to_safe'
      };
    }
  }

  /**
   * Admin marks a safe message as fraud
   * @param {string} messageId - The message ID
   * @param {string} userId - The user ID who owns the message
   * @param {string} adminEmail - Admin performing the action
   * @param {string} reason - Reason for marking as fraud
   */
  static async markSafeAsFraud(messageId, userId, adminEmail, reason = 'Admin identified message as fraudulent') {
    console.log(`🚨 Admin ${adminEmail} marking safe message ${messageId} as fraud for user ${userId}`);
    
    try {
      // Step 1: Check if message exists in user's messages collection, handle both locations
      let messageInUserCollection = false;
      let messageData = null;
      
      try {
        const messageRef = doc(db, 'users', userId, 'messages', messageId);
        const messageDoc = await getDoc(messageRef);
        
        if (messageDoc.exists()) {
          messageInUserCollection = true;
          messageData = messageDoc.data();
          console.log(`✅ Message ${messageId} found in user's messages collection`);
          
          // Update message status in user's collection
          await updateDoc(messageRef, {
            status: 'fraud',
            previousStatus: 'safe',
            adminReview: {
              reviewedBy: 'admin',
              adminEmail: adminEmail,
              action: 'safe_to_fraud',
              timestamp: serverTimestamp(),
              reason: reason,
              actionType: 'status_change'
            },
            updatedAt: serverTimestamp(),
            adminVerified: true,
            adminFlagged: true
          });
          console.log('✅ Message status updated from safe to fraud in user collection');
        } else {
          console.log(`❌ Message ${messageId} not found in user's messages collection`);
          // For markSafeAsFraud, if message doesn't exist in user collection, we might need to create it
          // This is less common than the markFraudAsSafe case, but let's handle it
        }
      } catch (userMessageError) {
        console.warn('⚠️ Failed to check/update user message collection:', userMessageError);
      }

      // Step 1b: For this action, we primarily work with user messages, but we should also check
      // if there are related entries in fraud_alerts that need updating
      try {
        const fraudAlertsRef = collection(db, 'fraud_alerts');
        const alertQuery = query(
          fraudAlertsRef, 
          where('messageId', '==', messageId),
          where('userId', '==', userId)
        );
        const alertSnapshot = await getDocs(alertQuery);
        
        if (!alertSnapshot.empty) {
          console.log(`✅ Found existing fraud alerts for message ${messageId}, updating them`);
          
          for (const alertDoc of alertSnapshot.docs) {
            // Update existing fraud alert to mark it as admin-verified fraud
            await updateDoc(alertDoc.ref, {
              status: 'active',
              adminVerified: true,
              adminAction: {
                action: 'confirmed_fraud',
                adminEmail: adminEmail,
                timestamp: serverTimestamp(),
                reason: reason,
                actionType: 'admin_status_change'
              },
              updatedAt: serverTimestamp()
            });
          }
          console.log(`✅ Updated ${alertSnapshot.docs.length} existing fraud alerts with admin confirmation`);
        }
      } catch (fraudAlertError) {
        console.warn('⚠️ Failed to check existing fraud alerts:', fraudAlertError);
      }

      // If we couldn't find the message in user collection, we need to handle this case
      if (!messageInUserCollection) {
        console.log(`⚠️ Message ${messageId} not found in user's messages collection - this might be a legacy or external reference`);
        // We can still proceed with creating fraud alert and notifications
      }

      // Step 2: Create new fraud alert
      try {
        const fraudAlertsRef = collection(db, 'fraud_alerts');
        await addDoc(fraudAlertsRef, {
          messageId: messageId,
          userId: userId,
          message: '', // Will be populated from message data
          sender: '', // Will be populated from message data
          status: 'active',
          priority: 'high',
          adminCreated: true,
          adminDetails: {
            createdBy: adminEmail,
            reason: reason,
            timestamp: serverTimestamp(),
            source: 'admin_review'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ New fraud alert created by admin');
      } catch (alertError) {
        console.error('❌ Failed to create fraud alert:', alertError);
      }

      // Step 3: Update dashboard statistics
      try {
        const dashboardRef = doc(db, 'dashboard', 'stats');
        const today = new Date().toISOString().split('T')[0];
        
        await updateDoc(dashboardRef, {
          activeFraudAlerts: increment(1), // Increase fraud count
          adminCreatedFraud: increment(1), // Track admin-created fraud
          totalSafeMessages: increment(-1), // Decrease safe count
          lastAdminAction: {
            action: 'safe_to_fraud',
            adminEmail: adminEmail,
            messageId: messageId,
            userId: userId,
            timestamp: serverTimestamp()
          },
          lastUpdated: serverTimestamp(),
          [`daily_${today}.adminActions`]: increment(1),
          [`daily_${today}.safeToFraud`]: increment(1)
        });
        console.log('✅ Dashboard statistics updated for safe to fraud');
      } catch (dashboardError) {
        console.error('❌ Failed to update dashboard stats:', dashboardError);
      }

      // Step 4: Update location statistics
      try {
        const locationStatsRef = collection(db, 'locationStats');
        const locationQuery = query(
          locationStatsRef,
          where('userId', '==', userId)
        );
        const locationSnapshot = await getDocs(locationQuery);
        
        for (const locationDoc of locationSnapshot.docs) {
          await updateDoc(locationDoc.ref, {
            fraudCount: increment(1),
            safeCount: increment(-1),
            adminActions: increment(1),
            lastAdminAction: {
              action: 'safe_to_fraud',
              adminEmail: adminEmail,
              timestamp: serverTimestamp()
            },
            updatedAt: serverTimestamp()
          });
        }
        console.log('✅ Location statistics updated');
      } catch (locationError) {
        console.error('❌ Failed to update location stats:', locationError);
      }

      // Step 5: Update user's security score (marking safe as fraud decreases score)
      try {
        const userStatsRef = doc(db, 'user_statistics', userId);
        await updateDoc(userStatsRef, {
          securityScore: increment(-10), // Negative adjustment for detection gap
          adminActions: increment(1),
          adminScoreAdjustments: increment(-10),
          lastAdminAction: {
            action: 'admin_safe_to_fraud',
            adminEmail: adminEmail,
            messageId: messageId,
            scoreImpact: -10,
            timestamp: serverTimestamp()
          },
          lastUpdated: serverTimestamp()
        });
        
        // Also update main user document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          securityScore: increment(-10),
          lastSecurityUpdate: serverTimestamp(),
          lastAdminReview: {
            adminEmail: adminEmail,
            action: 'safe_to_fraud',
            timestamp: serverTimestamp(),
            scoreImpact: -10
          }
        });
        
        console.log('✅ Security score updated after admin action');
      } catch (scoreError) {
        console.error('❌ Failed to update security score:', scoreError);
      }

      // Step 6: Create admin action log
      try {
        const adminActionsRef = collection(db, 'adminActions');
        await addDoc(adminActionsRef, {
          action: 'mark_safe_as_fraud',
          adminEmail: adminEmail,
          messageId: messageId,
          userId: userId,
          details: {
            previousStatus: 'safe',
            newStatus: 'fraud',
            reason: reason,
            impactedSystems: ['messages', 'fraudAlerts', 'dashboard', 'locationStats', 'securityScore']
          },
          timestamp: serverTimestamp(),
          metadata: {
            source: 'admin_dashboard',
            version: '1.0'
          }
        });
        console.log('✅ Admin action logged');
      } catch (logError) {
        console.error('❌ Failed to log admin action:', logError);
      }

      return {
        success: true,
        message: 'Safe message successfully marked as fraud',
        details: {
          messageId,
          userId,
          adminEmail,
          action: 'safe_to_fraud',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Failed to mark safe as fraud:', error);
      return {
        success: false,
        error: error.message,
        action: 'safe_to_fraud'
      };
    }
  }

  /**
   * Get admin action history for a specific message
   * @param {string} messageId - The message ID
   * @param {string} userId - The user ID
   */
  static async getMessageAdminHistory(messageId, userId) {
    try {
      const adminActionsRef = collection(db, 'adminActions');
      const historyQuery = query(
        adminActionsRef,
        where('messageId', '==', messageId),
        where('userId', '==', userId)
      );
      
      const historySnapshot = await getDocs(historyQuery);
      const history = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));
      
      return {
        success: true,
        history: history.sort((a, b) => b.timestamp - a.timestamp)
      };
      
    } catch (error) {
      console.error('❌ Failed to get admin history:', error);
      return {
        success: false,
        error: error.message,
        history: []
      };
    }
  }

  /**
   * Bulk admin action on multiple messages
   * @param {Array} messageActions - Array of {messageId, userId, action, reason}
   * @param {string} adminEmail - Admin performing the actions
   */
  static async bulkUpdateMessages(messageActions, adminEmail) {
    console.log(`🔄 Admin ${adminEmail} performing bulk update on ${messageActions.length} messages`);
    
    const results = {
      successful: [],
      failed: [],
      summary: {
        total: messageActions.length,
        successful: 0,
        failed: 0
      }
    };

    for (const action of messageActions) {
      try {
        let result;
        
        if (action.action === 'fraud_to_safe') {
          result = await this.markFraudAsSafe(
            action.messageId, 
            action.userId, 
            adminEmail, 
            action.reason
          );
        } else if (action.action === 'safe_to_fraud') {
          result = await this.markSafeAsFraud(
            action.messageId, 
            action.userId, 
            adminEmail, 
            action.reason
          );
        }

        if (result.success) {
          results.successful.push({ ...action, result });
          results.summary.successful++;
        } else {
          results.failed.push({ ...action, error: result.error });
          results.summary.failed++;
        }

      } catch (error) {
        results.failed.push({ ...action, error: error.message });
        results.summary.failed++;
      }
    }

    console.log(`✅ Bulk update completed: ${results.summary.successful} successful, ${results.summary.failed} failed`);
    return results;
  }
}

export default AdminMessageManager;
