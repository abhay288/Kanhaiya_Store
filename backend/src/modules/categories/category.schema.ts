import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Category name is required' }).min(2, 'Name must be at least 2 characters').trim(),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional(),
    imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
    imagePublicId: z.string().trim().optional().or(z.literal('')),
    displayOrder: z.coerce.number().optional().default(0),
    isActive: z.boolean().optional().default(true),
    parentId: z
      .string()
      .regex(objectIdRegex, 'Invalid parent category ID')
      .nullable()
      .optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid category ID'),
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional(),
    imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
    imagePublicId: z.string().trim().optional().or(z.literal('')),
    displayOrder: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
    parentId: z
      .string()
      .regex(objectIdRegex, 'Invalid parent category ID')
      .nullable()
      .optional(),
  }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Category ID or slug is required'),
  }),
});

export const listCategoriesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    parentId: z.string().optional(),
    includeInactive: z.enum(['true', 'false']).optional(),
    tree: z.enum(['true', 'false']).optional(),
  }),
});
