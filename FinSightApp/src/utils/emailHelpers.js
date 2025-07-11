/**
 * Email helpers for improving deliverability and user experience
 */

// Common email domains and their specific spam folder names
export const EMAIL_PROVIDERS = {
  gmail: {
    domain: 'gmail.com',
    spamFolders: ['Spam', 'Promotions'],
    instructions: 'Check your "Spam" or "Promotions" tabs in Gmail'
  },
  outlook: {
    domain: 'outlook.com',
    spamFolders: ['Junk Email'],
    instructions: 'Check your "Junk Email" folder in Outlook'
  },
  hotmail: {
    domain: 'hotmail.com',
    spamFolders: ['Junk Email'],
    instructions: 'Check your "Junk Email" folder in Hotmail'
  },
  yahoo: {
    domain: 'yahoo.com',
    spamFolders: ['Spam', 'Bulk'],
    instructions: 'Check your "Spam" or "Bulk" folder in Yahoo Mail'
  },
  icloud: {
    domain: 'icloud.com',
    spamFolders: ['Junk'],
    instructions: 'Check your "Junk" folder in iCloud Mail'
  }
};

/**
 * Get provider-specific instructions for checking spam folders
 * @param {string} email - User's email address
 * @returns {object} Provider info and instructions
 */
export const getEmailProviderInfo = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return null;
  }

  // Check for exact matches first
  for (const [key, provider] of Object.entries(EMAIL_PROVIDERS)) {
    if (domain === provider.domain) {
      return {
        provider: key,
        ...provider
      };
    }
  }

  // Check for partial matches (e.g., gmail variants)
  if (domain.includes('gmail')) {
    return { provider: 'gmail', ...EMAIL_PROVIDERS.gmail };
  }
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) {
    return { provider: 'outlook', ...EMAIL_PROVIDERS.outlook };
  }
  if (domain.includes('yahoo')) {
    return { provider: 'yahoo', ...EMAIL_PROVIDERS.yahoo };
  }

  // Default instructions for unknown providers
  return {
    provider: 'unknown',
    domain: domain,
    spamFolders: ['Spam', 'Junk'],
    instructions: 'Check your spam or junk folder'
  };
};

/**
 * Generate helpful message for password reset emails
 * @param {string} email - User's email address
 * @returns {string} Formatted message with provider-specific instructions
 */
export const generatePasswordResetMessage = (email) => {
  const providerInfo = getEmailProviderInfo(email);
  
  let message = `We've sent a password reset link to ${email}.\n\n`;
  
  if (providerInfo) {
    message += `📧 ${providerInfo.instructions}\n\n`;
  } else {
    message += `📧 Please check your spam/junk folder\n\n`;
  }
  
  message += `💡 Tips to find the email:\n`;
  message += `• The email is from Firebase (noreply@finsight-9d1fd.firebaseapp.com)\n`;
  message += `• Subject: "Reset your password for FinSight"\n`;
  message += `• It may take 2-5 minutes to arrive\n\n`;
  message += `🔒 If you don't see it:\n`;
  message += `• Check your email address is correct\n`;
  message += `• Try adding Firebase to your contacts\n`;
  message += `• Check all email folders\n`;
  message += `• Wait a few minutes and refresh`;

  return message;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get suggestions for improving email deliverability
 * @returns {array} Array of suggestion strings
 */
export const getDeliverabilityTips = () => {
  return [
    'Add noreply@finsight-9d1fd.firebaseapp.com to your contacts',
    'Check your spam/junk folder regularly',
    'Mark previous emails from Firebase as "Not Spam"',
    'Ensure your email storage isn\'t full',
    'Try using a different email provider if issues persist'
  ];
};
