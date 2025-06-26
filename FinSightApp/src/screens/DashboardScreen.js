import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import Card from '../components/Card';
import colors from '../theme/colors';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { analyzeMessages, getSmsSummary } from '../utils/api';

let SmsAndroid;
if (Platform.OS === 'android') {
  try {
    SmsAndroid = require('react-native-get-sms-android');
  } catch (e) {
    SmsAndroid = null;
  }
}

const scanSmsMessages = async () => {
  if (Platform.OS !== 'android' || !SmsAndroid) {
    return [];
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: 'SMS Permission',
      message: 'This app needs access to your SMS messages to detect fraud.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    },
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('SMS permission denied');
  }
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox' }),
      fail => reject(fail),
      (count, smsList) => {
        const messages = JSON.parse(smsList).map((msg, idx) => ({
          id: String(msg._id || idx),
          text: msg.body,
          status: 'safe',
          timestamp: new Date(msg.date).toLocaleString(),
          amount: '',
          type: 'received',
          sender: msg.address,
          analysis: 'Not analyzed',
        }));
        resolve(messages);
      }
    );
  });
};

export default function DashboardScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isScanning, setIsScanning] = useState(false);
  const [fraudScore, setFraudScore] = useState(15);
  const [smsAlerts, setSmsAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [smsSummary, setSmsSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Mock data - in a real app, this would come from your ML API
  const mockData = {
    weeklySummary: {
      sent: 'RWF 250,000',
      received: 'RWF 450,000',
      net: '+RWF 200,000',
      flagged: 3
    },
    spendingPatterns: [
      { category: 'Shopping', amount: 'RWF 120,000', percentage: 48, alert: true },
      { category: 'Utilities', amount: 'RWF 50,000', percentage: 20 },
      { category: 'Entertainment', amount: 'RWF 30,000', percentage: 12 },
      { category: 'Transport', amount: 'RWF 25,000', percentage: 10 },
      { category: 'Other', amount: 'RWF 25,000', percentage: 10 },
    ],
    smsAlerts: [
      { 
        id: '1', 
        content: 'URGENT: Your account will be suspended. Click link to verify: fake.link', 
        timestamp: '2 mins ago', 
        risk: 'High', 
        type: 'phishing'
      },
      { 
        id: '2', 
        content: 'Transaction of RWF 350,000 to John Doe. Reply STOP to cancel', 
        timestamp: '1 hour ago', 
        risk: 'Medium', 
        type: 'fake_transaction'
      },
      { 
        id: '3', 
        content: 'You won RWF 5,000,000! Claim your prize: scam.link', 
        timestamp: '3 hours ago', 
        risk: 'High', 
        type: 'scam'
      },
    ],
    transactions: [
      { 
        id: '1', 
        name: 'MTN Mobile Money', 
        amount: 'RWF 50,000', 
        date: 'Today', 
        type: 'sent', 
        flagged: false 
      },
      { 
        id: '2', 
        name: 'Online Payment', 
        amount: 'RWF 120,000', 
        date: 'Today', 
        type: 'sent', 
        flagged: true 
      },
      { 
        id: '3', 
        name: 'Salary Deposit', 
        amount: 'RWF 450,000', 
        date: 'Today', 
        type: 'received', 
        flagged: false 
      },
    ],
    financialAdvice: [
      "Your shopping expenses are 48% of your weekly spending - consider setting a budget",
      "Detected 3 suspicious SMS messages this week - review in Alerts section",
      "You've saved 25% less this week compared to average - try to reduce discretionary spending",
      "Consistently saving 10% of income can build emergency fund in 6 months"
    ]
  };

  // Simulate API calls to ML backend
  useEffect(() => {
    const fetchData = async () => {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSmsAlerts(mockData.smsAlerts);
      setTransactions(mockData.transactions);
      setLoading(false);
    };

    fetchData();
  }, []);

  const runFraudScan = async () => {
    setIsScanning(true);
    try {
      const smsMessages = await scanSmsMessages();
      const analyzed = await analyzeMessages(smsMessages);
      // Calculate fraud score and alerts
      const fraudCount = analyzed.filter(m => m.status === 'fraud').length;
      setFraudScore(fraudCount * 10); // Example: 10 points per fraud
      setSmsAlerts(analyzed.filter(m => m.status === 'fraud' || m.status === 'suspicious'));
      setLastScan(new Date());
    } catch (e) {
      // fallback to mock`
      setFraudScore(15);
      setSmsAlerts(mockData.smsAlerts);
    }
    setIsScanning(false);
  };

  const fetchSmsSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      // Get SMS messages from device (Android only)
      const smsMessages = await scanSmsMessages();
      // Extract just the text bodies for the API
      const smsBodies = smsMessages.map(m => m.text).filter(Boolean);
      if (smsBodies.length === 0) {
        setSummaryError('No SMS messages found on device.');
        setSummaryLoading(false);
        return;
      }
      // Call the backend API with the SMS bodies
      const summary = await getSmsSummary(smsBodies);
      setSmsSummary(summary);
    } catch (e) {
      setSummaryError('Failed to fetch SMS summary');
    }
    setSummaryLoading(false);
  };

  const getRiskLevel = () => {
    if (fraudScore < 10) return { text: "Low Risk", color: colors.success };
    if (fraudScore < 20) return { text: "Medium Risk", color: colors.warning };
    return { text: "High Risk", color: colors.danger };
  };

  const getRiskIcon = (risk) => {
    switch(risk.toLowerCase()) {
      case 'high': return <Ionicons name="warning" size={20} color={colors.danger} />;
      case 'medium': return <Ionicons name="alert-circle" size={20} color={colors.warning} />;
      default: return <Ionicons name="information-circle" size={20} color={colors.textSecondary} />;
    }
  };

  const renderAdvice = () => {
    return mockData.financialAdvice.map((advice, index) => (
      <View key={index} style={styles.adviceItem}>
        <Ionicons name="bulb-outline" size={18} color={colors.primary} />
        <Text style={styles.adviceText}>{advice}</Text>
      </View>
    ));
  };

  const renderSpendingPatterns = () => {
    // If smsSummary is available, use its monthly_summary for spending
    if (smsSummary && smsSummary.monthly_summary) {
      // Convert monthly_summary to array and sort by date
      const months = Object.keys(smsSummary.monthly_summary);
      // Optionally, sort months chronologically if needed
      return months.map((month, index) => (
        <View key={month} style={styles.spendingRow}>
          <View style={styles.spendingCategory}>
            <Text style={styles.spendingText}>{month}</Text>
          </View>
          <View style={styles.spendingBarContainer}>
            <View 
              style={[
                styles.spendingBar, 
                { 
                  width: `${Math.min(100, (smsSummary.monthly_summary[month] / Math.max(...Object.values(smsSummary.monthly_summary))) * 100)}%`,
                  backgroundColor: colors.primary
                }
              ]}
            />
          </View>
          <Text style={styles.spendingAmount}>{`RWF ${smsSummary.monthly_summary[month].toLocaleString()}`}</Text>
        </View>
      ));
    }
    // fallback to mock
    return mockData.spendingPatterns.map((item, index) => (
      <View key={index} style={styles.spendingRow}>
        <View className={styles.spendingCategory}>
          <Text style={styles.spendingText}>{item.category}</Text>
          {item.alert && <Ionicons name="warning" size={16} color={colors.danger} />}
        </View>
        <View style={styles.spendingBarContainer}>
          <View 
            style={[
              styles.spendingBar, 
              { 
                width: `${item.percentage}%`,
                backgroundColor: item.alert ? colors.danger : colors.primary
              }
            ]}
          />
        </View>
        <Text style={styles.spendingAmount}>{item.amount}</Text>
      </View>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing your transactions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Summary */}
      <View style={styles.profileContainer}>
        <Image source={require('../../assets/icon.png')} style={styles.profileAvatar} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Hello, Alex!</Text>
          <Text style={styles.profileStats}>Net: {mockData.weeklySummary.net} | Risk: {getRiskLevel().text}</Text>
        </View>
      </View>

      {/* Fraud Detection Card */}
      <Card style={styles.fraudCard}>
        <View style={styles.fraudHeader}>
          <MaterialCommunityIcons name="shield-alert" size={28} color={colors.danger} />
          <Text style={styles.fraudTitle}>SMS Fraud Detection</Text>
        </View>
        
        <View style={styles.riskIndicator}>
          <Text style={styles.riskLabel}>Current Risk Level:</Text>
          <View style={[styles.riskBadge, { backgroundColor: getRiskLevel().color + '20' }]}>
            <Text style={[styles.riskText, { color: getRiskLevel().color }]}>
              {getRiskLevel().text}
            </Text>
          </View>
        </View>
        
        {lastScan && (
          <Text style={styles.lastScanText}>Last scanned: {lastScan.toLocaleString()}</Text>
        )}
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{mockData.weeklySummary.flagged}</Text>
            <Text style={styles.statLabel}>SMS Alerts</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{mockData.weeklySummary.sent}</Text>
            <Text style={styles.statLabel}>Money Sent</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {mockData.weeklySummary.received}
            </Text>
            <Text style={styles.statLabel}>Money Received</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={runFraudScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <AntDesign name="scan1" size={20} color={colors.white} />
              <Text style={styles.scanButtonText}>Scan Messages for Fraud</Text>
            </>
          )}
        </TouchableOpacity>
      </Card>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'spending' && styles.activeTab]}
          onPress={() => setActiveTab('spending')}
        >
          <Text style={[styles.tabText, activeTab === 'spending' && styles.activeTabText]}>
            Spending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{mockData.smsAlerts.length}</Text>
          </View>
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>
            Alerts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Weekly Summary */}
          <Card style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Weekly Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Money Sent</Text>
                <Text style={styles.summaryValue}>{mockData.weeklySummary.sent}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Money Received</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {mockData.weeklySummary.received}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net Change</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {mockData.weeklySummary.net}
                </Text>
              </View>
            </View>
          </Card>

          {/* Financial Advice */}
          <Card style={styles.adviceCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="bulb" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Financial Advice</Text>
            </View>
            <View style={styles.adviceList}>
              {renderAdvice()}
            </View>
            {/* Progress indicator example */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Savings Progress</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBar, { width: '60%', backgroundColor: colors.success }]} />
              </View>
              <Text style={styles.progressValue}>60% of goal</Text>
            </View>
          </Card>

          {/* Recent Transactions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {transactions.slice(0, 3).map(transaction => (
            <Card key={transaction.id} style={[
              styles.transactionCard,
              transaction.flagged && styles.flaggedCard
            ]}>
              <View style={styles.transactionRow}>
                <View style={[
                  styles.transactionIcon,
                  transaction.type === 'received' ? 
                    { backgroundColor: colors.success + '20' } : 
                    { backgroundColor: colors.primary + '20' }
                ]}>
                  <MaterialCommunityIcons 
                    name={transaction.type === 'received' ? "arrow-bottom-left" : "arrow-top-right"} 
                    size={20} 
                    color={transaction.type === 'received' ? colors.success : colors.primary} 
                  />
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionName}>{transaction.name}</Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                </View>
                
                <Text style={[
                  styles.transactionAmount, 
                  transaction.type === 'received' ? { color: colors.success } : {}
                ]}>
                  {transaction.amount}
                </Text>
                
                {transaction.flagged && (
                  <View style={styles.flagBadge}>
                    <Ionicons name="flag" size={14} color={colors.danger} />
                  </View>
                )}
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Spending Tab Content */}
      {activeTab === 'spending' && (
        <>
          <Card style={styles.spendingCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Spending Patterns</Text>
            </View>
            
            <View style={styles.spendingContainer}>
              {renderSpendingPatterns()}
            </View>
            
            <Text style={styles.spendingNote}>
              AI Analysis: Your shopping expenses are significantly higher than average this week
            </Text>
            {/* Simple bar chart visualization */}
            <View style={styles.barChartContainer}>
              {mockData.spendingPatterns.map((item, idx) => (
                <View key={idx} style={styles.barChartRow}>
                  <Text style={styles.barChartLabel}>{item.category}</Text>
                  <View style={styles.barChartBarBg}>
                    <View style={[styles.barChartBar, { width: `${item.percentage}%`, backgroundColor: item.alert ? colors.danger : colors.primary }]} />
                  </View>
                  <Text style={styles.barChartValue}>{item.amount}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.budgetCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Budget Recommendations</Text>
            </View>
            
            <View style={styles.budgetRow}>
              <Text style={styles.budgetCategory}>Shopping</Text>
              <Text style={styles.budgetAmount}>RWF 75,000</Text>
              <Text style={[styles.budgetStatus, { color: colors.danger }]}>Over budget</Text>
            </View>
            
            <View style={styles.budgetRow}>
              <Text style={styles.budgetCategory}>Utilities</Text>
              <Text style={styles.budgetAmount}>RWF 45,000</Text>
              <Text style={[styles.budgetStatus, { color: colors.success }]}>On track</Text>
            </View>
            
            <View style={styles.budgetRow}>
              <Text style={styles.budgetCategory}>Entertainment</Text>
              <Text style={styles.budgetAmount}>RWF 30,000</Text>
              <Text style={[styles.budgetStatus, { color: colors.warning }]}>Approaching limit</Text>
            </View>
            
            <TouchableOpacity style={styles.budgetButton}>
              <Text style={styles.budgetButtonText}>Create Custom Budget</Text>
            </TouchableOpacity>
          </Card>
        </>
      )}

      {/* Alerts Tab Content */}
      {activeTab === 'alerts' && (
        <>
          <Card style={styles.alertsCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning" size={24} color={colors.danger} />
              <Text style={styles.cardTitle}>SMS Fraud Alerts</Text>
              <Text style={styles.alertCount}>{smsAlerts.length} detected</Text>
            </View>
            
            <View style={styles.alertsContainer}>
              {smsAlerts.map(alert => (
                <View key={alert.id} style={styles.alertItem}>
                  <View style={styles.alertHeader}>
                    {getRiskIcon(alert.risk)}
                    <Text style={[
                      styles.alertRisk, 
                      { color: alert.risk === 'High' ? colors.danger : colors.warning }
                    ]}>
                      {alert.risk} Risk
                    </Text>
                    <Text style={styles.alertTimestamp}>{alert.timestamp}</Text>
                  </View>
                  <Text style={styles.alertContent}>{alert.content}</Text>
                  <View style={styles.alertActions}>
                    <TouchableOpacity style={styles.alertButton}>
                      <Text style={styles.alertButtonText}>Mark as Safe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.alertButton, styles.reportButton]}>
                      <Text style={styles.alertButtonText}>Report Fraud</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </Card>
          
          <Card style={styles.protectionCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="shield-check" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Protection Status</Text>
            </View>
            
            <View style={styles.protectionStatus}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.protectionText}>Real-time SMS scanning active</Text>
            </View>
            
            <View style={styles.protectionStats}>
              <View style={styles.protectionStat}>
                <Text style={styles.protectionNumber}>98%</Text>
                <Text style={styles.protectionLabel}>Fraud Accuracy</Text>
              </View>
              <View style={styles.protectionStat}>
                <Text style={styles.protectionNumber}>24/7</Text>
                <Text style={styles.protectionLabel}>Monitoring</Text>
              </View>
              <View style={styles.protectionStat}>
                <Text style={styles.protectionNumber}>12</Text>
                <Text style={styles.protectionLabel}>Protected</Text>
              </View>
            </View>
          </Card>
        </>
      )}

      {/* SMS Summary Section - New Feature */}
      <View style={styles.smsSummaryContainer}>
        <Text style={styles.smsSummaryTitle}>SMS Financial Summary</Text>
        <TouchableOpacity style={styles.scanButton} onPress={fetchSmsSummary}>
          <Text style={styles.scanButtonText}>Get SMS Financial Summary</Text>
        </TouchableOpacity>
        {summaryLoading && <Text>Loading summary...</Text>}
        {summaryError && <Text style={{color: 'red'}}>{summaryError}</Text>}
        {smsSummary && (
          <View style={{backgroundColor: '#f5f5f5', margin: 12, padding: 12, borderRadius: 8}}>
            <Text style={{fontWeight: 'bold', marginBottom: 8}}>Summary</Text>
            <Text>Total Sent: <Text style={{fontWeight: 'bold'}}>{smsSummary.total_sent ? `RWF ${smsSummary.total_sent.toLocaleString()}` : '-'}</Text></Text>
            <Text>Total Received: <Text style={{fontWeight: 'bold', color: colors.success}}>{smsSummary.total_received ? `RWF ${smsSummary.total_received.toLocaleString()}` : '-'}</Text></Text>
            <Text>Total Withdrawn: <Text style={{fontWeight: 'bold'}}>{smsSummary.total_withdrawn ? `RWF ${smsSummary.total_withdrawn.toLocaleString()}` : '-'}</Text></Text>
            <Text>Total Airtime: <Text style={{fontWeight: 'bold'}}>{smsSummary.total_airtime ? `RWF ${smsSummary.total_airtime.toLocaleString()}` : '-'}</Text></Text>
            <Text>Latest Balance: <Text style={{fontWeight: 'bold'}}>{smsSummary.latest_balance ? `RWF ${smsSummary.latest_balance.toLocaleString()}` : '-'}</Text></Text>
            <Text>Transactions: <Text style={{fontWeight: 'bold'}}>{smsSummary.transactions_count ?? '-'}</Text></Text>
            <Text style={{marginTop: 8, fontWeight: 'bold'}}>Monthly Summary:</Text>
            {smsSummary.monthly_summary && Object.keys(smsSummary.monthly_summary).length > 0 ? (
              Object.entries(smsSummary.monthly_summary).map(([month, amount]) => (
                <Text key={month} style={{marginLeft: 8}}>{month}: RWF {amount.toLocaleString()}</Text>
              ))
            ) : (
              <Text style={{marginLeft: 8}}>-</Text>
            )}
            {/* Raw JSON for debugging */}
            <Text style={{marginTop: 12, fontSize: 12, color: '#888'}}>Raw: {JSON.stringify(smsSummary, null, 2)}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  fraudCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  fraudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  fraudTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  riskLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  riskBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  riskText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  scanButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 6,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: {
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  alertBadge: {
    position: 'absolute',
    top: -5,
    right: 10,
    backgroundColor: colors.danger,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  adviceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  adviceList: {
    gap: 16,
  },
  adviceItem: {
    flexDirection: 'row',
    gap: 12,
  },
  adviceText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    color: colors.primary,
    fontWeight: '600',
  },
  transactionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  flaggedCard: {
    borderColor: colors.dangerLight,
    backgroundColor: colors.dangerLight + '20',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  flagBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spendingCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  spendingContainer: {
    gap: 12,
    marginBottom: 16,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spendingCategory: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spendingText: {
    fontSize: 14,
    color: colors.text,
  },
  spendingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  spendingBar: {
    height: '100%',
    borderRadius: 4,
  },
  spendingAmount: {
    width: 90,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    color: colors.text,
  },
  spendingNote: {
    fontSize: 14,
    color: colors.danger,
    fontStyle: 'italic',
    marginTop: 8,
  },
  budgetCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  budgetCategory: {
    fontSize: 16,
    color: colors.text,
    width: '35%',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    width: '30%',
  },
  budgetStatus: {
    fontSize: 14,
    fontWeight: '600',
    width: '35%',
    textAlign: 'right',
  },
  budgetButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  budgetButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  alertsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  alertCount: {
    marginLeft: 'auto',
    backgroundColor: colors.danger + '20',
    color: colors.danger,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    fontWeight: '600',
  },
  alertsContainer: {
    gap: 16,
  },
  alertItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  alertRisk: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertTimestamp: {
    marginLeft: 'auto',
    fontSize: 12,
    color: colors.textSecondary,
  },
  alertContent: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  reportButton: {
    backgroundColor: colors.danger + '20',
    borderColor: colors.danger,
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  protectionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  protectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  protectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  protectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  protectionStat: {
    alignItems: 'center',
    flex: 1,
  },
  protectionNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  protectionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 12,
    gap: 16,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '10',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  profileStats: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  lastScanText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: -8,
    textAlign: 'right',
  },
  barChartContainer: {
    marginTop: 16,
    gap: 8,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barChartLabel: {
    width: 90,
    fontSize: 14,
    color: colors.textSecondary,
  },
  barChartBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: colors.card,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  barChartBar: {
    height: 12,
    borderRadius: 6,
  },
  barChartValue: {
    width: 70,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  progressContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: colors.card,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  progressValue: {
    fontSize: 12,
    color: colors.success,
  },
  smsSummaryContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  smsSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
});