import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Share, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  StatusBar
} from 'react-native';
import Button from '../components/Button';
import colors from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'johndoe@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    bio: 'Senior UX Designer | Photography enthusiast | Coffee lover',
  });

  const handleEditToggle = () => setIsEditing(!isEditing);
  
  const handleSave = () => {
    setIsEditing(false);
    console.log('Profile saved:', userData);
  };

  const handleChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${userData.name}'s Profile`,
        message: `Check out ${userData.name}'s profile!\n\nEmail: ${userData.email}\nLocation: ${userData.location}\nBio: ${userData.bio}`,
        url: 'https://yourapp.com/profile',
      });
    } catch (error) {
      console.error('Error sharing profile:', error.message);
    }
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
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="arrow-back" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={isEditing ? handleSave : handleEditToggle}>
          <Ionicons 
            name={isEditing ? "save" : "settings-outline"} 
            size={28} 
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
          {/* Profile Card */}
          <View style={styles.profileCard}>
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
                  <Ionicons name="camera" size={18} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>
            
            {isEditing ? (
              <TextInput
                ref={nameRef}
                style={[styles.title, styles.input]}
                value={userData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="Full Name"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="next"
                onSubmitEditing={() => focusNextField(emailRef)}
              />
            ) : (
              <Text style={styles.title}>{userData.name}</Text>
            )}
            
            {isEditing ? (
              <TextInput
                ref={emailRef}
                style={[styles.label, styles.input]}
                value={userData.email}
                onChangeText={(text) => handleChange('email', text)}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => focusNextField(bioRef)}
              />
            ) : (
              <Text style={styles.label}>{userData.email}</Text>
            )}
            
            <View style={styles.statusContainer}>
              <Ionicons name="ios-shield-checkmark" size={22} color={colors.success} />
              <Text style={styles.status}>Verified User</Text>
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

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>42</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>128</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>89</Text>
              <Text style={styles.statLabel}>Kudos</Text>
            </View>
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
              <Text style={styles.infoText}>Member since Jan 2020</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button 
              title={isEditing ? "Cancel" : "Edit Profile"} 
              style={isEditing ? styles.cancelButton : styles.outlineButton}
              textStyle={isEditing ? styles.cancelButtonText : styles.outlineButtonText}
              onPress={() => isEditing ? setIsEditing(false) : handleEditToggle()}
            />
            <Button 
              title="Share Profile" 
              icon="share-social-outline"
              onPress={handleShare}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: colors.primary,
    width: '100%',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 32,
    paddingTop: 50,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.lightGray,
  },
  editIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  status: {
    fontSize: 15,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
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
    borderBottomColor: colors.borderLight,
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
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 16,
    color: colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 10,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    flex: 1,
  },
  outlineButtonText: {
    color: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.dangerLight,
    flex: 1,
  },
  cancelButtonText: {
    color: colors.danger,
  },
});
