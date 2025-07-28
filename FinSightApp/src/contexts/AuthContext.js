import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService from '../services/AuthService';
import DataRecoveryService from '../services/DataRecoveryService';
import { createSimpleUserProfile } from '../utils/firebaseMessages';
import LocationService from '../services/LocationService';
import LocationPermissionManager from '../services/LocationPermissionManager';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null); // Add userData state
  const [locationStatus, setLocationStatus] = useState(null); // Add location status

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      setUser(user);
      
      if (user) {
        console.log('🔥 AUTH: User signed in successfully');
        console.log('🔥 AUTH: User UID:', user.uid);
        console.log('🔥 AUTH: User email:', user.email);
        
        // Set user ID for data recovery service
        DataRecoveryService.setUserId(user.uid);
        
        // Automatically recover user data
        console.log('🔄 AUTH: Starting automatic data recovery...');
        try {
          const recoveredData = await DataRecoveryService.recoverUserData();
          
          if (recoveredData) {
            setUserData(recoveredData);
            console.log(`✅ AUTH: Data recovery successful from ${recoveredData.source}:`, {
              messagesCount: recoveredData.messages?.length || 0,
              hasProfile: !!recoveredData.userProfile,
              hasScanInfo: !!recoveredData.scanInfo
            });
          } else {
            console.log('� AUTH: No existing data found for user');
            setUserData({ 
              userId: user.uid, 
              messages: [], 
              hasData: false, 
              source: 'new_user' 
            });
          }
        } catch (error) {
          console.error('❌ AUTH: Data recovery failed:', error);
          setUserData({ 
            userId: user.uid, 
            messages: [], 
            hasData: false, 
            error: error.message 
          });
        }
        
        // Create user profile if needed (delayed to avoid auth interference)
        setTimeout(async () => {
          try {
            await createSimpleUserProfile(user.uid, {
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Mobile User',
              lastLogin: new Date().toISOString()
            });
            console.log('✅ AUTH: Profile created/updated successfully');
          } catch (error) {
            console.error('❌ AUTH: Profile creation failed:', error.message);
          }
        }, 2000);
        
        // Handle location permission on every user login (including after logout)
        setTimeout(async () => {
          try {
            console.log('📍 AUTH: Handling location permission for user login...');
            const locationResult = await LocationPermissionManager.handleUserLogin(user.uid);
            
            setLocationStatus(locationResult);
            
            if (locationResult.success) {
              console.log('✅ AUTH: Location handled successfully on login:', locationResult.action);
              if (locationResult.location) {
                console.log('📍 AUTH: Location data:', locationResult.location);
              }
            } else {
              console.log('⚠️ AUTH: Location not enabled on login:', locationResult.action || locationResult.error);
            }
            
          } catch (error) {
            console.error('❌ AUTH: Location error on login:', error);
            setLocationStatus({
              success: false,
              error: error.message
            });
          }
        }, 3000); // Run after profile creation
        
      } else {
        console.log('🔥 AUTH: User signed out');
        
        // Clear location login session
        await LocationPermissionManager.clearLoginSession();
        
        // Clear data recovery service
        if (userData?.userId) {
          await DataRecoveryService.clearUserCache();
        }
        DataRecoveryService.setUserId(null);
        setUserData(null);
        setLocationStatus(null); // Clear location status on logout
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    const result = await AuthService.signInWithEmail(email, password);
    setLoading(false);
    return result;
  };

  const signUp = async (email, password, displayName) => {
    setLoading(true);
    try {
      const result = await AuthService.signUpWithEmail(email, password, displayName);
      setLoading(false);
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    setLoading(true);
    const result = await AuthService.signOut();
    setLoading(false);
    return result;
  };

  const resetPassword = async (email) => {
    return await AuthService.resetPassword(email);
  };

  const value = {
    user,
    userData, // Add userData to context
    locationStatus, // Add location status to context
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    // Add data recovery functions
    recoverUserData: () => DataRecoveryService.recoverUserData(),
    getCacheStatus: () => DataRecoveryService.getCacheStatus(),
    refreshUserData: async () => {
      if (user) {
        const refreshedData = await DataRecoveryService.loadUserDataFromFirebase();
        if (refreshedData) {
          setUserData({ ...refreshedData, userId: user.uid });
        }
        return refreshedData;
      }
      return null;
    },
    // Add location functions
    refreshLocationStatus: async () => {
      if (user) {
        try {
          const locationResult = await LocationService.updateUserLocation(user.uid);
          setLocationStatus(locationResult);
          return locationResult;
        } catch (error) {
          console.error('❌ Location refresh failed:', error);
          return { success: false, error: error.message };
        }
      }
      return null;
    },
    getCurrentLocation: async () => {
      if (user) {
        try {
          return await LocationService.getUserLocation(user.uid);
        } catch (error) {
          console.error('❌ Get current location failed:', error);
          return { success: false, error: error.message };
        }
      }
      return null;
    },
    hasLocationPermission: () => LocationService.hasLocationPermission(),
    requestLocationPermission: () => LocationService.requestLocationPermission(),
    // Add new permission manager functions
    getLocationStatus: () => LocationPermissionManager.getLocationStatus(),
    isLocationEnabledInApp: () => LocationPermissionManager.isLocationEnabledInApp(),
    handleLocationPermissionCheck: async () => {
      if (user) {
        return await LocationPermissionManager.handleAppStartupLocationCheck(user.uid);
      }
      return null;
    },
    handleUserLoginLocationCheck: async () => {
      if (user) {
        return await LocationPermissionManager.handleUserLogin(user.uid);
      }
      return null;
    },
    clearLocationSession: () => LocationPermissionManager.clearLoginSession(),
    resetLocationPreferences: () => LocationPermissionManager.resetLocationPreferences()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
