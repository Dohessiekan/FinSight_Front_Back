@echo off
setlocal enabledelayedexpansion

echo.
echo =====================================
echo  Firebase Indexes Deployment Script
echo =====================================
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI is not installed
    echo 📦 Please install Firebase CLI first:
    echo    npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)

echo ✅ Firebase CLI is available
echo.

REM Check if logged into Firebase
echo 🔐 Checking Firebase authentication...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged into Firebase
    echo 🔑 Please login first:
    echo    firebase login
    echo.
    pause
    exit /b 1
)

echo ✅ Firebase authentication verified
echo.

REM Show current project
echo 📋 Current Firebase project:
firebase use
echo.

echo 🏗️  Deploying Firestore indexes...
echo 📁 Using configuration from: firestore.indexes.json
echo.

REM Deploy only Firestore indexes
firebase deploy --only firestore:indexes

if %errorlevel% equ 0 (
    echo.
    echo ✅ Firebase indexes deployed successfully!
    echo.
    echo 📊 Deployed indexes for:
    echo    • fraudAlerts ^(userId + createdAt^)
    echo    • fraudAlerts ^(userId + severity + createdAt^)
    echo    • fraudAlerts ^(userId + status + createdAt^)
    echo    • messages ^(monthYear + createdAt^)
    echo    • messages ^(text + sender^)
    echo    • messages ^(userId + status + createdAt^)
    echo    • messages ^(userId + type + createdAt^)
    echo    • messages ^(userId + monthYear + createdAt^)
    echo    • userNotifications ^(userId + createdAt^)
    echo    • userProfiles ^(userId + lastUpdated^)
    echo    • dashboardStats ^(userId + lastSync^)
    echo    • transactions ^(createdAt^)
    echo.
    echo ⏱️  Index building usually takes 1-3 minutes
    echo 🔄 Check index status in Firebase Console
    echo.
    echo 🎉 Your security score real-time updates should now work without errors!
    echo.
    echo Press any key to continue...
    pause >nul
) else (
    echo.
    echo ❌ Failed to deploy Firebase indexes
    echo 🔍 Please check the error messages above
    echo.
    echo 💡 Common issues:
    echo    • Make sure you're in the correct project directory
    echo    • Verify firestore.indexes.json is valid JSON
    echo    • Check Firebase project permissions
    echo.
    pause
    exit /b 1
)
