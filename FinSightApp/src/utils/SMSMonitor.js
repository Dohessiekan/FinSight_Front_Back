// SMS Monitor with Push Notification Integration
import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationManager from './NotificationManager';

class SMSMonitor {
  constructor() {
    this.isMonitoring = false;
    this.smsListener = null;
    this.userId = null;
    this.lastProcessedSMSId = null;
    this.pendingAnalysisCount = 0;
    this.updateCountCallback = null;
    
    // Transaction-related keywords
    this.transactionKeywords = [
      'transaction', 'payment', 'transfer', 'debit', 'credit',
      'withdrawal', 'deposit', 'balance', 'account', 'bank',
      'charged', 'paid', 'received', 'sent', 'amount',
      'rs', 'inr', '₹', '$', 'usd', 'debited', 'credited',
      'otp', 'verification', 'confirm', 'merchant',
      'atm', 'pos', 'online', 'mobile', 'banking'
    ];
    
    // Financial institutions and services
    this.financialSenders = [
      'bank', 'hdfc', 'icici', 'sbi', 'axis', 'kotak',
      'paytm', 'googlepay', 'phonepe', 'upi', 'bhim',
      'razorpay', 'stripe', 'paypal', 'amazon', 'flipkart',
      'swiggy', 'zomato', 'uber', 'ola', 'irctc'
    ];
  }

  /**
   * Start monitoring SMS for transaction messages
   */
  async startMonitoring(userId, onCountUpdate = null) {
    if (!userId) {
      console.error('❌ Cannot start SMS monitoring without userId');
      return false;
    }

    if (Platform.OS !== 'android') {
      console.warn('⚠️ SMS monitoring is only available on Android');
      return false;
    }

    this.userId = userId;
    this.updateCountCallback = onCountUpdate;
    
    try {
      console.log('📱 Starting SMS monitoring for transaction messages...');
      
      // Initialize notification manager
      await NotificationManager.initialize(userId);
      
      // Load the last processed SMS ID
      const lastId = await AsyncStorage.getItem(`lastProcessedSMS_${userId}`);
      this.lastProcessedSMSId = lastId ? parseInt(lastId) : null;
      
      // Load pending count
      const pendingCount = await AsyncStorage.getItem(`pendingAnalysisCount_${userId}`);
      this.pendingAnalysisCount = pendingCount ? parseInt(pendingCount) : 0;
      
      this.isMonitoring = true;
      
      // Set up SMS listener for new messages
      this.setupSMSListener();
      
      // Check for recent unprocessed messages
      await this.checkForRecentUnprocessedSMS();
      
      // Notify callback of current count
      if (this.updateCountCallback) {
        this.updateCountCallback(this.pendingAnalysisCount);
      }
      
      console.log('✅ SMS monitoring started successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error starting SMS monitoring:', error);
      return false;
    }
  }

  /**
   * Stop SMS monitoring
   */
  stopMonitoring() {
    console.log('🛑 Stopping SMS monitoring...');
    this.isMonitoring = false;
    
    if (this.smsListener) {
      this.smsListener.remove();
      this.smsListener = null;
    }
    
    this.userId = null;
    this.updateCountCallback = null;
  }

  /**
   * Set up SMS listener for incoming messages
   */
  setupSMSListener() {
    if (Platform.OS !== 'android') return;

    // Listen for new SMS messages
    this.smsListener = DeviceEventEmitter.addListener('onSMSReceived', (message) => {
      if (this.isMonitoring) {
        this.processIncomingSMS(message);
      }
    });
    
    console.log('📱 SMS listener set up');
  }

  /**
   * Check if SMS is transaction-related
   */
  isTransactionRelatedSMS(smsBody, sender) {
    const bodyLower = smsBody.toLowerCase();
    const senderLower = sender.toLowerCase();
    
    // Check if sender is a known financial institution
    const isFinancialSender = this.financialSenders.some(institution => 
      senderLower.includes(institution)
    );
    
    // Check if message contains transaction keywords
    const hasTransactionKeywords = this.transactionKeywords.some(keyword => 
      bodyLower.includes(keyword)
    );
    
    // Check for amount patterns
    const hasAmountPattern = /(\₹|rs\.?|inr)\s*\d+|(\d+)\s*(\₹|rs\.?|inr)/i.test(smsBody);
    const hasAccountPattern = /account.*\d{4,}|\d{4,}.*account/i.test(smsBody);
    
    return isFinancialSender || hasTransactionKeywords || hasAmountPattern || hasAccountPattern;
  }

  /**
   * Process incoming SMS message
   */
  async processIncomingSMS(sms) {
    try {
      const { body, address: sender, date, _id } = sms;
      
      // Skip if already processed
      if (_id && this.lastProcessedSMSId && _id <= this.lastProcessedSMSId) {
        return;
      }
      
      // Check if transaction-related
      if (!this.isTransactionRelatedSMS(body, sender)) {
        return;
      }
      
      console.log('📱 New transaction SMS detected:', {
        sender,
        preview: body.substring(0, 50) + '...',
        timestamp: new Date(date).toISOString()
      });
      
      // Create SMS details for notification
      const smsDetails = {
        id: _id,
        sender,
        body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
        timestamp: new Date(date),
        analyzed: false
      };
      
      // Send push notification
      await NotificationManager.notifyNewTransactionSMS(smsDetails);
      
      // Update pending count
      this.pendingAnalysisCount++;
      await this.savePendingCount();
      
      // Update last processed SMS ID
      this.lastProcessedSMSId = _id;
      await AsyncStorage.setItem(`lastProcessedSMS_${this.userId}`, _id.toString());
      
      // Notify callback of updated count
      if (this.updateCountCallback) {
        this.updateCountCallback(this.pendingAnalysisCount);
      }
      
      // Schedule reminder if many pending
      if (this.pendingAnalysisCount >= 3) {
        await NotificationManager.notifyAnalysisReminder(this.pendingAnalysisCount);
      }
      
    } catch (error) {
      console.error('❌ Error processing incoming SMS:', error);
    }
  }

  /**
   * Check for recent unprocessed SMS messages
   */
  async checkForRecentUnprocessedSMS() {
    try {
      // Import SMS service dynamically (it's already an instance)
      const smsService = (await import('../services/SMSService')).default;
      
      // Check permissions
      const hasPermissions = await smsService.checkSMSPermissions();
      if (!hasPermissions) {
        console.log('⚠️ No SMS permissions for checking recent messages');
        return;
      }
      
      // Get SMS from last 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentMessages = await smsService.getAllSMS({
        minDate: oneDayAgo,
        maxCount: 50
      });
      
      let unprocessedCount = 0;
      
      for (const sms of recentMessages) {
        // Skip if already processed
        if (this.lastProcessedSMSId && sms._id <= this.lastProcessedSMSId) {
          continue;
        }
        
        // Check if transaction-related
        if (this.isTransactionRelatedSMS(sms.body, sms.address)) {
          unprocessedCount++;
        }
      }
      
      if (unprocessedCount > 0) {
        console.log(`📊 Found ${unprocessedCount} unprocessed transaction messages`);
        this.pendingAnalysisCount += unprocessedCount;
        await this.savePendingCount();
        
        // Notify about pending messages
        if (unprocessedCount >= 2) {
          await NotificationManager.notifyAnalysisReminder(this.pendingAnalysisCount);
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking recent SMS:', error);
    }
  }

  /**
   * Save pending count to storage
   */
  async savePendingCount() {
    try {
      await AsyncStorage.setItem(
        `pendingAnalysisCount_${this.userId}`, 
        this.pendingAnalysisCount.toString()
      );
    } catch (error) {
      console.error('❌ Error saving pending count:', error);
    }
  }

  /**
   * Mark messages as analyzed
   */
  async markMessagesAsAnalyzed(analyzedCount = null) {
    const countToReduce = analyzedCount || this.pendingAnalysisCount;
    this.pendingAnalysisCount = Math.max(0, this.pendingAnalysisCount - countToReduce);
    await this.savePendingCount();
    
    // Notify callback of updated count
    if (this.updateCountCallback) {
      this.updateCountCallback(this.pendingAnalysisCount);
    }
    
    console.log(`✅ Marked ${countToReduce} messages as analyzed. Pending: ${this.pendingAnalysisCount}`);
  }

  /**
   * Get current pending analysis count
   */
  getPendingAnalysisCount() {
    return this.pendingAnalysisCount;
  }

  /**
   * Send test SMS notification
   */
  async sendTestSMSNotification() {
    const testSMS = {
      id: Date.now(),
      sender: 'TEST-BANK',
      body: 'Test transaction: Rs.1000 debited from account ending 1234',
      timestamp: new Date()
    };
    
    await NotificationManager.notifyNewTransactionSMS(testSMS);
  }
}

// Export singleton instance
export default new SMSMonitor();
