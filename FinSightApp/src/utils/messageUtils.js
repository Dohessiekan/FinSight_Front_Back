/**
 * Message utility functions for extracting financial information from SMS messages
 */

/**
 * Extract financial information from SMS message text
 * @param {string} messageText - The SMS message text to analyze
 * @returns {object} - Extracted financial information
 */
export const extractFinancialInfo = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return {
      amount: null,
      type: 'unknown',
      balance: null,
      transactionId: null,
      date: null
    };
  }

  const text = messageText.toLowerCase();
  const result = {
    amount: null,
    type: 'transaction',
    balance: null,
    transactionId: null,
    date: null
  };

  // Extract amount patterns
  const amountPatterns = [
    /(?:rwf|frw)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rwf|frw)/i,
    /amount[:\s]+([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:sent|received|withdrawn|credited|debited)\s+(?:rwf|frw)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
  ];

  for (const pattern of amountPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      result.amount = `RWF ${match[1].replace(/,/g, '')}`;
      break;
    }
  }

  // Extract balance
  const balancePatterns = [
    /(?:new\s+)?balance[:\s]+(?:rwf|frw)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:available\s+)?balance[:\s]+(?:rwf|frw)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
  ];

  for (const pattern of balancePatterns) {
    const match = messageText.match(pattern);
    if (match) {
      result.balance = `RWF ${match[1].replace(/,/g, '')}`;
      break;
    }
  }

  // Extract transaction ID
  const idPatterns = [
    /(?:ref|reference|transaction\s+id|txn\s+id)[:\s]+([a-zA-Z0-9]+)/i,
    /(?:external\s+transaction\s+id)[:\s]+([a-zA-Z0-9]+)/i,
    /(?:financial\s+transaction\s+id)[:\s]+([a-zA-Z0-9]+)/i
  ];

  for (const pattern of idPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      result.transactionId = match[1];
      break;
    }
  }

  // Determine transaction type
  if (text.includes('sent') || text.includes('transfer')) {
    result.type = 'sent';
  } else if (text.includes('received') || text.includes('credited')) {
    result.type = 'received';
  } else if (text.includes('withdrawn') || text.includes('debited')) {
    result.type = 'withdrawal';
  } else if (text.includes('airtime') || text.includes('data bundle')) {
    result.type = 'airtime';
  } else if (text.includes('payment') || text.includes('paid')) {
    result.type = 'payment';
  } else if (text.includes('deposit')) {
    result.type = 'deposit';
  }

  // Extract date if present
  const datePatterns = [
    /(?:on|date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
  ];

  for (const pattern of datePatterns) {
    const match = messageText.match(pattern);
    if (match) {
      result.date = match[1];
      break;
    }
  }

  return result;
};

/**
 * Check if a message contains financial/transaction keywords
 * @param {string} messageText - The SMS message text to check
 * @returns {boolean} - True if message appears to be financial
 */
export const isFinancialMessage = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return false;
  }

  const text = messageText.toLowerCase();
  
  const financialKeywords = [
    'sent', 'received', 'withdrawn', 'bought airtime', 'buy airtime',
    'payment', 'paid', 'deposit', 'credited', 'debited', 'transfer',
    'transaction', 'purchase', 'completed', 'rwf', 'frw', 'amount',
    'balance', 'new balance', 'fee', 'momo', 'mobile money',
    'data bundle', 'airtime', 'ref:', 'transaction id', 'mtn',
    'airtel', 'tigo', 'bank', 'equity', 'cogebanque', 'ecobank'
  ];

  return financialKeywords.some(keyword => text.includes(keyword)) ||
         /\d+(?:,\d{3})*\s*(?:rwf|frw)/i.test(messageText) ||
         /(?:rwf|frw)\s*\d+(?:,\d{3})*/i.test(messageText);
};

/**
 * Classify message risk level based on content
 * @param {string} messageText - The SMS message text to analyze
 * @returns {string} - Risk level: 'low', 'medium', 'high'
 */
export const classifyRiskLevel = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return 'low';
  }

  const text = messageText.toLowerCase();
  
  const highRiskKeywords = [
    'urgent', 'immediate', 'suspend', 'block', 'verify now',
    'click here', 'call immediately', 'winner', 'congratulations',
    'prize', 'lottery', 'inheritance', 'foreign', 'beneficiary'
  ];

  const mediumRiskKeywords = [
    'verify', 'confirm', 'update', 'expired', 'limited time',
    'act now', 'temporary', 'security'
  ];

  if (highRiskKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }

  if (mediumRiskKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }

  return 'low';
};

/**
 * Format currency amount for display
 * @param {string|number} amount - The amount to format
 * @returns {string} - Formatted amount string
 */
export const formatCurrency = (amount) => {
  if (!amount) return '';
  
  const numAmount = typeof amount === 'string' 
    ? parseFloat(amount.replace(/[^\d.]/g, ''))
    : amount;
  
  if (isNaN(numAmount)) return '';
  
  return `RWF ${numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Extract phone number from message sender
 * @param {string} sender - The sender information
 * @returns {string} - Cleaned phone number
 */
export const extractPhoneNumber = (sender) => {
  if (!sender) return 'Unknown';
  
  // Remove any non-digit characters except +
  const cleaned = sender.replace(/[^\d+]/g, '');
  
  // If it starts with +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's a Rwanda number starting with 07, format it
  if (cleaned.startsWith('07') && cleaned.length === 10) {
    return `+25${cleaned}`;
  }
  
  // If it starts with 25007, format it
  if (cleaned.startsWith('25007') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  return cleaned || sender;
};

export default {
  extractFinancialInfo,
  isFinancialMessage,
  classifyRiskLevel,
  formatCurrency,
  extractPhoneNumber
};
