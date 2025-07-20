// API calls to your backend/model
// Configuration for different environments
const API_CONFIG = {
  // Production API (Render.com deployment) - for APK distribution
  production: 'https://finsight-front-back-2.onrender.com',
  
  // Development API (local machine) - for testing
  development: 'http://localhost:8000', // Local machine IP
};

// Use production API for deployed version
const API_BASE_URL = API_CONFIG.production;

console.log('🔗 API Base URL:', API_BASE_URL);

export async function analyzeMessages(messages) {
  try {
    // Use batch processing for better performance
    const response = await fetch(`${API_BASE_URL}/predict-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.map(msg => msg.text) }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Since predict-sms returns a summary, we'll mark all messages as analyzed
    // and provide a general analysis based on the summary
    const analyzed = messages.map((msg, index) => {
      let status = 'safe';
      
      // Basic fraud detection based on summary data
      if (data.total_sent > 100000) { // Large amounts sent
        status = 'suspicious';
      }
      
      return {
        ...msg,
        status,
        analysis: `Transaction analysis complete. Total processed: ${data.transactions_count || 0} messages`,
        summary: data,
      };
    });
    
    return analyzed;
  } catch (error) {
    console.error('Error analyzing messages:', error);
    // Return messages with error status
    return messages.map(msg => ({
      ...msg,
      status: 'suspicious',
      analysis: 'API analysis failed - manual review needed'
    }));
  }
}

export async function getWeeklySummary(userId) {
  // Call your backend for weekly summary
  return { sent: 0, received: 0 };
}

export async function getSmsSummary(messages) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for analysis
    
    console.log('Sending request to predict-sms endpoint with', messages.length, 'messages');
    
    const response = await fetch(`${API_BASE_URL}/predict-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Financial summary from predict-sms endpoint:', data);
    
    // Return the financial summary data
    return {
      transactions_count: data.transactions_count || 0,
      amount_transactions_count: data.amount_transactions_count || 0,
      total_sent: data.total_sent || 0,
      total_received: data.total_received || 0,
      total_withdrawn: data.total_withdrawn || 0,
      total_airtime: data.total_airtime || 0,
      latest_balance: data.latest_balance || 0,
      suspicious_transactions: 0, // This endpoint focuses on financial analysis
      fraud_indicators: [],
      monthly_summary: data.monthly_summary || {},
      message: `Real SMS analysis completed successfully. Processed ${data.transactions_count || 0} messages, found ${data.amount_transactions_count || 0} with financial amounts.`
    };
  } catch (error) {
    console.error('Error getting SMS summary from predict-sms:', error);
    
    // Return mock data when API fails
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('API timeout - returning mock data');
      return {
        transactions_count: 5,
        total_sent: 125000,
        total_received: 245000,
        total_withdrawn: 50000,
        total_airtime: 15000,
        latest_balance: 185000,
        suspicious_transactions: 1,
        fraud_indicators: [],
        monthly_summary: {},
        message: 'API timeout - showing sample data'
      };
    }
    
    // For other errors, also return mock data
    return {
      transactions_count: 3,
      total_sent: 75000,
      total_received: 150000,
      total_withdrawn: 30000,
      total_airtime: 5000,
      latest_balance: 125000,
      suspicious_transactions: 0,
      fraud_indicators: [],
      monthly_summary: {},
      message: `API error: ${error.message} - showing sample data`
    };
  }
}

export async function scanMessages(messages) {
  try {
    // Ensure messages is always an array
    const messageArray = Array.isArray(messages) ? messages : [messages];
    
    // Filter messages to only include those from the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentMonthMessages = messageArray.filter(message => {
      // Handle different message formats
      let messageDate;
      if (typeof message === 'string') {
        // If it's just a string, we can't filter by date, so include it
        return true;
      } else if (message.date) {
        messageDate = new Date(message.date);
      } else if (message.timestamp) {
        messageDate = new Date(message.timestamp);
      } else if (message.dateReceived) {
        messageDate = new Date(message.dateReceived);
      } else {
        // If no date field found, include the message
        return true;
      }
      
      // Check if message is from current month and year
      return messageDate.getMonth() === currentMonth && 
             messageDate.getFullYear() === currentYear;
    });
    
    // If no messages from current month, return proper error structure
    if (currentMonthMessages.length === 0) {
      console.log('No messages from current month found');
      const errorResult = {
        label: 'no_data',
        confidence: 0.0,
        probabilities: { no_data: 1.0 },
        message: 'No messages from current month to analyze'
      };
      return messageArray.length === 1 ? errorResult : [errorResult];
    }
    
    // Extract text content for API call
    const messageTexts = currentMonthMessages.map(msg => 
      typeof msg === 'string' ? msg : msg.text || msg.body || String(msg)
    );
    
    // Use the updated /predict-spam endpoint that handles both single and batch
    const payload = messageTexts.length === 1 
      ? { text: messageTexts[0] }  // Single message
      : { messages: messageTexts }; // Multiple messages
    
    const response = await fetch(`${API_BASE_URL}/predict-spam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('API Response status:', response.status);
    console.log('API Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Scan result:', data);
    console.log(`Analyzed ${currentMonthMessages.length} messages from current month (${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })})`);
    
    // Ensure the response has valid structure with defaults
    const normalizeResult = (result) => ({
      label: result?.label || 'unknown',
      confidence: result?.confidence || 0.0,
      probabilities: result?.probabilities || { unknown: 1.0 }
    });
    
    // Return normalized data - backend returns array for multiple messages, single object for single message
    if (Array.isArray(data)) {
      return data.map(normalizeResult);
    } else {
      return normalizeResult(data);
    }
  } catch (error) {
    console.error('Error scanning messages:', error);
    console.log('Falling back to local analysis...');
    
    // Fallback: Basic local fraud detection
    const messageArray = Array.isArray(messages) ? messages : [messages];
    const results = messageArray.map(msg => {
      const text = typeof msg === 'string' ? msg : msg.text || msg.body || String(msg);
      
      // Simple keyword-based detection
      const suspiciousKeywords = ['urgent', 'winner', 'claim', 'prize', 'congratulations', 'lottery', 'click here', 'verify account'];
      const fraudKeywords = ['send money', 'transfer funds', 'bank details', 'pin', 'password'];
      
      const lowerText = text.toLowerCase();
      const hasFraudKeywords = fraudKeywords.some(keyword => lowerText.includes(keyword));
      const hasSuspiciousKeywords = suspiciousKeywords.some(keyword => lowerText.includes(keyword));
      
      let label = 'ham'; // legitimate
      let confidence = 0.7;
      
      if (hasFraudKeywords) {
        label = 'spam';
        confidence = 0.9;
      } else if (hasSuspiciousKeywords) {
        label = 'spam';
        confidence = 0.6;
      }
      
      return {
        label,
        confidence,
        probabilities: { 
          ham: label === 'ham' ? confidence : 1 - confidence,
          spam: label === 'spam' ? confidence : 1 - confidence
        }
      };
    });
    
    console.log('Local analysis results:', results);
    return messageArray.length === 1 ? results[0] : results;
  }
}

export async function analyzeMessagesComprehensive(messages, userId) {
  try {
    // Filter messages to only include those from the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentMonthMessages = messages.filter(message => {
      let messageDate;
      if (message.date) {
        messageDate = new Date(message.date);
      } else if (message.timestamp) {
        messageDate = new Date(message.timestamp);
      } else if (message.dateReceived) {
        messageDate = new Date(message.dateReceived);
      } else {
        // If no date field found, include the message
        return true;
      }
      
      // Check if message is from current month and year
      return messageDate.getMonth() === currentMonth && 
             messageDate.getFullYear() === currentYear;
    });
    
    if (currentMonthMessages.length === 0) {
      return {
        success: true,
        data: {
          spam_analysis: { results: [] },
          financial_summary: {
            total_messages: 0,
            spam_detected: 0,
            safe_messages: 0,
            message: `No messages from current month (${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}) to analyze`
          }
        }
      };
    }

    // Use the scanMessages function which calls predict-spam endpoint
    const results = await Promise.all(
      currentMonthMessages.map(async (message, index) => {
        const scanResult = await scanMessages([message]);
        return {
          message_index: index,
          prediction: {
            is_spam: scanResult.label === 'spam' || scanResult.label === 'fraud',
            confidence: scanResult.confidence || 0,
            label: scanResult.label,
            probabilities: scanResult.probabilities
          }
        };
      })
    );

    // Create a comprehensive response structure
    return {
      success: true,
      data: {
        spam_analysis: {
          results: results
        },
        financial_summary: {
          total_messages: currentMonthMessages.length,
          spam_detected: results.filter(r => r.prediction.is_spam).length,
          safe_messages: results.filter(r => !r.prediction.is_spam).length,
          month_analyzed: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
        }
      }
    };
  } catch (error) {
    console.error('Error in comprehensive analysis:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function detectSpamBatch(messages) {
  try {
    // Extract just the text from messages if they're objects
    const messageTexts = messages.map(msg => 
      typeof msg === 'string' ? msg : msg.text || msg.body || String(msg)
    );
    
    const result = await scanMessages(messageTexts);
    return {
      success: true,
      results: Array.isArray(result) ? result : [result]
    };
  } catch (error) {
    console.error('Error in batch spam detection:', error);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}

// Dedicated function for analyzing current month SMS messages
export async function analyzeCurrentMonthSMS(smsService) {
  try {
    console.log('Starting current month SMS analysis...');
    
    // Check permissions
    const hasPermissions = await smsService.checkSMSPermissions();
    if (!hasPermissions) {
      const granted = await smsService.requestSMSPermissions();
      if (!granted) {
        throw new Error('SMS permissions required');
      }
    }

    // Get all SMS messages
    const allMessages = await smsService.getAllSMS({ maxCount: 1000 });
    console.log(`Retrieved ${allMessages.length} total SMS messages`);
    
    // Filter to current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentMonthMessages = allMessages.filter(message => {
      const messageDate = new Date(parseInt(message.date));
      return messageDate.getMonth() === currentMonth && 
             messageDate.getFullYear() === currentYear;
    });
    
    console.log(`Found ${currentMonthMessages.length} messages from current month`);
    
    if (currentMonthMessages.length === 0) {
      return {
        success: false,
        error: 'No SMS messages found for current month',
        data: {
          transactions_count: 0,
          total_sent: 0,
          total_received: 0,
          total_withdrawn: 0,
          total_airtime: 0,
          latest_balance: 0,
          monthly_summary: {},
          message: 'No messages from current month'
        }
      };
    }

    // Extract message texts and filter for financial transactions
    const messageTexts = currentMonthMessages.map(msg => msg.body || msg.text || '');
    
    // More comprehensive filtering for transaction-related messages
    const transactionMessages = messageTexts.filter(text => {
      const textLower = text.toLowerCase();
      
      // Core financial indicators
      const hasFinancialKeywords = textLower.includes('rwf') || 
                                   textLower.includes('balance') || 
                                   textLower.includes('transaction');
      
      // Payment/Transfer keywords
      const hasPaymentKeywords = textLower.includes('payment') || 
                                  textLower.includes('paid') || 
                                  textLower.includes('transfer') || 
                                  textLower.includes('sent') || 
                                  textLower.includes('send') ||
                                  textLower.includes('received') || 
                                  textLower.includes('receive') ||
                                  textLower.includes('deposit') ||
                                  textLower.includes('credited') ||
                                  textLower.includes('debited');
      
      // Banking/Mobile Money keywords
      const hasBankingKeywords = textLower.includes('withdraw') || 
                                 textLower.includes('airtime') ||
                                 textLower.includes('bundle') ||
                                 textLower.includes('momo') ||
                                 textLower.includes('mobile money') ||
                                 textLower.includes('bank') ||
                                 textLower.includes('atm') ||
                                 textLower.includes('account');
      
      // Service providers (Rwanda specific)
      const hasProviderKeywords = textLower.includes('mtn') ||
                                  textLower.includes('airtel') ||
                                  textLower.includes('tigo') ||
                                  textLower.includes('bk') ||
                                  textLower.includes('equity') ||
                                  textLower.includes('cogebanque') ||
                                  textLower.includes('ecobank');
      
      // Financial amounts (numbers with common currency formats)
      const hasAmountPattern = /\d+(?:,\d{3})*\s*(?:rwf|frw|rf)/i.test(text) ||
                               /(?:rwf|frw|rf)\s*\d+(?:,\d{3})*/i.test(text);
      
      // Balance or account information
      const hasBalanceInfo = textLower.includes('your balance') ||
                             textLower.includes('new balance') ||
                             textLower.includes('current balance') ||
                             textLower.includes('remaining balance') ||
                             textLower.includes('account balance');
      
      // Return true if message has any financial relevance
      return hasFinancialKeywords || 
             hasPaymentKeywords || 
             hasBankingKeywords || 
             hasProviderKeywords || 
             hasAmountPattern || 
             hasBalanceInfo ||
             // Even broader catch for any message mentioning money-related terms
             textLower.includes('money') ||
             textLower.includes('cash') ||
             textLower.includes('fund') ||
             textLower.includes('bill') ||
             textLower.includes('fee') ||
             textLower.includes('charge') ||
             textLower.includes('cost') ||
             textLower.includes('price') ||
             textLower.includes('amount') ||
             textLower.includes('total') ||
             textLower.includes('salary') ||
             textLower.includes('loan') ||
             textLower.includes('debt') ||
             textLower.includes('refund');
    });

    console.log(`Found ${transactionMessages.length} transaction-related messages`);
    
    if (transactionMessages.length === 0) {
      console.log('No transaction messages found. Sample messages:', messageTexts.slice(0, 3));
      return {
        success: false,
        error: 'No transaction messages found for current month',
        data: {
          transactions_count: currentMonthMessages.length,
          amount_transactions_count: 0,
          total_sent: 0,
          total_received: 0,
          total_withdrawn: 0,
          total_airtime: 0,
          latest_balance: 0,
          monthly_summary: {},
          message: `Found ${currentMonthMessages.length} SMS messages but none appear to be transaction-related`
        }
      };
    }

    // Send to API for financial analysis
    const summary = await getSmsSummary(transactionMessages);
    
    return {
      success: true,
      data: summary,
      messageCount: currentMonthMessages.length,
      transactionCount: transactionMessages.length
    };
    
  } catch (error) {
    console.error('Error analyzing current month SMS:', error);
    return {
      success: false,
      error: error.message,
      data: {
        transactions_count: 0,
        total_sent: 0,
        total_received: 0,
        total_withdrawn: 0,
        total_airtime: 0,
        latest_balance: 0,
        monthly_summary: {},
        message: `Analysis failed: ${error.message}`
      }
    };
  }
}
