// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  deleteUser
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service  
const db = getFirestore(app);

// Auth functions
const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's display name
    await updateProfile(user, {
      displayName: displayName
    });
    
    // Send email verification
    await sendEmailVerification(user, {
      url: window.location.origin, // Redirect back to your app after verification
      handleCodeInApp: false
    });
    
    return { 
      success: true, 
      user: user,
      emailSent: true,
      message: 'Account created! Please check your email to verify your account.'
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: error.message };
  }
};

const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified
    if (!user.emailVerified) {
      return { 
        success: true, 
        user: user,
        emailVerified: false,
        warning: 'Please verify your email before continuing. Check your inbox for the verification link.'
      };
    }
    
    return { 
      success: true, 
      user: user,
      emailVerified: true 
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
};

const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: error.message };
  }
};

const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin, // Redirect back to your app after password reset
      handleCodeInApp: false
    });
    return { 
      success: true,
      message: 'Password reset email sent! Please check your inbox.'
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, error: error.message };
  }
};

const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user, {
        url: window.location.origin,
        handleCodeInApp: false
      });
      return { 
        success: true, 
        message: 'Verification email resent! Please check your inbox.' 
      };
    }
    return { 
      success: false, 
      error: 'No user logged in' 
    };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { success: false, error: error.message };
  }
};

// Export everything at the end
export { 
  auth, 
  db, 
  registerUser, 
  loginUser, 
  logoutUser, 
  resetPassword,
  resendVerificationEmail,
  deleteUser
};

// Default export if needed
export default app;