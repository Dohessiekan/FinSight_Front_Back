// Test script to add sample fraud alerts to Firebase for map testing
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const sampleFraudAlerts = [
  {
    id: 'fraud_1',
    messageId: 'msg_001',
    userId: 'user_123',
    sender: '+250788123456',
    message: 'Congratulations! You have won $10,000. Send your bank details to claim.',
    prediction: { label: 'spam', confidence: 0.95 },
    location: {
      coordinates: { lat: -1.9441, lng: 30.0619 },
      address: 'Kigali City Center, Rwanda',
      formattedLocation: 'Kigali, Rwanda'
    },
    riskScore: 98,
    fraudConfidence: 0.95,
    status: 'active',
    alertType: 'fraud',
    severity: 'high',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'fraud_2', 
    messageId: 'msg_002',
    userId: 'user_456',
    sender: '+250788987654',
    message: 'Your account will be suspended. Click this link to verify: http://fake-bank.com',
    prediction: { label: 'spam', confidence: 0.87 },
    location: {
      coordinates: { lat: -1.9706, lng: 30.1044 },
      address: 'Remera, Gasabo, Kigali',
      formattedLocation: 'Remera, Kigali'
    },
    riskScore: 89,
    fraudConfidence: 0.87,
    status: 'active',
    alertType: 'fraud',
    severity: 'high',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'fraud_3',
    messageId: 'msg_003', 
    userId: 'user_789',
    sender: '+250788456789',
    message: 'Urgent: Your package is stuck at customs. Pay 50,000 RWF to release it.',
    prediction: { label: 'spam', confidence: 0.92 },
    location: {
      coordinates: { lat: -1.9355, lng: 30.0606 },
      address: 'Nyamirambo, Nyarugenge, Kigali',
      formattedLocation: 'Nyamirambo, Kigali'
    },
    riskScore: 94,
    fraudConfidence: 0.92,
    status: 'active',
    alertType: 'fraud',
    severity: 'high',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'fraud_4',
    messageId: 'msg_004',
    userId: 'user_101', 
    sender: '+250788321654',
    message: 'You have been selected for a government loan. Provide your ID and bank details.',
    prediction: { label: 'spam', confidence: 0.85 },
    location: {
      coordinates: { lat: -1.9536, lng: 30.0908 },
      address: 'Kimironko, Gasabo, Kigali',
      formattedLocation: 'Kimironko, Kigali'
    },
    riskScore: 88,
    fraudConfidence: 0.85,
    status: 'active',
    alertType: 'suspicious',
    severity: 'medium',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'fraud_5',
    messageId: 'msg_005',
    userId: 'user_202',
    sender: '+250788654321',
    message: 'Final notice: Your MTN line will be blocked. Call 0788000000 to reactivate.',
    prediction: { label: 'spam', confidence: 0.91 },
    location: {
      coordinates: { lat: -1.9553, lng: 30.0619 },
      address: 'Kacyiru, Gasabo, Kigali',
      formattedLocation: 'Kacyiru, Kigali'
    },
    riskScore: 93,
    fraudConfidence: 0.91,
    status: 'active',
    alertType: 'fraud',
    severity: 'high',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// Function to add sample fraud alerts
export const addSampleFraudAlerts = async () => {
  try {
    console.log('🗺️ Adding sample fraud alerts for map testing...');
    
    const fraudAlertsRef = collection(db, 'fraudAlerts');
    
    for (const alert of sampleFraudAlerts) {
      const { id, ...alertData } = alert;
      await addDoc(fraudAlertsRef, alertData);
      console.log(`✅ Added fraud alert: ${id}`);
    }
    
    console.log('🎉 All sample fraud alerts added successfully!');
    return { success: true, message: 'Sample fraud alerts added' };
    
  } catch (error) {
    console.error('❌ Error adding sample fraud alerts:', error);
    return { success: false, error: error.message };
  }
};

// Function to clear all fraud alerts (for testing)
export const clearAllFraudAlerts = async () => {
  try {
    console.log('🧹 Clearing all fraud alerts...');
    // Note: This would require getting all docs first, then deleting them
    // For now, just log the intent
    console.log('Manual deletion required from Firebase console');
    return { success: true, message: 'Clear function available' };
  } catch (error) {
    console.error('❌ Error clearing fraud alerts:', error);
    return { success: false, error: error.message };
  }
};

// Function to add a single test alert
export const addSingleTestAlert = async () => {
  try {
    const testAlert = {
      messageId: `test_${Date.now()}`,
      userId: 'test_user',
      sender: '+250788999999',
      message: 'TEST: This is a test fraud alert for map visualization',
      prediction: { label: 'spam', confidence: 0.95 },
      location: {
        coordinates: { lat: -1.9441, lng: 30.0619 },
        address: 'Test Location, Kigali',
        formattedLocation: 'Test - Kigali City Center'
      },
      riskScore: 99,
      fraudConfidence: 0.95,
      status: 'active',
      alertType: 'fraud',
      severity: 'high',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const fraudAlertsRef = collection(db, 'fraudAlerts');
    await addDoc(fraudAlertsRef, testAlert);
    
    console.log('✅ Test fraud alert added successfully!');
    return { success: true, message: 'Test alert added' };
    
  } catch (error) {
    console.error('❌ Error adding test alert:', error);
    return { success: false, error: error.message };
  }
};
