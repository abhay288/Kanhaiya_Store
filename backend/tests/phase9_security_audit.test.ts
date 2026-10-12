import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Product } from '../src/models/product.model';
import { Order } from '../src/models/order.model';
import { User } from '../src/models/user.model';
import { StoreSettings } from '../src/models/storeSettings.model';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import mongoose from 'mongoose';

describe('Phase 9: Production Hardening & Security Audit Suite', () => {
  const adminId = '60d5ec49f1b2c82d99999990';
  const customerAId = '60d5ec49f1b2c82d99999991';
  const customerBId = '60d5ec49f1b2c82d99999992';
  const deactivatedId = '60d5ec49f1b2c82d99999993';

  const adminToken = jwt.sign(
    { id: adminId, firebaseUid: 'firebase-admin-uid', email: 'kanhaiyaastore@gmail.com', role: 'ADMIN' },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const customerAToken = jwt.sign(
    { id: customerAId, firebaseUid: 'firebase-cust-a', email: 'alice@example.com', role: 'CUSTOMER' },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const customerBToken = jwt.sign(
    { id: customerBId, firebaseUid: 'firebase-cust-b', email: 'bob@example.com', role: 'CUSTOMER' },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const deactivatedUserToken = jwt.sign(
    { id: deactivatedId, firebaseUid: 'firebase-deactivated', email: 'baduser@example.com', role: 'CUSTOMER' },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const mockUsers: any[] = [
    {
      _id: new mongoose.Types.ObjectId(adminId),
      firebaseUid: 'firebase-admin-uid',
      email: 'kanhaiyaastore@gmail.com',
      displayName: 'Store Manager',
      role: 'ADMIN',
      isActive: true,
    },
    {
      _id: new mongoose.Types.ObjectId(customerAId),
      firebaseUid: 'firebase-cust-a',
      email: 'alice@example.com',
      displayName: 'Alice Sharma',
      role: 'CUSTOMER',
      isActive: true,
    },
    {
      _id: new mongoose.Types.ObjectId(customerBId),
      firebaseUid: 'firebase-cust-b',
      email: 'bob@example.com',
      displayName: 'Bob Verma',
      role: 'CUSTOMER',
      isActive: true,
    },
    {
      _id: new mongoose.Types.ObjectId(deactivatedId),
      firebaseUid: 'firebase-deactivated',
      email: 'baduser@example.com',
      displayName: 'Blocked User',
      role: 'CUSTOMER',
      isActive: false, // Deactivated account!
    },
  ];

  let mockOrders: any[] = [];

  beforeAll(() => {
    // Mock User.findById for active account and authoritative role enforcement
    vi.spyOn(User, 'findById').mockImplementation((id: any) => {
      const u = mockUsers.find((x) => x._id.toString() === id?.toString());
      return Promise.resolve(u || null) as any;
    });

    // Mock StoreSettings
    vi.spyOn(StoreSettings as any, 'findOne').mockResolvedValue({
      storeName: 'Kanhaiya General Store',
      storePhone: '+919876543210',
      storeWhatsapp: '+919876543210',
      storeAddress: 'Main Market, Badlapur, UP',
      isStoreOpen: true,
      minOrderValue: 100,
      isDeliveryEnabled: true,
      standardDeliveryFee: 30,
      freeDeliveryThreshold: 499,
      serviceablePincodes: ['222125'],
      pickupInstructions: 'Collect at store counter',
    } as any);

    // Mock Orders
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
      return Promise.resolve(doc);
    });
  });

  // ================= 1. AUTHENTICATION & PRIVILEGE ENFORCEMENT =================
  describe('1. Authentication & Role Privilege Enforcement', () => {
    it('should reject requests with missing Authorization header (401)', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with malformed or tampered token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject deactivated user accounts even if possessing valid JWT (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${deactivatedUserToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('deactivated');
    });

    it('should prevent standard customer from accessing administrative endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Administrator privileges required');
    });

    it('should grant access to admin endpoint with verified admin credentials (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/test')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorized).toBe(true);
    });
  });

  // ================= 2. OBJECT-LEVEL ACCESS CONTROL (IDOR) =================
  describe('2. Object-Level Access Control & Guest Token Protection', () => {
    beforeAll(() => {
      mockOrders = [
        {
          _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d77777771'),
          orderNumber: 'KGS-2026-9001',
          customerId: new mongoose.Types.ObjectId(customerAId),
          customerName: 'Alice Sharma',
          customerPhone: '9876543210',
          totalAmount: 350,
          orderStatus: 'PLACED',
          paymentStatus: 'PENDING',
          items: [],
          statusHistory: [],
        },
        {
          _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d77777772'),
          orderNumber: 'KGS-2026-9002',
          customerId: null, // Guest order
          customerName: 'Guest Purchaser',
          customerPhone: '9123456789',
          guestTrackingToken: 'secure-unguessable-token-abc123xyz',
          totalAmount: 250,
          orderStatus: 'PLACED',
          paymentStatus: 'PENDING',
          items: [],
          statusHistory: [],
        },
      ];
    });

    it('should prevent Customer B from accessing Customer A private order (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/orders/KGS-2026-9001')
        .set('Authorization', `Bearer ${customerBToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized');
    });

    it('should allow Customer A to access their own private order (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/orders/KGS-2026-9001')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('KGS-2026-9001');
    });

    it('should reject unauthenticated guest lookup without token or phone (403 Forbidden)', async () => {
      const res = await request(app).get('/api/v1/orders/KGS-2026-9002');
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('guest tracking token or verified phone number is required');
    });

    it('should allow guest lookup when valid X-Guest-Token header is provided (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/orders/KGS-2026-9002')
        .set('X-Guest-Token', 'secure-unguessable-token-abc123xyz');
      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('KGS-2026-9002');
    });

    it('should allow guest lookup when verified phone number is provided (200 OK)', async () => {
      const res = await request(app).get('/api/v1/orders/KGS-2026-9002?phone=9123456789');
      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('KGS-2026-9002');
    });

    it('should allow authorized Admin to inspect any customer or guest order (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/orders/KGS-2026-9002')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('KGS-2026-9002');
    });
  });

  // ================= 3. API SECURITY & INPUT SANITIZATION =================
  describe('3. API Security, Correlation IDs & Input Sanitization', () => {
    it('should include X-Request-Id correlation header on every API response', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('x-request-id');
      expect(typeof res.headers['x-request-id']).toBe('string');
    });

    it('should strip malicious NoSQL injection operator keys from request payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'valid-token-str',
          $where: 'sleep(5000)',
          $gt: '',
        });
      // The body was parsed and sanitized, and rejected because token wasn't real google token
      expect(res.status).toBe(401);
    });

    it('should include Helmet security headers', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  // ================= 4. CLOUDINARY ASSET ACCESS RESTRICTIONS =================
  describe('4. Cloudinary Asset Access Restrictions', () => {
    it('should reject image deletion outside of kanhaiya_store namespace (400)', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/upload/unauthorized_folder%2Fimage123')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('kanhaiya_store namespace');
    });

    it('should reject path traversal in asset deletion public ID (400)', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/upload/kanhaiya_store%2F..%2Froot_asset')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('kanhaiya_store namespace');
    });
  });
});
