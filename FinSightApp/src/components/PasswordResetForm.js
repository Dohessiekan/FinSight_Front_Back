import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from './Input';
import Button from './Button';
import colors from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { generatePasswordResetMessage, isValidEmail } from '../utils/emailHelpers';

export default function PasswordResetForm({ onClose, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email);
      if (result.success) {
        setEmailSent(true);
        const message = generatePasswordResetMessage(email);
        
        Alert.alert(
          'Password Reset Email Sent',
          message,
          [
            { 
              text: 'Check Email', 
              style: 'default',
              onPress: onClose
            },
            {
              text: 'Resend',
              style: 'cancel',
              onPress: () => {
                setEmailSent(false);
                handleResetPassword();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showEmailTips = () => {
    Alert.alert(
      'Email Delivery Tips',
      '📧 Having trouble receiving emails?\n\n' +
      '✓ Check your spam/junk folder\n' +
      '✓ Add Firebase to your contacts:\n' +
      '   noreply@finsight-9d1fd.firebaseapp.com\n' +
      '✓ Look for subject: "Reset your password for FinSight"\n' +
      '✓ Email may take 2-5 minutes to arrive\n' +
      '✓ Ensure your email storage isn\'t full\n\n' +
      '💡 Mark Firebase emails as "Not Spam" to improve delivery',
      [{ text: 'Got It', style: 'default' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Reset Password</Text>
        <TouchableOpacity onPress={showEmailTips} style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <Input
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
        </View>

        <Button
          title={isLoading ? "Sending..." : emailSent ? "Resend Email" : "Send Reset Email"}
          onPress={handleResetPassword}
          style={styles.resetButton}
          disabled={isLoading || !email}
          loading={isLoading}
        />

        {emailSent && (
          <View style={styles.successMessage}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>
              Email sent! Check your inbox and spam folder.
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={showEmailTips} style={styles.tipsButton}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.tipsText}>Email delivery tips</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  helpButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  resetButton: {
    marginBottom: 16,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: colors.success,
    marginLeft: 8,
    fontWeight: '500',
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tipsText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
});
