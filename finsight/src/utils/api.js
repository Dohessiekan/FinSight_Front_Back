// src/utils/api.js
// Utility for calling the SMS summary FastAPI backend

export async function getSmsSummary(messages) {
  const response = await fetch('http://localhost:8000/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error('API error');
  return await response.json();
}
