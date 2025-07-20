// SMS Inbox Field Mapping Test for FinSight Web Dashboard
// This utility helps test and debug message content extraction

import { fetchAllSMSMessages } from './firebaseMessages';

export const SMSInboxTester = {
  
  // Test message field mapping
  testMessageFieldMapping: async () => {
    try {
      console.log('🧪 Testing SMS Inbox field mapping...');
      
      const allMessages = await fetchAllSMSMessages();
      console.log(`📱 Found ${allMessages.length} total messages`);
      
      if (allMessages.length === 0) {
        return {
          success: true,
          message: 'No messages found in Firebase',
          analysis: {
            totalMessages: 0,
            fieldAnalysis: {},
            contentIssues: []
          }
        };
      }
      
      // Analyze field structures
      const fieldAnalysis = {};
      const contentIssues = [];
      
      allMessages.forEach((msg, index) => {
        // Check all possible content fields
        const contentFields = [
          'text', 'body', 'message', 'content', 
          'messageContent', 'messageText', 'smsContent',
          'originalMessage', 'rawMessage'
        ];
        
        const foundFields = [];
        const missingFields = [];
        
        contentFields.forEach(field => {
          if (msg[field] && typeof msg[field] === 'string' && msg[field].trim().length > 0) {
            foundFields.push({
              field,
              value: msg[field].substring(0, 50) + (msg[field].length > 50 ? '...' : ''),
              length: msg[field].length
            });
            
            if (!fieldAnalysis[field]) {
              fieldAnalysis[field] = { count: 0, examples: [] };
            }
            fieldAnalysis[field].count++;
            if (fieldAnalysis[field].examples.length < 3) {
              fieldAnalysis[field].examples.push(msg[field].substring(0, 50) + '...');
            }
          } else {
            missingFields.push(field);
          }
        });
        
        if (foundFields.length === 0) {
          contentIssues.push({
            messageId: msg.id || `index_${index}`,
            userId: msg.userId || 'unknown',
            issue: 'No content fields found',
            availableFields: Object.keys(msg).filter(key => 
              typeof msg[key] === 'string' && msg[key].length > 0
            ),
            sample: JSON.stringify(msg, null, 2).substring(0, 200) + '...'
          });
        }
      });
      
      return {
        success: true,
        analysis: {
          totalMessages: allMessages.length,
          fieldAnalysis,
          contentIssues,
          recommendations: generateRecommendations(fieldAnalysis, contentIssues)
        }
      };
      
    } catch (error) {
      console.error('❌ SMS Inbox field mapping test failed:', error);
      return {
        success: false,
        error: error.message,
        analysis: null
      };
    }
  },
  
  // Test current SMS Inbox extraction logic
  testCurrentExtractionLogic: async () => {
    try {
      const allMessages = await fetchAllSMSMessages();
      const transformedMessages = allMessages.map(msg => {
        // This mirrors the logic in SMSInboxClean.js
        return {
          id: msg.id || `msg_${Date.now()}_${Math.random()}`,
          userId: msg.userId || 'unknown',
          sender: msg.senderName || msg.sender || 'Unknown Sender',
          phone: msg.senderPhone || msg.phone || msg.from || 'Unknown Number',
          content: msg.messageContent || msg.content || msg.message || msg.text || 'No content',
          extractedContent: {
            messageContent: msg.messageContent || null,
            content: msg.content || null,
            message: msg.message || null,
            text: msg.text || null,
            fallback: 'No content'
          },
          hasContent: !!(msg.messageContent || msg.content || msg.message || msg.text),
          originalData: msg
        };
      });
      
      const withContent = transformedMessages.filter(msg => msg.hasContent);
      const withoutContent = transformedMessages.filter(msg => !msg.hasContent);
      
      return {
        success: true,
        analysis: {
          totalMessages: transformedMessages.length,
          messagesWithContent: withContent.length,
          messagesWithoutContent: withoutContent.length,
          contentSuccessRate: `${Math.round((withContent.length / transformedMessages.length) * 100)}%`,
          sampleWithContent: withContent.slice(0, 3).map(msg => ({
            id: msg.id,
            content: msg.content.substring(0, 100) + '...',
            extractedFrom: Object.keys(msg.extractedContent).find(key => 
              msg.extractedContent[key] && msg.extractedContent[key] === msg.content
            )
          })),
          sampleWithoutContent: withoutContent.slice(0, 3).map(msg => ({
            id: msg.id,
            availableFields: Object.keys(msg.originalData).filter(key => 
              typeof msg.originalData[key] === 'string' && msg.originalData[key].length > 0
            )
          }))
        }
      };
      
    } catch (error) {
      console.error('❌ Current extraction logic test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Generate recommendations based on analysis
const generateRecommendations = (fieldAnalysis, contentIssues) => {
  const recommendations = [];
  
  // Find most common content field
  const sortedFields = Object.entries(fieldAnalysis)
    .sort(([,a], [,b]) => b.count - a.count);
  
  if (sortedFields.length > 0) {
    const [mostCommonField, data] = sortedFields[0];
    recommendations.push(
      `Primary content field: '${mostCommonField}' (${data.count} messages)`
    );
  }
  
  if (contentIssues.length > 0) {
    recommendations.push(
      `${contentIssues.length} messages have no recognizable content fields`
    );
    
    // Analyze what fields are available in problematic messages
    const alternativeFields = new Set();
    contentIssues.forEach(issue => {
      issue.availableFields.forEach(field => alternativeFields.add(field));
    });
    
    if (alternativeFields.size > 0) {
      recommendations.push(
        `Consider checking these alternative fields: ${Array.from(alternativeFields).join(', ')}`
      );
    }
  }
  
  // Field priority recommendation
  if (sortedFields.length > 1) {
    const fieldPriority = sortedFields.map(([field]) => field).join(' > ');
    recommendations.push(
      `Recommended field priority: ${fieldPriority}`
    );
  }
  
  return recommendations;
};

export default SMSInboxTester;
