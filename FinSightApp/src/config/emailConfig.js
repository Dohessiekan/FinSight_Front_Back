/**
 * Email configuration for Firebase Auth
 * Update these settings based on your app's domain and branding
 */

export const EMAIL_CONFIG = {
  // Your app's domain (update when you have a custom domain)
  appDomain: 'finsight-9d1fd.firebaseapp.com',
  
  // Custom domain for better deliverability (optional)
  customDomain: null, // e.g., 'finsight.app'
  
  // Dynamic links domain (set up in Firebase Console)
  dynamicLinkDomain: null, // e.g., 'finsight.page.link'
  
  // App package/bundle identifiers
  android: {
    packageName: 'com.finsight.app', // Update with your actual package name
    installApp: true,
    minimumVersion: '1.0'
  },
  
  ios: {
    bundleId: 'com.finsight.app' // Update with your actual bundle ID
  },
  
  // Email sender information
  sender: {
    name: 'FinSight Security Team',
    address: 'noreply@finsight-9d1fd.firebaseapp.com' // This will be automatically set by Firebase
  },
  
  // Support contact information
  support: {
    email: 'support@finsight.app', // Update with your actual support email
    website: 'https://finsight.app/support' // Update with your actual support page
  }
};

/**
 * Get action code settings for Firebase Auth
 * @param {string} action - The action type ('PASSWORD_RESET', 'VERIFY_EMAIL', etc.)
 * @returns {object} Action code settings
 */
export const getActionCodeSettings = (action = 'PASSWORD_RESET') => {
  const baseUrl = EMAIL_CONFIG.customDomain 
    ? `https://${EMAIL_CONFIG.customDomain}` 
    : `https://${EMAIL_CONFIG.appDomain}`;
    
  const settings = {
    url: `${baseUrl}/__/auth/action`,
    handleCodeInApp: false,
    iOS: EMAIL_CONFIG.ios,
    android: EMAIL_CONFIG.android
  };
  
  // Add dynamic link domain if configured
  if (EMAIL_CONFIG.dynamicLinkDomain) {
    settings.dynamicLinkDomain = EMAIL_CONFIG.dynamicLinkDomain;
  }
  
  return settings;
};

/**
 * Email templates configuration
 * These can be customized in Firebase Console → Authentication → Templates
 */
export const EMAIL_TEMPLATES = {
  PASSWORD_RESET: {
    subject: 'Reset your password for FinSight',
    // Note: Template body is configured in Firebase Console
  },
  
  EMAIL_VERIFICATION: {
    subject: 'Verify your email for FinSight',
  },
  
  PASSWORD_CHANGE: {
    subject: 'Your FinSight password was changed',
  }
};

/**
 * Common spam trigger words to avoid in email content
 */
export const SPAM_TRIGGER_WORDS = [
  'urgent', 'act now', 'limited time', 'free', 'winner',
  'congratulations', 'click here', 'call now', 'order now',
  'don\'t delay', 'expires soon', 'hurry up', 'instant',
  'immediately', 'guaranteed', 'risk free', 'no obligation'
];

/**
 * Email deliverability best practices
 */
export const DELIVERABILITY_TIPS = {
  subject: [
    'Keep subject lines under 50 characters',
    'Use clear, descriptive language',
    'Include your app name for brand recognition',
    'Avoid excessive punctuation and capital letters',
    'Don\'t use spam trigger words'
  ],
  
  content: [
    'Use plain text and simple HTML',
    'Include your company name and contact information',
    'Provide clear instructions for the user',
    'Include an unsubscribe link if required',
    'Use consistent branding across all emails'
  ],
  
  technical: [
    'Set up SPF, DKIM, and DMARC records',
    'Use a custom domain for better reputation',
    'Monitor email delivery rates',
    'Test with multiple email providers',
    'Maintain good sender reputation'
  ]
};
