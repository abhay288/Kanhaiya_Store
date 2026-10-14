import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/user.model';
import { Order } from '../src/models/order.model';
import { Product } from '../src/models/product.model';
import { StoreSettings } from '../src/models/storeSettings.model';
import { StockMovement } from '../src/models/stockMovement.model';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import mongoose from 'mongoose';

describe('Admin Direct MongoDB User & Order CRUD and Product Live/Unlive Suite', () => {
  const adminId = '60d5ec49f1b2c82d88888880';
  const customerId = '60d5ec49f1b2c82d88888881';

  const adminToken = jwt.sign(
    {
      id: adminId,
      firebaseUid: 'admin-firebase-uid',
      email: 'kanhaiyaastore@gmail.com',
      role: 'ADMIN',
    },
    env.JWT_SECRET
  );

  const customerToken = jwt.sign(
    {
      id: customerId,
      firebaseUid: 'customer-firebase-uid',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    },
    env.JWT_SECRET
  );

  let mockUsers: Map<string, any> = new Map();
  let mockProducts: Map<string, any> = new Map();
  let mockOrders: Map<string, any> = new Map();

  beforeAll(() => {
    vi.spyOn(StockMovement as any, 'create').mockResolvedValue({} as any);
    vi.spyOn(StoreSettings as any, 'findOne').mockResolvedValue({
      storeName: 'Kanhaiya General Store',
      storePhone: '+919876543210',
      storeWhatsapp: '+919876543210',
      storeAddress: 'Fatehpur Roshnai, Sarvankhera, Kanpur Dehat, Uttar Pradesh',
      pickupInstructions: 'Counter collection with order number',
      isDeliveryEnabled: false,
      isPickupEnabled: true,
      minOrderValue: 100,
      standardDeliveryFee: 30,
      freeDeliveryThreshold: 500,
      save: vi.fn().mockResolvedValue(true),
    } as any);
  });

  beforeEach(() => {
    mockUsers.clear();
    mockProducts.clear();
    mockOrders.clear();

    const rootAdmin = {
      _id: new mongoose.Types.ObjectId(adminId),
      email: 'kanhaiyaastore@gmail.com',
      displayName: 'Kanhaiya Store Owner',
      phoneNumber: '9876543210',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      save: vi.fn().mockResolvedValue(true),
      toObject: function () {
        return { ...this };
      },
    };
    mockUsers.set(adminId, rootAdmin);

    // Mock User findById
    vi.spyOn(User as any, 'findById').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      const user = mockUsers.get(idStr);
      if (!user) return Promise.resolve(null);
      return Promise.resolve({
        ...user,
        save: vi.fn().mockImplementation(function (this: any) {
          mockUsers.set(idStr, this);
          return Promise.resolve(this);
        }),
        toObject: function () {
          return { ...this };
        },
      });
    });

    // Mock User findByIdAndDelete
    vi.spyOn(User as any, 'findByIdAndDelete').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      const user = mockUsers.get(idStr);
      mockUsers.delete(idStr);
      return Promise.resolve(user);
    });

    // Mock Product findById
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

    // Mock Order findById and findOne
    vi.spyOn(Order as any, 'findById').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      const ord = mockOrders.get(idStr);
      if (!ord) return Promise.resolve(null);
      return Promise.resolve({
        ...ord,
        save: vi.fn().mockImplementation(function (this: any) {
          mockOrders.set(idStr, this);
          return Promise.resolve(this);
        }),
      });
    });

    vi.spyOn(Order as any, 'findOne').mockImplementation((query: any) => {
      const wrap = (o: any) => ({
        ...o,
        save: vi.fn().mockImplementation(function (this: any) {
          mockOrders.set(o._id.toString(), this);
          return Promise.resolve(this);
        }),
      });

      if (query._id) {
        const ord = mockOrders.get(query._id.toString());
        if (ord) return Promise.resolve(wrap(ord));
      }
      if (query.orderNumber) {
        for (const ord of mockOrders.values()) {
          if (ord.orderNumber === query.orderNumber) return Promise.resolve(wrap(ord));
        }
      }
      if (query.$or) {
        for (const cond of query.$or) {
          if (cond._id && mockOrders.has(cond._id.toString())) {
            return Promise.resolve(wrap(mockOrders.get(cond._id.toString())));
          }
          if (cond.orderNumber) {
            for (const ord of mockOrders.values()) {
              if (ord.orderNumber === cond.orderNumber) return Promise.resolve(wrap(ord));
            }
          }
        }
      }
      return Promise.resolve(null);
    });

    vi.spyOn(Order as any, 'findByIdAndDelete').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      const ord = mockOrders.get(idStr);
      mockOrders.delete(idStr);
      return Promise.resolve(ord);
    });
  });

  describe('1. Direct MongoDB User Management CRUD', () => {
    it('GET /api/v1/admin/users - should reject non-admin users with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/admin/users - should list users directly from Mongo for admin', async () => {
      vi.spyOn(User as any, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(User as any, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(Array.from(mockUsers.values())),
      } as any);

      vi.spyOn(Order as any, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.users[0].isRootAdmin).toBe(true);
    });

    it('POST /api/v1/admin/users - should create a new user directly in MongoDB', async () => {
      vi.spyOn(User as any, 'findOne').mockResolvedValue(null);
      vi.spyOn(User as any, 'create').mockImplementation((data: any) => {
        const id = new mongoose.Types.ObjectId();
        const obj = {
          ...data,
          _id: id,
          toObject: () => ({ ...data, _id: id }),
        };
        mockUsers.set(id.toString(), obj);
        return Promise.resolve(obj);
      });

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newcustomer@example.com',
          displayName: 'Aakash Verma',
          phoneNumber: '9876501234',
          role: 'CUSTOMER',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('newcustomer@example.com');
    });

    it('PATCH /api/v1/admin/users/:id - should update user details in MongoDB', async () => {
      const targetId = new mongoose.Types.ObjectId().toString();
      mockUsers.set(targetId, {
        _id: new mongoose.Types.ObjectId(targetId),
        email: 'target@example.com',
        displayName: 'Target User',
        phoneNumber: '9876543210',
        role: 'CUSTOMER',
        isActive: true,
      });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Updated User Name',
          role: 'ADMIN',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.displayName).toBe('Updated User Name');
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('PATCH /api/v1/admin/users/:id - should prevent demoting root admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'CUSTOMER',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Root administrator');
    });

    it('DELETE /api/v1/admin/users/:id - should prevent deleting root admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('cannot be deleted');
    });

    it('DELETE /api/v1/admin/users/:id - should delete non-root user from MongoDB', async () => {
      const targetId = new mongoose.Types.ObjectId().toString();
      mockUsers.set(targetId, {
        _id: new mongoose.Types.ObjectId(targetId),
        email: 'temp@example.com',
        displayName: 'Temp User',
        role: 'CUSTOMER',
        isActive: true,
      });

      const res = await request(app)
        .delete(`/api/v1/admin/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
      expect(mockUsers.has(targetId)).toBe(false);
    });
  });

  describe('2. Admin All Orders CRUD Operations', () => {
    it('POST /api/v1/orders/admin - should allow admin to manually create an in-store order', async () => {
      const prodId = new mongoose.Types.ObjectId().toString();
      mockProducts.set(prodId, {
        _id: new mongoose.Types.ObjectId(prodId),
        name: 'Sugar 1kg',
        sellingPrice: 45,
        mrp: 50,
        stockQuantity: 10,
        isAvailable: true,
      });

      vi.spyOn(Order as any, 'create').mockImplementation((data: any) => {
        const id = new mongoose.Types.ObjectId();
        const ord = { ...data, _id: id };
        mockOrders.set(id.toString(), ord);
        return Promise.resolve(ord);
      });

      const res = await request(app)
        .post('/api/v1/orders/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Counter Customer',
          customerPhone: '9876543210',
          fulfillmentMethod: 'STORE_PICKUP',
          paymentMethod: 'COD',
          paymentStatus: 'PAID',
          orderStatus: 'COMPLETED',
          items: [{ productId: prodId, quantity: 2 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.customerName).toBe('Counter Customer');
      expect(res.body.data.totalAmount).toBe(90);
      expect(mockProducts.get(prodId).stockQuantity).toBe(8);
    });

    it('DELETE /api/v1/orders/admin/:idOrNumber - should permanently delete order and restore inventory', async () => {
      const prodId = new mongoose.Types.ObjectId().toString();
      const orderId = new mongoose.Types.ObjectId().toString();

      mockProducts.set(prodId, {
        _id: new mongoose.Types.ObjectId(prodId),
        name: 'Mustard Oil 1L',
        stockQuantity: 5,
        isAvailable: true,
      });

      const orderObj = {
        _id: new mongoose.Types.ObjectId(orderId),
        orderNumber: 'KGS-202610-8888',
        isInventoryRestored: false,
        orderStatus: 'CONFIRMED',
        items: [{ productId: new mongoose.Types.ObjectId(prodId), quantity: 3 }],
        statusHistory: [],
      };
      mockOrders.set(orderId, orderObj);

      const res = await request(app)
        .delete(`/api/v1/orders/admin/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
      expect(mockProducts.get(prodId).stockQuantity).toBe(8); // Restored from 5 + 3
      expect(mockOrders.has(orderId)).toBe(false);
    });
  });

  describe('3. Product Live / Unlive Status Toggle', () => {
    it('PATCH /api/v1/products/:id/publish - should toggle product LIVE (isPublished: true)', async () => {
      const prodId = new mongoose.Types.ObjectId().toString();
      mockProducts.set(prodId, {
        _id: new mongoose.Types.ObjectId(prodId),
        name: 'Tata Salt 1kg',
        isPublished: false,
      });

      const res = await request(app)
        .patch(`/api/v1/products/${prodId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPublished: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockProducts.get(prodId).isPublished).toBe(true);
    });

    it('PATCH /api/v1/products/:id/publish - should toggle product UNLIVE (isPublished: false)', async () => {
      const prodId = new mongoose.Types.ObjectId().toString();
      mockProducts.set(prodId, {
        _id: new mongoose.Types.ObjectId(prodId),
        name: 'Tata Salt 1kg',
        isPublished: true,
      });

      const res = await request(app)
        .patch(`/api/v1/products/${prodId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPublished: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockProducts.get(prodId).isPublished).toBe(false);
    });
  });
});
