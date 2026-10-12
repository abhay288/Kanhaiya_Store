import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const cartItemInputSchema = z.object({
  productId: z.string().regex(objectIdRegex, 'Invalid product ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  variantName: z.string().optional(),
});

export const validateCartSchema = z.object({
  body: z.object({
    items: z.array(cartItemInputSchema),
  }),
});

export const syncCartSchema = z.object({
  body: z.object({
    items: z.array(cartItemInputSchema),
  }),
});
