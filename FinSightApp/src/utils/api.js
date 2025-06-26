// Placeholder for API calls to your backend/model
export async function analyzeMessages(messages) {
  // Use your backend IP address and port here
  const API_URL = 'http://192.168.0.103:8000/predict'; // Use your computer's local IP
  // Analyze each message
  const analyzed = await Promise.all(
    messages.map(async (msg) => {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg.text }),
        });
        const data = await res.json();
        return {
          ...msg,
          status: data.label === 'spam' ? 'fraud' : 'safe',
          analysis: `Model: ${data.label} (confidence: ${(data.confidence * 100).toFixed(1)}%)`,
          confidence: data.confidence,
          probabilities: data.probabilities,
        };
      } catch (e) {
        return { ...msg, status: 'suspicious', analysis: 'API error' };
      }
    })
  );
  return analyzed;
}

export async function getWeeklySummary(userId) {
  // Call your backend for weekly summary
  return { sent: 0, received: 0 };
}

export async function getSmsSummary(messages) {
  // Use your backend IP address and port here
  const API_URL = 'http://192.168.0.103:8000/predict'; // Replace with your computer's local IP
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error('API error');
  return await response.json();
}
