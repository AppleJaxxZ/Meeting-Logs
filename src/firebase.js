// firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  deleteUser,
  onAuthStateChanged, // export this directly too
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  getDocs,
  writeBatch,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

// ✅ Firebase Config from .env
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// ✅ Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------- Firestore Helpers ---------------- */

// Save a single row
export const saveMeetingLog = async (userId, logId, data) => {
  try {
    if (!userId) throw new Error('Missing userId');
    const logRef = doc(db, 'meetingLogs', userId, 'logs', logId);
    await setDoc(logRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving meeting log:', error);
    return { success: false, error: error.message };
  }
};

// Save meta (name, dateRange)
export const saveFormMeta = async (userId, meta = {}) => {
  try {
    if (!userId) throw new Error('Missing userId');
    const metaRef = doc(db, 'meetingLogs', userId);
    await setDoc(metaRef, { ...meta, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving form meta:', error);
    return { success: false, error: error.message };
  }
};

// Load meta + rows
export const getMeetingLogs = async (userId) => {
  try {
    if (!userId) throw new Error('Missing userId');
    const metaRef = doc(db, 'meetingLogs', userId);
    const metaSnap = await getDoc(metaRef);
    const meta = metaSnap.exists() ? metaSnap.data() : {};

    const logsCol = collection(db, 'meetingLogs', userId, 'logs');
    const q = query(logsCol, orderBy('__name__'));
    const snapshot = await getDocs(q);

    const rows = [];
    snapshot.forEach((docSnap) => {
      const match = docSnap.id.match(/^row-(\d+)$/);
      const idx = match ? parseInt(match[1], 10) : null;
      if (idx !== null) rows[idx] = docSnap.data();
    });

    return { success: true, meta, rows };
  } catch (error) {
    console.error('Error fetching meeting logs:', error);
    return { success: false, error: error.message };
  }
};

// Clear logs + meta
export const clearMeetingLogs = async (userId) => {
  try {
    if (!userId) throw new Error('Missing userId');
    const logsRef = collection(db, 'meetingLogs', userId, 'logs');
    const snapshot = await getDocs(logsRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
    batch.delete(doc(db, 'meetingLogs', userId));
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error clearing logs:', error);
    return { success: false, error: error.message };
  }
};

/* ---------------- Auth Helpers ---------------- */

export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName });
    await sendEmailVerification(user, { url: window.location.origin });
    return { success: true, user, emailSent: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return { success: true, user, emailVerified: user.emailVerified };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email, { url: window.location.origin });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Track how many times a user has used location per day
export const checkLocationUsage = async (userId) => {
    if (!userId) {
      return { allowed: true, remaining: 3 };
    }
  
    try {
      const today = new Date().toDateString();
      const docRef = doc(db, 'locationUsage', userId);
      const userDoc = await getDoc(docRef);
  
      if (!userDoc.exists()) {
        await setDoc(docRef, { date: today, count: 0, createdAt: new Date().toISOString() });
        return { allowed: true, remaining: 3 };
      }
  
      const data = userDoc.data();
      if (data.date !== today) {
        await updateDoc(docRef, { date: today, count: 0 });
        return { allowed: true, remaining: 3 };
      }
  
      const count = data.count || 0;
      if (count >= 3) {
        return { allowed: false, remaining: 0, error: 'Daily limit reached (3 uses). Resets at midnight.' };
      }
  
      return { allowed: true, remaining: 3 - count };
    } catch (err) {
      console.error('checkLocationUsage error:', err);
      return { allowed: true, remaining: 3 };
    }
  };
  
  export const incrementLocationUsage = async (userId) => {
    if (!userId) return { success: false };
  
    try {
      const today = new Date().toDateString();
      const docRef = doc(db, 'locationUsage', userId);
      const userDoc = await getDoc(docRef);
  
      if (!userDoc.exists()) {
        await setDoc(docRef, { date: today, count: 1, lastUsed: serverTimestamp() });
      } else {
        const data = userDoc.data();
        if (data.date === today) {
          await updateDoc(docRef, { count: increment(1), lastUsed: serverTimestamp() });
        } else {
          await updateDoc(docRef, { date: today, count: 1, lastUsed: serverTimestamp() });
        }
      }
      return { success: true };
    } catch (err) {
      console.error('incrementLocationUsage error:', err);
      return { success: false };
    }
  };
  

export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user, { url: window.location.origin });
      return { success: true };
    }
    return { success: false, error: 'No user logged in' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/* ---------------- Exports ---------------- */
export { app, auth, db, deleteUser, onAuthStateChanged};
