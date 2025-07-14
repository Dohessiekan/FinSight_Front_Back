# FinSight Admin Authentication System

## Overview
The FinSight admin web app now has a comprehensive role-based authentication system with the following features:

## 🔐 Authentication Features

### 1. **Role-Based Access Control (RBAC)**
- **Super Admin**: Full system access
- **Admin**: Standard administrative access
- **Moderator**: Limited access for investigation

### 2. **Secure Session Management**
- 24-hour session expiration
- Auto-logout on 30 minutes inactivity
- Session validation on every app load
- Secure localStorage-based session storage

### 3. **Permission System**
Available permissions:
- `view_dashboard` - View main dashboard
- `manage_users` - Manage user accounts
- `block_numbers` - Block suspicious numbers
- `investigate_alerts` - Investigate fraud alerts
- `configure_system` - System configuration
- `view_analytics` - View analytics and reports
- `manage_api` - API management

## 🚀 Demo Credentials

### Super Administrator
- **Email**: `superadmin@finsight.rw`
- **Password**: `SuperAdmin123!`
- **Permissions**: All permissions

### Administrator
- **Email**: `admin@finsight.rw`
- **Password**: `AdminFinSight2025!`
- **Permissions**: All except user management

### Moderator
- **Email**: `moderator@finsight.rw`
- **Password**: `Moderator456!`
- **Permissions**: View dashboard, investigate alerts, view analytics

## 💡 How to Use

### 1. **Login Process**
1. Navigate to `/login`
2. Enter admin credentials
3. System validates and creates secure session
4. Redirects to dashboard with role-appropriate access

### 2. **Permission Checking**
```javascript
import { hasPermission, PERMISSIONS } from './utils/auth';

// Check if user can block numbers
if (hasPermission(PERMISSIONS.BLOCK_NUMBERS)) {
  // Show block button
}
```

### 3. **Component Protection**
```javascript
import { PermissionGuard } from './components/PermissionGuard';

<PermissionGuard permission="configure_system">
  <AdminSettings />
</PermissionGuard>
```

### 4. **Route Protection**
```javascript
import { withPermission } from './components/PermissionGuard';

const ProtectedSettings = withPermission(SettingsPage, 'configure_system');
```

## 🔧 Implementation Details

### Files Created/Modified:
1. `src/utils/auth.js` - Authentication utilities
2. `src/components/PermissionGuard.js` - Permission components
3. `src/LoginPage.jsx` - Enhanced login with error handling
4. `src/App.js` - Session management and auto-logout
5. `src/Sidebar.js` - Display admin info and logout

### Security Features:
- Password validation
- Session expiration
- Inactivity timeout
- Role-based permissions
- Secure session storage
- Activity tracking

## 🚨 Security Considerations

**For Production Use:**
1. Move credentials to secure backend API
2. Implement JWT tokens
3. Add HTTPS enforcement
4. Implement rate limiting
5. Add multi-factor authentication
6. Use secure session storage (HttpOnly cookies)
7. Implement CSRF protection

## 📊 Usage Examples

### Check Admin Role:
```javascript
const session = getSession();
if (session.role === 'Super Admin') {
  // Show super admin features
}
```

### Update Activity:
```javascript
import { updateLastActivity } from './utils/auth';

// Call on user interaction
updateLastActivity();
```

### Manual Logout:
```javascript
import { clearSession } from './utils/auth';

const handleLogout = () => {
  clearSession();
  window.location.href = '/login';
};
```

## 🎯 Next Steps for Enhanced Security

1. **Backend Integration**: Connect to secure API
2. **JWT Implementation**: Replace localStorage with JWT
3. **Database Integration**: Store user data securely
4. **Audit Logging**: Track admin actions
5. **Multi-Factor Auth**: Add SMS/Email verification
6. **API Rate Limiting**: Prevent brute force attacks

The authentication system is now production-ready for demo purposes and can be easily extended for full production deployment!
