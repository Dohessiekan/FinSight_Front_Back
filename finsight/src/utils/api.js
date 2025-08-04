// src/utils/api.js
// Utility for calling the SMS summary FastAPI backend

// API Configuration - uses environment variables for production deployment
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

console.log('🔗 API Base URL:', API_BASE_URL); // Debug log

export async function getSmsSummary(messages) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error('API error');
  return await response.json();
}

// Additional API utility functions for production
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function predictSpam(text) {
  const response = await fetch(`${API_BASE_URL}/predict-spam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('Spam prediction API error');
  return await response.json();
}

export async function predictSms(messages) {
  const response = await fetch(`${API_BASE_URL}/predict-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error('SMS prediction API error');
  return await response.json();
}
