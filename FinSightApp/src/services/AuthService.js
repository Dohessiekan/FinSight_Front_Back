import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
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
