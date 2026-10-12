import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from './category.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin } from '../../middleware/authorize-admin';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from './category.schema';

const router = Router();

// Publicly readable (with admin extensions if token provided)
router.get('/', optionalAuthenticate, validateRequest(listCategoriesQuerySchema), listCategories);
router.get('/:id', optionalAuthenticate, validateRequest(categoryIdParamSchema), getCategory);

// Protected Admin CRUD
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validateRequest(createCategorySchema),
  createCategory
);

router.patch(
  '/:id',
  authenticate,
  authorizeAdmin,
  validateRequest(updateCategorySchema),
  updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validateRequest(categoryIdParamSchema),
  deleteCategory
);

export const categoryRouter = router;
