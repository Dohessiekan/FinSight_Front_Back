import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { testFirebaseConnection } from '../utils/firebaseTest';

export default function DebugSignupScreen() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('123456');
  const [displayName, setDisplayName] = useState('Test User');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState('');

  const { signUp } = useAuth();

  const handleTestConnection = async () => {
    setTestResult('Testing...');
    const result = await testFirebaseConnection();
    setTestResult(result.success ? '✅ Connection OK' : `❌ ${result.error}`);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    console.log('🧪 DEBUG: Starting signup process...');
    
    try {
      const result = await signUp(email, password, displayName);
      
      if (result.success) {
        Alert.alert('Success', 'Account created successfully!');
        console.log('✅ DEBUG: Signup completed successfully');
      } else {
        Alert.alert('Signup Failed', result.error || 'Unknown error occurred');
        console.error('❌ DEBUG: Signup failed:', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      console.error('💥 DEBUG: Signup exception:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Debug Signup Test</Text>
      
      <TouchableOpacity style={styles.testButton} onPress={handleTestConnection}>
        <Text style={styles.buttonText}>Test Firebase Connection</Text>
      </TouchableOpacity>
      
      {testResult ? <Text style={styles.testResult}>{testResult}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      {loading && <Text style={styles.loadingText}>Creating account...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  testResult: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
