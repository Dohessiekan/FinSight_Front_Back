// API calls to your backend/model
const API_BASE_URL = 'http://192.168.0.103:8000'; // Replace with your computer's local IP

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
