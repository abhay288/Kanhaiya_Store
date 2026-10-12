import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Product } from '../src/models/product.model';
import { Order } from '../src/models/order.model';
import { StoreSettings } from '../src/models/storeSettings.model';
import { User } from '../src/models/user.model';
import { StockMovement } from '../src/models/stockMovement.model';
import { Notification } from '../src/models/notification.model';
import { OrderService } from '../src/modules/orders/order.service';
import { AnalyticsService } from '../src/modules/admin/analytics.service';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import mongoose from 'mongoose';

describe('Phase 10: Critical Business Logic & Financial Integrity Suite (15 Scenarios)', () => {
  const adminId = '60d5ec49f1b2c82d88888880';
  const customerAId = '60d5ec49f1b2c82d88888881';
  const customerBId = '60d5ec49f1b2c82d88888882';

  const adminToken = jwt.sign(
    { id: adminId, firebaseUid: 'firebase-admin-uid', email: 'kanhaiyaastore@gmail.com', role: 'ADMIN' },
    env.JWT_SECRET
  );

  const customerAToken = jwt.sign(
    { id: customerAId, firebaseUid: 'firebase-cust-a', email: 'alice@example.com', role: 'CUSTOMER' },
    env.JWT_SECRET
  );

  const customerBToken = jwt.sign(
    { id: customerBId, firebaseUid: 'firebase-cust-b', email: 'bob@example.com', role: 'CUSTOMER' },
    env.JWT_SECRET
  );

  let mockProducts: Map<string, any> = new Map();
  let mockOrders: any[] = [];
  let mockStockMovements: any[] = [];

  const initialProduct = {
    _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
    name: 'Amul Taaza Milk 1L',
    unit: 'l',
    packSize: '1 L',
    sellingPrice: 72,
    mrp: 74,
    stockQuantity: 10,
    isPublished: true,
    isAvailable: true,
  };

  const unpublishedProduct = {
    _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222222'),
    name: 'Draft Seasonal Ghee',
    unit: 'kg',
    sellingPrice: 550,
    mrp: 600,
    stockQuantity: 5,
    isPublished: false,
    isAvailable: true,
  };

  beforeAll(() => {
    // Mock User lookup
    vi.spyOn(User, 'findById').mockImplementation((id: any) => {
      if (id?.toString() === adminId) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(adminId),
          email: 'kanhaiyaastore@gmail.com',
          role: 'ADMIN',
          isActive: true,
        }) as any;
      }
      if (id?.toString() === customerAId) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(customerAId),
          email: 'alice@example.com',
          role: 'CUSTOMER',
          isActive: true,
        }) as any;
      }
      if (id?.toString() === customerBId) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(customerBId),
          email: 'bob@example.com',
          role: 'CUSTOMER',
          isActive: true,
        }) as any;
      }
      return Promise.resolve(null);
    });

    // Mock StoreSettings
    vi.spyOn(StoreSettings as any, 'findOne').mockResolvedValue({
      storeName: 'Kanhaiya General Store',
      storePhone: '+919876543210',
      storeWhatsapp: '+919876543210',
      storeAddress: 'Main Market, Badlapur, UP',
      isStoreOpen: true,
      minOrderValue: 50,
      isDeliveryEnabled: true,
      standardDeliveryFee: 30,
      freeDeliveryThreshold: 500,
      serviceablePincodes: ['222125'],
      pickupInstructions: 'Counter collection with order number',
    } as any);

    // Mock Notifications
    vi.spyOn(Notification as any, 'create').mockImplementation((data: any) => {
      return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data });
    });

    // Mock Stock Movements
    vi.spyOn(StockMovement as any, 'create').mockImplementation((data: any) => {
      const entry = { _id: new mongoose.Types.ObjectId(), ...data };
      mockStockMovements.push(entry);
      return Promise.resolve(entry);
    });
    vi.spyOn(StockMovement as any, 'findByIdAndDelete').mockImplementation((id: any) => {
      mockStockMovements = mockStockMovements.filter((m) => m._id.toString() !== id.toString());
      return Promise.resolve(null);
    });

    // Mock Order methods
    vi.spyOn(Order as any, 'create').mockImplementation((data: any) => {
      const order = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        statusHistory: data.statusHistory || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockImplementation(function (this: any) {
          const idx = mockOrders.findIndex((o) => o.orderNumber === this.orderNumber);
          if (idx >= 0) mockOrders[idx] = this;
          return Promise.resolve(this);
        }),
      };
      mockOrders.push(order);
      return Promise.resolve(order);
    });

    vi.spyOn(Order as any, 'findOne').mockImplementation((query: any) => {
      let found = null;
      if (query.idempotencyKey) {
        found = mockOrders.find((o) => o.idempotencyKey === query.idempotencyKey);
      } else if (query.orderNumber) {
        found = mockOrders.find((o) => o.orderNumber === query.orderNumber);
      } else if (query.$or) {
        const ids = query.$or.map((q: any) => q._id?.toString() || q.orderNumber);
        found = mockOrders.find((o) => ids.includes(o._id?.toString()) || ids.includes(o.orderNumber));
      }
      if (!found) return Promise.resolve(null);

      const doc = {
        ...found,
        save: vi.fn().mockImplementation(function (this: any) {
          const idx = mockOrders.findIndex((o) => o.orderNumber === this.orderNumber);
          if (idx >= 0) mockOrders[idx] = this;
          return Promise.resolve(this);
        }),
      };
      return Promise.resolve(doc);
    });

    vi.spyOn(Order as any, 'find').mockImplementation(() => {
      return {
        sort: () => ({
          lean: () => Promise.resolve(mockOrders),
        }),
        lean: () => Promise.resolve(mockOrders),
      } as any;
    });

    // Mock Product methods
    vi.spyOn(Product as any, 'findById').mockImplementation((id: any) => {
      const p = mockProducts.get(id?.toString());
      if (!p) return Promise.resolve(null);
      return Promise.resolve({
        ...p,
        save: vi.fn().mockImplementation(function (this: any) {
          mockProducts.set(id.toString(), this);
          return Promise.resolve(this);
        }),
      });
    });

    vi.spyOn(Product as any, 'findByIdAndUpdate').mockImplementation((id: any, update: any) => {
      const p = mockProducts.get(id?.toString());
      if (p) {
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) {
            p[k] = (p[k] || 0) + (v as number);
          }
        }
        Object.assign(p, update);
        mockProducts.set(id.toString(), p);
      }
      return Promise.resolve(p);
    });
  });

  beforeEach(() => {
    mockOrders = [];
    mockStockMovements = [];
    mockProducts.clear();
    mockProducts.set(initialProduct._id.toString(), { ...initialProduct });
    mockProducts.set(unpublishedProduct._id.toString(), { ...unpublishedProduct });
  });

  // --------------------------------------------------------------------------
  // Scenario 1 & 2: Client Submits Manipulated Price or Total
  // --------------------------------------------------------------------------
  it('Scenario 1 & 2: should recalculate prices and totals server-side, ignoring client manipulated values', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        customerName: 'Alice Sharma',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        paymentMethod: 'COD',
        items: [
          {
            productId: initialProduct._id.toString(),
            quantity: 2,
            sellingPrice: 1, // Client attempting to pay ₹1 instead of ₹72!
            lineSubtotal: 2,
          },
        ],
        subtotal: 2, // Client manipulated subtotal
        totalAmount: 2, // Client manipulated total
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Server recalculated 2 * 72 = 144
    expect(res.body.data.subtotal).toBe(144);
    expect(res.body.data.totalAmount).toBe(144);
    expect(res.body.data.items[0].sellingPrice).toBe(72);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Customer Attempts to Order Unpublished Product
  // --------------------------------------------------------------------------
  it('Scenario 3: should reject ordering an unpublished or draft product', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        customerName: 'Guest User',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        paymentMethod: 'COD',
        items: [
          {
            productId: unpublishedProduct._id.toString(),
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not available for purchase');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Stock Exhaustion / Concurrency Handling
  // --------------------------------------------------------------------------
  it('Scenario 4: should reject checkout when requested quantity exceeds available stock', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        customerName: 'Bulk Buyer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        paymentMethod: 'COD',
        items: [
          {
            productId: initialProduct._id.toString(),
            quantity: 15, // Only 10 available
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Insufficient stock');
  });

  // --------------------------------------------------------------------------
  // Scenario 5 & 6: Retried Request & Repeated Button Taps (Idempotency)
  // --------------------------------------------------------------------------
  it('Scenario 5 & 6: should return identical order without creating duplicates when idempotencyKey is reused', async () => {
    const idempotencyKey = 'unique-checkout-nonce-556677';
    const payload = {
      customerName: 'Alice Sharma',
      customerPhone: '9876543210',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: 'COD',
      idempotencyKey,
      items: [{ productId: initialProduct._id.toString(), quantity: 1 }],
    };

    const res1 = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send(payload);

    expect(res1.status).toBe(201);
    const orderNumber1 = res1.body.data.orderNumber;

    // Simulate immediate repeated click or network timeout retry
    const res2 = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.body.data.orderNumber).toBe(orderNumber1);
    expect(mockOrders.length).toBe(1); // Exact-once order creation!
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Order Creation Failure Rolls Back Decremented Inventory
  // --------------------------------------------------------------------------
  it('Scenario 7: should execute compensating rollback of inventory if order save fails', async () => {
    // Force Order.create to reject unexpectedly
    const createSpy = vi.spyOn(Order as any, 'create').mockRejectedValueOnce(new Error('Simulated DB Failure'));

    await expect(
      OrderService.placeOrder({
        customerName: 'Fail Test',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        paymentMethod: 'COD',
        items: [{ productId: initialProduct._id.toString(), quantity: 2 }],
      })
    ).rejects.toThrow('Simulated DB Failure');

    // Product stock was restored to original 10
    const prod = mockProducts.get(initialProduct._id.toString());
    expect(prod.stockQuantity).toBe(10);
    createSpy.mockRestore();
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Cancelled Order Does Not Restore Stock Twice
  // --------------------------------------------------------------------------
  it('Scenario 8: should restore inventory exactly once and remain idempotent on repeat cancellations', async () => {
    const order = await OrderService.placeOrder({
      customerName: 'Cancel Test',
      customerPhone: '9876543210',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: 'COD',
      items: [{ productId: initialProduct._id.toString(), quantity: 3 }],
    });

    // Stock was decremented: 10 - 3 = 7
    expect(mockProducts.get(initialProduct._id.toString()).stockQuantity).toBe(7);

    // First cancellation: restores stock to 10
    const cancel1 = await OrderService.cancelOrder(order.orderNumber, { id: adminId, role: 'ADMIN', email: 'kanhaiyaastore@gmail.com' } as any);
    expect(cancel1.orderStatus).toBe('CANCELLED');
    expect(cancel1.isInventoryRestored).toBe(true);
    expect(mockProducts.get(initialProduct._id.toString()).stockQuantity).toBe(10);

    // Second cancellation attempt: must not restore stock again!
    const cancel2 = await OrderService.cancelOrder(order.orderNumber, { id: adminId, role: 'ADMIN', email: 'kanhaiyaastore@gmail.com' } as any);
    expect(cancel2.orderStatus).toBe('CANCELLED');
    expect(mockProducts.get(initialProduct._id.toString()).stockQuantity).toBe(10); // Still 10, not 13!
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Customer Access Control (IDOR Prevention)
  // --------------------------------------------------------------------------
  it('Scenario 9: should forbid customer B from viewing customer A private order', async () => {
    const order = await OrderService.placeOrder(
      {
        customerName: 'Alice Sharma',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        paymentMethod: 'COD',
        items: [{ productId: initialProduct._id.toString(), quantity: 1 }],
      },
      { id: customerAId, email: 'alice@example.com', role: 'CUSTOMER' } as any
    );

    const res = await request(app)
      .get(`/api/v1/orders/${order.orderNumber}`)
      .set('Authorization', `Bearer ${customerBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('not authorized to view this order');
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Unauthorized User Cannot Verify WhatsApp QR Payment
  // --------------------------------------------------------------------------
  it('Scenario 10: should forbid regular customer from verifying manual WhatsApp payments', async () => {
    const order = await OrderService.placeOrder({
      customerName: 'WhatsApp Cust',
      customerPhone: '9876543210',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: 'WHATSAPP_QR',
      items: [{ productId: initialProduct._id.toString(), quantity: 1 }],
    });

    const res = await request(app)
      .patch(`/api/v1/orders/admin/${order.orderNumber}/verify-payment`)
      .set('Authorization', `Bearer ${customerAToken}`) // Regular customer!
      .send({ transactionReference: 'FAKE-UPI-123' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Administrator privileges required');
  });

  // --------------------------------------------------------------------------
  // Scenario 11: COD Order Cannot Be Marked Paid by Customer
  // --------------------------------------------------------------------------
  it('Scenario 11: should keep COD order payment status as PENDING until authorized admin collection', async () => {
    const order = await OrderService.placeOrder({
      customerName: 'COD User',
      customerPhone: '9876543210',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: 'COD',
      items: [{ productId: initialProduct._id.toString(), quantity: 1 }],
    });

    expect(order.paymentStatus).toBe('PENDING');

    // Customer attempt to collect-cod should fail
    const resCust = await request(app)
      .patch(`/api/v1/orders/admin/${order.orderNumber}/collect-cod`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ notes: 'Self payment' });

    expect(resCust.status).toBe(403);

    // Authorized admin collection succeeds
    const resAdmin = await request(app)
      .patch(`/api/v1/orders/admin/${order.orderNumber}/collect-cod`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Collected at counter' });

    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.data.paymentStatus).toBe('PAID');
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Invoice Access Restricted by Order Ownership
  // --------------------------------------------------------------------------
  it('Scenario 12: should prevent invoice download if requested by unauthorized customer', async () => {
    const order = await OrderService.placeOrder(
      {
        customerName: 'Alice Sharma',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        paymentMethod: 'COD',
        items: [{ productId: initialProduct._id.toString(), quantity: 1 }],
      },
      { id: customerAId, email: 'alice@example.com', role: 'CUSTOMER' } as any
    );

    const res = await request(app)
      .get(`/api/v1/orders/${order.orderNumber}/invoice`)
      .set('Authorization', `Bearer ${customerBToken}`);

    expect(res.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Product Price Edit After Order Does Not Alter Historical Snapshot
  // --------------------------------------------------------------------------
  it('Scenario 13: should preserve historical order snapshot even after product catalog price modification', async () => {
    const order = await OrderService.placeOrder({
      customerName: 'Snapshot Test',
      customerPhone: '9876543210',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: 'COD',
      items: [{ productId: initialProduct._id.toString(), quantity: 1 }],
    });

    expect(order.totalAmount).toBe(72);

    // Catalog admin updates product sellingPrice from ₹72 to ₹99
    const prod = mockProducts.get(initialProduct._id.toString());
    prod.sellingPrice = 99;

    // Fetch order again
    const fetchedOrder = await OrderService.getOrderByIdOrNumber(order.orderNumber, { id: adminId, role: 'ADMIN', email: 'kanhaiyaastore@gmail.com' } as any);
    expect(fetchedOrder.items[0].sellingPrice).toBe(72); // Preserved!
    expect(fetchedOrder.totalAmount).toBe(72);
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Pending Payments Excluded From Collected Revenue Reports
  // --------------------------------------------------------------------------
  it('Scenario 14: should separate verified paid revenue from pending payments in financial analytics', async () => {
    mockOrders = [
      {
        orderNumber: 'KGS-2026-PAID',
        orderStatus: 'COMPLETED',
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        totalAmount: 500,
        createdAt: new Date(),
      },
      {
        orderNumber: 'KGS-2026-PENDING',
        orderStatus: 'PLACED',
        paymentStatus: 'PENDING',
        paymentMethod: 'WHATSAPP_QR',
        totalAmount: 300,
        createdAt: new Date(),
      },
    ];

    const sales = await AnalyticsService.getSalesAnalytics('today');
    expect(sales.grossOrderValue).toBe(800);
    expect(sales.verifiedPayments).toBe(500); // Only PAID
    expect(sales.pendingPayments).toBe(300); // Uncollected separated
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Report Export Validates Formats and Rejects Invalid Date Ranges
  // --------------------------------------------------------------------------
  it('Scenario 15: should reject malformed date filters or excessive date range on report export', async () => {
    const resInvalidType = await request(app)
      .get('/api/v1/admin/reports/export/unsupported_report')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resInvalidType.status).toBe(400);
    expect(resInvalidType.body.error.message).toContain('Unsupported report export type');

    const resInvertedDate = await request(app)
      .get('/api/v1/admin/reports/export/sales?range=custom&startDate=2026-12-01&endDate=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resInvertedDate.status).toBe(400);
    expect(resInvertedDate.body.error.message).toContain('Start date cannot be after end date');
  });
});
