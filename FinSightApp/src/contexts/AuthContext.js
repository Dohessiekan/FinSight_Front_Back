import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService from '../services/AuthService';
import DataRecoveryService from '../services/DataRecoveryService';
import { createSimpleUserProfile } from '../utils/firebaseMessages';

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
        
      } else {
        console.log('🔥 AUTH: User signed out');
        
        // Clear data recovery service
        if (userData?.userId) {
          await DataRecoveryService.clearUserCache();
        }
        DataRecoveryService.setUserId(null);
        setUserData(null);
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
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
