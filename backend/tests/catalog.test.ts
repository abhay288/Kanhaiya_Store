import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'express';
import { app } from '../src/app';
import { Category } from '../src/models/category.model';
import { Product } from '../src/models/product.model';
import { User } from '../src/models/user.model';
import * as cloudinaryModule from '../src/config/cloudinary';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('Phase 3: Category & Product Management Suite', () => {
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

  let mockCategories: any[] = [];
  let mockProducts: any[] = [];

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

    // Mock Cloudinary functions
    vi.spyOn(cloudinaryModule, 'uploadImageBuffer').mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.webp',
      public_id: 'kanhaiya_store/products/sample_123',
      format: 'webp',
      width: 800,
      height: 800,
      bytes: 45000,
    } as any);

    vi.spyOn(cloudinaryModule, 'deleteCloudinaryImage').mockResolvedValue({ result: 'ok' });
  });

  beforeEach(() => {
    mockCategories = [
      {
        _id: '60d5ec49f1b2c82d11111111',
        name: 'Atta, Flours & Sooji',
        slug: 'atta-flours-sooji',
        description: 'Fresh stone-ground wheat flour & grains',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/atta.webp',
        imagePublicId: 'kanhaiya_store/categories/atta',
        displayOrder: 1,
        isActive: true,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      },
      {
        _id: '60d5ec49f1b2c82d11111112',
        name: 'Seasonal Inactive Category',
        slug: 'seasonal-inactive',
        description: 'Not currently in season',
        imageUrl: '',
        imagePublicId: '',
        displayOrder: 99,
        isActive: false,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      },
    ];

    mockProducts = [
      {
        _id: '60d5ec49f1b2c82d22222221',
        name: 'Aashirvaad Shudh Chakki Atta 5kg',
        slug: 'aashirvaad-shudh-chakki-atta-5kg',
        description: '100% pure whole wheat flour',
        brand: 'Aashirvaad',
        sku: 'AASH-ATTA-5KG',
        barcode: '8901030000001',
        categoryId: {
          _id: '60d5ec49f1b2c82d11111111',
          name: 'Atta, Flours & Sooji',
          slug: 'atta-flours-sooji',
        },
        subcategoryId: null,
        unit: 'kg',
        packSize: '5 kg',
        mrp: 295,
        sellingPrice: 265,
        stockQuantity: 40,
        lowStockThreshold: 5,
        isAvailable: true,
        isPublished: true,
        isFeatured: true,
        isNewArrival: false,
        isBestseller: true,
        tags: ['atta', 'flour', 'wheat', 'grocery'],
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/aashirvaad_atta.webp',
            publicId: 'kanhaiya_store/products/aashirvaad_atta',
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        variants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      },
      {
        _id: '60d5ec49f1b2c82d22222222',
        name: 'Draft Hidden Biscuit Pack',
        slug: 'draft-hidden-biscuit-pack',
        description: 'Unpublished biscuit batch',
        brand: 'Parle',
        sku: 'PARLE-G-DRAFT',
        barcode: '8901030000002',
        categoryId: {
          _id: '60d5ec49f1b2c82d11111111',
          name: 'Atta, Flours & Sooji',
          slug: 'atta-flours-sooji',
        },
        subcategoryId: null,
        unit: 'packet',
        packSize: '800 g',
        mrp: 90,
        sellingPrice: 80,
        stockQuantity: 10,
        lowStockThreshold: 5,
        isAvailable: true,
        isPublished: false, // Unpublished draft
        isFeatured: false,
        isNewArrival: false,
        isBestseller: false,
        tags: ['biscuit', 'snacks'],
        images: [],
        variants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      },
    ];

    function createMockQuery<T>(data: T | null) {
      const query: any = {
        then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
          return Promise.resolve(data).then(onfulfilled, onrejected);
        },
        populate() {
          return query;
        },
        sort() {
          return query;
        },
        skip() {
          return query;
        },
        limit() {
          return query;
        },
        lean() {
          return Promise.resolve(data);
        },
      };
      return query;
    }

    // Mock Category Mongoose methods
    vi.spyOn(Category as any, 'aggregate').mockImplementation(() => {
      return Promise.resolve(
        mockCategories.map((c) => ({
          ...c,
          productCount: c._id === '60d5ec49f1b2c82d11111111' ? 2 : 0,
        }))
      );
    });

    vi.spyOn(Category as any, 'find').mockImplementation(() => createMockQuery(mockCategories));

    vi.spyOn(Category as any, 'findOne').mockImplementation((q: any) => {
      let found = null;
      if (q.slug) found = mockCategories.find((c) => c.slug === q.slug);
      if (q._id) found = mockCategories.find((c) => c._id.toString() === q._id.toString());
      return createMockQuery(found || null);
    });

    vi.spyOn(Category as any, 'findById').mockImplementation((id: any) => {
      const found = mockCategories.find((c) => c._id.toString() === id.toString());
      return createMockQuery(found || null);
    });

    vi.spyOn(Category as any, 'countDocuments').mockImplementation((q: any) => {
      if (q.parentId) {
        return Promise.resolve(mockCategories.filter((c) => c.parentId === q.parentId.toString()).length);
      }
      return Promise.resolve(0);
    });

    vi.spyOn(Category as any, 'create').mockImplementation((doc: any) => {
      const created = {
        _id: '60d5ec49f1b2c82d11111119',
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };
      mockCategories.push(created);
      return Promise.resolve(created);
    });

    vi.spyOn(Category as any, 'findByIdAndDelete').mockImplementation((id: any) => {
      mockCategories = mockCategories.filter((c) => c._id.toString() !== id.toString());
      return Promise.resolve(true);
    });

    // Mock Product Mongoose methods
    vi.spyOn(Product as any, 'countDocuments').mockImplementation((q: any) => {
      if (q.$or) {
        // Checking for category dependency
        const catId = q.$or[0].categoryId.toString();
        const count = mockProducts.filter(
          (p) =>
            (p.categoryId?._id ? p.categoryId._id.toString() : p.categoryId.toString()) === catId
        ).length;
        return Promise.resolve(count);
      }
      if (q.isPublished === true) {
        return Promise.resolve(mockProducts.filter((p) => p.isPublished).length);
      }
      return Promise.resolve(mockProducts.length);
    });

    vi.spyOn(Product as any, 'find').mockImplementation((q: any) => {
      let filtered = [...mockProducts];
      if (q.isPublished === true) {
        filtered = filtered.filter((p) => p.isPublished);
      }
      if (q.brand) {
        filtered = filtered.filter((p) => p.brand.toLowerCase().includes('aashirvaad'));
      }
      return createMockQuery(filtered);
    });

    vi.spyOn(Product as any, 'findOne').mockImplementation((q: any) => {
      let found: any = null;
      if (q.sku) found = mockProducts.find((p) => p.sku === q.sku);
      if (q.slug) found = mockProducts.find((p) => p.slug === q.slug);
      if (q._id) found = mockProducts.find((p) => p._id.toString() === q._id.toString());
      if (found && q.isPublished === true && !found.isPublished) found = null;
      return createMockQuery(found || null);
    });

    vi.spyOn(Product as any, 'findById').mockImplementation((id: any) => {
      const found = mockProducts.find((p) => p._id.toString() === id.toString());
      return createMockQuery(found || null);
    });


    vi.spyOn(Product as any, 'create').mockImplementation((doc: any) => {
      const created = {
        _id: '60d5ec49f1b2c82d22222229',
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };
      mockProducts.push(created);
      return Promise.resolve(created);
    });

    vi.spyOn(Product as any, 'findByIdAndDelete').mockImplementation((id: any) => {
      mockProducts = mockProducts.filter((p) => p._id.toString() !== id.toString());
      return Promise.resolve(true);
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ================= CATEGORY TESTS =================
  describe('Category Management Endpoints', () => {
    it('GET /api/v1/categories - public users should retrieve category list with live product count', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('productCount');
    });

    it('POST /api/v1/categories - should reject unauthenticated creation (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/v1/categories').send({
        name: 'Dals & Pulses',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/categories - should reject customer role creation (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Dals & Pulses',
        });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/categories - admin should create new category with auto-generated slug', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dals & Pulses',
          description: 'High quality arhar, moong, chana dals',
          displayOrder: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Dals & Pulses');
      expect(res.body.data.slug).toBe('dals-pulses');
    });

    it('DELETE /api/v1/categories/:id - should prevent deletion when products depend on category (400)', async () => {
      // Category 60d5ec49f1b2c82d11111111 has 2 products
      const res = await request(app)
        .delete('/api/v1/categories/60d5ec49f1b2c82d11111111')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('product(s) still belong to it');
    });
  });

  // ================= PRODUCT TESTS =================
  describe('Product Management Endpoints', () => {
    it('GET /api/v1/products - public users should only see published products', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].slug).toBe('aashirvaad-shudh-chakki-atta-5kg');
      // Draft product should NOT be in public listing
      const hasDraft = res.body.data.items.some((p: any) => p.isPublished === false);
      expect(hasDraft).toBe(false);
    });

    it('GET /api/v1/products/:id - public user should receive 404 for draft product', async () => {
      const res = await request(app).get('/api/v1/products/60d5ec49f1b2c82d22222222');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/products/:id - admin can view draft product', async () => {
      const res = await request(app)
        .get('/api/v1/products/60d5ec49f1b2c82d22222222')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Draft Hidden Biscuit Pack');
    });

    it('POST /api/v1/products - should reject creation by customer (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Fortune Sunlite Refined Oil 1L',
          categoryId: '60d5ec49f1b2c82d11111111',
          sellingPrice: 145,
        });
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/products - admin should create new product with retail unit and prices', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Fortune Sunlite Refined Oil 1L',
          categoryId: '60d5ec49f1b2c82d11111111',
          unit: 'l',
          packSize: '1 L pouch',
          mrp: 170,
          sellingPrice: 145,
          stockQuantity: 25,
          lowStockThreshold: 4,
          sku: 'FORT-OIL-1L',
          tags: ['oil', 'cooking oil', 'sunflower'],
          images: [
            {
              url: 'https://res.cloudinary.com/demo/image/upload/fortune.webp',
              publicId: 'kanhaiya_store/products/fortune_1',
              isPrimary: true,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Fortune Sunlite Refined Oil 1L');
      expect(res.body.data.unit).toBe('l');
      expect(res.body.data.discountPercentage).toBe(15);
      expect(res.body.data.inStock).toBe(true);
    });

    it('POST /api/v1/products - should reject duplicate SKU (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Atta Item',
          categoryId: '60d5ec49f1b2c82d11111111',
          sku: 'AASH-ATTA-5KG', // already used
          sellingPrice: 200,
          stockQuantity: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("SKU 'AASH-ATTA-5KG' already exists");
    });

    it('PATCH /api/v1/products/:id/publish - admin should toggle publish status', async () => {
      const res = await request(app)
        .patch('/api/v1/products/60d5ec49f1b2c82d22222222/publish')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isPublished: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPublished).toBe(true);
    });

    it('DELETE /api/v1/products/:id - admin should delete product and trigger Cloudinary cleanup', async () => {
      const res = await request(app)
        .delete('/api/v1/products/60d5ec49f1b2c82d22222221')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
      expect(cloudinaryModule.deleteCloudinaryImage).toHaveBeenCalledWith('kanhaiya_store/products/aashirvaad_atta');
    });
  });

  // ================= CLOUDINARY UPLOAD ENDPOINTS =================
  describe('Cloudinary Image Upload Endpoints', () => {
    it('POST /api/v1/admin/upload - should reject unauthenticated upload (401)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/upload')
        .attach('image', Buffer.from('fake image content'), 'product.png');

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/admin/upload - admin should upload image buffer and receive secure URL', async () => {
      const res = await request(app)
        .post('/api/v1/admin/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('fake png image buffer'), 'item.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('url');
      expect(res.body.data).toHaveProperty('publicId');
      expect(res.body.data.url).toContain('https://res.cloudinary.com');
    });

    it('DELETE /api/v1/admin/upload/:publicId - admin should delete Cloudinary asset', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/upload/kanhaiya_store%2Fproducts%2Fsample_123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});
