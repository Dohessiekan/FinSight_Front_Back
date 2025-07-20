// Authentication utilities for FinSight Admin Dashboard
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

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
