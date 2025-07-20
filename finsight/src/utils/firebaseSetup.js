// Firebase Connection Test and Data Setup
import { db, auth } from '../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

// Test Firebase connection and add sample data
export async function testAndSetupFirebase() {
  console.log('🧪 Testing Firebase connection...');
  
  try {
    // Step 1: Authenticate with Firebase
    if (!auth.currentUser) {
      console.log('🔐 Authenticating with Firebase...');
      await signInAnonymously(auth);
      console.log('✅ Firebase authentication successful');
    }
    
    // Step 2: Test reading users collection
    console.log('🔍 Testing users collection access...');
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    console.log(`📊 Found ${snapshot.size} users in database`);
    
    // Step 3: If no users, create sample data
    if (snapshot.empty) {
      console.log('📝 No users found. Creating sample data...');
      await createSampleData();
    }
    
    // Step 4: Test reading again
    const newSnapshot = await getDocs(usersRef);
    console.log(`✅ After setup: ${newSnapshot.size} users in database`);
    
    return {
      success: true,
      usersCount: newSnapshot.size,
      authenticated: !!auth.currentUser
    };
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return {
      success: false,
      error: error.message,
      authenticated: !!auth.currentUser
    };
  }
}

// Create sample data for testing
async function createSampleData() {
  try {
    console.log('🏗️ Creating sample users and messages...');
    
    // Create sample users
    const sampleUsers = [
      {
        id: 'user_001',
        email: 'user1@example.com',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      },
      {
        id: 'user_002', 
        email: 'user2@example.com',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      },
      {
        id: 'user_003',
        email: 'user3@example.com',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      }
    ];
    
    // Add users to Firestore
    for (const user of sampleUsers) {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user);
      console.log(`✅ Created user: ${user.id}`);
      
      // Add sample messages for each user
      await createSampleMessages(user.id);
    }
    
    // Create sample fraud alerts
    await createSampleFraudAlerts();
    
    // Create dashboard stats
    await createDashboardStats();
    
    console.log('✅ Sample data creation completed');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

// Create sample messages for a user using the enhanced saveUserMessage function
async function createSampleMessages(userId) {
  const { saveUserMessage } = await import('./firebaseMessages');
  
  const sampleMessages = [
    {
      messageText: "Congratulations! You've won $1000. Click here to claim your prize now!",
      phoneNumber: "+1234567890",
      analysis: {
        isFraud: true,
        confidence: 0.94,
        category: "prize_scam",
        riskLevel: "high"
      }
    },
    {
      messageText: "Your bank account has been compromised. Call 555-SCAM immediately.",
      phoneNumber: "+1987654321",
      analysis: {
        isFraud: true,
        confidence: 0.97,
        category: "bank_scam",
        riskLevel: "critical"
      }
    },
    {
      messageText: "Your package delivery is scheduled for today between 2-4 PM.",
      phoneNumber: "+1555123456",
      analysis: {
        isFraud: false,
        confidence: 0.89,
        category: "legitimate",
        riskLevel: "low"
      }
    }
  ];
  
  // Use the enhanced saveUserMessage function which handles everything
  for (const message of sampleMessages) {
    try {
      await saveUserMessage(userId, message);
      console.log(`✅ Saved message for ${userId} using enhanced function`);
    } catch (error) {
      console.error(`❌ Error saving message for ${userId}:`, error);
    }
  }
}

// Create sample fraud alerts
async function createSampleFraudAlerts() {
  const fraudAlertsRef = collection(db, 'fraudAlerts');
  
  const sampleAlerts = [
    {
      type: "Prize Scam Detected",
      severity: "high",
      phone: "+1234567890",
      message: "Congratulations! You've won $1000...",
      confidence: 94,
      status: "active",
      userId: "user_001",
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    },
    {
      type: "Bank Scam Alert",
      severity: "critical", 
      phone: "+1987654321",
      message: "Your bank account has been compromised...",
      confidence: 97,
      status: "active",
      userId: "user_002",
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    }
  ];
  
  for (const alert of sampleAlerts) {
    await addDoc(fraudAlertsRef, alert);
    console.log(`✅ Created fraud alert: ${alert.type}`);
  }
}

// Create dashboard stats
async function createDashboardStats() {
  const dashboardRef = doc(db, 'dashboard', 'stats');
  
  await setDoc(dashboardRef, {
    totalUsers: 3,
    smsAnalyzedToday: 9,
    fraudsPrevented: 2,
    lastUpdated: serverTimestamp(),
    mlAccuracy: 94.7
  });
  
  console.log('✅ Created dashboard stats');
}

export default testAndSetupFirebase;
