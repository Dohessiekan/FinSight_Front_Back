import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

class SMSService {
  constructor() {
    this.hasPermissions = false;
  }

  /**
   * Request necessary permissions for reading SMS
   */
  async requestSMSPermissions() {
    if (Platform.OS !== 'android') {
      console.warn('SMS reading is only available on Android');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ]);

      const hasReadSMS = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
      const hasReceiveSMS = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;

      this.hasPermissions = hasReadSMS && hasReceiveSMS;
      
      if (this.hasPermissions) {
        console.log('SMS permissions granted');
      } else {
        console.log('SMS permissions denied');
      }

      return this.hasPermissions;
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      return false;
    }
  }

  /**
   * Check if SMS permissions are granted
   */
  async checkSMSPermissions() {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const hasReadSMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      const hasReceiveSMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
      
      this.hasPermissions = hasReadSMS && hasReceiveSMS;
      return this.hasPermissions;
    } catch (error) {
      console.error('Error checking SMS permissions:', error);
      return false;
    }
  }

  /**
   * Retrieve all SMS messages
   */
  async getAllSMS(options = {}) {
    if (!await this.checkSMSPermissions()) {
      throw new Error('SMS permissions not granted');
    }

    const defaultOptions = {
      box: 'inbox', // 'inbox', 'sent', 'draft', 'outbox', 'failed', 'queued'
      maxCount: 100,
      ...options
    };

    return new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify(defaultOptions),
        (fail) => {
          console.error('Failed to get SMS list:', fail);
          reject(new Error(fail));
        },
        (count, smsList) => {
          try {
            const messages = JSON.parse(smsList);
            console.log(`Retrieved ${count} SMS messages`);
            resolve(messages);
          } catch (error) {
            console.error('Error parsing SMS list:', error);
            reject(error);
          }
        }
      );
    });
  }
}

// Singleton instance
const smsService = new SMSService();

export default smsService;
