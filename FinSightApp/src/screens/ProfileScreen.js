import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  StatusBar,
  SafeAreaView,
  Alert
} from 'react-native';
import colors from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import FirebaseService from '../services/FirebaseService';
import Button from '../components/Button';
import ScreenWrapper from '../components/ScreenWrapper';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    name: user?.displayName || 'User',
    email: user?.email || 'user@email.com',
    phone: '+250 788 123 456',
    location: 'Kigali, Rwanda',
    bio: 'FinSight user | Managing finances smartly',
  });

  // Function to format the member since date
  const getMemberSinceDate = () => {
    // Try to get creation date from different sources in order of preference
    let creationDate = null;
    
    // 1. From Firebase Auth metadata (most reliable)
    if (user?.metadata?.creationTime) {
      creationDate = new Date(user.metadata.creationTime);
    }
    // 2. From user profile document's createdAt field
    else if (userData?.createdAt) {
      creationDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    }
    // 3. From user profile document's accountCreated field
    else if (userData?.accountCreated) {
      creationDate = userData.accountCreated.toDate ? userData.accountCreated.toDate() : new Date(userData.accountCreated);
    }
    
    // Format the date or use fallback
    if (creationDate && !isNaN(creationDate.getTime())) {
      const now = new Date();
      const diffTime = Math.abs(now - creationDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If account is very new (less than 30 days), show more specific info
      if (diffDays < 30) {
        if (diffDays === 0) {
          return 'Member since today';
        } else if (diffDays === 1) {
          return 'Member since yesterday';
        } else if (diffDays < 7) {
          return `Member since ${diffDays} days ago`;
        } else {
          const weeks = Math.floor(diffDays / 7);
          return `Member since ${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
      } else {
        // For older accounts, show month and year
        const options = { year: 'numeric', month: 'short' };
        const formattedDate = creationDate.toLocaleDateString('en-US', options);
        return `Member since ${formattedDate}`;
      }
    }
    
    // Fallback if no valid date is found
    return 'Member since Jan 2020';
  };

  // Load user profile from Firebase
  const loadUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await FirebaseService.getUserProfile(user.uid);
      if (result.success && result.data) {
        setUserData(prevData => ({
          ...prevData,
          ...result.data,
          name: user.displayName || result.data.name || prevData.name,
          email: user.email || result.data.email || prevData.email
        }));
      } else {
        // If no profile exists, create one with account creation date
        const profileData = {
          name: user.displayName || userData.name,
          email: user.email || userData.email,
          phone: userData.phone,
          location: userData.location,
          bio: userData.bio,
          accountCreated: user.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date()
        };
        
        const createResult = await FirebaseService.createUserProfile(user.uid, profileData);
        if (createResult.success) {
          setUserData(prevData => ({
            ...prevData,
            ...profileData
          }));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const handleEditToggle = () => setIsEditing(!isEditing);
  
  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await FirebaseService.updateUserProfile(user.uid, {
        phone: userData.phone,
        location: userData.location,
        bio: userData.bio
      });
      
      if (result.success) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await signOut();
              if (!result.success) {
                Alert.alert(
                  'Sign Out Failed', 
                  result.error || 'Failed to sign out. Please try again.',
                  [{ text: 'OK' }]
                );
              }
              // If successful, the AuthContext will handle navigation automatically
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert(
                'Error', 
                'An unexpected error occurred. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  const handleChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  // Create refs for input fields
  const nameRef = useRef();
  const emailRef = useRef();
  const bioRef = useRef();
  const phoneRef = useRef();
  const locationRef = useRef();

  // Function to focus next field
  const focusNextField = (nextRef) => {
    if (nextRef && nextRef.current) {
      nextRef.current.focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <ScreenWrapper>
        {/* Standardized Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Profile</Text>
            <Text style={styles.subtitle}>Manage your account settings</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.editButton,
              isEditing && styles.saveButton
            ]}
            onPress={isEditing ? handleSave : handleEditToggle}
          >
            <Ionicons 
              name={isEditing ? "checkmark" : "settings"} 
              size={20} 
              color={colors.white} 
            />
          </TouchableOpacity>
        </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Compact Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileContent}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.avatar} 
                />
                {isEditing && (
                  <TouchableOpacity 
                    style={styles.editIcon} 
                    onPress={() => alert('Image upload would be implemented here')}
                  >
                    <Ionicons name="camera" size={14} color={colors.white} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.profileInfo}>
                {isEditing ? (
                  <TextInput
                    ref={nameRef}
                    style={[styles.nameText, styles.input]}
                    value={userData.name}
                    onChangeText={(text) => handleChange('name', text)}
                    placeholder="Full Name"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="next"
                    onSubmitEditing={() => focusNextField(emailRef)}
                  />
                ) : (
                  <Text style={styles.nameText}>{userData.name}</Text>
                )}
                
                {isEditing ? (
                  <TextInput
                    ref={emailRef}
                    style={[styles.emailText, styles.input]}
                    value={userData.email}
                    onChangeText={(text) => handleChange('email', text)}
                    placeholder="Email"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => focusNextField(bioRef)}
                  />
                ) : (
                  <Text style={styles.emailText}>{userData.email}</Text>
                )}
                
                <View style={styles.verifiedContainer}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bio Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            {isEditing ? (
              <TextInput
                ref={bioRef}
                style={[styles.bioInput, styles.input]}
                value={userData.bio}
                onChangeText={(text) => handleChange('bio', text)}
                placeholder="Tell something about yourself..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                returnKeyType="next"
                onSubmitEditing={() => focusNextField(phoneRef)}
              />
            ) : (
              <Text style={styles.bioText}>{userData.bio}</Text>
            )}
          </View>

          {/* Additional Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={24} color={colors.primary} />
              {isEditing ? (
                <TextInput
                  ref={phoneRef}
                  style={[styles.infoText, styles.input]}
                  value={userData.phone}
                  onChangeText={(text) => handleChange('phone', text)}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => focusNextField(locationRef)}
                />
              ) : (
                <Text style={styles.infoText}>{userData.phone}</Text>
              )}
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={24} color={colors.primary} />
              {isEditing ? (
                <TextInput
                  ref={locationRef}
                  style={[styles.infoText, styles.input]}
                  value={userData.location}
                  onChangeText={(text) => handleChange('location', text)}
                  placeholder="Location"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              ) : (
                <Text style={styles.infoText}>{userData.location}</Text>
              )}
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <Text style={styles.infoText}>{getMemberSinceDate()}</Text>
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => {
                // For now, show an alert since these screens might not exist yet
                Alert.alert(
                  'Coming Soon',
                  'Settings page will be available in a future update.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => {
                Alert.alert(
                  'Coming Soon',
                  'Help & Support page will be available in a future update.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => {
                Alert.alert(
                  'Coming Soon',
                  'Privacy Policy page will be available in a future update.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="shield-outline" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <View style={styles.signOutSection}>
            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="danger"
              style={styles.signOutButton}
              loading={loading}
              icon="log-out-outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </ScreenWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Add status bar padding for Android
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  editButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
    flex: 1,
  },
  bioText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
    flex: 1,
  },
  signOutSection: {
    marginBottom: 20,
  },
  signOutButton: {
    marginTop: 10,
  },
});
