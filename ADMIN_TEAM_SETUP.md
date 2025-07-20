# 👥 FinSight Admin Account Management Guide

## 🎯 **Recommended Approach: Use Real Email Addresses**

Instead of sharing generic accounts, give each admin their own personal account for better security and accountability.

## 📝 **How to Add Your Team as Admins:**

### Step 1: Edit the Admin List
1. Open: `finsight/src/utils/auth.js`
2. Find the `ADMIN_USERS` section (around line 45)
3. Add your team's real email addresses:

```javascript
export const ADMIN_USERS = {
  // Your team members - replace with real emails:
  'yourname@yourcompany.com': {
    role: ADMIN_ROLES.SUPER_ADMIN,
    name: 'Your Name',
    department: 'IT Management'
  },
  'teamlead@yourcompany.com': {
    role: ADMIN_ROLES.ADMIN,
    name: 'Team Lead Name', 
    department: 'Fraud Prevention'
  },
  'analyst@yourcompany.com': {
    role: ADMIN_ROLES.MODERATOR,
    name: 'Analyst Name',
    department: 'Investigation'
  }
};
```

### Step 2: Create Firebase Accounts
For **each email** you added:
1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter their **real email address**
4. Set a **temporary password** (they can change it later)
5. Send them the login details

### Step 3: Team Login Process
Each admin logs in with:
- ✅ Their own email address
- ✅ Their own password
- ✅ Their assigned role and permissions

## 🔐 **Security Benefits:**

### ✅ Individual Accounts (Recommended):
- Each person has their own login
- Easy to track who did what
- Can disable individual access
- Admins can change their own passwords
- More professional and secure

### ❌ Shared Accounts (Not Recommended):
- Multiple people sharing same login
- Can't track individual actions
- Security risk if someone leaves team
- Password sharing is unprofessional

## 📋 **Quick Setup Examples:**

### Example 1: Small Team
```javascript
export const ADMIN_USERS = {
  'ceo@finsight.rw': {
    role: ADMIN_ROLES.SUPER_ADMIN,
    name: 'CEO Name',
    department: 'Executive'
  },
  'itmanager@finsight.rw': {
    role: ADMIN_ROLES.ADMIN,
    name: 'IT Manager',
    department: 'Technology'
  }
};
```

### Example 2: Large Team
```javascript
export const ADMIN_USERS = {
  // Senior Management
  'cto@company.com': { role: ADMIN_ROLES.SUPER_ADMIN, name: 'CTO', department: 'Executive' },
  'securityhead@company.com': { role: ADMIN_ROLES.SUPER_ADMIN, name: 'Security Head', department: 'Security' },
  
  // Fraud Prevention Team
  'fraudmanager@company.com': { role: ADMIN_ROLES.ADMIN, name: 'Fraud Manager', department: 'Fraud Prevention' },
  'analyst1@company.com': { role: ADMIN_ROLES.ADMIN, name: 'Senior Analyst', department: 'Analysis' },
  
  // Investigation Team  
  'investigator1@company.com': { role: ADMIN_ROLES.MODERATOR, name: 'Lead Investigator', department: 'Investigation' },
  'investigator2@company.com': { role: ADMIN_ROLES.MODERATOR, name: 'Junior Investigator', department: 'Investigation' }
};
```

## 🎭 **Role Assignments Guide:**

### 🏆 **SUPER_ADMIN** - For Senior Leadership
- **Who:** CTO, Security Head, System Owner
- **Access:** Everything (manage users, configure system, view all data)
- **Use Case:** Final decision makers, system configuration

### 👨‍💼 **ADMIN** - For Department Managers  
- **Who:** Fraud Manager, Senior Analysts, Team Leads
- **Access:** Dashboard, block numbers, investigate alerts, view analytics
- **Use Case:** Day-to-day fraud prevention operations

### 🔍 **MODERATOR** - For Analysts & Investigators
- **Who:** Fraud Analysts, Junior Staff, External Consultants
- **Access:** View dashboard, investigate alerts only
- **Use Case:** Investigation and analysis work

## 🚀 **Quick Start for Your Team:**

1. **Right now:** Use the default accounts to test:
   - `admin@finsight.rw` / `AdminFinSight2025!`

2. **For production:** Replace with your team's real emails in the code

3. **Create Firebase accounts** for each team member

4. **Test login** with each account to verify roles work correctly

## 💡 **Pro Tips:**

- ✅ Use company email addresses (@yourcompany.com)
- ✅ Give each person appropriate role level
- ✅ Document who has what access
- ✅ Review admin list quarterly
- ✅ Remove access when people leave team

Would you like me to help you set up accounts for your specific team members?
