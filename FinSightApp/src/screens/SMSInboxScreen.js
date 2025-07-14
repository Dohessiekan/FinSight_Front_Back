import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import SMSService from '../services/SMSService';

const SMSInboxScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSMS = async () => {
      try {
        const hasPermissions = await SMSService.checkSMSPermissions();
        if (!hasPermissions) {
          const granted = await SMSService.requestSMSPermissions();
          if (!granted) {
            Alert.alert('Permissions Required', 'SMS permissions are required to display messages.');
            return;
          }
        }

        const smsMessages = await SMSService.getAllSMS();
        setMessages(smsMessages);
      } catch (error) {
        console.error('Error fetching SMS:', error);
        Alert.alert('Error', 'Failed to fetch SMS messages.');
      } finally {
        setLoading(false);
      }
    };

    fetchSMS();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.messageContainer}>
      <Text style={styles.sender}>{item.address || 'Unknown Sender'}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.date}>{new Date(parseInt(item.date)).toLocaleString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading SMS messages...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item._id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 10,
  },
  messageContainer: {
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  body: {
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
});

export default SMSInboxScreen;
