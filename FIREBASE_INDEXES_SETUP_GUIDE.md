# Firebase Indexes Setup Guide for Security Score

## Overview
This guide helps you create the necessary Firebase Firestore indexes to make your security score real-time updates work properly. The indexes will resolve the "Failed precondition" errors you're seeing in the dashboard.

## Why Do We Need Indexes?

Firebase Firestore requires **composite indexes** for queries that:
- Use multiple `where` clauses
- Combine `where` with `orderBy`
- Query across different fields

Your security score system uses these types of queries:
```javascript
// Example queries that need indexes:
query(fraudAlertsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
query(messagesRef, where('monthYear', '==', currentMonth), orderBy('createdAt', 'desc'))
```

## What Indexes Are Included

### 📊 Security Score Related Indexes

1. **fraudAlerts Collection**
   - `userId` + `createdAt` (DESC) - For user's fraud alerts timeline
   - `userId` + `severity` + `createdAt` (DESC) - For filtered severity queries
   - `userId` + `status` + `createdAt` (DESC) - For active/resolved alerts

2. **messages Collection** 
   - `monthYear` + `createdAt` (DESC) - For current month messages
   - `userId` + `status` + `createdAt` (DESC) - For fraud/safe message filtering
   - `userId` + `type` + `createdAt` (DESC) - For message type filtering
   - `userId` + `monthYear` + `createdAt` (DESC) - For user's monthly messages
   - `text` + `sender` - For duplicate detection

3. **Supporting Collections**
   - `userNotifications` - `userId` + `createdAt` (DESC)
   - `userProfiles` - `userId` + `lastUpdated` (DESC) 
   - `dashboardStats` - `userId` + `lastSync` (DESC)
   - `transactions` - `createdAt` (DESC)

## Quick Setup (3 Options)

### Option 1: PowerShell (Recommended for Windows)
```powershell
# Run this in PowerShell as Administrator
./deploy-firebase-indexes.ps1
```

### Option 2: Batch File (Simple Windows)
```cmd
# Double-click or run in Command Prompt
deploy-firebase-indexes.bat
```

### Option 3: Bash Script (Mac/Linux/WSL)
```bash
# Make executable and run
chmod +x deploy-firebase-indexes.sh
./deploy-firebase-indexes.sh
```

## Manual Deployment Steps

If the scripts don't work, follow these manual steps:

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Set Your Project
```bash
# List your projects
firebase projects:list

# Use your project
firebase use your-project-id
```

### Step 4: Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

## Verification Steps

### 1. Check Deployment Status
After running the deployment:
```bash
firebase deploy --only firestore:indexes
```

You should see:
```
✅ Deploy complete!
Project Console: https://console.firebase.google.com/project/your-project/overview
```

### 2. Monitor Index Building
1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to your project
3. Navigate to **Firestore Database** → **Indexes**
4. You should see indexes in "Building" or "Enabled" status

### 3. Test in Your App
1. Open your mobile app dashboard
2. The security score should load without errors
3. Look for the green "Live" indicator
4. Test creating a fraud alert - the score should update automatically

## Troubleshooting

### ❌ "Firebase CLI not found"
**Solution:**
```bash
npm install -g firebase-tools
# Or using yarn:
yarn global add firebase-tools
```

### ❌ "Not authenticated"
**Solution:**
```bash
firebase login
```

### ❌ "Permission denied"
**Solution:**
- Make sure you're logged into the correct Google account
- Verify you have Editor/Owner permissions on the Firebase project
- Check if you're using the correct project:
  ```bash
  firebase use --list
  firebase use your-correct-project-id
  ```

### ❌ "Index already exists"
**This is normal!** It means some indexes were already created. The deployment will skip existing ones and create new ones.

### ❌ "Failed precondition" in app
**Wait for indexes to build:**
- Index building takes 1-3 minutes
- Check Firebase Console → Firestore → Indexes
- Look for "Enabled" status (not "Building")

## Expected Results

### ✅ Before Index Creation
```
❌ Error: The query requires an index
❌ Security score shows "Loading..." indefinitely
❌ Real-time updates fail
```

### ✅ After Index Creation
```
✅ Security score loads successfully
✅ Green "Live" indicator appears
✅ Real-time updates work automatically
✅ No Firebase console errors
```

## Index File Location

The indexes are defined in:
```
📁 firestore.indexes.json
```

This file contains all the composite indexes needed for your queries. You can view and edit it, but be careful not to break the JSON structure.

## Performance Benefits

With these indexes:
- **Query Speed**: 10-100x faster query execution
- **Real-time Updates**: Instant security score changes
- **Scalability**: Handles thousands of users
- **Reliability**: No more "failed precondition" errors

## Security Score Features Enabled

These indexes enable:
1. **Real-time Score Updates** - Automatic recalculation when fraud detected
2. **Dashboard Performance** - Fast loading of user data
3. **Alert Timeline** - Chronological fraud alert display  
4. **Message Filtering** - Filter by status, type, month
5. **Notification System** - Real-time user notifications

## Need Help?

### Firebase Console
- Project Overview: `https://console.firebase.google.com/project/YOUR_PROJECT/overview`
- Firestore Indexes: `https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes`

### Check Index Status
```bash
# List all indexes
firebase firestore:indexes

# Check specific collection
firebase firestore:indexes --collection-group=fraudAlerts
```

### Debug Commands
```bash
# Check current project
firebase use

# List projects
firebase projects:list

# Check authentication
firebase auth:list
```

## Summary

Run one of these commands to deploy indexes:

**Windows PowerShell:**
```powershell
./deploy-firebase-indexes.ps1
```

**Windows Command Prompt:**
```cmd
deploy-firebase-indexes.bat
```

**Mac/Linux/WSL:**
```bash
./deploy-firebase-indexes.sh
```

After deployment:
1. ⏱️ Wait 1-3 minutes for building
2. 🔄 Check Firebase Console for "Enabled" status  
3. 📱 Test your app's security score
4. ✅ Enjoy real-time security updates!

Your security score should now update automatically whenever fraud is detected! 🎉
