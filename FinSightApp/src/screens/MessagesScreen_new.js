import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  StatusBar,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { scanSmsMessages } from '../services/SMSService';
import { scanMessages } from '../utils/api';
import { extractFinancialInfo } from '../utils/messageUtils';
import { saveAllMessagesToFirebase } from '../utils/firebaseMessages';
import { getUserExistingData, smartAnalyzeUserMessages } from '../utils/firebaseMessages';
import { DataRecoveryService } from '../services/DataRecoveryService';

const { width, height } = Dimensions.get('window');
const LAST_SCAN_KEY = '@last_scan_data';

// Color scheme
const colors = {
  primary: '#6B73FF',
  secondary: '#9C88FF',
  success: '#00D4AA',
  warning: '#FFB800',
  danger: '#FF3333',
  white: '#FFFFFF',
  lightGray: '#F8F9FA',
  mediumGray: '#E9ECEF',
  darkGray: '#6C757D',
  text: '#212529',
  textLight: '#6C757D'
};

const MessagesScreen = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load saved messages on component mount
  useEffect(() => {
    if (user) {
      loadSavedMessages();
    }
  }, [user]);

  const loadSavedMessages = async () => {
    try {
      if (!user) return;
      
      // Try to recover user data
      const recoveredData = await DataRecoveryService.recoverUserData(user.uid);
      
      if (recoveredData && recoveredData.messages?.length > 0) {
        console.log(`📱 Loaded ${recoveredData.messages.length} saved messages`);
        setMessages(recoveredData.messages);
        setScanComplete(true);
      }
    } catch (error) {
      console.error('Error loading saved messages:', error);
    }
  };

  const handleScanPress = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to scan messages');
      return;
    }

    setLoading(true);
    
    // Add timeout for the entire scan process
    const scanTimeout = setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Scan Timeout', 
        'The SMS scan is taking longer than expected. This might be due to:\n\n• Large number of SMS messages\n• Slow network connection\n• Firebase operations\n\nPlease try again with a stable internet connection.',
        [{ text: 'OK' }]
      );
    }, 180000); // 3 minutes timeout
    
    try {
      const currentDate = new Date();
      const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      console.log(`🧠 Starting smart SMS analysis for ${currentMonthName}...`);
      
      // Step 1: Check if user has existing data
      console.log(`📊 Checking existing data for user: ${user.uid}`);
      const existingData = await getUserExistingData(user.uid);
      
      if (existingData && existingData.hasData) {
        console.log(`📱 User has ${existingData.totalMessages} existing messages`);
        console.log(`📅 Last scan: ${existingData.lastScanDate ? new Date(existingData.lastScanDate).toLocaleString() : 'Never'}`);
        
        // Load existing messages immediately
        setMessages(existingData.messages);
        setScanComplete(true);
        
        Alert.alert(
          'Existing Data Found',
          `Found ${existingData.totalMessages} previously analyzed messages.\n\nLast scan: ${existingData.lastScanDate ? new Date(existingData.lastScanDate).toLocaleString() : 'Never'}\n\nScanning for new messages...`,
          [{ text: 'Continue', style: 'default' }]
        );
      } else {
        console.log(`🆕 New user - will perform initial analysis`);
      }
      
      // Step 2: Get ALL current month messages from device
      const allCurrentMessages = await scanSmsMessages(user.uid);
      console.log(`📱 Found ${allCurrentMessages.length} SMS messages from device`);
      
      if (allCurrentMessages.length === 0) {
        Alert.alert(
          'No Current Month Messages', 
          `No SMS messages found for ${currentMonthName}. Make sure you have SMS messages in the current month.`
        );
        clearTimeout(scanTimeout);
        setLoading(false);
        return;
      }
      
      // Step 3: Use smart analysis to process messages
      console.log(`🤖 Running smart analysis...`);
      const analysisResult = await smartAnalyzeUserMessages(user.uid, allCurrentMessages);
      
      if (analysisResult && analysisResult.success) {
        console.log(`✅ Smart analysis complete:`);
        console.log(`  - Analysis type: ${analysisResult.isIncremental ? 'Incremental' : 'Initial'}`);
        console.log(`  - Messages analyzed: ${analysisResult.newMessagesAnalyzed || 0}`);
        console.log(`  - Total user messages: ${analysisResult.totalMessages || 0}`);
        
        // Get updated user data
        const updatedData = await getUserExistingData(user.uid);
        if (updatedData && updatedData.messages) {
          setMessages(updatedData.messages);
          setScanComplete(true);
          
          // Show appropriate success message
          const isFirstScan = !existingData || !existingData.hasData;
          const newCount = analysisResult.newMessagesAnalyzed || 0;
          const totalCount = analysisResult.totalMessages || updatedData.totalMessages || 0;
          
          if (analysisResult.isIncremental && newCount === 0) {
            Alert.alert(
              'No New Messages', 
              `No new transaction messages found since your last scan.\n\nTotal messages: ${totalCount}`,
              [{ text: 'OK' }]
            );
          } else {
            const title = analysisResult.isIncremental ? 'Incremental Scan Complete' : 'Initial Scan Complete';
            const message = analysisResult.isIncremental 
              ? `Found and analyzed ${newCount} new messages.\n\nTotal messages: ${totalCount}`
              : `Analyzed ${totalCount} transaction messages for ${currentMonthName}.${isFirstScan ? '\n\n🎯 Future scans will only check new messages!' : ''}`;
            
            Alert.alert(title, message, [{ text: 'OK' }]);
          }
        } else {
          Alert.alert('Analysis Failed', 'Failed to retrieve analyzed messages. Please try again.');
        }
        
        // Update local storage
        await AsyncStorage.setItem(LAST_SCAN_KEY, JSON.stringify({
          timestamp: new Date().getTime(),
          messageCount: updatedData?.totalMessages || analysisResult.totalAnalyzed || 0,
          month: currentMonthName,
          scanType: analysisResult.isIncremental ? 'incremental' : 'initial'
        }));
        
      } else {
        Alert.alert('Analysis Failed', 'Failed to analyze messages. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ SMS scan failed:', error);
      Alert.alert(
        'Scan Failed', 
        `An error occurred during SMS analysis:\n\n${error.message}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      clearTimeout(scanTimeout);
      setLoading(false);
    }
  };

  // 🧪 TEST FUNCTION: Manual Firebase User Creation Test
  const testFirebaseUserCreation = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in first to test user creation');
      return;
    }

    try {
      console.log('🧪 Testing Firebase user creation for:', user.uid);
      
      const testUserData = {
        uid: user.uid,
        email: user.email || 'test@example.com',
        displayName: user.displayName || 'Test User',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        messageCount: 0,
        totalScans: 0
      };

      // Simulate creating user document in Firebase
      console.log('Creating test user document:', testUserData);
      
      Alert.alert(
        'Firebase Test Complete',
        `✅ Firebase user creation test successful!\n\nUser ID: ${user.uid}\nEmail: ${user.email || 'N/A'}\nName: ${user.displayName || 'Test User'}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Firebase test failed:', error);
      Alert.alert('Test Failed', `Firebase test failed: ${error.message}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedMessages();
    setRefreshing(false);
  };

  const handleMessagePress = (message) => {
    setSelectedMessage(message);
    setModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return colors.success;
      case 'suspicious': return colors.warning;
      case 'fraud': return colors.danger;
      default: return colors.mediumGray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe': return 'shield-checkmark';
      case 'suspicious': return 'warning';
      case 'fraud': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const filterButtons = ['all', 'safe', 'suspicious', 'fraud'];

  const filteredMessages = activeFilter === 'all' 
    ? messages 
    : messages.filter(msg => msg.status === activeFilter);

  const renderMessage = ({ item }) => (
    <TouchableOpacity 
      style={[styles.messageCard, { borderLeftColor: getStatusColor(item.status) }]}
      onPress={() => handleMessagePress(item)}
    >
      <View style={styles.messageHeader}>
        <View style={styles.senderInfo}>
          <Text style={styles.phoneNumber}>{item.phoneNumber || 'Unknown'}</Text>
          <Text style={styles.timestamp}>
            {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'No date'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Icon name={getStatusIcon(item.status)} size={12} color={colors.white} />
          <Text style={styles.statusText}>{item.status?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>
      </View>
      
      <Text style={styles.messageText} numberOfLines={2}>
        {item.messageText || item.text || 'No message content'}
      </Text>
      
      {item.amount && (
        <View style={styles.amountContainer}>
          <Icon name="cash" size={14} color={colors.success} />
          <Text style={styles.amountText}>{item.amount}</Text>
        </View>
      )}
      
      <Text style={styles.analysisText} numberOfLines={1}>
        {item.analysis || 'No analysis available'}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chatbubbles-outline" size={64} color={colors.mediumGray} />
      <Text style={styles.emptyTitle}>No Messages Found</Text>
      <Text style={styles.emptySubtitle}>
        {scanComplete 
          ? 'No SMS messages match your current filter.' 
          : 'Tap "Scan SMS" to analyze your messages for fraud detection.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.lightGray} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SMS Analysis</Text>
        <Text style={styles.headerSubtitle}>
          {messages.length > 0 ? `${filteredMessages.length} messages` : 'Ready to scan'}
        </Text>
      </View>

      {/* Filter Buttons */}
      {messages.length > 0 && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterButtons.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.activeFilterButton
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[
                  styles.filterButtonText,
                  activeFilter === filter && styles.activeFilterButtonText
                ]}>
                  {filter.toUpperCase()}
                </Text>
                <Text style={[
                  styles.filterCount,
                  activeFilter === filter && styles.activeFilterCount
                ]}>
                  {filter === 'all' 
                    ? messages.length 
                    : messages.filter(msg => msg.status === filter).length}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        data={filteredMessages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `${item.timestamp || index}-${index}`}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Scan Button */}
      <TouchableOpacity 
        style={[styles.scanButton, loading && styles.scanButtonDisabled]}
        onPress={handleScanPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Icon name="scan" size={20} color={colors.white} />
        )}
        <Text style={styles.scanButtonText}>
          {loading ? 'Scanning...' : 'Scan SMS'}
        </Text>
      </TouchableOpacity>

      {/* Test Button (for development) */}
      {__DEV__ && (
        <TouchableOpacity 
          style={styles.testButton}
          onPress={testFirebaseUserCreation}
        >
          <Text style={styles.testButtonText}>🧪 Test Firebase</Text>
        </TouchableOpacity>
      )}

      {/* Message Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={colors.darkGray} />
              </TouchableOpacity>
            </View>
            
            {selectedMessage && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone Number:</Text>
                  <Text style={styles.detailValue}>{selectedMessage.phoneNumber || 'Unknown'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedMessage.status) }]}>
                    <Icon name={getStatusIcon(selectedMessage.status)} size={12} color={colors.white} />
                    <Text style={styles.statusText}>{selectedMessage.status?.toUpperCase() || 'UNKNOWN'}</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Message:</Text>
                  <Text style={styles.detailValue}>{selectedMessage.messageText || selectedMessage.text}</Text>
                </View>
                
                {selectedMessage.amount && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValue}>{selectedMessage.amount}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Analysis:</Text>
                  <Text style={styles.detailValue}>{selectedMessage.analysis || 'No analysis available'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {selectedMessage.timestamp ? new Date(selectedMessage.timestamp).toLocaleString() : 'No date'}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.mediumGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  filterContainer: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.mediumGray,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: colors.mediumGray,
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.darkGray,
    marginRight: 6,
  },
  activeFilterButtonText: {
    color: colors.white,
  },
  filterCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.darkGray,
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  activeFilterCount: {
    backgroundColor: colors.white,
    color: colors.primary,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  senderInfo: {
    flex: 1,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 4,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginLeft: 4,
  },
  analysisText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scanButtonDisabled: {
    backgroundColor: colors.mediumGray,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: colors.warning,
    margin: 16,
    marginTop: 0,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.mediumGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
});

export default MessagesScreen;
