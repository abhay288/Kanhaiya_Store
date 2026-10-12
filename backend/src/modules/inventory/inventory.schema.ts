import { z } from 'zod';
import { Types } from 'mongoose';

const isValidObjectId = (val: string) => Types.ObjectId.isValid(val);

export const stockAdjustmentTypes = [
  'OPENING_STOCK',
  'PURCHASE_RECEIPT',
  'MANUAL_INCREASE',
  'MANUAL_DECREASE',
  'DAMAGED_EXPIRED',
  'CUSTOMER_RETURN',
  'STOCK_CORRECTION',
  'RECONCILIATION',
  'ORDER_FULFILLMENT',
] as const;

export const stockAdjustmentSchema = z.object({
  body: z.object({
    productId: z.string().refine(isValidObjectId, { message: 'Invalid product ID' }),
    adjustmentType: z.enum(stockAdjustmentTypes, {
      errorMap: () => ({ message: 'Invalid stock adjustment type' }),
    }),
    quantity: z.number().positive({ message: 'Adjustment quantity must be greater than 0' }),
    reason: z.string().min(2, { message: 'Reason must be at least 2 characters' }),
    notes: z.string().optional(),
    supplierName: z.string().optional(),
    supplierInvoiceNumber: z.string().optional(),
    batchNumber: z.string().optional(),
    manufacturingDate: z.string().datetime().optional().or(z.date().optional()),
    expiryDate: z.string().datetime().optional().or(z.date().optional()),
    idempotencyKey: z.string().min(6).optional(),
    allowNegativeStock: z.boolean().optional().default(false),
  }),
});

export const stockReconciliationSchema = z.object({
  body: z.object({
    productId: z.string().refine(isValidObjectId, { message: 'Invalid product ID' }),
    physicalCount: z.number().min(0, { message: 'Physical count cannot be negative' }),
    reason: z.string().min(2, { message: 'Reason must be at least 2 characters' }).default('Physical inventory count reconciliation'),
    notes: z.string().optional(),
    idempotencyKey: z.string().min(6).optional(),
  }),
});

export const listMovementsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    productId: z.string().refine(isValidObjectId, { message: 'Invalid product ID' }).optional(),
    adjustmentType: z.enum(stockAdjustmentTypes).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const listAlertsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
    alertType: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'NEAR_EXPIRY']).optional(),
  }),
});

export const alertIdParamSchema = z.object({
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid alert ID' }),
  }),
});

export const expiryReportQuerySchema = z.object({
  query: z.object({
    daysThreshold: z.string().regex(/^\d+$/).transform(Number).optional().default('30'),
  }),
});
