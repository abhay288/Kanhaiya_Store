import { Router } from 'express';
import { AuthController, googleLoginSchema, quickLoginSchema, updateProfileSchema } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public: Google sign-in with rate limit and schema validation
router.post('/google', authRateLimiter, validateRequest(googleLoginSchema), AuthController.loginWithGoogle);

// Public: Quick customer mobile login/registration (auto-creates account if not exists)
router.post('/quick-login', authRateLimiter, validateRequest(quickLoginSchema), AuthController.quickLogin);

// Protected: Current authenticated profile
router.get('/me', authenticate, AuthController.getCurrentUser);

// Protected: Update contact phone or display name
router.put('/profile', authenticate, validateRequest(updateProfileSchema), AuthController.updateProfile);

// Protected: Logout session
router.post('/logout', authenticate, AuthController.logout);

export const authRoutes = router;
