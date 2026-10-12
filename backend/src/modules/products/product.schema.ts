import { z } from 'zod';
import { PRODUCT_UNITS } from '../../models/product.model';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const productImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  publicId: z.string().min(1, 'Cloudinary public ID is required'),
  isPrimary: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().optional().default(0),
});

const productVariantSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  price: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  stockQuantity: z.coerce.number().int().min(0).optional(),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Product name is required' }).min(2, 'Name must be at least 2 characters').trim(),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional().default(''),
    brand: z.string().trim().optional().default(''),
    sku: z.string().trim().optional(),
    barcode: z.string().trim().optional().default(''),
    categoryId: z.string().regex(objectIdRegex, 'Invalid category ID'),
    subcategoryId: z.string().regex(objectIdRegex, 'Invalid subcategory ID').nullable().optional(),
    unit: z.enum(PRODUCT_UNITS, {
      errorMap: () => ({ message: `Unit must be one of: ${PRODUCT_UNITS.join(', ')}` }),
    }).default('piece'),
    packSize: z.string().trim().optional().default(''),
    mrp: z.coerce.number().min(0, 'MRP cannot be negative').optional().default(0),
    sellingPrice: z.coerce.number({ required_error: 'Selling price is required' }).min(0, 'Selling price cannot be negative'),
    stockQuantity: z.coerce.number().int('Stock must be an integer').min(0, 'Stock cannot be negative').default(0),
    lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
    isAvailable: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(true),
    isFeatured: z.boolean().optional().default(false),
    isNewArrival: z.boolean().optional().default(false),
    isBestseller: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional().default([]),
    images: z.array(productImageSchema).optional().default([]),
    variants: z.array(productVariantSchema).optional().default([]),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID or slug is required'),
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    sku: z.string().trim().optional(),
    barcode: z.string().trim().optional(),
    categoryId: z.string().regex(objectIdRegex, 'Invalid category ID').optional(),
    subcategoryId: z.string().regex(objectIdRegex, 'Invalid subcategory ID').nullable().optional(),
    unit: z.enum(PRODUCT_UNITS).optional(),
    packSize: z.string().trim().optional(),
    mrp: z.coerce.number().min(0).optional(),
    sellingPrice: z.coerce.number().min(0).optional(),
    stockQuantity: z.coerce.number().int().min(0).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
    isAvailable: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isBestseller: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    images: z.array(productImageSchema).optional(),
    variants: z.array(productVariantSchema).optional(),
  }),
});

export const togglePublishProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID is required'),
  }),
  body: z.object({
    isPublished: z.boolean({ required_error: 'isPublished boolean is required' }),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID or slug is required'),
  }),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().optional(),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    tag: z.string().optional(),
    brand: z.string().optional(),
    isFeatured: z.enum(['true', 'false']).optional(),
    isNewArrival: z.enum(['true', 'false']).optional(),
    isBestseller: z.enum(['true', 'false']).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    isPublished: z.enum(['true', 'false']).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z
      .enum(['price_asc', 'price_desc', 'newest', 'name_asc', 'stock_asc'])
      .optional()
      .default('newest'),
  }),
});
