/**
 * Simple Incremental Scan Implementation
 * 
 * This solves the 176 vs 139 discrepancy by only analyzing NEW messages
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class SimpleIncrementalScanner {
  
  static LAST_SCAN_KEY = 'lastScanTimestamp';
  
  /**
   * Get the timestamp of the last scan
   */
  static async getLastScanTimestamp(userId) {
    try {
      const timestamp = await AsyncStorage.getItem(`${this.LAST_SCAN_KEY}_${userId}`);
      return timestamp ? parseInt(timestamp) : null;
    } catch (error) {
      console.error('Error getting last scan timestamp:', error);
      return null;
    }
  }
  
  /**
   * Update the last scan timestamp
   */
  static async updateLastScanTimestamp(userId, timestamp = Date.now()) {
    try {
      await AsyncStorage.setItem(`${this.LAST_SCAN_KEY}_${userId}`, timestamp.toString());
      console.log(`✅ Updated last scan timestamp: ${new Date(timestamp).toISOString()}`);
    } catch (error) {
      console.error('Error updating last scan timestamp:', error);
    }
  }
  
  /**
   * Filter messages to only include NEW ones since last scan
   * Now includes automatic detection of recreated accounts
   */
  static async filterNewMessages(userId, allMessages, userFirestoreData = null) {
    try {
      // Safety checks
      if (!userId) {
        throw new Error('userId is required for incremental scanning');
      }
      
      if (!allMessages || !Array.isArray(allMessages)) {
        console.warn('⚠️ Invalid allMessages array provided, using empty array');
        allMessages = [];
      }
      
      // Check if account was recreated and reset scan history if needed
      if (userFirestoreData) {
        const wasReset = await this.checkAndResetForRecreatedAccount(userId, userFirestoreData);
        if (wasReset) {
          console.log('🆕 Account recreated - treating as first scan');
          return {
            messagesToAnalyze: allMessages,
            isFirstScan: true,
            accountRecreated: true,
            summary: `Account recreated - analyzing all ${allMessages.length} messages`
          };
        }
      }
      
      const lastScanTimestamp = await this.getLastScanTimestamp(userId);
      
      if (!lastScanTimestamp) {
        // First scan - analyze all messages
        console.log(`🆕 FIRST SCAN: Will analyze all ${allMessages.length} messages`);
        return {
          messagesToAnalyze: allMessages,
          isFirstScan: true,
          summary: `First scan - analyzing all ${allMessages.length} messages`
        };
      }
      
      // Filter for messages newer than last scan
      const newMessages = allMessages.filter(message => {
        const messageTimestamp = new Date(message.date || message.timestamp).getTime();
        return messageTimestamp > lastScanTimestamp;
      });
      
      console.log(`🔄 INCREMENTAL SCAN: Found ${newMessages.length} new messages since ${new Date(lastScanTimestamp).toISOString()}`);
      
      return {
        messagesToAnalyze: newMessages,
        isFirstScan: false,
        summary: `Incremental scan - ${newMessages.length} new messages since last scan`,
        lastScanDate: new Date(lastScanTimestamp)
      };
      
    } catch (error) {
      console.error('Error filtering new messages:', error);
      // Fallback to analyzing all messages
      return {
        messagesToAnalyze: allMessages,
        isFirstScan: true,
        summary: `Error fallback - analyzing all ${allMessages.length} messages`,
        error: error.message
      };
    }
  }
  
  /**
   * Complete the scan and update timestamp
   */
  static async completeScan(userId, analyzedCount) {
    try {
      const now = Date.now();
      await this.updateLastScanTimestamp(userId, now);
      
      console.log(`✅ Scan completed: ${analyzedCount} messages analyzed`);
      console.log(`📅 Next scan will only analyze messages newer than ${new Date(now).toISOString()}`);
      
      return {
        success: true,
        analyzedCount,
        completedAt: new Date(now).toISOString()
      };
    } catch (error) {
      console.error('Error completing scan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Reset scan history (useful for testing or account recreation)
   */
  static async resetScanHistory(userId) {
    try {
      await AsyncStorage.removeItem(`${this.LAST_SCAN_KEY}_${userId}`);
      console.log('🔄 Scan history reset - next scan will be treated as first scan');
    } catch (error) {
      console.error('Error resetting scan history:', error);
    }
  }

  /**
   * Check if scan history should be reset based on Firestore account status
   * Call this before filtering messages to detect recreated accounts
   */
  static async checkAndResetForRecreatedAccount(userId, userFirestoreData) {
    try {
      const lastScanTimestamp = await this.getLastScanTimestamp(userId);
      
      if (!lastScanTimestamp || !userFirestoreData) {
        return false; // No local scan history or no Firestore data
      }
      
      // Get Firestore account creation date
      const firestoreCreatedAt = userFirestoreData.createdAt?.toDate?.() || userFirestoreData.createdAt;
      
      if (!firestoreCreatedAt) {
        return false; // No creation date in Firestore
      }
      
      const firestoreCreatedTimestamp = new Date(firestoreCreatedAt).getTime();
      
      // If Firestore account was created AFTER our last scan, it means account was recreated
      if (firestoreCreatedTimestamp > lastScanTimestamp) {
        console.log('🔄 Detected recreated Firestore account - resetting scan history');
        console.log(`📅 Local last scan: ${new Date(lastScanTimestamp).toISOString()}`);
        console.log(`📅 Firestore created: ${new Date(firestoreCreatedTimestamp).toISOString()}`);
        
        await this.resetScanHistory(userId);
        return true; // History was reset
      }
      
      return false; // No reset needed
      
    } catch (error) {
      console.error('Error checking for recreated account:', error);
      return false;
    }
  }
}

export default SimpleIncrementalScanner;
