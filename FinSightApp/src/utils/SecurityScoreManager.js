import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * SecurityScoreManager - Calculates and manages user security scores
 * 
 * Updates security score based on SMS analysis results, fraud alerts, and user behavior
 */
class SecurityScoreManager {
  
  // Security score calculation weights
  static SCORE_WEIGHTS = {
    fraudMessages: -15,        // High penalty for fraud messages
    suspiciousMessages: -8,    // Medium penalty for suspicious messages
    safeMessages: +2,          // Small bonus for safe messages
    recentFraud: -20,          // Extra penalty for recent fraud (last 7 days)
    scanFrequency: +5,         // Bonus for regular scanning
    messageVolume: -1,         // Small penalty for high message volume (per 100 messages)
    alertResponse: +3,         // Bonus for responding to alerts appropriately
    baseScore: 85              // Starting security score
  };
  
  // Risk thresholds
  static RISK_LEVELS = {
    HIGH: { min: 0, max: 40, color: '#dc3545', text: 'High Risk' },
    MEDIUM: { min: 41, max: 70, color: '#ffc107', text: 'Medium Risk' },
    LOW: { min: 71, max: 100, color: '#28a745', text: 'Low Risk' }
  };
  
  /**
   * Calculate comprehensive security score for a user
   */
  static async calculateSecurityScore(userId) {
    try {
      console.log(`🔒 Calculating security score for user: ${userId}`);
      
      let score = this.SCORE_WEIGHTS.baseScore;
      const scoreBreakdown = {
        baseScore: this.SCORE_WEIGHTS.baseScore,
        fraudPenalty: 0,
        suspiciousPenalty: 0,
        safeBonus: 0,
        recentFraudPenalty: 0,
        scanFrequencyBonus: 0,
        messageVolumeImpact: 0,
        finalScore: 0
      };
      
      // Get user's analyzed messages
      const messagesData = await this.getUserMessages(userId);
      const alertsData = await this.getUserAlerts(userId);
      const scanHistory = await this.getUserScanHistory(userId);
      
      // 1. Calculate message-based score adjustments
      const messageScores = this.calculateMessageScores(messagesData);
      score += messageScores.fraudPenalty;
      score += messageScores.suspiciousPenalty;
      score += messageScores.safeBonus;
      score += messageScores.volumeImpact;
      
      scoreBreakdown.fraudPenalty = messageScores.fraudPenalty;
      scoreBreakdown.suspiciousPenalty = messageScores.suspiciousPenalty;
      scoreBreakdown.safeBonus = messageScores.safeBonus;
      scoreBreakdown.messageVolumeImpact = messageScores.volumeImpact;
      
      // 2. Calculate recent fraud penalty
      const recentFraudPenalty = this.calculateRecentFraudPenalty(alertsData);
      score += recentFraudPenalty;
      scoreBreakdown.recentFraudPenalty = recentFraudPenalty;
      
      // 3. Calculate scan frequency bonus
      const scanBonus = this.calculateScanFrequencyBonus(scanHistory);
      score += scanBonus;
      scoreBreakdown.scanFrequencyBonus = scanBonus;
      
      // 4. Ensure score is within bounds
      score = Math.max(0, Math.min(100, Math.round(score)));
      scoreBreakdown.finalScore = score;
      
      // 5. Determine risk level
      const riskLevel = this.getRiskLevel(score);
      
      const result = {
        userId,
        securityScore: score,
        riskLevel,
        scoreBreakdown,
        messagesAnalyzed: messagesData.total,
        fraudMessages: messagesData.fraud,
        suspiciousMessages: messagesData.suspicious,
        safeMessages: messagesData.safe,
        recentAlerts: alertsData.recentCount,
        lastCalculated: new Date().toISOString(),
        recommendations: this.generateSecurityRecommendations(score, scoreBreakdown)
      };
      
      // Save score to Firebase and cache
      await this.saveSecurityScore(userId, result);
      
      console.log(`🔒 Security score calculated: ${score}/100 (${riskLevel.text})`);
      return result;
      
    } catch (error) {
      console.error('❌ Security score calculation failed:', error);
      return {
        success: false,
        error: error.message,
        securityScore: 50, // Default fallback score
        riskLevel: this.getRiskLevel(50)
      };
    }
  }
  
  /**
   * Get user's analyzed messages from Firebase
   */
  static async getUserMessages(userId) {
    try {
      const messagesRef = collection(db, 'users', userId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      const messages = messagesSnapshot.docs.map(doc => doc.data());
      
      return {
        total: messages.length,
        fraud: messages.filter(m => m.status === 'fraud').length,
        suspicious: messages.filter(m => m.status === 'suspicious').length,
        safe: messages.filter(m => m.status === 'safe').length,
        unprocessed: messages.filter(m => !m.status || m.status === 'unknown').length,
        messages: messages
      };
    } catch (error) {
      console.error('❌ Failed to get user messages:', error);
      return { total: 0, fraud: 0, suspicious: 0, safe: 0, unprocessed: 0, messages: [] };
    }
  }
  
  /**
   * Get user's fraud alerts from Firebase
   */
  static async getUserAlerts(userId) {
    try {
      const alertsRef = collection(db, 'fraudAlerts');
      const q = query(
        alertsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const alertsSnapshot = await getDocs(q);
      const alerts = alertsSnapshot.docs.map(doc => doc.data());
      
      // Count recent alerts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentAlerts = alerts.filter(alert => {
        const alertDate = alert.createdAt?.toDate?.() || new Date(alert.detectedAt);
        return alertDate >= sevenDaysAgo;
      });
      
      return {
        total: alerts.length,
        recentCount: recentAlerts.length,
        alerts: alerts,
        recentAlerts: recentAlerts
      };
    } catch (error) {
      console.error('❌ Failed to get user alerts:', error);
      return { total: 0, recentCount: 0, alerts: [], recentAlerts: [] };
    }
  }
  
  /**
   * Get user's scan history from AsyncStorage
   */
  static async getUserScanHistory(userId) {
    try {
      const scanHistoryKey = `scan_history_${userId}`;
      const scanHistory = await AsyncStorage.getItem(scanHistoryKey);
      
      if (scanHistory) {
        const history = JSON.parse(scanHistory);
        return {
          totalScans: history.length || 0,
          recentScans: this.getRecentScans(history),
          lastScan: history[history.length - 1]?.timestamp,
          history: history
        };
      }
      
      return { totalScans: 0, recentScans: 0, lastScan: null, history: [] };
    } catch (error) {
      console.error('❌ Failed to get scan history:', error);
      return { totalScans: 0, recentScans: 0, lastScan: null, history: [] };
    }
  }
  
  /**
   * Calculate score adjustments based on message analysis
   */
  static calculateMessageScores(messagesData) {
    const fraudPenalty = messagesData.fraud * this.SCORE_WEIGHTS.fraudMessages;
    const suspiciousPenalty = messagesData.suspicious * this.SCORE_WEIGHTS.suspiciousMessages;
    const safeBonus = Math.min(messagesData.safe * this.SCORE_WEIGHTS.safeMessages, 15); // Cap safe bonus
    
    // Volume impact: slight penalty for very high message counts
    const volumeImpact = Math.max(
      Math.floor(messagesData.total / 100) * this.SCORE_WEIGHTS.messageVolume,
      -10 // Cap volume penalty
    );
    
    return {
      fraudPenalty,
      suspiciousPenalty,
      safeBonus,
      volumeImpact
    };
  }
  
  /**
   * Calculate penalty for recent fraud alerts
   */
  static calculateRecentFraudPenalty(alertsData) {
    if (alertsData.recentCount === 0) return 0;
    
    // Progressive penalty for multiple recent alerts
    const basePenalty = Math.min(alertsData.recentCount, 3) * this.SCORE_WEIGHTS.recentFraud;
    const extraPenalty = Math.max(alertsData.recentCount - 3, 0) * (this.SCORE_WEIGHTS.recentFraud / 2);
    
    return basePenalty + extraPenalty;
  }
  
  /**
   * Calculate bonus for regular scanning activity
   */
  static calculateScanFrequencyBonus(scanHistory) {
    if (scanHistory.totalScans === 0) return 0;
    
    const recentScans = scanHistory.recentScans || 0;
    const totalScans = scanHistory.totalScans || 0;
    
    // Bonus for recent activity
    let bonus = Math.min(recentScans * this.SCORE_WEIGHTS.scanFrequency, 15);
    
    // Additional bonus for consistent scanning over time
    if (totalScans >= 10) bonus += 5;
    if (totalScans >= 20) bonus += 5;
    
    return bonus;
  }
  
  /**
   * Get recent scans count (last 30 days)
   */
  static getRecentScans(scanHistory) {
    if (!scanHistory || scanHistory.length === 0) return 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return scanHistory.filter(scan => {
      const scanDate = new Date(scan.timestamp);
      return scanDate >= thirtyDaysAgo;
    }).length;
  }
  
  /**
   * Determine risk level based on score
   */
  static getRiskLevel(score) {
    if (score <= this.RISK_LEVELS.HIGH.max) return this.RISK_LEVELS.HIGH;
    if (score <= this.RISK_LEVELS.MEDIUM.max) return this.RISK_LEVELS.MEDIUM;
    return this.RISK_LEVELS.LOW;
  }
  
  /**
   * Generate security recommendations based on score and breakdown
   */
  static generateSecurityRecommendations(score, breakdown) {
    const recommendations = [];
    
    if (breakdown.fraudPenalty < -20) {
      recommendations.push({
        priority: 'high',
        type: 'fraud_detected',
        message: 'Multiple fraud messages detected. Review and delete suspicious SMS immediately.',
        action: 'Review fraud alerts and block suspicious senders'
      });
    }
    
    if (breakdown.recentFraudPenalty < -15) {
      recommendations.push({
        priority: 'high',
        type: 'recent_threats',
        message: 'Recent security threats detected. Monitor your accounts closely.',
        action: 'Check bank accounts and change passwords if needed'
      });
    }
    
    if (breakdown.scanFrequencyBonus === 0) {
      recommendations.push({
        priority: 'medium',
        type: 'scan_frequency',
        message: 'Regular SMS scanning helps maintain security. Scan weekly.',
        action: 'Set up regular SMS analysis schedule'
      });
    }
    
    if (score >= 80) {
      recommendations.push({
        priority: 'low',
        type: 'good_security',
        message: 'Excellent security score! Keep up the good security practices.',
        action: 'Continue regular monitoring and scanning'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Save security score to Firebase and cache
   */
  static async saveSecurityScore(userId, scoreData) {
    try {
      // Save to Firebase user profile
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        securityScore: scoreData.securityScore,
        riskLevel: scoreData.riskLevel.text,
        lastSecurityUpdate: new Date(),
        securityBreakdown: scoreData.scoreBreakdown
      });
      
      // Cache locally for offline access
      const cacheKey = `security_score_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(scoreData));
      
      console.log('✅ Security score saved to Firebase and cache');
    } catch (error) {
      console.error('❌ Failed to save security score:', error);
      // Still cache locally even if Firebase fails
      try {
        const cacheKey = `security_score_${userId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(scoreData));
      } catch (cacheError) {
        console.error('❌ Failed to cache security score:', cacheError);
      }
    }
  }
  
  /**
   * Load cached security score
   */
  static async loadCachedSecurityScore(userId) {
    try {
      const cacheKey = `security_score_${userId}`;
      const cachedScore = await AsyncStorage.getItem(cacheKey);
      
      if (cachedScore) {
        return JSON.parse(cachedScore);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to load cached security score:', error);
      return null;
    }
  }
  
  /**
   * Update security score after SMS analysis
   */
  static async updateScoreAfterAnalysis(userId, analysisResults) {
    try {
      console.log('🔄 Updating security score after SMS analysis...');
      
      // Record this scan in history
      await this.recordScanActivity(userId, analysisResults);
      
      // Recalculate security score
      const updatedScore = await this.calculateSecurityScore(userId);
      
      console.log(`🔒 Security score updated: ${updatedScore.securityScore}/100`);
      return updatedScore;
      
    } catch (error) {
      console.error('❌ Failed to update security score after analysis:', error);
      return null;
    }
  }
  
  /**
   * Record scan activity for score calculation
   */
  static async recordScanActivity(userId, analysisResults) {
    try {
      const scanHistoryKey = `scan_history_${userId}`;
      let scanHistory = [];
      
      // Load existing history
      const existingHistory = await AsyncStorage.getItem(scanHistoryKey);
      if (existingHistory) {
        scanHistory = JSON.parse(existingHistory);
      }
      
      // Add new scan record
      const scanRecord = {
        timestamp: new Date().toISOString(),
        messagesAnalyzed: analysisResults.totalAnalyzed || 0,
        fraudFound: analysisResults.fraudCount || 0,
        suspiciousFound: analysisResults.suspiciousCount || 0,
        safeFound: analysisResults.safeCount || 0,
        scanType: 'sms_analysis'
      };
      
      scanHistory.push(scanRecord);
      
      // Keep only last 100 scan records
      if (scanHistory.length > 100) {
        scanHistory = scanHistory.slice(-100);
      }
      
      // Save updated history
      await AsyncStorage.setItem(scanHistoryKey, JSON.stringify(scanHistory));
      
      console.log('✅ Scan activity recorded');
    } catch (error) {
      console.error('❌ Failed to record scan activity:', error);
    }
  }
  
  /**
   * Quick security score check (uses cache if available)
   */
  static async getSecurityScore(userId, forceRefresh = false) {
    try {
      if (!forceRefresh) {
        // Try to load from cache first
        const cachedScore = await this.loadCachedSecurityScore(userId);
        if (cachedScore) {
          // Check if cache is recent (less than 1 hour old)
          const cacheAge = new Date() - new Date(cachedScore.lastCalculated);
          if (cacheAge < 60 * 60 * 1000) { // 1 hour
            console.log('🔒 Using cached security score');
            return cachedScore;
          }
        }
      }
      
      // Calculate fresh score
      return await this.calculateSecurityScore(userId);
      
    } catch (error) {
      console.error('❌ Failed to get security score:', error);
      return {
        securityScore: 50,
        riskLevel: this.getRiskLevel(50),
        error: error.message
      };
    }
  }
}

export default SecurityScoreManager;
