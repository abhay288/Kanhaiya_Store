import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { Product } from '../src/models/product.model';
import { StockMovement } from '../src/models/stockMovement.model';
import { InventoryAlert } from '../src/models/inventoryAlert.model';
import { User } from '../src/models/user.model';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('Phase 4: Inventory Management & Stock Control Suite', () => {
  const adminId = '60d5ec49f1b2c82d88888882';
  const customerId = '60d5ec49f1b2c82d88888881';

  const adminToken = jwt.sign(
    {
      id: adminId,
      firebaseUid: 'firebase-admin-uid',
      email: 'admin@kanhaiyastore.com',
      role: 'ADMIN',
    },
    env.JWT_SECRET
  );

  const customerToken = jwt.sign(
    {
      id: customerId,
      firebaseUid: 'firebase-customer-uid',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    },
    env.JWT_SECRET
  );

  let mockProducts: any[] = [];
  let mockMovements: any[] = [];
  let mockAlerts: any[] = [];

  beforeAll(() => {
    // Mock user lookups for auth middleware
    vi.spyOn(User as any, 'findById').mockImplementation((id: any) => {
      const isAdm = id.toString() === adminId;
      return Promise.resolve({
        _id: id,
        email: isAdm ? 'admin@kanhaiyastore.com' : 'customer@example.com',
        displayName: isAdm ? 'Admin' : 'Customer',
        role: isAdm ? 'ADMIN' : 'CUSTOMER',
        isActive: true,
      } as any);
    });

    // Mock mongoose transaction session
    vi.spyOn(mongoose, 'startSession').mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn().mockResolvedValue(null),
      abortTransaction: vi.fn().mockResolvedValue(null),
      endSession: vi.fn().mockResolvedValue(null),
    } as any);
  });

  beforeEach(() => {
    mockProducts = [
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
        name: 'Aashirvaad Shudh Chakki Atta 5kg',
        slug: 'aashirvaad-shudh-chakki-atta-5kg',
        sku: 'AASH-ATTA-5KG',
        barcode: '8901030000001',
        categoryId: new mongoose.Types.ObjectId('60d5ec49f1b2c82d11111111'),
        unit: 'kg',
        stockQuantity: 40,
        lowStockThreshold: 10,
        isAvailable: true,
        isPublished: true,
        save: vi.fn().mockResolvedValue(true),
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222222'),
        name: 'Fortune Sunlite Sunflower Oil 1L',
        slug: 'fortune-sunlite-oil-1l',
        sku: 'FORT-OIL-1L',
        barcode: '8901030000002',
        categoryId: new mongoose.Types.ObjectId('60d5ec49f1b2c82d11111111'),
        unit: 'bottle',
        stockQuantity: 5,
        lowStockThreshold: 10,
        isAvailable: true,
        isPublished: true,
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // in 15 days
        save: vi.fn().mockResolvedValue(true),
      },
    ];

    mockMovements = [];
    mockAlerts = [];

    // Mock Product methods
    vi.spyOn(Product, 'findById').mockImplementation(((id: any) => {
      const prod = mockProducts.find((p) => p._id.toString() === id.toString());
      return {
        session: vi.fn().mockResolvedValue(prod ? { ...prod } : null),
        then: (resolve: any) => resolve(prod ? { ...prod } : null),
      } as any;
    }) as any);

    vi.spyOn(Product, 'findOneAndUpdate').mockImplementation(((filter: any, update: any) => {
      const prod = mockProducts.find((p) => p._id.toString() === filter._id.toString());
      if (prod && update.$set) {
        Object.assign(prod, update.$set);
        return Promise.resolve({ ...prod });
      }
      return Promise.resolve(null);
    }) as any);

    vi.spyOn(Product, 'findByIdAndUpdate').mockImplementation(((id: any, update: any) => {
      const prod = mockProducts.find((p) => p._id.toString() === id.toString());
      if (prod && update.$set) {
        Object.assign(prod, update.$set);
        return Promise.resolve({ ...prod });
      }
      return Promise.resolve(null);
    }) as any);

    vi.spyOn(Product, 'countDocuments').mockImplementation(((query: any = {}) => {
      if (query.$expr) {
        return Promise.resolve(1);
      }
      if (query.stockQuantity && query.stockQuantity.$lte !== undefined) {
        return Promise.resolve(1);
      }
      return Promise.resolve(mockProducts.length);
    }) as any);

    vi.spyOn(Product, 'find').mockImplementation((() => {
      return {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([...mockProducts]),
      } as any;
    }) as any);

    // Mock StockMovement methods
    vi.spyOn(StockMovement, 'findOne').mockImplementation(((query: any) => {
      const found = mockMovements.find((m) => m.idempotencyKey && m.idempotencyKey === query.idempotencyKey);
      return Promise.resolve(found || null);
    }) as any);

    vi.spyOn(StockMovement, 'create').mockImplementation(((docs: any) => {
      const arr = Array.isArray(docs) ? docs : [docs];
      const created = arr.map((d: any) => {
        const item = {
          _id: new mongoose.Types.ObjectId(),
          ...d,
          createdAt: new Date(),
        };
        mockMovements.push(item);
        return item;
      });
      return Promise.resolve(created as any);
    }) as any);

    vi.spyOn(StockMovement, 'find').mockImplementation((() => {
      return {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([...mockMovements]),
      } as any;
    }) as any);

    vi.spyOn(StockMovement, 'countDocuments').mockImplementation((() => {
      return Promise.resolve(mockMovements.length);
    }) as any);

    // Mock InventoryAlert methods
    vi.spyOn(InventoryAlert, 'findOne').mockImplementation(((query: any) => {
      const found = mockAlerts.find(
        (a) =>
          a.product.toString() === query.product.toString() &&
          a.alertType === query.alertType &&
          query.status?.$in?.includes(a.status)
      );
      return Promise.resolve(found || null);
    }) as any);

    vi.spyOn(InventoryAlert, 'create').mockImplementation(((doc: any) => {
      const item = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        status: doc.status || 'ACTIVE',
        createdAt: new Date(),
      };
      mockAlerts.push(item);
      return Promise.resolve(item as any);
    }) as any);

    vi.spyOn(InventoryAlert, 'updateMany').mockImplementation(((query: any, update: any) => {
      mockAlerts.forEach((a) => {
        if (a.product.toString() === query.product.toString()) {
          if (update.$set) Object.assign(a, update.$set);
        }
      });
      return Promise.resolve({ matchedCount: 1, modifiedCount: 1 } as any);
    }) as any);

    vi.spyOn(InventoryAlert, 'findById').mockImplementation(((id: any) => {
      const found = mockAlerts.find((a) => a._id.toString() === id.toString());
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      } as any);
    }) as any);

    vi.spyOn(InventoryAlert, 'find').mockImplementation((() => {
      return {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([...mockAlerts]),
      } as any;
    }) as any);

    vi.spyOn(InventoryAlert, 'countDocuments').mockImplementation((() => {
      return Promise.resolve(mockAlerts.filter((a) => a.status !== 'RESOLVED').length);
    }) as any);
  });

  describe('Authorization & Access Control', () => {
    it('should reject unauthenticated stock adjustment requests (401)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'PURCHASE_RECEIPT',
          quantity: 10,
          reason: 'Supplier restock',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject stock adjustment by customers (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'PURCHASE_RECEIPT',
          quantity: 10,
          reason: 'Unauthorized restock attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Stock Adjustments (Receipt, Damaged, Opening, Unit Validation)', () => {
    it('should successfully increase stock on PURCHASE_RECEIPT', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'PURCHASE_RECEIPT',
          quantity: 20,
          reason: 'Received shipment from ITC Ltd',
          supplierInvoiceNumber: 'INV-2026-9901',
          batchNumber: 'BATCH-2026-A1',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movement.previousQuantity).toBe(40);
      expect(res.body.data.movement.changeQuantity).toBe(20);
      expect(res.body.data.movement.finalQuantity).toBe(60);
      expect(res.body.data.product.stockQuantity).toBe(60);
      expect(mockMovements.length).toBe(1);
    });

    it('should decrease stock when recording DAMAGED_EXPIRED goods', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'DAMAGED_EXPIRED',
          quantity: 5,
          reason: 'Torn packaging during transport',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movement.previousQuantity).toBe(40);
      expect(res.body.data.movement.changeQuantity).toBe(-5);
      expect(res.body.data.movement.finalQuantity).toBe(35);
      expect(res.body.data.product.stockQuantity).toBe(35);
    });

    it('should reject adjustments resulting in negative stock without authorized flag', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'MANUAL_DECREASE',
          quantity: 100, // Current stock is 40
          reason: 'Excessive stock write-off',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Insufficient stock');
    });

    it('should enforce integer quantity for integer unit products (e.g. bottle)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222222', // unit: bottle
          adjustmentType: 'MANUAL_INCREASE',
          quantity: 2.5, // fractional not allowed for bottle
          reason: 'Fractional bottles test',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('must be an integer');
    });

    it('should prevent duplicate movements via idempotency key', async () => {
      const idempotencyKey = 'unique-tx-key-123456';

      // First request
      const firstRes = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'MANUAL_INCREASE',
          quantity: 10,
          reason: 'Restocking shelf',
          idempotencyKey,
        });

      expect(firstRes.status).toBe(201);
      expect(mockMovements.length).toBe(1);

      // Second identical request with same idempotency key
      const secondRes = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'MANUAL_INCREASE',
          quantity: 10,
          reason: 'Restocking shelf (retry)',
          idempotencyKey,
        });

      expect(secondRes.status).toBe(201);
      // Movement count should NOT double
      expect(mockMovements.length).toBe(1);
    });
  });

  describe('Stock Reconciliation', () => {
    it('should reconcile physical inventory count accurately', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/reconcile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221', // current stock is 40
          physicalCount: 48,
          reason: 'Physical count audit found 8 extra packets',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movement.previousQuantity).toBe(40);
      expect(res.body.data.movement.changeQuantity).toBe(8);
      expect(res.body.data.movement.finalQuantity).toBe(48);
    });
  });

  describe('Low-Stock and Out-of-Stock Alerts', () => {
    it('should trigger LOW_STOCK alert when stock drops to or below threshold', async () => {
      // Product 1 threshold is 10. Adjust down to 6.
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'MANUAL_DECREASE',
          quantity: 34, // 40 - 34 = 6
          reason: 'Major bulk order dispatch',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.stockQuantity).toBe(6);
      expect(mockAlerts.some((a) => a.alertType === 'LOW_STOCK')).toBe(true);
    });

    it('should trigger OUT_OF_STOCK alert when stock reaches 0', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'MANUAL_DECREASE',
          quantity: 40, // 40 - 40 = 0
          reason: 'Depleted stock',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.stockQuantity).toBe(0);
      expect(mockAlerts.some((a) => a.alertType === 'OUT_OF_STOCK')).toBe(true);
    });

    it('should auto-resolve alerts when stock is replenished above threshold', async () => {
      // Seed an active alert
      mockAlerts.push({
        _id: new mongoose.Types.ObjectId(),
        product: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
        alertType: 'LOW_STOCK',
        status: 'ACTIVE',
        threshold: 10,
        currentQuantity: 5,
        message: 'Low stock',
      });

      // Replenish with 50 units (current is 40 -> 90)
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '60d5ec49f1b2c82d22222221',
          adjustmentType: 'PURCHASE_RECEIPT',
          quantity: 50,
          reason: 'Full warehouse replenishment',
        });

      expect(res.status).toBe(201);
      expect(mockAlerts.every((a) => a.status === 'RESOLVED')).toBe(true);
    });

    it('should allow admin to acknowledge an active alert', async () => {
      const alertId = new mongoose.Types.ObjectId();
      mockAlerts.push({
        _id: alertId,
        product: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
        alertType: 'LOW_STOCK',
        status: 'ACTIVE',
        threshold: 10,
        currentQuantity: 4,
        message: 'Product low on stock',
      });

      const res = await request(app)
        .patch(`/api/v1/inventory/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACKNOWLEDGED');
    });
  });

  describe('Inventory Metrics, Movements & Reports', () => {
    it('should return inventory dashboard summary metrics', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalProducts');
      expect(res.body.data).toHaveProperty('inStockCount');
      expect(res.body.data).toHaveProperty('lowStockCount');
      expect(res.body.data).toHaveProperty('outOfStockCount');
      expect(res.body.data).toHaveProperty('recentMovements');
    });

    it('should return paginated stock movement audit trail', async () => {
      mockMovements.push({
        _id: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
        previousQuantity: 20,
        changeQuantity: 20,
        finalQuantity: 40,
        adjustmentType: 'PURCHASE_RECEIPT',
        reason: 'Initial load',
        performedBy: new mongoose.Types.ObjectId(adminId),
        createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/inventory/movements?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('movements');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data.page).toBe(1);
    });

    it('should return expiry report for near-expiry products', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/expiry-report?daysThreshold=30')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
