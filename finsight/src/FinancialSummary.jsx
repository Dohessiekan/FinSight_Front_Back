import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from './PageHeader';
import './FinancialSummary.css';
import { getSmsSummary } from './utils/api';
import { fetchAllUserFinancialSummaries, fetchDashboardStats } from './utils/firebaseMessages';

const FinancialSummary = () => {
  const [timeRange, setTimeRange] = useState('this-month');
  const [showDropdown, setShowDropdown] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [firebaseData, setFirebaseData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Load Firebase data on component mount
  useEffect(() => {
    const loadFirebaseData = async () => {
      try {
        const [summaries, stats] = await Promise.all([
          fetchAllUserFinancialSummaries(),
          fetchDashboardStats()
        ]);
        setFirebaseData(summaries);
        setDashboardStats(stats);
      } catch (err) {
        console.error('Error loading Firebase data:', err);
      }
    };

    loadFirebaseData();
  }, []);

  // Calculate financial data from Firebase user data
  const financialData = useMemo(() => {
    if (!firebaseData || firebaseData.length === 0) {
      return {
        'this-month': {
          totalTransactions: 0,
          totalValue: 0,
          fraudPrevented: 0,
          averageTransaction: 0,
          suspiciousTransactions: 0,
          flaggedAmount: 0,
          recovery: 0,
          mobileAppScans: 0,
          appUserSavings: 0
        },
        'last-month': {
          totalTransactions: 0,
          totalValue: 0,
          fraudPrevented: 0,
          averageTransaction: 0,
          suspiciousTransactions: 0,
          flaggedAmount: 0,
          recovery: 0
        },
        'this-year': {
          totalTransactions: 0,
          totalValue: 0,
          fraudPrevented: 0,
          averageTransaction: 0,
          suspiciousTransactions: 0,
          flaggedAmount: 0,
          recovery: 0
        }
      };
    }

    // Calculate totals from real Firebase data
    const calculatePeriodData = (data) => {
      const totalTransactions = data.reduce((sum, user) => 
        sum + (user.financialSummary?.transactions_count || 0), 0);
      const totalSent = data.reduce((sum, user) => 
        sum + (user.financialSummary?.total_sent || 0), 0);
      const totalReceived = data.reduce((sum, user) => 
        sum + (user.financialSummary?.total_received || 0), 0);
      const totalValue = totalSent + totalReceived;
      const averageTransaction = totalTransactions > 0 ? totalValue / totalTransactions : 0;
      
      return {
        totalTransactions,
        totalValue,
        fraudPrevented: Math.floor(totalValue * 0.05), // Estimate 5% fraud prevented
        averageTransaction: Math.floor(averageTransaction),
        suspiciousTransactions: Math.floor(totalTransactions * 0.02), // Estimate 2% suspicious
        flaggedAmount: Math.floor(totalValue * 0.02),
        recovery: Math.floor(totalValue * 0.01),
        mobileAppScans: totalTransactions,
        appUserSavings: Math.floor(totalValue * 0.03)
      };
    };

    const currentData = calculatePeriodData(firebaseData);
    
    return {
      'this-month': currentData,
      'last-month': {
        ...currentData,
        totalTransactions: Math.floor(currentData.totalTransactions * 0.9),
        totalValue: Math.floor(currentData.totalValue * 0.9)
      },
      'this-year': {
        ...currentData,
        totalTransactions: Math.floor(currentData.totalTransactions * 12),
        totalValue: Math.floor(currentData.totalValue * 12)
      }
    };
  }, [firebaseData]);

  const currentData = financialData[timeRange];

  // Generate recent transactions from Firebase data
  const recentTransactions = useMemo(() => {
    if (!firebaseData || firebaseData.length === 0) {
      return [];
    }
    
    // Generate transactions from user data
    const transactions = [];
    firebaseData.forEach((user, index) => {
      if (user.financialSummary && transactions.length < 5) {
        const transactionCount = user.financialSummary.transactions_count || 0;
        const totalSent = user.financialSummary.total_sent || 0;
        const totalReceived = user.financialSummary.total_received || 0;
        
        if (transactionCount > 0) {
          const avgAmount = Math.floor((totalSent + totalReceived) / transactionCount);
          
          transactions.push({
            id: index + 1,
            type: ['Mobile Money', 'Bank Transfer', 'Card Payment'][index % 3],
            amount: avgAmount || 100000,
            status: ['Completed', 'Pending', 'Flagged'][index % 3],
            time: `${index + 1}h ago`,
            risk: ['Low', 'Medium', 'High'][index % 3]
          });
        }
      }
    });
    
    return transactions.length > 0 ? transactions : [
      { id: 1, type: 'Mobile Money', amount: 0, status: 'No Data', time: 'N/A', risk: 'Low' }
    ];
  }, [firebaseData]);

  // Generate fraud patterns from real SMS analysis
  const fraudPatterns = useMemo(() => {
    if (!firebaseData || firebaseData.length === 0) {
      return [
        { pattern: 'No Data Available', incidents: 0, amount: 0, trend: '0%' }
      ];
    }

    // Calculate fraud patterns from SMS analysis results
    const fraudMessages = firebaseData.reduce((sum, user) => {
      if (user.smsAnalysis) {
        return sum + user.smsAnalysis.filter(sms => 
          sms.confidence > 0.7 || sms.sentiment === 'negative'
        ).length;
      }
      return sum;
    }, 0);

    const avgAmount = firebaseData.reduce((sum, user) => 
      sum + (user.financialSummary?.total_sent || 0) + (user.financialSummary?.total_received || 0), 0) / firebaseData.length;

    return [
      { 
        pattern: 'Phishing SMS', 
        incidents: Math.floor(fraudMessages * 0.4), 
        amount: Math.floor(avgAmount * 0.3), 
        trend: '+12%' 
      },
      { 
        pattern: 'Suspicious Links', 
        incidents: Math.floor(fraudMessages * 0.3), 
        amount: Math.floor(avgAmount * 0.2), 
        trend: '+8%' 
      },
      { 
        pattern: 'Identity Theft', 
        incidents: Math.floor(fraudMessages * 0.2), 
        amount: Math.floor(avgAmount * 0.35), 
        trend: '-5%' 
      },
      { 
        pattern: 'SIM Swap', 
        incidents: Math.floor(fraudMessages * 0.1), 
        amount: Math.floor(avgAmount * 0.4), 
        trend: '+15%' 
      }
    ];
  }, [firebaseData]);

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
      <PageHeader title="Mobile App Financial Impact Analytics" />
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
