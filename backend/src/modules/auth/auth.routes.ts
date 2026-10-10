import { Router } from 'express';
import { AuthController, googleLoginSchema } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public: Google sign-in with rate limit and schema validation
router.post('/google', authRateLimiter, validateRequest(googleLoginSchema), AuthController.loginWithGoogle);

// Protected: Current authenticated profile
router.get('/me', authenticate, AuthController.getCurrentUser);

// Protected: Logout session
router.post('/logout', authenticate, AuthController.logout);

export const authRoutes = router;
