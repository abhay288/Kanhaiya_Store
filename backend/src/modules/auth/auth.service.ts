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
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
  }

  /**
   * Authenticate or register customer by phone number.
   * If account does not exist -> creates it.
   * If account exists -> logs them in.
   */
  public static async authenticateCustomerPhone(
    phone: string,
    displayName?: string,
    email?: string
  ): Promise<{ user: any; token: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new BadRequestError('Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.');
    }

    let user = await User.findOne({ phoneNumber: cleanPhone });

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      // Create new customer account atomically
      user = await User.create({
        firebaseUid: `phone_${cleanPhone}`,
        email: email ? email.toLowerCase().trim() : `${cleanPhone}@kanhaiyastore.local`,
        displayName: displayName?.trim() || 'Valued Customer',
        phoneNumber: cleanPhone,
        role: 'CUSTOMER',
        isActive: true,
        lastLoginAt: new Date(),
      });
      logger.info(`New customer registered with phone: ${cleanPhone}`);
    } else {
      user.lastLoginAt = new Date();
      if (!user.phoneNumber) {
        user.phoneNumber = cleanPhone;
      }
      if (displayName && user.displayName === 'Valued Customer') {
        user.displayName = displayName.trim();
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
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Updates customer profile (e.g. phone number or display name).
   */
  public static async updateProfile(
    userId: string,
    data: { phoneNumber?: string; displayName?: string }
  ) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated.');
    }

    if (data.phoneNumber) {
      const cleanPhone = data.phoneNumber.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        throw new BadRequestError('Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.');
      }
      user.phoneNumber = cleanPhone;
    }

    if (data.displayName && data.displayName.trim().length >= 2) {
      user.displayName = data.displayName.trim();
    }

    await user.save();
    return (user as any).toSafeProfile ? (user as any).toSafeProfile() : {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
  }
}
