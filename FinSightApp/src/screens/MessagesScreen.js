import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, TextInput, Keyboard } from 'react-native';
import Card from '../components/Card';
import colors from '../theme/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { analyzeMessages } from '../utils/api';

let SmsAndroid;
if (Platform.OS === 'android') {
  try {
    SmsAndroid = require('react-native-get-sms-android');
  } catch (e) {
    SmsAndroid = null;
  }
}

// Mock API service (replace with actual SMS scanning implementation)
const scanSmsMessages = async () => {
  if (Platform.OS !== 'android' || !SmsAndroid) {
    // fallback to mock for non-android or dev
    return new Promise(resolve => setTimeout(() => resolve([
      { 
        id: '1', 
        text: 'Received RWF 50,000 from John Doe. Ref: TXN123456', 
        status: 'safe', 
        timestamp: '2 hours ago',
        amount: 'RWF 50,000',
        type: 'received',
        sender: 'MTN Mobile',
        analysis: 'Verified transaction from known contact'
      },
      { 
        id: '2', 
        text: 'URGENT: Your account will be suspended. Click here to verify: scam.link', 
        status: 'fraud', 
        timestamp: '1 hour ago',
        amount: '',
        type: 'alert',
        sender: 'Unknown',
        analysis: 'Phishing attempt - contains suspicious link'
      },
      { 
        id: '3', 
        text: 'Sent RWF 120,000 to Amazon. Ref: TXN789012', 
        status: 'safe', 
        timestamp: 'Yesterday',
        amount: 'RWF 120,000',
        type: 'sent',
        sender: 'Bank of Kigali',
        analysis: 'Recipient verified through official channels'
      },
      { 
        id: '4', 
        text: 'You won RWF 5,000,000! Claim your prize: prize.fake', 
        status: 'suspicious', 
        timestamp: 'May 15',
        amount: '',
        type: 'alert',
        sender: 'Contest',
        analysis: 'Unverified lottery notification - high fraud probability'
      },
    ]), 1500));
  }
  // Request permission
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
  // Read SMS
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox' }),
      fail => reject(fail),
      (count, smsList) => {
        const messages = JSON.parse(smsList).map((msg, idx) => ({
          id: String(msg._id || idx),
          text: msg.body,
          status: 'safe', // TODO: Call your model API to analyze
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

export default function MessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [iosInput, setIosInput] = useState('');
  const [iosLoading, setIosLoading] = useState(false);
  const [iosResult, setIosResult] = useState(null);
  
  // Calculate statistics
  const totalMessages = messages.length;
  const verifiedCount = messages.filter(m => m.status === 'safe').length;
  const suspiciousCount = messages.filter(m => m.status === 'suspicious').length;
  const fraudCount = messages.filter(m => m.status === 'fraud').length;
  
  const filteredMessages = activeFilter === 'all' 
    ? messages 
    : messages.filter(msg => msg.status === activeFilter);
  
  const handleScanPress = async () => {
    setLoading(true);
    try {
      const scannedMessages = await scanSmsMessages();
      // Only keep messages that look like transactions (sent/received/withdrawn/airtime)
      const transactionKeywords = [
        'sent', 'received', 'withdrawn', 'bought airtime', 'buy airtime', 'payment', 'paid', 'deposit', 'credited', 'debited', 'transfer'
      ];
      const transactionMessages = scannedMessages.filter(m =>
        transactionKeywords.some(keyword => m.text && m.text.toLowerCase().includes(keyword))
      );
      setMessages(transactionMessages); // Only display transaction messages
      setScanComplete(true);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('SMS scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Add handler for iOS paste/scan
  const handleIosScan = async () => {
    if (!iosInput.trim()) return;
    setIosLoading(true);
    setIosResult(null);
    try {
      const analyzed = await analyzeMessages([{ id: 'ios', text: iosInput }]);
      setIosResult(analyzed[0]);
    } catch (e) {
      setIosResult({ status: 'suspicious', analysis: 'API error' });
    } finally {
      setIosLoading(false);
      Keyboard.dismiss();
    }
  };
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'safe': 
        return <Ionicons name="shield-checkmark" size={20} color={colors.success} />;
      case 'suspicious': 
        return <Ionicons name="warning" size={20} color={colors.warning} />;
      case 'fraud': 
        return <Ionicons name="alert-circle" size={20} color={colors.danger} />;
      default: 
        return <Ionicons name="document-text" size={20} color={colors.textSecondary} />;
    }
  };
  
  const getStatusText = (status) => {
    switch(status) {
      case 'safe': return 'Verified Transaction';
      case 'suspicious': return 'Suspicious Activity';
      case 'fraud': return 'Fraud Detected';
      default: return 'Message';
    }
  };
  
  const getTypeIcon = (type) => {
    switch(type) {
      case 'received': 
        return <MaterialCommunityIcons name="arrow-bottom-left" size={20} color={colors.success} />;
      case 'sent': 
        return <MaterialCommunityIcons name="arrow-top-right" size={20} color={colors.primary} />;
      case 'alert': 
        return <Ionicons name="notifications" size={20} color={colors.warning} />;
      default: 
        return <Ionicons name="document-text" size={20} color={colors.textSecondary} />;
    }
  };

  const renderMessageDetails = (item) => (
    <View style={styles.detailsContainer}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Sender:</Text>
        <Text style={styles.detailValue}>{item.sender || 'Unknown'}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Analysis:</Text>
        <Text style={styles.detailValue}>{item.analysis || 'No analysis available'}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Risk Level:</Text>
        <Text style={[
          styles.riskLevel,
          item.status === 'safe' && { color: colors.success },
          item.status === 'suspicious' && { color: colors.warning },
          item.status === 'fraud' && { color: colors.danger }
        ]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
      
      {item.status !== 'safe' && (
        <TouchableOpacity style={styles.reportButton}>
          <Text style={styles.reportButtonText}>Report to Authorities</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SMS Fraud Guard</Text>
          <Text style={styles.subtitle}>Real-time SMS monitoring & protection</Text>
        </View>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleScanPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="scan" size={24} color={colors.white} />
              <Text style={styles.scanButtonText}>Scan Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalMessages}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{suspiciousCount}</Text>
          <Text style={styles.statLabel}>Suspicious</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.danger }]}>{fraudCount}</Text>
          <Text style={styles.statLabel}>Fraud</Text>
        </View>
      </View>
      
      {/* Scan Status */}
      {scanComplete && (
        <View style={styles.scanStatus}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.scanStatusText}>Last scan: {new Date().toLocaleTimeString()}</Text>
        </View>
      )}
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'safe' && styles.activeFilter]}
          onPress={() => setActiveFilter('safe')}
        >
          <Ionicons name="shield-checkmark" size={16} color={activeFilter === 'safe' ? colors.white : colors.success} />
          <Text style={[styles.filterText, activeFilter === 'safe' && styles.activeFilterText]}>Safe</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'suspicious' && styles.activeFilter]}
          onPress={() => setActiveFilter('suspicious')}
        >
          <Ionicons name="warning" size={16} color={activeFilter === 'suspicious' ? colors.white : colors.warning} />
          <Text style={[styles.filterText, activeFilter === 'suspicious' && styles.activeFilterText]}>Suspicious</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'fraud' && styles.activeFilter]}
          onPress={() => setActiveFilter('fraud')}
        >
          <Ionicons name="alert-circle" size={16} color={activeFilter === 'fraud' ? colors.white : colors.danger} />
          <Text style={[styles.filterText, activeFilter === 'fraud' && styles.activeFilterText]}>Fraud</Text>
        </TouchableOpacity>
      </View>
      
      {/* Analysis Results */}
      <FlatList
        data={filteredMessages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card style={[
            styles.card,
            item.status === 'suspicious' && styles.suspiciousCard,
            item.status === 'fraud' && styles.fraudCard
          ]}>
            <View style={styles.messageHeader}>
              <View style={styles.statusIndicator}>
                {getStatusIcon(item.status)}
                <Text style={[
                  styles.statusText,
                  item.status === 'safe' && { color: colors.success },
                  item.status === 'suspicious' && { color: colors.warning },
                  item.status === 'fraud' && { color: colors.danger }
                ]}>
                  {getStatusText(item.status)}
                </Text>
              </View>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>
            
            <View style={styles.messageContent}>
              <Text style={styles.messageText}>{item.text}</Text>
              
              {item.amount ? (
                <View style={[
                  styles.amountContainer,
                  item.type === 'received' && { backgroundColor: colors.success + '20' },
                  item.type === 'sent' && { backgroundColor: colors.primary + '20' }
                ]}>
                  {getTypeIcon(item.type)}
                  <Text style={[
                    styles.amountText,
                    item.type === 'received' && { color: colors.success },
                    item.type === 'sent' && { color: colors.primary }
                  ]}>
                    {item.amount}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.reportButton}>
                  <Text style={styles.reportButtonText}>Report Fraud</Text>
                </TouchableOpacity>
              )}
              
              {/* Expanded details section */}
              {renderMessageDetails(item)}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield-checkmark" size={60} color={colors.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>
              {scanComplete ? 'No messages match filter' : 'Ready to scan SMS'}
            </Text>
            <Text style={styles.emptyText}>
              {scanComplete 
                ? 'Try changing your filter settings' 
                : 'Scan your messages to detect fraud attempts'
              }
            </Text>
          </View>
        }
      />
      
      {/* iOS Paste SMS Section */}
      {Platform.OS === 'ios' && (
        <View style={styles.iosPasteContainer}>
          <Text style={styles.iosPasteTitle}>Paste SMS for Analysis</Text>
          <TextInput
            style={styles.iosPasteInput}
            placeholder="Paste your SMS message here"
            value={iosInput}
            onChangeText={setIosInput}
            multiline
          />
          <TouchableOpacity style={styles.iosPasteButton} onPress={handleIosScan} disabled={iosLoading}>
            {iosLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.iosPasteButtonText}>Analyze</Text>}
          </TouchableOpacity>
          {iosResult && (
            <Card style={[styles.iosResultCard, iosResult.status === 'fraud' && styles.fraudCard, iosResult.status === 'suspicious' && styles.suspiciousCard]}> 
              <Text style={styles.iosResultText}>{iosResult.analysis}</Text>
            </Card>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  scanButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    paddingHorizontal: 8,
  },
  scanStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 6,
    marginBottom: 24,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  activeFilter: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeFilterText: {
    color: colors.white,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.backgroundLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  suspiciousCard: {
    borderLeftColor: colors.warning,
    backgroundColor: colors.warning + '10',
  },
  fraudCard: {
    borderLeftColor: colors.danger,
    backgroundColor: colors.danger + '10',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messageContent: {
    gap: 12,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  reportButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.danger + '20',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  reportButtonText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  iosPasteContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  iosPasteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.primary,
  },
  iosPasteInput: {
    minHeight: 60,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.background,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text,
  },
  iosPasteButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  iosPasteButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  iosResultCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  iosResultText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});