import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../../models/user.model';
import { verifyFirebaseIdToken } from '../../config/firebase-admin';
import { env } from '../../config/env';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface AuthSessionPayload {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
}

export class AuthService {
  /**
   * Determine whether an email is on the administrative allowlist.
   */
  private static isAllowlistedAdmin(email: string): boolean {
    const allowlist = env.ADMIN_ALLOWED_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return allowlist.includes(email.toLowerCase());
  }

  /**
   * Generates a signed application session token.
   */
  public static generateSessionToken(user: IUser): string {
    const payload: AuthSessionPayload = {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Authenticates a user by validating their Firebase ID token and syncing with MongoDB.
   */
  public static async authenticateGoogleUser(idToken: string): Promise<{ user: any; token: string }> {
    if (!idToken || typeof idToken !== 'string') {
      throw new BadRequestError('Firebase ID token is required.');
    }

    let verifiedToken;
    try {
      verifiedToken = await verifyFirebaseIdToken(idToken);
    } catch (error) {
      logger.warn(`Firebase token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedError(`Invalid or expired Google credentials: ${(error as Error).message}`);
    }

    const normalizedEmail = verifiedToken.email.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new BadRequestError('Google account must provide an email address.');
    }

    const isAdminEmail = this.isAllowlistedAdmin(normalizedEmail);

    try {
      // Find existing user or insert new one atomically
      let user = await User.findOne({ firebaseUid: verifiedToken.uid });

      if (!user) {
        // Also check if account exists by email (linked account scenario)
        user = await User.findOne({ email: normalizedEmail });
      }

      if (!user) {
        user = await User.create({
          firebaseUid: verifiedToken.uid,
          email: normalizedEmail,
          displayName: verifiedToken.displayName || 'Valued Customer',
          photoURL: verifiedToken.photoURL,
          role: isAdminEmail ? 'ADMIN' : 'CUSTOMER',
          isActive: true,
          lastLoginAt: new Date(),
        });
        logger.info(`New user registered: ${normalizedEmail} (Role: ${user.role})`);
      } else {
        // Update login timestamp and profile information
        user.lastLoginAt = new Date();
        if (verifiedToken.displayName && user.displayName === 'Valued Customer') {
          user.displayName = verifiedToken.displayName;
        }
        if (verifiedToken.photoURL) {
          user.photoURL = verifiedToken.photoURL;
        }
        // Promote if on admin allowlist
        if (isAdminEmail && user.role !== 'ADMIN') {
          user.role = 'ADMIN';
          logger.info(`Promoted user ${normalizedEmail} to ADMIN based on trusted allowlist.`);
        }
        await user.save();
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Your account has been deactivated. Please contact store management.');
      }

      const token = this.generateSessionToken(user);

      return {
        user: (user as any).toSafeProfile ? (user as any).toSafeProfile() : {
          id: user._id.toString(),
          firebaseUid: user.firebaseUid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: user.role,
        },
        token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Failed to sync user with database:', error);
      throw new Error('Database operation failed during authentication.');
    }
  }

  /**
   * Retrieves profile for the authenticated user.
   */
  public static async getUserProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated.');
    }
    return (user as any).toSafeProfile ? (user as any).toSafeProfile() : {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
    };
  }
}
