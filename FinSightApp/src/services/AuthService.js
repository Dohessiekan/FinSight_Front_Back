import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { getActionCodeSettings } from '../config/emailConfig';

class AuthService {
  // Sign in with email and password
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Sign up with email and password
  async signUpWithEmail(email, password, displayName) {
    try {
      console.log('🔐 Starting Firebase signup...');
      
      // Add timeout to signup process
      const signupPromise = createUserWithEmailAndPassword(auth, email, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Signup timeout - please check your internet connection')), 30000)
      );
      
      const userCredential = await Promise.race([signupPromise, timeoutPromise]);
      console.log('✅ Firebase signup successful');
      
      // Update the user's display name
      if (displayName) {
        try {
          await updateProfile(userCredential.user, {
            displayName: displayName
          });
          console.log('✅ Display name updated');
        } catch (profileError) {
          console.warn('Profile update failed (non-critical):', profileError);
          // Don't fail the entire signup for profile update issues
        }
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('❌ Signup error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet and try again.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Sign out
  async signOut() {
    try {
      console.log('🔐 Signing out user from Firebase...');
      await firebaseSignOut(auth);
      console.log('✅ Firebase sign out successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Firebase sign out failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset password with enhanced settings
  async resetPassword(email) {
    try {
      // Get optimized action code settings for better deliverability
      const actionCodeSettings = getActionCodeSettings('PASSWORD_RESET');
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send password reset email';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many reset attempts. Please try again later';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }
}

export default new AuthService();
