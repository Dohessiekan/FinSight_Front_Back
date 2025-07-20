import { Platform, PermissionsAndroid } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import NotificationManager from './NotificationManager';

class SMSMonitor {
  constructor() {
    this.isMonitoring = false;
    this.lastCheckedTimestamp = null;
    this.monitoringInterval = null;
    this.checkIntervalMs = 10000; // Check every 10 seconds
  }

  // Transaction-related keywords and patterns
  transactionKeywords = [
    // Bank transaction keywords
    'debited', 'credited', 'withdrawn', 'deposited', 'transfer', 'payment',
    'transaction', 'spent', 'received', 'balance', 'account',
    
    // Financial institutions
    'bank', 'atm', 'upi', 'imps', 'neft', 'rtgs',
    
    // Money amounts (regex patterns)
    'rs', 'inr', 'usd', '$', '₹',
    
    // Payment methods
    'card', 'debit', 'credit', 'wallet', 'paytm', 'phonepe', 'gpay',
    
    // Transaction types
    'purchase', 'refund', 'cashback', 'reward', 'bill', 'recharge'
  ];

  // Common financial senders (partial matches)
  financialSenders = [
    'bank', 'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'yes',
    'paytm', 'phonepe', 'gpay', 'amazon', 'flipkart',
    'visa', 'mastercard', 'rupay',
    'upi', 'bhim', 'tez'
  ];

  async initialize() {
    try {
      // Only work on Android for SMS access
      if (Platform.OS !== 'android') {
        console.log('SMS monitoring only available on Android');
        return false;
      }

      // Request SMS permissions
      const hasPermission = await this.requestSMSPermissions();
      if (!hasPermission) {
        console.log('SMS permissions denied');
        return false;
      }

      console.log('SMSMonitor initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing SMSMonitor:', error);
      return false;
    }
  }

  async requestSMSPermissions() {
    try {
      if (Platform.OS !== 'android') return false;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'FinSight needs access to read SMS messages to detect transaction notifications',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      return false;
    }
  }

  async startMonitoring() {
    try {
      if (this.isMonitoring) {
        console.log('SMS monitoring already active');
        return;
      }

      if (Platform.OS !== 'android') {
        console.log('SMS monitoring only available on Android');
        return;
      }

      // Set initial timestamp to now (only check new messages)
      this.lastCheckedTimestamp = Date.now();
      this.isMonitoring = true;

      console.log('Starting SMS monitoring for transaction messages...');

      // Start periodic checking
      this.monitoringInterval = setInterval(() => {
        this.checkForNewTransactionSMS();
      }, this.checkIntervalMs);

      // Also check immediately
      setTimeout(() => this.checkForNewTransactionSMS(), 1000);

    } catch (error) {
      console.error('Error starting SMS monitoring:', error);
      this.isMonitoring = false;
    }
  }

  stopMonitoring() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      this.isMonitoring = false;
      console.log('SMS monitoring stopped');
    } catch (error) {
      console.error('Error stopping SMS monitoring:', error);
    }
  }

  async checkForNewTransactionSMS() {
    try {
      if (!this.isMonitoring || Platform.OS !== 'android') return;

      // Get recent SMS messages (last 5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const minDate = Math.max(this.lastCheckedTimestamp || fiveMinutesAgo, fiveMinutesAgo);

      const filter = {
        box: 'inbox',
        minDate: minDate,
        maxCount: 20,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail) => {
          console.error('Failed to get SMS list:', fail);
        },
        (count, smsList) => {
          try {
            const messages = JSON.parse(smsList);
            this.processSMSMessages(messages);
            this.lastCheckedTimestamp = Date.now();
          } catch (error) {
            console.error('Error processing SMS messages:', error);
          }
        }
      );

    } catch (error) {
      console.error('Error checking for new SMS:', error);
    }
  }

  processSMSMessages(messages) {
    try {
      if (!Array.isArray(messages)) return;

      messages.forEach(message => {
        if (this.isTransactionSMS(message)) {
          this.handleTransactionSMS(message);
        }
      });

    } catch (error) {
      console.error('Error processing SMS messages:', error);
    }
  }

  isTransactionSMS(message) {
    try {
      if (!message || !message.body || !message.address) return false;

      const body = message.body.toLowerCase();
      const sender = message.address.toLowerCase();

      // Check if sender is from a financial institution
      const isFinancialSender = this.financialSenders.some(pattern => 
        sender.includes(pattern.toLowerCase())
      );

      // Check if message contains transaction keywords
      const hasTransactionKeywords = this.transactionKeywords.some(keyword => 
        body.includes(keyword.toLowerCase())
      );

      // Check for amount patterns (₹, Rs, USD, $)
      const hasAmountPattern = /(?:₹|rs\.?|inr|usd|\$)\s*[\d,]+(?:\.\d{2})?/i.test(body) ||
                              /[\d,]+(?:\.\d{2})?\s*(?:₹|rs\.?|inr|usd|\$)/i.test(body);

      // Check for account/card number patterns
      const hasAccountPattern = /(?:a\/c|account|card).*?[\*x]{2,}\d{4}/i.test(body) ||
                               /\b\d{4}\s*[\*x]{4,}\s*\d{4}\b/i.test(body);

      // Message is likely a transaction if:
      // 1. From financial sender AND has transaction keywords, OR
      // 2. Has transaction keywords AND amount pattern, OR
      // 3. Has amount pattern AND account pattern
      const isTransaction = (isFinancialSender && hasTransactionKeywords) ||
                           (hasTransactionKeywords && hasAmountPattern) ||
                           (hasAmountPattern && hasAccountPattern);

      if (isTransaction) {
        console.log('Transaction SMS detected:', {
          sender: message.address,
          preview: body.substring(0, 100),
          hasFinancialSender: isFinancialSender,
          hasKeywords: hasTransactionKeywords,
          hasAmount: hasAmountPattern
        });
      }

      return isTransaction;

    } catch (error) {
      console.error('Error checking if SMS is transaction:', error);
      return false;
    }
  }

  async handleTransactionSMS(message) {
    try {
      console.log('Processing transaction SMS:', message.address);

      // Extract transaction details
      const transactionData = this.extractTransactionDetails(message);

      // Send push notification
      await NotificationManager.sendTransactionSMSNotification(transactionData);

      console.log('Transaction SMS notification sent for:', transactionData.sender);

    } catch (error) {
      console.error('Error handling transaction SMS:', error);
    }
  }

  extractTransactionDetails(message) {
    try {
      const body = message.body;
      const sender = message.address;

      // Extract amount
      let amount = null;
      const amountMatch = body.match(/(?:₹|rs\.?|inr|usd|\$)\s*([\d,]+(?:\.\d{2})?)/i) ||
                         body.match(/([\d,]+(?:\.\d{2})?)\s*(?:₹|rs\.?|inr|usd|\$)/i);
      if (amountMatch) {
        amount = amountMatch[1].replace(/,/g, '');
      }

      // Determine transaction type
      let category = 'unknown';
      const bodyLower = body.toLowerCase();
      
      if (bodyLower.includes('debited') || bodyLower.includes('spent') || bodyLower.includes('withdrawn')) {
        category = 'debit';
      } else if (bodyLower.includes('credited') || bodyLower.includes('received') || bodyLower.includes('deposited')) {
        category = 'credit';
      } else if (bodyLower.includes('transfer')) {
        category = 'transfer';
      } else if (bodyLower.includes('payment')) {
        category = 'payment';
      }

      // Create preview (first 100 characters)
      const preview = body.length > 100 ? body.substring(0, 97) + '...' : body;

      return {
        id: message._id || Date.now().toString(),
        sender: sender,
        body: body,
        preview: preview,
        amount: amount,
        category: category,
        timestamp: new Date(parseInt(message.date)).toISOString(),
        read: false
      };

    } catch (error) {
      console.error('Error extracting transaction details:', error);
      return {
        id: Date.now().toString(),
        sender: message.address || 'Unknown',
        body: message.body || '',
        preview: 'Transaction detected',
        amount: null,
        category: 'unknown',
        timestamp: new Date().toISOString(),
        read: false
      };
    }
  }

  // Get recent transaction SMS for display
  async getRecentTransactionSMS(limit = 10) {
    try {
      if (Platform.OS !== 'android') return [];

      return new Promise((resolve) => {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        const filter = {
          box: 'inbox',
          minDate: oneDayAgo,
          maxCount: 50,
        };

        SmsAndroid.list(
          JSON.stringify(filter),
          (fail) => {
            console.error('Failed to get recent SMS:', fail);
            resolve([]);
          },
          (count, smsList) => {
            try {
              const messages = JSON.parse(smsList);
              const transactionMessages = messages
                .filter(message => this.isTransactionSMS(message))
                .map(message => this.extractTransactionDetails(message))
                .slice(0, limit);
              
              resolve(transactionMessages);
            } catch (error) {
              console.error('Error getting recent transaction SMS:', error);
              resolve([]);
            }
          }
        );
      });

    } catch (error) {
      console.error('Error getting recent transaction SMS:', error);
      return [];
    }
  }

  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastChecked: this.lastCheckedTimestamp ? new Date(this.lastCheckedTimestamp).toISOString() : null,
      platform: Platform.OS
    };
  }
}

// Export singleton instance
export default new SMSMonitor();
