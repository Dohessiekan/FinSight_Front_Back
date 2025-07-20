// Component to properly display SMS analysis results from mobile app
import React from 'react';

const SMSAnalysisDisplay = ({ message }) => {
  const { analysis } = message;

  // If no analysis data exists
  if (!analysis) {
    return (
      <div className="analysis-pending">
        <span className="analysis-status pending">🤖 AI Analysis</span>
        <span className="analysis-text">AI analysis pending</span>
      </div>
    );
  }

  // Extract analysis data with proper fallbacks
  const isFraud = analysis.isFraud || false;
  const confidence = Math.round((analysis.confidence || 0) * 100);
  const category = analysis.category || 'General SMS';
  const riskLevel = analysis.riskLevel || 'low';

  // Create human-readable analysis summary
  const getAnalysisText = () => {
    if (isFraud) {
      return `FRAUD DETECTED - ${category} (${confidence}% confidence)`;
    } else {
      return `SAFE - ${category} (${confidence}% confidence)`;
    }
  };

  const getStatusClass = () => {
    if (isFraud) return 'fraud';
    if (riskLevel === 'medium') return 'warning';
    return 'safe';
  };

  const getStatusIcon = () => {
    if (isFraud) return '🚨';
    if (riskLevel === 'medium') return '⚠️';
    return '✅';
  };

  return (
    <div className={`analysis-result ${getStatusClass()}`}>
      <div className="analysis-header">
        <span className="analysis-icon">{getStatusIcon()}</span>
        <span className="analysis-status">{isFraud ? 'FRAUD DETECTED' : 'SAFE'}</span>
      </div>
      <div className="analysis-details">
        <span className="analysis-category">Category: {category}</span>
        <span className="analysis-confidence">Confidence: {confidence}%</span>
        <span className="analysis-risk">Risk Level: {riskLevel}</span>
      </div>
      <div className="analysis-summary">
        {getAnalysisText()}
      </div>
    </div>
  );
};

// CSS styles for the component
const styles = `
.analysis-result {
  padding: 12px;
  border-radius: 8px;
  margin: 8px 0;
  border-left: 4px solid;
}

.analysis-result.fraud {
  background-color: #fff1f1;
  border-left-color: #dc3545;
  color: #721c24;
}

.analysis-result.warning {
  background-color: #fff8e1;
  border-left-color: #ffc107;
  color: #856404;
}

.analysis-result.safe {
  background-color: #f1f8ff;
  border-left-color: #28a745;
  color: #155724;
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  margin-bottom: 8px;
}

.analysis-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  margin-bottom: 8px;
}

.analysis-summary {
  font-style: italic;
  font-size: 0.95em;
}

.analysis-pending {
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #6c757d;
  font-style: italic;
}
`;

// Inject styles if not already present
if (!document.getElementById('sms-analysis-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'sms-analysis-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default SMSAnalysisDisplay;
