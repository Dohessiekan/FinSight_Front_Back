// API calls to your backend/model
const API_BASE_URL = 'http://192.168.1.65:8000'; // Replace with your computer's local IP

export async function analyzeMessages(messages) {
  try {
    const analyzed = await Promise.all(
      messages.map(async (msg) => {
        try {
          const res = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [msg.text] }),
          });
          
          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }
          
          const data = await res.json();
          
          // Determine status based on API response
          let status = 'safe';
          if (data.suspicious_transactions > 0) {
            status = 'suspicious';
          }
          if (data.fraud_indicators && data.fraud_indicators.length > 0) {
            status = 'fraud';
          }
          
          return {
            ...msg,
            status,
            analysis: `Found ${data.transactions_count} transactions. Sent: RWF ${data.total_sent || 0}, Received: RWF ${data.total_received || 0}`,
            summary: data,
          };
        } catch (e) {
          console.error('Error analyzing individual message:', e);
          return { 
            ...msg, 
            status: 'suspicious', 
            analysis: 'API analysis failed - manual review needed' 
          };
        }
      })
    );
    return analyzed;
  } catch (error) {
    console.error('Error analyzing messages:', error);
    throw error;
  }
}

export async function getWeeklySummary(userId) {
  // Call your backend for weekly summary
  return { sent: 0, received: 0 };
}

export async function getSmsSummary(messages) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${API_BASE_URL}/predict`, {
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
    console.log('Raw API response:', data);
    return data;
  } catch (error) {
    console.error('Error getting SMS summary:', error);
    
    // Return mock data when API fails
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('API timeout - returning mock data');
      return {
        transactions_count: 5,
        total_sent: 125000,
        total_received: 245000,
        latest_balance: 185000,
        suspicious_transactions: 1,
        fraud_indicators: [],
        message: 'API timeout - showing sample data'
      };
    }
    
    // For other errors, also return mock data
    return {
      transactions_count: 3,
      total_sent: 75000,
      total_received: 150000,
      latest_balance: 125000,
      suspicious_transactions: 0,
      fraud_indicators: [],
      message: 'API unavailable - showing sample data'
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

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
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
    
    // Return appropriate error structure with valid fields
    const messageArray = Array.isArray(messages) ? messages : [messages];
    const errorResult = {
      label: 'error',
      confidence: 0.0,
      probabilities: { error: 1.0 },
    };
    
    if (messageArray.length > 1) {
      return messageArray.map(() => errorResult);
    } else {
      return errorResult;
    }
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
