# Firebase Indexes Deployment Script for Windows
# This script deploys the Firestore indexes for security score and dashboard queries

Write-Host "🔥 Firebase Indexes Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version 2>$null
    if (-not $firebaseVersion) {
        throw "Firebase CLI not found"
    }
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI is not installed" -ForegroundColor Red
    Write-Host "📦 Please install Firebase CLI first:" -ForegroundColor Yellow
    Write-Host "   npm install -g firebase-tools" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if logged into Firebase
Write-Host "🔐 Checking Firebase authentication..." -ForegroundColor Blue
try {
    $projects = firebase projects:list 2>$null
    if (-not $projects) {
        throw "Not authenticated"
    }
    Write-Host "✅ Firebase authentication verified" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged into Firebase" -ForegroundColor Red
    Write-Host "🔑 Please login first:" -ForegroundColor Yellow
    Write-Host "   firebase login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# Show current project
Write-Host "📋 Current Firebase project:" -ForegroundColor Blue
firebase use

Write-Host ""
Write-Host "🏗️  Deploying Firestore indexes..." -ForegroundColor Blue
Write-Host "📁 Using configuration from: firestore.indexes.json" -ForegroundColor Gray
Write-Host ""

# Deploy only Firestore indexes
try {
    firebase deploy --only firestore:indexes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Firebase indexes deployed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Deployed indexes for:" -ForegroundColor Cyan
        Write-Host "   • fraudAlerts (userId + createdAt)" -ForegroundColor White
        Write-Host "   • fraudAlerts (userId + severity + createdAt)" -ForegroundColor White
        Write-Host "   • fraudAlerts (userId + status + createdAt)" -ForegroundColor White
        Write-Host "   • messages (monthYear + createdAt)" -ForegroundColor White
        Write-Host "   • messages (text + sender)" -ForegroundColor White
        Write-Host "   • messages (userId + status + createdAt)" -ForegroundColor White
        Write-Host "   • messages (userId + type + createdAt)" -ForegroundColor White
        Write-Host "   • messages (userId + monthYear + createdAt)" -ForegroundColor White
        Write-Host "   • userNotifications (userId + createdAt)" -ForegroundColor White
        Write-Host "   • userProfiles (userId + lastUpdated)" -ForegroundColor White
        Write-Host "   • dashboardStats (userId + lastSync)" -ForegroundColor White
        Write-Host "   • transactions (createdAt)" -ForegroundColor White
        Write-Host ""
        Write-Host "⏱️  Index building usually takes 1-3 minutes" -ForegroundColor Yellow
        
        # Get current project for console URL
        try {
            $currentProject = firebase use --current 2>$null
            if ($currentProject) {
                Write-Host "🔄 You can check index status in Firebase Console:" -ForegroundColor Blue
                Write-Host "   https://console.firebase.google.com/project/$currentProject/firestore/indexes" -ForegroundColor White
            }
        } catch {
            Write-Host "🔄 Check index status in Firebase Console" -ForegroundColor Blue
        }
        
        Write-Host ""
        Write-Host "🎉 Your security score real-time updates should now work without errors!" -ForegroundColor Green
        
        # Ask if user wants to open Firebase Console
        Write-Host ""
        $openConsole = Read-Host "🌐 Would you like to open Firebase Console to check index status? (y/n)"
        if ($openConsole -eq 'y' -or $openConsole -eq 'Y') {
            try {
                $currentProject = firebase use --current 2>$null
                if ($currentProject) {
                    $consoleUrl = "https://console.firebase.google.com/project/$currentProject/firestore/indexes"
                    Start-Process $consoleUrl
                    Write-Host "🌐 Opening Firebase Console..." -ForegroundColor Blue
                }
            } catch {
                Write-Host "❌ Could not open browser automatically" -ForegroundColor Red
                Write-Host "Please visit Firebase Console manually" -ForegroundColor Yellow
            }
        }
    } else {
        throw "Firebase deploy failed"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Failed to deploy Firebase indexes" -ForegroundColor Red
    Write-Host "🔍 Please check the error messages above" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Common issues:" -ForegroundColor Blue
    Write-Host "   • Make sure you're in the correct project directory" -ForegroundColor White
    Write-Host "   • Verify firestore.indexes.json is valid JSON" -ForegroundColor White
    Write-Host "   • Check Firebase project permissions" -ForegroundColor White
    Write-Host "   • Ensure you're logged into the correct Firebase account" -ForegroundColor White
    Write-Host ""
    exit 1
}
