import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

class FirebaseService {
  // User Profile Management
  async createUserProfile(userId, profileData) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(userId, updateData) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Financial Data Management
  async saveTransaction(userId, transactionData) {
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const docRef = await addDoc(transactionsRef, {
        ...transactionData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getTransactions(userId, limitCount = 50) {
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error getting transactions:', error);
      return { success: false, error: error.message };
    }
  }

  // Security & Fraud Management
  async reportFraudulentMessage(userId, messageData) {
    try {
      const fraudReportsRef = collection(db, 'fraud_reports');
      await addDoc(fraudReportsRef, {
        userId,
        messageData,
        reportedAt: serverTimestamp(),
        status: 'pending'
      });
      return { success: true };
    } catch (error) {
      console.error('Error reporting fraud:', error);
      return { success: false, error: error.message };
    }
  }

  async updateFraudScore(userId, newScore, reason) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fraudScore: newScore,
        lastFraudUpdate: {
          score: newScore,
          reason,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating fraud score:', error);
      return { success: false, error: error.message };
    }
  }

  // Settings & Preferences
  async saveUserSettings(userId, settings) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        settings,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSettings(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists() && userDoc.data().settings) {
        return { success: true, data: userDoc.data().settings };
      } else {
        return { success: true, data: {} }; // Return empty settings if none exist
      }
    } catch (error) {
      console.error('Error getting settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics & Insights
  async saveAnalyticsEvent(userId, eventType, eventData) {
    try {
      const analyticsRef = collection(db, 'analytics');
      await addDoc(analyticsRef, {
        userId,
        eventType,
        eventData,
        timestamp: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving analytics event:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new FirebaseService();
