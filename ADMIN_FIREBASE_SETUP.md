# FinSight Admin Authentication Setup

## 🔥 Firebase Admin Account Creation

The FinSight web admin dashboard now uses **Firebase Authentication** for secure admin access. You need to create admin accounts in Firebase Authentication.

### 📝 Step-by-Step Setup:

1. **Go to Firebase Console**
   - Open [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `finsight-9d1fd`

2. **Navigate to Authentication**
   - Click "Authentication" in the left sidebar
   - Click "Users" tab
   - Click "Add user" button

3. **Create Admin Accounts**
   Create these three admin accounts:

   **Super Administrator:**
   - Email: `superadmin@finsight.rw`
   - Password: `SuperAdmin123!` (or your preferred secure password)
   - Role: Super Admin (full access)

   **Administrator:**
   - Email: `admin@finsight.rw`  
   - Password: `AdminFinSight2025!` (or your preferred secure password)
   - Role: Admin (standard admin access)

   **Moderator:**
   - Email: `moderator@finsight.rw`
   - Password: `Moderator456!` (or your preferred secure password)
   - Role: Moderator (limited access for investigation)

### 🔐 Security Features:

- **Firebase Authentication**: Secure authentication with Firebase Auth
- **Role-Based Access**: Different permission levels for different admin types
- **Session Management**: 24-hour session expiration with auto-logout
- **Secure Sign Out**: Proper Firebase sign out with session cleanup

### 🎯 Admin Roles & Permissions:

#### Super Admin:
- ✅ View Dashboard
- ✅ Manage Users  
- ✅ Block Numbers
- ✅ Investigate Alerts
- ✅ Configure System
- ✅ View Analytics
- ✅ Manage API

#### Admin:
- ✅ View Dashboard
- ✅ Block Numbers
- ✅ Investigate Alerts
- ✅ Configure System
- ✅ View Analytics
- ❌ Manage Users
- ❌ Manage API

#### Moderator:
- ✅ View Dashboard
- ✅ Investigate Alerts
- ✅ View Analytics
- ❌ Block Numbers
- ❌ Configure System
- ❌ Manage Users
- ❌ Manage API

### 💡 Testing:

1. Create the admin accounts in Firebase Authentication
2. Refresh the web dashboard login page
3. Try logging in with any of the admin accounts
4. Verify that the dashboard loads and shows user count correctly
5. Test logout functionality

### 🚨 Important Notes:

- Admin accounts must be created in Firebase Authentication first
- The web dashboard validates admin access based on email addresses
- Both mobile app users and admin users use the same Firebase project
- This ensures proper Firestore security rules compliance (`request.auth != null`)

---

**After creating the admin accounts, you'll have:**
- ✅ Secure Firebase Authentication for admin access
- ✅ Proper user count display (no more 0 users issue)
- ✅ Role-based admin permissions
- ✅ Consistent authentication across mobile and web apps
