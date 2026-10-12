import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: 'Firebase ID token is required' }).min(1, 'Firebase ID token cannot be empty'),
  }),
});

export const quickLoginSchema = z.object({
  body: z.object({
    phone: z.string({ required_error: 'Phone number is required' }).min(10, 'Valid 10-digit mobile number required'),
    displayName: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    phoneNumber: z.string().optional(),
    displayName: z.string().optional(),
  }),
});

export class AuthController {
  public static async loginWithGoogle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body;
      const result = await AuthService.authenticateGoogleUser(idToken);
      sendSuccess(res, result, 'Authenticated successfully with Google.');
    } catch (error) {
      next(error);
    }
  }

  public static async quickLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, displayName, email } = req.body;
      const result = await AuthService.authenticateCustomerPhone(phone, displayName, email);
      sendSuccess(res, result, 'Authenticated successfully.');
    } catch (error) {
      next(error);
    }
  }

  public static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getUserProfile(req.user!.id);
      sendSuccess(res, user, 'Current user profile retrieved.');
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await AuthService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, updated, 'Profile updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  public static logout(_req: Request, res: Response): void {
    sendSuccess(res, null, 'Logged out successfully.');
  }
}
