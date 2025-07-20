/**
 * Global Duplicate Detection System
 * 
 * Prevents the same SMS message from being saved multiple times
 * even when different users scan the same device
 */

import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class GlobalDuplicateDetector {
  
  /**
   * Create a global unique identifier for a message
   * This combines content, sender, and timing to create a device-agnostic ID
   */
  static createGlobalMessageId(message) {
    const text = (message.text || '').trim();
    const sender = message.sender || message.address || 'unknown';
    const date = message.date || message.timestamp || '';
    
    // Create a hash-like ID from content
    const contentKey = `${text}-${sender}-${date}`.toLowerCase();
    
    // Simple hash function for consistent IDs
    let hash = 0;
    for (let i = 0; i < contentKey.length; i++) {
      const char = contentKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `msg_${Math.abs(hash)}_${text.length}`;
  }
  
  /**
   * Check if a message already exists globally across all users
   */
  static async checkGlobalDuplicate(message) {
    try {
      const globalId = this.createGlobalMessageId(message);
      
      // Check in global messages collection
      const globalMessagesRef = collection(db, 'global_messages');
      const globalDoc = doc(globalMessagesRef, globalId);
      
      const globalSnapshot = await getDocs(query(
        globalMessagesRef,
        where('globalId', '==', globalId)
      ));
      
      if (!globalSnapshot.empty) {
        const existingData = globalSnapshot.docs[0].data();
        console.log(`🔍 Global duplicate found: ${globalId}`);
        console.log(`📅 Originally saved: ${existingData.firstSavedAt}`);
        console.log(`👤 Original user: ${existingData.firstUserId}`);
        
        return {
          isDuplicate: true,
          globalId,
          originalData: existingData,
          existingDocId: globalSnapshot.docs[0].id
        };
      }
      
      return {
        isDuplicate: false,
        globalId,
        originalData: null
      };
      
    } catch (error) {
      console.error('❌ Error checking global duplicate:', error);
      // If global check fails, allow the message (fail-open approach)
      return {
        isDuplicate: false,
        globalId: null,
        error: error.message
      };
    }
  }
  
  /**
   * Register a message in the global registry to prevent future duplicates
   */
  static async registerGlobalMessage(message, userId) {
    try {
      const globalId = this.createGlobalMessageId(message);
      
      const globalData = {
        globalId,
        messageText: (message.text || '').substring(0, 200), // First 200 chars for reference
        sender: message.sender || message.address || 'unknown',
        originalDate: message.date || message.timestamp || new Date().toISOString(),
        firstUserId: userId,
        firstSavedAt: new Date().toISOString(),
        usersWhoScanned: [userId],
        scanCount: 1,
        deviceFingerprint: await this.getDeviceFingerprint(),
        contentHash: this.simpleHash(message.text || ''),
        registered: true
      };
      
      const globalMessagesRef = collection(db, 'global_messages');
      const globalDocRef = doc(globalMessagesRef, globalId);
      
      await setDoc(globalDocRef, globalData);
      
      console.log(`✅ Registered global message: ${globalId}`);
      return { success: true, globalId };
      
    } catch (error) {
      console.error('❌ Error registering global message:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update global registry when another user tries to scan the same message
   */
  static async updateGlobalMessage(globalId, userId) {
    try {
      const globalMessagesRef = collection(db, 'global_messages');
      const globalDocRef = doc(globalMessagesRef, globalId);
      
      // For now, just log the attempt - we could update usersWhoScanned array
      console.log(`📝 User ${userId} attempted to scan already registered message ${globalId}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating global message:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Simple hash function for content verification
   */
  static simpleHash(text) {
    let hash = 0;
    if (!text) return hash;
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
  
  /**
   * Get basic device fingerprint for tracking
   */
  static async getDeviceFingerprint() {
    try {
      // Simple device fingerprint - could be enhanced with react-native-device-info
      const timestamp = new Date().toISOString();
      return `device_${timestamp.substring(0, 10)}`; // Date-based for now
    } catch (error) {
      return 'unknown_device';
    }
  }
  
  /**
   * Enhanced message saving with global duplicate detection
   */
  static async saveMessageWithGlobalCheck(message, userId, saveToUserCollection) {
    try {
      // Step 1: Check for global duplicates
      const duplicateCheck = await this.checkGlobalDuplicate(message);
      
      if (duplicateCheck.isDuplicate) {
        // Update global registry to track this user attempted to scan
        await this.updateGlobalMessage(duplicateCheck.globalId, userId);
        
        console.log(`⚠️ Skipping duplicate message for user ${userId}`);
        return {
          success: true,
          skipped: true,
          reason: 'global_duplicate',
          globalId: duplicateCheck.globalId,
          originalUser: duplicateCheck.originalData?.firstUserId
        };
      }
      
      // Step 2: Save to user's collection
      const saveResult = await saveToUserCollection(message);
      
      if (saveResult.success && !saveResult.exists) {
        // Step 3: Register in global registry
        await this.registerGlobalMessage(message, userId);
      }
      
      return {
        ...saveResult,
        globalId: duplicateCheck.globalId
      };
      
    } catch (error) {
      console.error('❌ Enhanced save failed:', error);
      // Fallback to original save method
      return await saveToUserCollection(message);
    }
  }
}

export default GlobalDuplicateDetector;
