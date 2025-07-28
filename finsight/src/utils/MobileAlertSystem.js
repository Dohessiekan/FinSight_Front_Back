/**
 * Web-Compatible Alert System for Admin Dashboard
 * 
 * This version is compatible with the web dashboard and doesn't use React Native dependencies
 */

import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export class MobileAlertSystem {

  // Debug function to test if this version is loaded
  static testVersion() {
    console.log('🔥 MobileAlertSystem v2.1 - IMPROVED VERSION LOADED');
    return 'v2.1-improved';
  }

  /**
   * DIRECT USER FRAUD SEARCH - Get all fraud messages for a specific user ID
   * This bypasses coordinate matching and directly searches by user ID
   */
  static async getUserFraudMessages(userId) {
    try {
      console.log(`👤 DIRECT USER SEARCH: Getting all fraud messages for user ${userId}`);
      
      const alertsRef = collection(db, 'fraud_alerts');
      const userQuery = query(
        alertsRef,
        where('userId', '==', userId),
        orderBy('detectedAt', 'desc')
      );
      
      const userSnapshot = await getDocs(userQuery);
      const userAlerts = [];
      
      userSnapshot.forEach(doc => {
        userAlerts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Found ${userAlerts.length} fraud messages for user ${userId}`);
      
      // Process the alerts for display
      const userBasedResults = {
        users: userAlerts.length > 0 ? [{
          userId: userId,
          fraudMessages: userAlerts.map(alert => ({
            id: alert.id,
            messageText: alert.messageText || 'No message content',
            sender: alert.sender || 'Unknown',
            phone: alert.phone || 'Unknown',
            severity: alert.severity,
            confidence: alert.confidence || 0,
            riskScore: alert.riskScore || 0,
            fraudType: alert.fraudType || 'unknown',
            detectedAt: alert.detectedAt,
            location: alert.location?.address?.formattedAddress || 'Location not available'
          })),
          totalMessages: userAlerts.length,
          location: userAlerts[0]?.location,
          avgConfidence: userAlerts.reduce((sum, alert) => sum + (alert.confidence || 0), 0) / userAlerts.length,
          avgRiskScore: userAlerts.reduce((sum, alert) => sum + (alert.riskScore || 0), 0) / userAlerts.length
        }] : [],
        totalUsers: userAlerts.length > 0 ? 1 : 0,
        totalFraudMessages: userAlerts.length
      };
      
      return {
        success: true,
        alerts: userAlerts,
        userBasedResults,
        totalFound: userAlerts.length,
        uniqueUsers: userAlerts.length > 0 ? 1 : 0,
        fraudMessageCount: userAlerts.length
      };
      
    } catch (error) {
      console.error('❌ Failed to get user fraud messages:', error);
      return {
        success: false,
        error: error.message,
        alerts: []
      };
    }
  }

  /**
   * Get all fraud messages for a specific user (simplified area search)
   * When admin clicks "View all messages in this area" on a fraud alert,
   * show all fraud messages for that specific user instead of geographic search
   */
  static async getFraudMessagesInArea(centerLat, centerLng, radiusKm = 5, filters = {}) {
    try {
      console.log(`🗺️ 🔥 IMPROVED VERSION v2.1: Finding user at coordinates ${centerLat}, ${centerLng} with radius ${radiusKm}km`);
      console.log(`🔍 📱 FORCE REFRESH: Called getFraudMessagesInArea with exact coordinates from clicked fraud alert`);
      console.log(`💡 Timestamp: ${new Date().toISOString()}`);
      
      // Step 1: Find the fraud alert at or near the clicked coordinates
      console.log('🔍 Step 1: Finding fraud alert near clicked location...');
      
      const alertsRef = collection(db, 'fraud_alerts');
      let alertQuery = query(
        alertsRef,
        orderBy('detectedAt', 'desc')
      );
      
      const alertsSnapshot = await getDocs(alertQuery);
      console.log(`🔍 FIREBASE QUERY RESULT: Found ${alertsSnapshot.size} documents in fraud_alerts collection`);
      
      let targetUserId = null;
      let clickedAlert = null;
      
      // Find the alert closest to the clicked coordinates
      let closestAlert = null;
      let closestDistance = Infinity;
      
      alertsSnapshot.forEach(doc => {
        const alertData = doc.data();
        console.log(`📋 Checking alert ${doc.id}:`, {
          hasLocation: !!alertData.location,
          hasCoordinates: !!alertData.location?.coordinates,
          coordinates: alertData.location?.coordinates,
          userId: alertData.userId,
          sender: alertData.sender
        });
        
        if (alertData.location?.coordinates) {
          const alertLat = alertData.location.coordinates.latitude;
          const alertLng = alertData.location.coordinates.longitude;
          
          // Calculate distance in kilometers
          const distance = this.calculateDistance(centerLat, centerLng, alertLat, alertLng);
          
          console.log(`🎯 Alert ${doc.id} at [${alertLat}, ${alertLng}] distance: ${(distance * 1000).toFixed(0)}m from click point [${centerLat}, ${centerLng}]`);
          
          // Check for exact coordinate match first (to handle precision issues)
          const latMatch = Math.abs(alertLat - centerLat) < 0.0001; // ~10m precision
          const lngMatch = Math.abs(alertLng - centerLng) < 0.0001; // ~10m precision
          
          if (latMatch && lngMatch) {
            console.log(`🎯 EXACT COORDINATE MATCH found for alert ${doc.id}`);
            targetUserId = alertData.userId;
            clickedAlert = {
              id: doc.id,
              ...alertData
            };
            return; // Found exact match, use this one
          }
          
          // Track closest alert as backup (within 2km radius)
          if (distance < closestDistance && distance <= 2) {
            closestDistance = distance;
            closestAlert = {
              id: doc.id,
              userId: alertData.userId,
              ...alertData
            };
          }
        }
      });
      
      // If no exact match found, use the closest alert within 2km
      if (!targetUserId && closestAlert) {
        console.log(`🔄 Using closest alert ${closestAlert.id} at ${(closestDistance * 1000).toFixed(0)}m distance`);
        targetUserId = closestAlert.userId;
        clickedAlert = closestAlert;
      }
      
      if (!targetUserId) {
        console.log(`❌ No fraud alert found near clicked coordinates [${centerLat}, ${centerLng}]`);
        console.log(`🔍 Searched ${alertsSnapshot.size} total alerts in fraud_alerts collection`);
        
        // List all alerts with their coordinates for debugging
        alertsSnapshot.forEach(doc => {
          const alertData = doc.data();
          if (alertData.location?.coordinates) {
            const alertLat = alertData.location.coordinates.latitude;
            const alertLng = alertData.location.coordinates.longitude;
            const distance = this.calculateDistance(centerLat, centerLng, alertLat, alertLng);
            console.log(`📍 Alert ${doc.id}: [${alertLat}, ${alertLng}] - ${(distance * 1000).toFixed(0)}m away, User: ${alertData.userId}`);
          } else {
            console.log(`📍 Alert ${doc.id}: No coordinates, User: ${alertData.userId}`);
          }
        });
        
        return {
          success: false,
          error: `No fraud alert found within 2km of coordinates [${centerLat}, ${centerLng}]. Searched ${alertsSnapshot.size} alerts.`,
          alerts: [],
          totalFound: 0,
          debugInfo: {
            searchCoordinates: [centerLat, centerLng],
            totalAlertsChecked: alertsSnapshot.size,
            closestDistance: closestDistance === Infinity ? 'none found' : `${(closestDistance * 1000).toFixed(0)}m`
          }
        };
      }
      
      // Step 2: Get ALL fraud messages for this specific user
      console.log(`🔍 Step 2: Getting all fraud messages for user: ${targetUserId}`);
      
      let userAlertsQuery = query(
        alertsRef,
        where('userId', '==', targetUserId),
        orderBy('detectedAt', 'desc')
      );
      
      const userAlertsSnapshot = await getDocs(userAlertsQuery);
      const userAlerts = [];
      
      userAlertsSnapshot.forEach(doc => {
        const alertData = doc.data();
        userAlerts.push({
          id: doc.id,
          ...alertData
        });
      });
      
      console.log(`📊 Found ${userAlerts.length} fraud messages for user ${targetUserId}`);
      
      // Step 3: Process user fraud data for detailed display
      const userBasedResults = this.processUserFraudDataForArea(userAlerts);
      
      // Step 4: Generate summary statistics
      const areaStats = this.generateAreaStatistics(userAlerts);
      
      // Step 5: Create user profile summary
      const userProfile = {
        userId: targetUserId,
        totalFraudMessages: userAlerts.length,
        location: clickedAlert?.location,
        riskLevel: this.calculateUserRiskLevel({
          totalMessages: userAlerts.length,
          avgRiskScore: userAlerts.reduce((sum, alert) => sum + (alert.riskScore || 0), 0) / userAlerts.length,
          severestThreat: userAlerts.find(alert => alert.severity === 'critical') || userAlerts[0],
          fraudTypes: [...new Set(userAlerts.map(alert => alert.fraudType || 'unknown'))]
        }),
        firstFraudAlert: userAlerts[userAlerts.length - 1]?.detectedAt,
        lastFraudAlert: userAlerts[0]?.detectedAt,
        uniqueSenders: [...new Set(userAlerts.map(alert => alert.sender || 'Unknown'))],
        severityBreakdown: {
          critical: userAlerts.filter(a => a.severity === 'critical').length,
          high: userAlerts.filter(a => a.severity === 'high').length,
          warning: userAlerts.filter(a => a.severity === 'warning').length,
          info: userAlerts.filter(a => a.severity === 'info').length
        }
      };
      
      console.log(`✅ User profile created:`, {
        userId: userProfile.userId,
        totalMessages: userProfile.totalFraudMessages,
        riskLevel: userProfile.riskLevel,
        uniqueSenders: userProfile.uniqueSenders.length
      });
      
      return {
        success: true,
        alerts: userAlerts,
        userBasedResults: userBasedResults,
        areaStats: areaStats,
        userProfile: userProfile, // NEW: Detailed user profile
        searchArea: {
          center: { lat: centerLat, lng: centerLng },
          radius: radiusKm,
          type: 'user_focused', // Indicates this is user-focused, not geographic
          targetUserId: targetUserId
        },
        totalFound: userAlerts.length,
        uniqueUsers: 1, // Always 1 since we're focusing on a single user
        fraudMessageCount: userAlerts.length,
        clickedAlert: clickedAlert // The original alert that was clicked
      };
      
    } catch (error) {
      console.error('❌ Failed to get user fraud messages:', error);
      return {
        success: false,
        error: error.message,
        alerts: []
      };
    }
  }
  
  /**
   * Calculate distance between two geographic points using Haversine formula
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }
  
  /**
   * Process fraud alerts to organize by user and provide detailed user information
   */
  static processUserFraudDataForArea(alerts) {
    const userMap = new Map();
    
    alerts.forEach(alert => {
      const userId = alert.userId || 'unknown';
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: userId,
          fraudMessages: [],
          totalMessages: 0,
          severestThreat: null,
          firstAlert: alert.detectedAt,
          lastAlert: alert.detectedAt,
          location: alert.location,
          totalRiskScore: 0,
          avgConfidence: 0,
          fraudTypes: new Set(),
          suspiciousSenders: new Set()
        });
      }
      
      const userData = userMap.get(userId);
      
      // Add this alert to user's fraud messages
      userData.fraudMessages.push({
        id: alert.id,
        messageText: alert.messageText || 'No message content',
        sender: alert.sender || 'Unknown',
        phone: alert.phone || 'Unknown',
        severity: alert.severity,
        confidence: alert.confidence || 0,
        riskScore: alert.riskScore || 0,
        fraudType: alert.fraudType || 'unknown',
        detectedAt: alert.detectedAt,
        location: alert.location?.address?.formattedAddress || 'Location not available'
      });
      
      userData.totalMessages++;
      userData.totalRiskScore += (alert.riskScore || 0);
      userData.fraudTypes.add(alert.fraudType || 'unknown');
      userData.suspiciousSenders.add(alert.sender || 'Unknown');
      
      // Track severest threat
      if (!userData.severestThreat || 
          this.getSeverityWeight(alert.severity) > this.getSeverityWeight(userData.severestThreat.severity)) {
        userData.severestThreat = {
          severity: alert.severity,
          messageText: alert.messageText,
          sender: alert.sender,
          riskScore: alert.riskScore,
          detectedAt: alert.detectedAt
        };
      }
      
      // Update time range
      const alertDate = new Date(alert.detectedAt?.toDate ? alert.detectedAt.toDate() : alert.detectedAt);
      const firstDate = new Date(userData.firstAlert?.toDate ? userData.firstAlert.toDate() : userData.firstAlert);
      const lastDate = new Date(userData.lastAlert?.toDate ? userData.lastAlert.toDate() : userData.lastAlert);
      
      if (alertDate < firstDate) userData.firstAlert = alert.detectedAt;
      if (alertDate > lastDate) userData.lastAlert = alert.detectedAt;
    });
    
    // Convert to array and calculate averages
    const users = Array.from(userMap.values()).map(user => {
      user.avgConfidence = user.totalMessages > 0 ? 
        user.fraudMessages.reduce((sum, msg) => sum + msg.confidence, 0) / user.totalMessages : 0;
      user.avgRiskScore = user.totalMessages > 0 ? user.totalRiskScore / user.totalMessages : 0;
      user.fraudTypes = Array.from(user.fraudTypes);
      user.suspiciousSenders = Array.from(user.suspiciousSenders);
      
      // Calculate user risk level
      user.riskLevel = this.calculateUserRiskLevel(user);
      
      return user;
    });
    
    // Sort users by risk level (highest risk first)
    users.sort((a, b) => {
      const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const riskDiff = (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
      
      if (riskDiff !== 0) return riskDiff;
      
      // Then by total risk score
      return b.avgRiskScore - a.avgRiskScore;
    });
    
    return {
      users: users,
      totalUsers: users.length,
      totalFraudMessages: alerts.length,
      highRiskUsers: users.filter(u => u.riskLevel === 'critical' || u.riskLevel === 'high').length,
      userRiskDistribution: {
        critical: users.filter(u => u.riskLevel === 'critical').length,
        high: users.filter(u => u.riskLevel === 'high').length,
        medium: users.filter(u => u.riskLevel === 'medium').length,
        low: users.filter(u => u.riskLevel === 'low').length
      }
    };
  }
  
  /**
   * Generate statistics for fraud alerts
   */
  static generateAreaStatistics(alerts) {
    const stats = {
      totalAlerts: alerts.length,
      severityBreakdown: { critical: 0, high: 0, warning: 0, info: 0 },
      timeDistribution: { today: 0, thisWeek: 0, thisMonth: 0, older: 0 },
      topSenders: {},
      fraudTypes: {},
      averageConfidence: 0,
      highestRisk: null,
      mostRecentAlert: null
    };
    
    if (alerts.length === 0) {
      return stats;
    }
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let totalConfidence = 0;
    let highestRiskScore = 0;
    
    alerts.forEach(alert => {
      // Severity breakdown
      if (stats.severityBreakdown.hasOwnProperty(alert.severity)) {
        stats.severityBreakdown[alert.severity]++;
      }
      
      // Time distribution
      const alertDate = new Date(alert.detectedAt?.toDate ? alert.detectedAt.toDate() : alert.detectedAt);
      if (alertDate >= todayStart) {
        stats.timeDistribution.today++;
      } else if (alertDate >= weekStart) {
        stats.timeDistribution.thisWeek++;
      } else if (alertDate >= monthStart) {
        stats.timeDistribution.thisMonth++;
      } else {
        stats.timeDistribution.older++;
      }
      
      // Top senders
      const sender = alert.sender || 'Unknown';
      stats.topSenders[sender] = (stats.topSenders[sender] || 0) + 1;
      
      // Fraud types
      const fraudType = alert.fraudType || 'unknown';
      stats.fraudTypes[fraudType] = (stats.fraudTypes[fraudType] || 0) + 1;
      
      // Confidence tracking
      const confidence = alert.confidence || 0;
      totalConfidence += confidence;
      
      // Track highest risk alert
      const riskScore = alert.riskScore || 0;
      if (riskScore > highestRiskScore) {
        highestRiskScore = riskScore;
        stats.highestRisk = {
          id: alert.id,
          sender: alert.sender,
          riskScore: riskScore,
          severity: alert.severity,
          messageText: alert.messageText
        };
      }
      
      // Track most recent alert
      if (!stats.mostRecentAlert || alertDate > new Date(stats.mostRecentAlert.detectedAt?.toDate ? stats.mostRecentAlert.detectedAt.toDate() : stats.mostRecentAlert.detectedAt)) {
        stats.mostRecentAlert = {
          id: alert.id,
          sender: alert.sender,
          detectedAt: alertDate,
          severity: alert.severity
        };
      }
    });
    
    // Calculate average confidence
    stats.averageConfidence = alerts.length > 0 ? (totalConfidence / alerts.length) : 0;
    
    // Sort top senders by frequency
    stats.topSenders = Object.entries(stats.topSenders)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5) // Top 5 senders
      .reduce((obj, [sender, count]) => {
        obj[sender] = count;
        return obj;
      }, {});
    
    return stats;
  }
  
  /**
   * Calculate user risk level based on their fraud exposure
   */
  static calculateUserRiskLevel(userData) {
    const { totalMessages, avgRiskScore, severestThreat, fraudTypes } = userData;
    
    if (severestThreat?.severity === 'critical' || avgRiskScore > 85) {
      return 'critical';
    }
    
    if (severestThreat?.severity === 'high' || avgRiskScore > 70 || totalMessages > 5) {
      return 'high';
    }
    
    if (totalMessages > 2 || avgRiskScore > 50 || fraudTypes.length > 2) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Get numeric weight for severity comparison
   */
  static getSeverityWeight(severity) {
    const weights = { 'critical': 4, 'high': 3, 'warning': 2, 'info': 1 };
    return weights[severity] || 0;
  }
}

export default MobileAlertSystem;
