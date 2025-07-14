// Authentication utilities for FinSight Admin Dashboard

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

// Admin credentials (In production, this should be in a secure backend)
export const ADMIN_CREDENTIALS = {
  'admin@finsight.rw': {
    password: 'AdminFinSight2025!',
    role: ADMIN_ROLES.ADMIN,
    name: 'Admin User',
    department: 'Fraud Prevention'
  },
  'superadmin@finsight.rw': {
    password: 'SuperAdmin123!',
    role: ADMIN_ROLES.SUPER_ADMIN,
    name: 'Super Administrator',
    department: 'System Management'
  },
  'moderator@finsight.rw': {
    password: 'Moderator456!',
    role: ADMIN_ROLES.MODERATOR,
    name: 'Fraud Moderator',
    department: 'Investigation Team'
  }
};

// Authentication functions
export const validateCredentials = (email, password) => {
  const admin = ADMIN_CREDENTIALS[email];
  if (!admin) {
    return { success: false, error: 'Invalid email address' };
  }
  
  if (admin.password !== password) {
    return { success: false, error: 'Invalid password' };
  }
  
  return { 
    success: true, 
    admin: {
      email,
      role: admin.role,
      name: admin.name,
      department: admin.department,
      permissions: ROLE_PERMISSIONS[admin.role]
    }
  };
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
