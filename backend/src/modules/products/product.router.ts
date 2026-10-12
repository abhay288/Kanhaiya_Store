import { Router } from 'express';
import {
  listProducts,
  getProduct,
  getCollections,
  getRelatedProducts,
  createProduct,
  updateProduct,
  togglePublish,
  deleteProduct,
} from './product.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin } from '../../middleware/authorize-admin';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  togglePublishProductSchema,
  productIdParamSchema,
  listProductsQuerySchema,
} from './product.schema';

const router = Router();

// Collections for homepage merchandising (featured, new arrivals, bestsellers)
router.get('/collections', getCollections);

// Public listing & single product (optional auth to support admin draft preview)
router.get('/', optionalAuthenticate, validateRequest(listProductsQuerySchema), listProducts);
router.get('/:id/related', getRelatedProducts);
router.get('/:id', optionalAuthenticate, validateRequest(productIdParamSchema), getProduct);

// Admin-only management endpoints
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validateRequest(createProductSchema),
  createProduct
);

router.patch(
  '/:id/publish',
  authenticate,
  authorizeAdmin,
  validateRequest(togglePublishProductSchema),
  togglePublish
);

router.patch(
  '/:id',
  authenticate,
  authorizeAdmin,
  validateRequest(updateProductSchema),
  updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validateRequest(productIdParamSchema),
  deleteProduct
);

export const productRouter = router;
