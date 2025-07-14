import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Platform, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MessagesScreen from '../screens/MessagesScreen';
import AdviceScreen from '../screens/AdviceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SMSInboxScreen from '../screens/SMSInboxScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { 
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          paddingHorizontal: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
          position: 'absolute',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          borderRadius: 16,
          marginHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          const iconSize = focused ? 28 : 24;
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          } else if (route.name === 'Advice') {
            return (
              <MaterialIcons 
                name="insights" 
                size={iconSize} 
                color={focused ? colors.primary : colors.textSecondary}
                style={{ 
                  opacity: focused ? 1 : 0.6,
                  transform: [{ scale: focused ? 1.15 : 1 }]
                }}
              />
            );
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          } else if (route.name === 'SMSInbox') {
            iconName = focused ? 'mail' : 'mail-outline';
          }
          
          return iconName ? (
            <Ionicons 
              name={iconName} 
              size={iconSize} 
              color={focused ? colors.primary : colors.textSecondary}
              style={{ 
                opacity: focused ? 1 : 0.6,
                transform: [{ scale: focused ? 1.15 : 1 }]
              }}
            />
          ) : null;
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
        }}
      />
      <Tab.Screen 
        name="Advice" 
        component={AdviceScreen}
        options={{
          tabBarLabel: 'Insights',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
      <Tab.Screen 
        name="SMSInbox" 
        component={SMSInboxScreen} 
        options={{
          tabBarLabel: 'SMS Inbox',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'mail' : 'mail-outline'} 
              size={focused ? 28 : 24} 
              color={focused ? colors.primary : colors.textSecondary}
              style={{ 
                opacity: focused ? 1 : 0.6,
                transform: [{ scale: focused ? 1.15 : 1 }]
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Authentication Stack - for non-authenticated users
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// App Stack - for authenticated users
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
});
