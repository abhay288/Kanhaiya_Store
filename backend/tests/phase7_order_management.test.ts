import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Product } from '../src/models/product.model';
import { Order } from '../src/models/order.model';
import { StockMovement } from '../src/models/stockMovement.model';
import { StoreSettings } from '../src/models/storeSettings.model';
import { User } from '../src/models/user.model';
import { Notification } from '../src/models/notification.model';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import mongoose from 'mongoose';

describe('Phase 7: Order Management, Lifecycle & Invoices Suite', () => {
  const adminId = '60d5ec49f1b2c82d88888880';
  const customerId = '60d5ec49f1b2c82d88888881';
  const otherCustomerId = '60d5ec49f1b2c82d88888889';

  const adminToken = jwt.sign(
    {
      id: adminId,
      firebaseUid: 'firebase-admin-uid',
      email: 'kanhaiyaastore@gmail.com',
      role: 'ADMIN',
    },
    env.JWT_SECRET
  );

  const customerToken = jwt.sign(
    {
      id: customerId,
      firebaseUid: 'firebase-customer-uid-1',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    },
    env.JWT_SECRET
  );

  const otherCustomerToken = jwt.sign(
    {
      id: otherCustomerId,
      firebaseUid: 'firebase-customer-uid-2',
      email: 'other@example.com',
      role: 'CUSTOMER',
    },
    env.JWT_SECRET
  );

  // In-memory data store
  let mockOrders: any[] = [];
  let mockProducts: Map<string, any> = new Map();
  let mockStockMovements: any[] = [];
  let mockNotifications: any[] = [];

  const initialProduct = {
    _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    unit: 'kg',
    packSize: '5 kg',
    sellingPrice: 265,
    mrp: 295,
    stockQuantity: 20,
    isAvailable: true,
    isPublished: true,
  };

  beforeAll(() => {
    // Mock User findById
    vi.spyOn(User as any, 'findById').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      return Promise.resolve({
        _id: id,
        email: idStr === adminId ? 'kanhaiyaastore@gmail.com' : 'customer@example.com',
        displayName: idStr === adminId ? 'Store Owner' : 'Valued Customer',
        role: idStr === adminId ? 'ADMIN' : 'CUSTOMER',
        isActive: true,
      } as any);
    });

    // Mock StoreSettings
    vi.spyOn(StoreSettings as any, 'findOne').mockResolvedValue({
      storeName: 'Kanhaiya General Store',
      storePhone: '+919876543210',
      storeWhatsapp: '+919876543210',
      storeAddress: 'House 42, Main Bazar, New Delhi - 110001',
      pickupInstructions: 'Collect at store counter with Order #',
      isDeliveryEnabled: true,
      serviceablePincodes: ['110001', '110002'],
      minOrderValue: 100,
      standardDeliveryFee: 30,
      freeDeliveryThreshold: 500,
      estimatedDeliveryWindow: 'Same-day within 2-4 hours',
      isWhatsappQrEnabled: true,
    } as any);

    // Mock Product methods
    vi.spyOn(Product as any, 'findById').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      const prod = mockProducts.get(idStr);
      if (!prod) return Promise.resolve(null);
      return Promise.resolve({
        ...prod,
        save: vi.fn().mockImplementation(function (this: any) {
          mockProducts.set(idStr, this);
          return Promise.resolve(this);
        }),
      });
    });

    vi.spyOn(Product as any, 'findByIdAndUpdate').mockImplementation((id: any, update: any) => {
      const idStr = id?.toString() || '';
      const prod = mockProducts.get(idStr);
      if (prod) {
        Object.assign(prod, update);
        mockProducts.set(idStr, prod);
      }
      return Promise.resolve(prod);
    });

    // Mock StockMovement.create
    vi.spyOn(StockMovement as any, 'create').mockImplementation((data: any) => {
      const created = { _id: new mongoose.Types.ObjectId(), ...data };
      mockStockMovements.push(created);
      return Promise.resolve(created);
    });

    // Mock Notification.create
    vi.spyOn(Notification as any, 'create').mockImplementation((data: any) => {
      const created = { _id: new mongoose.Types.ObjectId(), ...data, isRead: false, createdAt: new Date() };
      mockNotifications.push(created);
      return Promise.resolve(created);
    });

    // Mock Order methods
    vi.spyOn(Order as any, 'create').mockImplementation((data: any) => {
      const created = {
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
      mockOrders.push(created);
      return Promise.resolve(created);
    });

    vi.spyOn(Order as any, 'findOne').mockImplementation((query: any) => {
      let found = null;
      if (query.orderNumber) {
        found = mockOrders.find((o) => o.orderNumber === query.orderNumber);
      } else if (query.$or) {
        const idMatches = query.$or.map((q: any) => q._id?.toString() || q.orderNumber);
        found = mockOrders.find((o) => idMatches.includes(o._id?.toString()) || idMatches.includes(o.orderNumber));
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
      const p: any = Promise.resolve(doc);
      p.lean = () => Promise.resolve(doc);
      return p;
    });

    vi.spyOn(Order as any, 'find').mockImplementation((query: any) => {
      let list = [...mockOrders];
      if (query.customerId) {
        list = list.filter((o) => o.customerId?.toString() === query.customerId.toString());
      }
      if (query.orderStatus) {
        list = list.filter((o) => o.orderStatus === query.orderStatus);
      }
      if (query.paymentStatus) {
        list = list.filter((o) => o.paymentStatus === query.paymentStatus);
      }

      return {
        sort: () => ({
          skip: (skipVal: number) => ({
            limit: (limitVal: number) => ({
              lean: () => Promise.resolve(list.slice(skipVal, skipVal + limitVal)),
            }),
          }),
          lean: () => Promise.resolve(list),
        }),
      } as any;
    });

    vi.spyOn(Order as any, 'countDocuments').mockImplementation((query: any) => {
      if (!query || Object.keys(query).length === 0) {
        return Promise.resolve(mockOrders.length);
      }
      let count = mockOrders.length;
      if (query.orderStatus) {
        if (typeof query.orderStatus === 'object' && query.orderStatus.$in) {
          count = mockOrders.filter((o) => query.orderStatus.$in.includes(o.orderStatus)).length;
        } else {
          count = mockOrders.filter((o) => o.orderStatus === query.orderStatus).length;
        }
      }
      if (query.paymentMethod && query.paymentStatus) {
        count = mockOrders.filter((o) => o.paymentMethod === query.paymentMethod && o.paymentStatus === query.paymentStatus).length;
      }
      return Promise.resolve(count);
    });
  });

  beforeEach(() => {
    mockOrders = [];
    mockProducts.clear();
    mockProducts.set(initialProduct._id.toString(), { ...initialProduct });
    mockStockMovements = [];
    mockNotifications = [];
  });

  describe('1. Admin Order Management Dashboard & Metrics', () => {
    it('GET /api/v1/orders/admin - should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/orders/admin');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/orders/admin - should reject regular customers with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/orders/admin')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/orders/admin - should allow admin to list orders with server-side pagination and filters', async () => {
      // Seed orders
      await Order.create({
        orderNumber: 'KGS-202610-1001',
        customerName: 'Customer A',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 30,
        totalAmount: 295,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
      });

      const res = await request(app)
        .get('/api/v1/orders/admin?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBe(1);
      expect(res.body.data.pagination.total).toBe(1);
      expect(res.body.data.orders[0].orderNumber).toBe('KGS-202610-1001');
    });

    it('GET /api/v1/orders/admin/metrics - should return dashboard KPI counts', async () => {
      const res = await request(app)
        .get('/api/v1/orders/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeDefined();
      expect(res.body.data.placed).toBeDefined();
      expect(res.body.data.confirmed).toBeDefined();
    });
  });

  describe('2. Order Lifecycle Status Transitions', () => {
    it('PATCH /api/v1/orders/admin/:id/status - should transition Store Pickup order validly', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-2001',
        customerName: 'Pickup Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 0,
        totalAmount: 265,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
      });

      // Transition to CONFIRMED
      const res1 = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.orderStatus).toBe('CONFIRMED');

      // Transition to READY_FOR_PICKUP
      const res2 = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'READY_FOR_PICKUP' });

      expect(res2.status).toBe(200);
      expect(res2.body.data.orderStatus).toBe('READY_FOR_PICKUP');
    });

    it('PATCH /api/v1/orders/admin/:id/status - should reject Store Pickup transitioning to OUT_FOR_DELIVERY', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-2002',
        customerName: 'Pickup Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 0,
        totalAmount: 265,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'OUT_FOR_DELIVERY' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Store pickup orders cannot transition to OUT_FOR_DELIVERY');
    });

    it('PATCH /api/v1/orders/admin/:id/status - should reject Local Delivery transitioning to READY_FOR_PICKUP', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-2003',
        customerName: 'Delivery Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 30,
        totalAmount: 295,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'READY_FOR_PICKUP' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Local delivery orders cannot transition to READY_FOR_PICKUP');
    });

    it('PATCH /api/v1/orders/admin/:id/status - should prevent reopening COMPLETED orders', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-2004',
        customerName: 'Completed Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 0,
        totalAmount: 265,
        paymentMethod: 'COD',
        paymentStatus: 'PAID',
        orderStatus: 'COMPLETED',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PLACED' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Completed orders cannot be transitioned');
    });
  });

  describe('3. Payment Verification & Collection', () => {
    it('PATCH /api/v1/orders/admin/:id/verify-payment - should verify manual WhatsApp QR payment', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-3001',
        customerName: 'WA Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 0,
        totalAmount: 265,
        paymentMethod: 'WHATSAPP_QR',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ transactionReference: 'UPI-REF-998877', notes: 'Verified in HDFC bank account' });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('PAID');
      expect(res.body.data.paymentReference).toBe('UPI-REF-998877');

      // Verify audit trail entry was created
      expect(res.body.data.statusHistory.length).toBeGreaterThan(0);
      const audit = res.body.data.statusHistory.find((a: any) => a.action === 'PAYMENT_VERIFIED');
      expect(audit).toBeDefined();
      expect(audit.newPaymentStatus).toBe('PAID');
    });

    it('PATCH /api/v1/orders/admin/:id/collect-cod - should record COD payment collection', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-3002',
        customerName: 'COD Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 30,
        totalAmount: 295,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'OUT_FOR_DELIVERY',
      });

      const res = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/collect-cod`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Collected cash ₹295 at doorstep' });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('PAID');
      const audit = res.body.data.statusHistory.find((a: any) => a.action === 'COD_COLLECTED');
      expect(audit).toBeDefined();
    });
  });

  describe('4. Order Cancellation & Exact-Once Inventory Restoration', () => {
    it('PATCH /api/v1/orders/admin/:id/cancel - should cancel order and restore inventory exactly once', async () => {
      const prodInitialStock = mockProducts.get(initialProduct._id.toString()).stockQuantity; // 20

      const order = await Order.create({
        orderNumber: 'KGS-202610-4001',
        customerName: 'Cancel Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 3, lineSubtotal: 795 }],
        subtotal: 795,
        deliveryFee: 0,
        totalAmount: 795,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
        isInventoryRestored: false,
      });

      // First cancellation call
      const res1 = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Customer requested change of mind' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.orderStatus).toBe('CANCELLED');
      expect(res1.body.data.isInventoryRestored).toBe(true);

      // Inventory should have been restored by +3
      const prodAfterFirstCancel = mockProducts.get(initialProduct._id.toString()).stockQuantity;
      expect(prodAfterFirstCancel).toBe(prodInitialStock + 3);

      // Verify StockMovement audit entry
      expect(mockStockMovements.length).toBe(1);
      expect(mockStockMovements[0].changeQuantity).toBe(3);

      // Second duplicate cancellation call (idempotency check)
      const res2 = await request(app)
        .patch(`/api/v1/orders/admin/${order.orderNumber}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate request' });

      expect(res2.status).toBe(200);
      // Stock MUST NOT be incremented twice!
      const prodAfterSecondCancel = mockProducts.get(initialProduct._id.toString()).stockQuantity;
      expect(prodAfterSecondCancel).toBe(prodAfterFirstCancel);
      expect(mockStockMovements.length).toBe(1); // Still 1 movement
    });
  });

  describe('5. Customer Order Tracking & Guest Security', () => {
    it('GET /api/v1/orders/:id/track - should provide tracking timeline for authenticated customer', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-5001',
        customerId: new mongoose.Types.ObjectId(customerId),
        customerName: 'Valued Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 30,
        totalAmount: 295,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
      });

      const res = await request(app)
        .get(`/api/v1/orders/${order.orderNumber}/track`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe(order.orderNumber);
      expect(res.body.data.timeline).toBeDefined();
      expect(res.body.data.storeContact).toBeDefined();
    });

    it('GET /api/v1/orders/:id/track - should prevent other customer from tracking private order (403)', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-5002',
        customerId: new mongoose.Types.ObjectId(customerId),
        customerName: 'Valued Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 30,
        totalAmount: 295,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
      });

      const res = await request(app)
        .get(`/api/v1/orders/${order.orderNumber}/track`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('6. Professional PDF Invoice Generation & Access Control', () => {
    it('GET /api/v1/orders/:id/invoice - should generate and stream PDF invoice with application/pdf header', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-6001',
        customerId: new mongoose.Types.ObjectId(customerId),
        customerName: 'Valued Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'DELIVERY',
        deliveryAddress: {
          name: 'Valued Customer',
          phone: '9876543210',
          houseNumber: '42',
          street: 'Main Bazar',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
        items: [
          {
            productId: initialProduct._id,
            name: 'Aashirvaad Shudh Chakki Atta 5kg',
            packSize: '5 kg',
            unit: 'kg',
            sellingPrice: 265,
            mrp: 295,
            quantity: 2,
            lineSubtotal: 530,
          },
        ],
        subtotal: 530,
        deliveryFee: 0,
        totalAmount: 530,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
      });

      const res = await request(app)
        .get(`/api/v1/orders/${order.orderNumber}/invoice`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('Invoice-INV-202610-6001.pdf');
      expect(res.body).toBeDefined();
    });

    it('GET /api/v1/orders/:id/invoice - should prevent unauthorized customer from downloading other customer invoice', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-6002',
        customerId: new mongoose.Types.ObjectId(customerId),
        customerName: 'Valued Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        items: [{ productId: initialProduct._id, name: 'Atta', sellingPrice: 265, mrp: 295, quantity: 1, lineSubtotal: 265 }],
        subtotal: 265,
        deliveryFee: 0,
        totalAmount: 265,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
      });

      const res = await request(app)
        .get(`/api/v1/orders/${order.orderNumber}/invoice`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('7. Order History Endpoint Routing & Isolation (/orders/my vs /orders/:id)', () => {
    it('GET /api/v1/orders/my - should return 200 with customer orders array', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((o: any) => {
        expect(o.customerId?.toString()).toBe(customerId);
      });
    });

    it('GET /api/v1/orders/my - should return empty array for customer with no orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my')
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('GET /api/v1/orders/my - should return 401 when accessed by unauthenticated guest', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my');

      expect(res.status).toBe(401);
    });

    it('GET /api/v1/orders/non-existent-order - should return 404 and NOT confuse with /orders/my', async () => {
      const res = await request(app)
        .get('/api/v1/orders/NON_EXISTENT_ID_999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain('NON_EXISTENT_ID_999');
    });

    it('GET /api/v1/orders/my - should NEVER return Order "my" not found error', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.error?.message).toBeUndefined();
    });
  });
});

