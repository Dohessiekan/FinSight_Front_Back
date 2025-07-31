import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * MessageCountAnalyzer - Diagnoses discrepancies between mobile analysis and web display
 * 
 * Helps identify why mobile shows 176 analyzed but web shows only 139 stored
 */
class MessageCountAnalyzer {
  
  /**
   * Analyze message count discrepancies for a specific user
   */
  static async analyzeUserMessageCounts(userId) {
    try {
      console.log(`🔍 Analyzing message counts for user: ${userId}`);
      
      // Get all messages for the user
      const messagesRef = collection(db, 'users', userId, 'messages');
      const allMessagesSnapshot = await getDocs(messagesRef);
      
      const allMessages = allMessagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Found ${allMessages.length} total messages in Firestore`);
      
      // Analyze the messages
      const analysis = {
        totalStored: allMessages.length,
        duplicateAnalysis: this.findDuplicates(allMessages),
        monthlyBreakdown: this.analyzeByMonth(allMessages),
        statusBreakdown: this.analyzeByStatus(allMessages),
        timestampAnalysis: this.analyzeTimestamps(allMessages),
        contentAnalysis: this.analyzeContent(allMessages),
        potentialIssues: []
      };
      
      // Identify potential issues
      analysis.potentialIssues = this.identifyIssues(analysis);
      
      return {
        success: true,
        userId,
        analysis,
        summary: {
          totalStored: analysis.totalStored,
          duplicateGroups: analysis.duplicateAnalysis.duplicateGroups,
          potentialDuplicates: analysis.duplicateAnalysis.totalDuplicates,
          mostRecentMessage: analysis.timestampAnalysis.mostRecent,
          oldestMessage: analysis.timestampAnalysis.oldest,
          issueCount: analysis.potentialIssues.length
        }
      };
      
    } catch (error) {
      console.error('❌ Message count analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Find duplicate messages
   */
  static findDuplicates(messages) {
    const duplicateMap = new Map();
    const duplicateGroups = [];
    
    messages.forEach(msg => {
      // Create a key based on content and sender
      const key = `${msg.text || msg.content || msg.message || 'NO_TEXT'}-${msg.sender || msg.address || 'NO_SENDER'}`;
      
      if (duplicateMap.has(key)) {
        duplicateMap.get(key).push(msg);
      } else {
        duplicateMap.set(key, [msg]);
      }
    });
    
    // Find groups with more than one message
    duplicateMap.forEach((group, key) => {
      if (group.length > 1) {
        duplicateGroups.push({
          key,
          count: group.length,
          messages: group.map(m => ({
            id: m.id,
            timestamp: m.timestamp || m.createdAt?.toDate?.()?.toISOString() || 'Unknown',
            status: m.status || 'Unknown',
            text: (m.text || m.content || m.message || '').substring(0, 100) + '...'
          }))
        });
      }
    });
    
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0);
    
    return {
      duplicateGroups,
      totalDuplicates,
      uniqueMessages: messages.length - totalDuplicates
    };
  }
  
  /**
   * Analyze messages by month
   */
  static analyzeByMonth(messages) {
    const monthlyData = {};
    
    messages.forEach(msg => {
      const date = msg.createdAt?.toDate?.() || new Date(msg.timestamp || msg.savedAt || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, messages: [] };
      }
      
      monthlyData[monthKey].count++;
      monthlyData[monthKey].messages.push(msg.id);
    });
    
    return {
      byMonth: monthlyData,
      currentMonth: this.getCurrentMonthKey(),
      currentMonthCount: monthlyData[this.getCurrentMonthKey()]?.count || 0
    };
  }
  
  /**
   * Analyze messages by status
   */
  static analyzeByStatus(messages) {
    const statusCounts = {
      safe: 0,
      suspicious: 0,
      fraud: 0,
      unknown: 0,
      unprocessed: 0
    };
    
    messages.forEach(msg => {
      const status = msg.status || (msg.processed === false ? 'unprocessed' : 'unknown');
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts.unknown++;
      }
    });
    
    return statusCounts;
  }
  
  /**
   * Analyze message timestamps
   */
  static analyzeTimestamps(messages) {
    const timestamps = messages.map(msg => {
      const date = msg.createdAt?.toDate?.() || new Date(msg.timestamp || msg.savedAt || Date.now());
      return {
        id: msg.id,
        timestamp: date.getTime(),
        dateString: date.toISOString()
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    const now = Date.now();
    const recentMessages = timestamps.filter(t => (now - t.timestamp) < (7 * 24 * 60 * 60 * 1000)); // Last 7 days
    
    return {
      oldest: timestamps[0]?.dateString || 'None',
      mostRecent: timestamps[timestamps.length - 1]?.dateString || 'None',
      recentCount: recentMessages.length,
      totalTimespan: timestamps.length > 1 ? 
        Math.round((timestamps[timestamps.length - 1].timestamp - timestamps[0].timestamp) / (24 * 60 * 60 * 1000)) : 0
    };
  }
  
  /**
   * Analyze message content
   */
  static analyzeContent(messages) {
    const contentFields = {
      hasText: 0,
      hasContent: 0,
      hasMessage: 0,
      hasMessageContent: 0,
      isEmpty: 0,
      totalFields: ['text', 'content', 'message', 'messageContent', 'body']
    };
    
    messages.forEach(msg => {
      if (msg.text) contentFields.hasText++;
      if (msg.content) contentFields.hasContent++;
      if (msg.message) contentFields.hasMessage++;
      if (msg.messageContent) contentFields.hasMessageContent++;
      
      const hasAnyContent = msg.text || msg.content || msg.message || msg.messageContent || msg.body;
      if (!hasAnyContent) contentFields.isEmpty++;
    });
    
    return contentFields;
  }
  
  /**
   * Identify potential issues
   */
  static identifyIssues(analysis) {
    const issues = [];
    
    // Check for high duplicate count
    if (analysis.duplicateAnalysis.totalDuplicates > 10) {
      issues.push({
        type: 'HIGH_DUPLICATES',
        severity: 'high',
        message: `${analysis.duplicateAnalysis.totalDuplicates} duplicate messages found`,
        recommendation: 'Check mobile app duplicate detection logic'
      });
    }
    
    // Check for empty content messages
    if (analysis.contentAnalysis.isEmpty > 5) {
      issues.push({
        type: 'EMPTY_CONTENT',
        severity: 'medium',
        message: `${analysis.contentAnalysis.isEmpty} messages with no content`,
        recommendation: 'Check message content extraction logic'
      });
    }
    
    // Check for unprocessed messages
    if (analysis.statusBreakdown.unprocessed > 10) {
      issues.push({
        type: 'UNPROCESSED_MESSAGES',
        severity: 'medium',
        message: `${analysis.statusBreakdown.unprocessed} unprocessed messages`,
        recommendation: 'Check analysis pipeline completion'
      });
    }
    
    return issues;
  }
  
  /**
   * Get current month key (YYYY-MM format)
   */
  static getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  /**
   * Compare with mobile app reported count
   */
  static async compareWithMobileCount(userId, mobileReportedCount) {
    try {
      const analysis = await this.analyzeUserMessageCounts(userId);
      
      if (!analysis.success) {
        return analysis;
      }
      
      const storedCount = analysis.analysis.totalStored;
      const discrepancy = mobileReportedCount - storedCount;
      
      const comparison = {
        mobileReported: mobileReportedCount,
        webStored: storedCount,
        discrepancy: discrepancy,
        discrepancyPercentage: Math.round((discrepancy / mobileReportedCount) * 100),
        potentialCauses: []
      };
      
      // Analyze potential causes
      if (discrepancy > 0) {
        comparison.potentialCauses.push({
          cause: 'DUPLICATES_ON_MOBILE',
          likelihood: 'high',
          description: `Mobile may be counting ${analysis.analysis.duplicateAnalysis.totalDuplicates} duplicates multiple times`,
          evidence: `${analysis.analysis.duplicateAnalysis.duplicateGroups} duplicate groups found`
        });
        
        if (analysis.analysis.contentAnalysis.isEmpty > 0) {
          comparison.potentialCauses.push({
            cause: 'FAILED_SAVES',
            likelihood: 'medium',
            description: `${analysis.analysis.contentAnalysis.isEmpty} messages with no content may have failed to save properly`,
            evidence: 'Empty content messages found in database'
          });
        }
        
        comparison.potentialCauses.push({
          cause: 'MOBILE_DOUBLE_COUNTING',
          likelihood: 'high',
          description: 'Mobile app may be analyzing some messages multiple times',
          evidence: `${discrepancy} messages difference suggests reanalysis of existing messages`
        });
      }
      
      return {
        success: true,
        analysis: analysis.analysis,
        comparison,
        recommendations: this.generateRecommendations(comparison, analysis.analysis)
      };
      
    } catch (error) {
      console.error('❌ Mobile count comparison failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate recommendations based on analysis
   */
  static generateRecommendations(comparison, analysis) {
    const recommendations = [];
    
    if (comparison.discrepancy > 0) {
      recommendations.push({
        priority: 'high',
        action: 'IMPLEMENT_INCREMENTAL_SCANNING',
        description: 'Implement incremental scanning to only analyze NEW messages',
        implementation: 'Track last scan timestamp and filter messages by date'
      });
      
      if (analysis.duplicateAnalysis.totalDuplicates > 10) {
        recommendations.push({
          priority: 'high',
          action: 'IMPROVE_DUPLICATE_DETECTION',
          description: 'Enhance duplicate detection in mobile app',
          implementation: 'Use better unique keys (text + sender + timestamp)'
        });
      }
      
      recommendations.push({
        priority: 'medium',
        action: 'ADD_ANALYSIS_TRACKING',
        description: 'Track which messages have been analyzed to prevent reanalysis',
        implementation: 'Store analysis status and timestamp for each message'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Quick diagnostic for immediate use
   */
  static async quickDiagnostic(userId, mobileCount = null) {
    try {
      const result = mobileCount ? 
        await this.compareWithMobileCount(userId, mobileCount) :
        await this.analyzeUserMessageCounts(userId);
      
      if (!result.success) {
        return `❌ Analysis failed: ${result.error}`;
      }
      
      // const analysis = result.analysis; // Commented out to fix ESLint warning
      const summary = result.analysis ? result.analysis : result.summary;
      
      let diagnostic = `📊 MESSAGE COUNT DIAGNOSTIC\n\n`;
      
      if (mobileCount) {
        diagnostic += `📱 Mobile Reported: ${result.comparison.mobileReported} messages\n`;
        diagnostic += `🌐 Web Stored: ${result.comparison.webStored} messages\n`;
        diagnostic += `📉 Discrepancy: ${result.comparison.discrepancy} messages (${result.comparison.discrepancyPercentage}%)\n\n`;
      } else {
        diagnostic += `🌐 Total Stored: ${summary.totalStored} messages\n\n`;
      }
      
      diagnostic += `🔍 ANALYSIS RESULTS:\n`;
      diagnostic += `• Potential Duplicates: ${summary.potentialDuplicates || 0}\n`;
      diagnostic += `• Duplicate Groups: ${summary.duplicateGroups || 0}\n`;
      diagnostic += `• Issues Found: ${summary.issueCount || 0}\n`;
      diagnostic += `• Most Recent: ${summary.mostRecentMessage || 'Unknown'}\n\n`;
      
      if (result.comparison?.potentialCauses?.length > 0) {
        diagnostic += `🔍 POTENTIAL CAUSES:\n`;
        result.comparison.potentialCauses.forEach(cause => {
          diagnostic += `• ${cause.cause}: ${cause.description}\n`;
        });
        diagnostic += `\n`;
      }
      
      if (result.recommendations?.length > 0) {
        diagnostic += `💡 RECOMMENDATIONS:\n`;
        result.recommendations.forEach(rec => {
          diagnostic += `• ${rec.action}: ${rec.description}\n`;
        });
      }
      
      return diagnostic;
      
    } catch (error) {
      return `❌ Diagnostic failed: ${error.message}`;
    }
  }
}

export default MessageCountAnalyzer;
