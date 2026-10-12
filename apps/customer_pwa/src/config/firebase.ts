import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAX6EKTDx4gL09YotiAdJrlC4UbI26vew0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kanhaiya-general-store.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kanhaiya-general-store",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kanhaiya-general-store.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "359309992004",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:359309992004:web:d4d37514f4b371bb12dc11",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-N1QQ168WD2",
};

// Initialize Firebase once
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request email and profile scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Triggers Google Sign-In popup via Firebase Web SDK
 * Returns Firebase UserCredential and ID Token
 */
export async function signInWithGoogleWeb(): Promise<{ credential: UserCredential; idToken: string }> {
  const credential = await signInWithPopup(auth, googleProvider);
  const idToken = await credential.user.getIdToken();
  return { credential, idToken };
}
