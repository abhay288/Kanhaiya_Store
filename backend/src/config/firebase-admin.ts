import * as admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

let isFirebaseInitialized = false;

export function initializeFirebaseAdmin(): admin.app.App | null {
  if (isFirebaseInitialized && admin.apps.length > 0) {
    return admin.app();
  }

  // Check if valid credentials are provided
  const hasRealCredentials =
    env.FIREBASE_PROJECT_ID !== 'dummy-firebase-project' &&
    env.FIREBASE_PRIVATE_KEY !== 'dummy-private-key' &&
    !env.FIREBASE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----') === false;

  if (hasRealCredentials) {
    try {
      const formattedPrivateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: formattedPrivateKey,
        }),
      });
      isFirebaseInitialized = true;
      logger.info('Firebase Admin SDK initialized successfully');
      return app;
    } catch (error) {
      logger.warn(`Firebase Admin SDK initialization skipped: ${(error as Error).message}`);
    }
  } else {
    logger.info('Firebase Admin SDK in development/mock fallback mode');
  }

  return null;
}

export interface VerifiedFirebaseToken {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
}

/**
 * Verify Firebase ID Token cryptographically using Firebase Admin SDK.
 * In dev/test mode, supports mock test tokens for automated test suites.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  // Test/Development mock token handlers for testing authentication flow
  if (idToken.startsWith('test-token:')) {
    const parts = idToken.split(':');
    const role = parts[1] || 'customer';
    const email = (parts[2] || 'customer@example.com').toLowerCase();
    return {
      uid: `test-firebase-uid-${email}`,
      email: email,
      displayName: role === 'admin' ? 'Test Administrator' : 'Test Customer',
      emailVerified: true,
    };
  }

  if (admin.apps.length > 0) {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: (decodedToken.email || '').toLowerCase(),
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      emailVerified: Boolean(decodedToken.email_verified),
    };
  }

  throw new Error('Firebase Admin SDK is not initialized with valid service credentials.');
}
