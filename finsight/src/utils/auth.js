// Admin SMS Management Functions
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Import AdminMessageManager for comprehensive message status management
import { AdminMessageManager } from './AdminMessageManager';

// Mark SMS as safe by admin - Enhanced with comprehensive system updates
export const markSMSAsSafe = async (messageId, userId, adminEmail, reason = 'Admin verified as legitimate', isProactive = true) => {
  try {
    console.log('🔒 Admin marking SMS as safe...', { messageId, userId, adminEmail, isProactive });
    
    // Verify admin permissions
    const session = getSession();
    if (!session || !hasPermission(PERMISSIONS.INVESTIGATE_ALERTS)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Use AdminMessageManager for comprehensive status change
    const result = await AdminMessageManager.markFraudAsSafe(messageId, userId, adminEmail, reason, isProactive);
    
    if (result.success) {
      console.log('✅ SMS marked as safe by admin with comprehensive updates');
      return {
        success: true,
        message: 'SMS marked as safe with system-wide updates',
        details: result.details
      };
    } else {
      console.error('❌ Failed to mark SMS as safe:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error) {
    console.error('❌ Error marking SMS as safe:', error);
    return { success: false, error: error.message };
  }
};

// Mark SMS as fraud by admin - New function for comprehensive fraud flagging
export const markSMSAsFraud = async (messageId, userId, adminEmail, reason = 'Admin identified as fraudulent', isProactive = true) => {
  try {
    console.log('🚨 Admin marking SMS as fraud...', { messageId, userId, adminEmail, isProactive });
    
    // Verify admin permissions
    const session = getSession();
    if (!session || !hasPermission(PERMISSIONS.INVESTIGATE_ALERTS)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Use AdminMessageManager for comprehensive status change
    const result = await AdminMessageManager.markSafeAsFraud(messageId, userId, adminEmail, reason, isProactive);
    
    if (result.success) {
      console.log('✅ SMS marked as fraud by admin with comprehensive updates');
      return {
        success: true,
        message: 'SMS marked as fraud with system-wide updates',
        details: result.details
      };
    } else {
      console.error('❌ Failed to mark SMS as fraud:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error) {
    console.error('❌ Error marking SMS as fraud:', error);
    return { success: false, error: error.message };
  }
};

// Get admin action history for a message
export const getMessageAdminHistory = async (messageId, userId) => {
  try {
    const result = await AdminMessageManager.getMessageAdminHistory(messageId, userId);
    return result;
  } catch (error) {
    console.error('❌ Error getting admin history:', error);
    return { success: false, error: error.message, history: [] };
  }
};

// Bulk admin actions on multiple messages
export const bulkUpdateMessages = async (messageActions, adminEmail) => {
  try {
    console.log(`🔄 Bulk admin update on ${messageActions.length} messages by ${adminEmail}`);
    
    // Verify admin permissions
    const session = getSession();
    if (!session || !hasPermission(PERMISSIONS.INVESTIGATE_ALERTS)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const result = await AdminMessageManager.bulkUpdateMessages(messageActions, adminEmail);
    
    console.log(`✅ Bulk update completed: ${result.summary.successful} successful, ${result.summary.failed} failed`);
    return {
      success: true,
      results: result,
      summary: `Bulk update completed: ${result.summary.successful}/${result.summary.total} successful`
    };
    
  } catch (error) {
    console.error('❌ Error in bulk update:', error);
    return { success: false, error: error.message };
  }
};

// Block SMS sender by admin
export const blockSMSSender = async (messageId, userId, senderNumber, adminEmail) => {
  try {
    console.log('🚫 Admin blocking SMS sender...', { messageId, senderNumber, adminEmail });
    
    // Verify admin permissions
    const session = getSession();
    if (!session || !hasPermission(PERMISSIONS.BLOCK_NUMBERS)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Add to blocked numbers collection
    const blockedRef = collection(db, 'blockedNumbers');
    await addDoc(blockedRef, {
      phoneNumber: senderNumber,
      blockedBy: adminEmail,
      reason: 'Admin blocked - fraud prevention',
      messageId: messageId,
      userId: userId,
      timestamp: serverTimestamp(),
      status: 'active'
    });

    // Update the original message
    const messageRef = doc(db, 'users', userId, 'messages', messageId);
    await updateDoc(messageRef, {
      status: 'blocked',
      senderBlocked: true,
      adminReview: {
        reviewedBy: 'admin',
        adminEmail: adminEmail,
        action: 'block_sender',
        timestamp: serverTimestamp(),
        reason: 'Sender blocked for fraud prevention'
      },
      updatedAt: serverTimestamp()
    });

    // Update fraud alert
    const fraudAlertsRef = collection(db, 'fraudAlerts');
    const alertQuery = query(fraudAlertsRef, where('messageId', '==', messageId));
    const alertSnapshot = await getDocs(alertQuery);
    
    if (!alertSnapshot.empty) {
      const alertDoc = alertSnapshot.docs[0];
      await updateDoc(alertDoc.ref, {
        status: 'blocked',
        senderBlocked: true,
        adminAction: {
          action: 'blocked_sender',
          adminEmail: adminEmail,
          timestamp: serverTimestamp(),
          reason: 'Sender blocked by admin'
        },
        updatedAt: serverTimestamp()
      });
    }

    console.log('✅ SMS sender blocked by admin successfully');
    return { success: true, message: 'SMS sender blocked successfully' };
    
  } catch (error) {
    console.error('❌ Error blocking SMS sender:', error);
    return { success: false, error: error.message };
  }
};

// Admin roles and permissions
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator'
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_USERS: 'manage_users',
  BLOCK_NUMBERS: 'block_numbers',
  INVESTIGATE_ALERTS: 'investigate_alerts',
  CONFIGURE_SYSTEM: 'configure_system',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_API: 'manage_api'
};

// Role-based permissions mapping
export const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.BLOCK_NUMBERS,
    PERMISSIONS.INVESTIGATE_ALERTS,
    PERMISSIONS.CONFIGURE_SYSTEM,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_API
  ],
  [ADMIN_ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.BLOCK_NUMBERS,
    PERMISSIONS.INVESTIGATE_ALERTS,
    PERMISSIONS.CONFIGURE_SYSTEM,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  [ADMIN_ROLES.MODERATOR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.INVESTIGATE_ALERTS,
    PERMISSIONS.VIEW_ANALYTICS
  ]
};

// Admin user mapping (email to role mapping)
// 🔧 ADD YOUR ADMIN EMAILS HERE - You can use any email addresses!
export const ADMIN_USERS = {
  // Default system accounts
  'admin@finsight.rw': {
    role: ADMIN_ROLES.ADMIN,
    name: 'System Admin',
    department: 'Fraud Prevention'
  },
  'superadmin@finsight.rw': {
    role: ADMIN_ROLES.SUPER_ADMIN,
    name: 'Super Administrator',
    department: 'System Management'
  },
  'moderator@finsight.rw': {
    role: ADMIN_ROLES.MODERATOR,
    name: 'Fraud Moderator',
    department: 'Investigation Team'
  },
  
  // 📝 ADD YOUR TEAM'S REAL EMAIL ADDRESSES HERE:
  // Example - replace with actual emails:
  // 'john.doe@company.com': {
  //   role: ADMIN_ROLES.ADMIN,
  //   name: 'John Doe',
  //   department: 'IT Security'
  // },
  // 'jane.smith@company.com': {
  //   role: ADMIN_ROLES.SUPER_ADMIN,
  //   name: 'Jane Smith', 
  //   department: 'System Management'
  // },
  // 'mike.wilson@company.com': {
  //   role: ADMIN_ROLES.MODERATOR,
  //   name: 'Mike Wilson',
  //   department: 'Investigation'
  // }
};

// Firebase Authentication functions
export const authenticateAdmin = async (email, password) => {
  try {
    console.log('🔐 Authenticating admin with Firebase...');
    
    // Check if user is in admin list
    if (!ADMIN_USERS[email]) {
      return { success: false, error: 'Access denied. Not an authorized administrator.' };
    }
    
    // Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get admin data
    const adminData = ADMIN_USERS[email];
    
    console.log('✅ Firebase authentication successful');
    
    return { 
      success: true, 
      admin: {
        email: user.email,
        uid: user.uid,
        role: adminData.role,
        name: adminData.name,
        department: adminData.department,
        permissions: ROLE_PERMISSIONS[adminData.role]
      }
    };
  } catch (error) {
    console.error('❌ Firebase authentication failed:', error);
    
    let errorMessage = 'Authentication failed';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Admin account not found';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Try again later';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Firebase sign out
export const signOutAdmin = async () => {
  try {
    await signOut(auth);
    clearSession();
    return { success: true };
  } catch (error) {
    console.error('❌ Sign out failed:', error);
    return { success: false, error: 'Sign out failed' };
  }
};

// Legacy function for compatibility - now uses Firebase
export const validateCredentials = async (email, password) => {
  return await authenticateAdmin(email, password);
};

export const createSession = (adminData) => {
  const session = {
    ...adminData,
    loginTime: new Date().toISOString(),
    sessionId: generateSessionId(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
  
  localStorage.setItem('adminAuth', JSON.stringify(session));
  return session;
};

export const getSession = () => {
  try {
    const session = localStorage.getItem('adminAuth');
    if (!session) return null;
    
    const parsed = JSON.parse(session);
    
    // Check if session is expired
    if (new Date() > new Date(parsed.expiresAt)) {
      clearSession();
      return null;
    }
    
    return parsed;
  } catch (error) {
    clearSession();
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem('adminAuth');
};

export const hasPermission = (permission) => {
  const session = getSession();
  if (!session) return false;
  
  return session.permissions.includes(permission);
};

export const requireAuth = () => {
  const session = getSession();
  if (!session) {
    window.location.href = '/login';
    return false;
  }
  return true;
};

// Helper functions
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Session activity tracking
export const updateLastActivity = () => {
  const session = getSession();
  if (session) {
    session.lastActivity = new Date().toISOString();
    localStorage.setItem('adminAuth', JSON.stringify(session));
  }
};

// Auto-logout on inactivity (call this periodically)
export const checkInactivity = (maxInactiveMinutes = 30) => {
  const session = getSession();
  if (!session || !session.lastActivity) return;
  
  const lastActivity = new Date(session.lastActivity);
  const now = new Date();
  const inactiveMinutes = (now - lastActivity) / (1000 * 60);
  
  if (inactiveMinutes > maxInactiveMinutes) {
    clearSession();
    window.location.href = '/login';
  }
};
