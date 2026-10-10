import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyAWYrTiuHh5nD5qzmCMG8rvtJT8mXvzA30",
  authDomain: "kanhaiya-general-store.firebaseapp.com",
  projectId: "kanhaiya-general-store",
  storageBucket: "kanhaiya-general-store.firebasestorage.app",
  messagingSenderId: "359309992004",
  appId: "1:359309992004:web:d4d37514f4b371bb12dc11",
  measurementId: "G-N1QQ168WD2",
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
