#!/bin/bash

# Firebase Indexes Deployment Script
# This script deploys the Firestore indexes for security score and dashboard queries

echo "🔥 Firebase Indexes Deployment Script"
echo "======================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed"
    echo "📦 Please install Firebase CLI first:"
    echo "   npm install -g firebase-tools"
    echo ""
    exit 1
fi

# Check if logged into Firebase
echo "� Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged into Firebase"
    echo "🔑 Please login first:"
    echo "   firebase login"
    echo ""
    exit 1
fi

echo "✅ Firebase CLI is ready"
echo ""

# Show current project
echo "📋 Current Firebase project:"
firebase use

echo ""
echo "🏗️  Deploying Firestore indexes..."
echo "📁 Using configuration from: firestore.indexes.json"
echo ""

# Deploy only Firestore indexes
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Firebase indexes deployed successfully!"
    echo ""
    echo "📊 Deployed indexes for:"
    echo "   • fraudAlerts (userId + createdAt)"
    echo "   • fraudAlerts (userId + severity + createdAt)"
    echo "   • fraudAlerts (userId + status + createdAt)"
    echo "   • messages (monthYear + createdAt)"
    echo "   • messages (text + sender)"
    echo "   • messages (userId + status + createdAt)"
    echo "   • messages (userId + type + createdAt)"
    echo "   • messages (userId + monthYear + createdAt)"
    echo "   • userNotifications (userId + createdAt)"
    echo "   • userProfiles (userId + lastUpdated)"
    echo "   • dashboardStats (userId + lastSync)"
    echo "   • transactions (createdAt)"
    echo ""
    echo "⏱️  Index building usually takes 1-3 minutes"
    echo "🔄 You can check index status in Firebase Console:"
    echo "   https://console.firebase.google.com/project/$(firebase use --current)/firestore/indexes"
    echo ""
    echo "🎉 Your security score real-time updates should now work without errors!"
else
    echo ""
    echo "❌ Failed to deploy Firebase indexes"
    echo "🔍 Please check the error messages above"
    echo "💡 Common issues:"
    echo "   • Make sure you're in the correct project directory"
    echo "   • Verify firestore.indexes.json is valid JSON"
    echo "   • Check Firebase project permissions"
    echo ""
    exit 1
fi
