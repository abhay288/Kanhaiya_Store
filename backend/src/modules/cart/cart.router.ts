import { Router } from 'express';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { authenticate } from '../../middleware/authenticate';
import { validateRequest } from '../../middleware/validate.middleware';
import { validateCartSchema, syncCartSchema } from './cart.schema';
import { validateCart, getCart, syncCart, clearCart } from './cart.controller';

const router = Router();

// Public cart validation (can be called by both guests and authenticated users)
router.post('/validate', validateRequest(validateCartSchema), validateCart);

// User-bound persistent cart endpoints
router.get('/', optionalAuthenticate, getCart);
router.put('/', authenticate, validateRequest(syncCartSchema), syncCart);
router.delete('/', authenticate, clearCart);

export const cartRouter = router;
