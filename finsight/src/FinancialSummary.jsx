import React, { useState } from 'react';
import PageHeader from './PageHeader';
import './FinancialSummary.css';
import { getSmsSummary } from './utils/api';

const FinancialSummary = () => {
  const [timeRange, setTimeRange] = useState('this-month');
  const [showDropdown, setShowDropdown] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock financial data
  const financialData = {
    'this-month': {
      totalTransactions: 15420,
      totalValue: 2847650000, // RWF
      fraudPrevented: 125340000,
      averageTransaction: 184523,
      suspiciousTransactions: 156,
      flaggedAmount: 89420000,
      recovery: 67800000
    },
    'last-month': {
      totalTransactions: 14180,
      totalValue: 2650420000,
      fraudPrevented: 98520000,
      averageTransaction: 186941,
      suspiciousTransactions: 134,
      flaggedAmount: 76230000,
      recovery: 52100000
    },
    'this-year': {
      totalTransactions: 185620,
      totalValue: 34216800000,
      fraudPrevented: 1540320000,
      averageTransaction: 184321,
      suspiciousTransactions: 1876,
      flaggedAmount: 1087540000,
      recovery: 891650000
    }
  };

  const currentData = financialData[timeRange];

  // Recent transactions data
  const recentTransactions = [
    { id: 1, type: 'Mobile Money', amount: 250000, status: 'Completed', time: '2h ago', risk: 'Low' },
    { id: 2, type: 'Bank Transfer', amount: 1500000, status: 'Flagged', time: '3h ago', risk: 'High' },
    { id: 3, type: 'Mobile Money', amount: 85000, status: 'Completed', time: '4h ago', risk: 'Low' },
    { id: 4, type: 'Card Payment', amount: 425000, status: 'Pending', time: '5h ago', risk: 'Medium' },
    { id: 5, type: 'Mobile Money', amount: 75000, status: 'Completed', time: '6h ago', risk: 'Low' },
  ];

  // Top fraud patterns
  const fraudPatterns = [
    { pattern: 'Phishing SMS', incidents: 45, amount: 12500000, trend: '+12%' },
    { pattern: 'Fake Payment Links', incidents: 32, amount: 8750000, trend: '+8%' },
    { pattern: 'Identity Theft', incidents: 28, amount: 15600000, trend: '-5%' },
    { pattern: 'SIM Swap', incidents: 19, amount: 22400000, trend: '+15%' },
    { pattern: 'Social Engineering', incidents: 16, amount: 6200000, trend: '+3%' }
  ];

  const formatAmount = (amount) => {
    if (amount >= 1000000000) {
      return `RWF ${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `RWF ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `RWF ${(amount / 1000).toFixed(0)}K`;
    }
    return `RWF ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'flagged': return 'status-flagged';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk.toLowerCase()) {
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      case 'low': return 'risk-low';
      default: return '';
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    setShowDropdown(false);
  };

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSmsSummary(); // Replace demoSms with real SMS data in production
      setSummary(result);
    } catch (err) {
      setError('Failed to fetch summary');
    }
    setLoading(false);
  };

  return (
    <div className="financial-summary-container">
      <PageHeader title="Financial Summary" />
      <button onClick={fetchSummary} style={{marginBottom: 16}}>Fetch SMS Summary (Demo)</button>
      {loading && <div>Loading summary...</div>}
      {error && <div style={{color: 'red'}}>{error}</div>}
      {summary && (
        <div className="api-summary-block">
          <h4>API Summary Result</h4>
          <pre style={{background: '#f5f5f5', padding: 12, borderRadius: 8}}>{JSON.stringify(summary, null, 2)}</pre>
        </div>
      )}

      {/* Time Range Filter */}
      <div className="time-range-filter">
        <div className="filter-dropdown">
          <button 
            className="filter-button" 
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {timeRange === 'this-month' && 'This Month'}
            {timeRange === 'last-month' && 'Last Month'}
            {timeRange === 'this-year' && 'This Year'}
            <img src={process.env.PUBLIC_URL + '/chevron-down.svg'} alt="Dropdown" className="filter-chevron" />
          </button>
          {showDropdown && (
            <div className="filter-dropdown-menu">
              <div className="dropdown-option" onClick={() => handleTimeRangeChange('this-month')}>This Month</div>
              <div className="dropdown-option" onClick={() => handleTimeRangeChange('last-month')}>Last Month</div>
              <div className="dropdown-option" onClick={() => handleTimeRangeChange('this-year')}>This Year</div>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <img src={process.env.PUBLIC_URL + '/stats.svg'} alt="Transactions" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{currentData.totalTransactions.toLocaleString()}</div>
            <div className="metric-label">Total Transactions</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <img src={process.env.PUBLIC_URL + '/amount.svg'} alt="Value" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{formatAmount(currentData.totalValue)}</div>
            <div className="metric-label">Total Transaction Value</div>
          </div>
        </div>

        <div className="metric-card highlight-green">
          <div className="metric-icon">
            <img src={process.env.PUBLIC_URL + '/alerts.svg'} alt="Prevented" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{formatAmount(currentData.fraudPrevented)}</div>
            <div className="metric-label">Fraud Prevented</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <img src={process.env.PUBLIC_URL + '/amount.svg'} alt="Average" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{formatAmount(currentData.averageTransaction)}</div>
            <div className="metric-label">Average Transaction</div>
          </div>
        </div>

        <div className="metric-card highlight-orange">
          <div className="metric-icon">
            <img src={process.env.PUBLIC_URL + '/alerts.svg'} alt="Suspicious" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{currentData.suspiciousTransactions}</div>
            <div className="metric-label">Suspicious Transactions</div>
          </div>
        </div>

        <div className="metric-card highlight-red">
          <div className="metric-icon">
            <img src={process.env.PUBLIC_URL + '/amount.svg'} alt="Flagged" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{formatAmount(currentData.flaggedAmount)}</div>
            <div className="metric-label">Flagged Amount</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Recent Transactions */}
        <div className="content-section">
          <h3 className="section-title">Recent Transactions</h3>
          <div className="transactions-list">
            {recentTransactions.map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-main">
                  <div className="transaction-type">{transaction.type}</div>
                  <div className="transaction-amount">{formatAmount(transaction.amount)}</div>
                </div>
                <div className="transaction-meta">
                  <span className={`transaction-status ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                  <span className={`transaction-risk ${getRiskColor(transaction.risk)}`}>
                    {transaction.risk} Risk
                  </span>
                  <span className="transaction-time">{transaction.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud Patterns */}
        <div className="content-section">
          <h3 className="section-title">Top Fraud Patterns</h3>
          <div className="fraud-patterns-list">
            {fraudPatterns.map((pattern, index) => (
              <div key={index} className="fraud-pattern-item">
                <div className="pattern-info">
                  <div className="pattern-name">{pattern.pattern}</div>
                  <div className="pattern-stats">
                    <span className="pattern-incidents">{pattern.incidents} incidents</span>
                    <span className="pattern-amount">{formatAmount(pattern.amount)}</span>
                  </div>
                </div>
                <div className={`pattern-trend ${pattern.trend.startsWith('+') ? 'trend-up' : 'trend-down'}`}>
                  {pattern.trend}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recovery Summary */}
      <div className="recovery-section">
        <div className="recovery-card">
          <h3 className="recovery-title">Recovery Summary</h3>
          <div className="recovery-stats">
            <div className="recovery-stat">
              <div className="recovery-value">{formatAmount(currentData.recovery)}</div>
              <div className="recovery-label">Amount Recovered</div>
            </div>
            <div className="recovery-stat">
              <div className="recovery-value">
                {Math.round((currentData.recovery / currentData.flaggedAmount) * 100)}%
              </div>
              <div className="recovery-label">Recovery Rate</div>
            </div>
            <div className="recovery-stat">
              <div className="recovery-value">
                {Math.round((currentData.fraudPrevented / currentData.totalValue) * 10000) / 100}%
              </div>
              <div className="recovery-label">Prevention Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
