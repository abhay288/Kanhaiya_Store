import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/user.model';

describe('Authentication & Authorization Suite (Phase 2)', () => {
  beforeAll(async () => {
    vi.spyOn(User as any, 'findOne').mockImplementation((query: any) => {
      if (query.firebaseUid === 'test-firebase-uid-customer@example.com' || query.email === 'customer@example.com') {
        return Promise.resolve({
          _id: '60d5ec49f1b2c82d88888881',
          firebaseUid: 'test-firebase-uid-customer@example.com',
          email: 'customer@example.com',
          displayName: 'Test Customer',
          role: 'CUSTOMER',
          isActive: true,
          save: vi.fn().mockResolvedValue(true),
          toSafeProfile: () => ({
            id: '60d5ec49f1b2c82d88888881',
            email: 'customer@example.com',
            displayName: 'Test Customer',
            role: 'CUSTOMER',
          }),
        } as any);
      }

      if (query.firebaseUid === 'test-firebase-uid-admin@kanhaiyastore.com' || query.email === 'admin@kanhaiyastore.com') {
        return Promise.resolve({
          _id: '60d5ec49f1b2c82d88888882',
          firebaseUid: 'test-firebase-uid-admin@kanhaiyastore.com',
          email: 'admin@kanhaiyastore.com',
          displayName: 'Test Administrator',
          role: 'ADMIN',
          isActive: true,
          save: vi.fn().mockResolvedValue(true),
          toSafeProfile: () => ({
            id: '60d5ec49f1b2c82d88888882',
            email: 'admin@kanhaiyastore.com',
            displayName: 'Test Administrator',
            role: 'ADMIN',
          }),
        } as any);
      }

      return Promise.resolve(null);
    });

    vi.spyOn(User as any, 'create').mockImplementation((doc: any) => {
      const isAdm = doc.email.includes('admin');
      const role = isAdm ? 'ADMIN' : 'CUSTOMER';
      return Promise.resolve({
        _id: isAdm ? '60d5ec49f1b2c82d88888882' : '60d5ec49f1b2c82d88888881',
        ...doc,
        role,
        save: vi.fn().mockResolvedValue(true),
        toSafeProfile: () => ({
          id: isAdm ? '60d5ec49f1b2c82d88888882' : '60d5ec49f1b2c82d88888881',
          email: doc.email,
          displayName: doc.displayName,
          role,
        }),
      } as any);
    });

    vi.spyOn(User as any, 'findById').mockImplementation((id: any) => {
      const isAdm = id.toString() === '60d5ec49f1b2c82d88888882';
      return Promise.resolve({
        _id: id,
        email: isAdm ? 'admin@kanhaiyastore.com' : 'customer@example.com',
        displayName: isAdm ? 'Test Administrator' : 'Test Customer',
        role: isAdm ? 'ADMIN' : 'CUSTOMER',
        isActive: true,
        toSafeProfile: () => ({
          id: id.toString(),
          email: isAdm ? 'admin@kanhaiyastore.com' : 'customer@example.com',
          role: isAdm ? 'ADMIN' : 'CUSTOMER',
        }),
      } as any);
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/google', () => {
    it('should reject request when idToken is missing (400 Bad Request)', async () => {
      const res = await request(app).post('/api/v1/auth/google').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid or expired tokens (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'invalid-untrusted-token-string' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should authenticate a valid customer token and assign CUSTOMER role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'test-token:customer:customer@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.token).toBeDefined();
    });

    it('should authenticate allowlisted admin and resolve ADMIN role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'test-token:admin:admin@kanhaiyastore.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('Role-Based Authorization & Admin Guarding', () => {
    it('should reject unauthenticated access to /api/v1/admin/test (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/admin/test');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject CUSTOMER access to /api/v1/admin/test (403 Forbidden)', async () => {
      // 1. Get customer session token
      const authRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'test-token:customer:customer@example.com' });

      const customerToken = authRes.body.data.token;

      // 2. Attempt to access admin endpoint
      const adminRes = await request(app)
        .get('/api/v1/admin/test')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(adminRes.status).toBe(403);
      expect(adminRes.body.success).toBe(false);
      expect(adminRes.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow authorized ADMIN access to /api/v1/admin/test (200 OK)', async () => {
      // 1. Get admin session token
      const authRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'test-token:admin:admin@kanhaiyastore.com' });

      const adminToken = authRes.body.data.token;

      // 2. Access admin test endpoint
      const adminRes = await request(app)
        .get('/api/v1/admin/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.authorized).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return profile for authenticated customer', async () => {
      const authRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'test-token:customer:customer@example.com' });

      const token = authRes.body.data.token;

      const profileRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.success).toBe(true);
      expect(profileRes.body.data.email).toBe('customer@example.com');
    });
  });
});
