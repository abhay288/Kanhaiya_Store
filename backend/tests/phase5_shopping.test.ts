import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Product } from '../src/models/product.model';
import { Cart } from '../src/models/cart.model';
import { User } from '../src/models/user.model';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('Phase 5: Customer Shopping Experience & Cart Validation Suite', () => {
  const customerId = '60d5ec49f1b2c82d88888881';

  const customerToken = jwt.sign(
    {
      id: customerId,
      firebaseUid: 'firebase-customer-uid',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    },
    env.JWT_SECRET
  );

  const product1 = {
    _id: '60d5ec49f1b2c82d22222221',
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    slug: 'aashirvaad-shudh-chakki-atta-5kg',
    categoryId: { _id: '60d5ec49f1b2c82d11111111', name: 'Atta, Flours & Sooji', slug: 'atta-flours-sooji' },
    unit: 'kg',
    packSize: '5 kg',
    mrp: 260,
    sellingPrice: 235,
    stockQuantity: 10,
    isAvailable: true,
    isPublished: true,
    isFeatured: true,
    isBestseller: true,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/atta.webp', isPrimary: true, sortOrder: 0 }],
  };

  const product2 = {
    _id: '60d5ec49f1b2c82d22222222',
    name: 'Fortune Chakki Fresh Atta 5kg',
    slug: 'fortune-chakki-fresh-atta-5kg',
    categoryId: { _id: '60d5ec49f1b2c82d11111111', name: 'Atta, Flours & Sooji', slug: 'atta-flours-sooji' },
    unit: 'kg',
    packSize: '5 kg',
    mrp: 240,
    sellingPrice: 210,
    stockQuantity: 4,
    isAvailable: true,
    isPublished: true,
    isNewArrival: true,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/fortune.webp', isPrimary: true, sortOrder: 0 }],
  };

  const outOfStockProduct = {
    _id: '60d5ec49f1b2c82d22222223',
    name: 'Organic Wheat Flour 1kg',
    slug: 'organic-wheat-flour-1kg',
    categoryId: { _id: '60d5ec49f1b2c82d11111111', name: 'Atta, Flours & Sooji', slug: 'atta-flours-sooji' },
    unit: 'kg',
    packSize: '1 kg',
    mrp: 90,
    sellingPrice: 85,
    stockQuantity: 0,
    isAvailable: false,
    isPublished: true,
    images: [],
  };

  const unpublishedProduct = {
    _id: '60d5ec49f1b2c82d22222224',
    name: 'Secret Upcoming Spice Mix',
    slug: 'secret-upcoming-spice-mix',
    categoryId: { _id: '60d5ec49f1b2c82d11111111', name: 'Atta, Flours & Sooji', slug: 'atta-flours-sooji' },
    unit: 'packet',
    packSize: '100g',
    mrp: 50,
    sellingPrice: 45,
    stockQuantity: 20,
    isAvailable: true,
    isPublished: false,
    images: [],
  };

  let allProducts: any[] = [];
  let userCartData: any = null;

  beforeAll(() => {
    vi.spyOn(User as any, 'findById').mockImplementation((id: any) => {
      return Promise.resolve({
        _id: id,
        email: 'customer@example.com',
        displayName: 'Valued Customer',
        role: 'CUSTOMER',
        isActive: true,
      } as any);
    });

    vi.spyOn(Product as any, 'findById').mockImplementation((id: any) => {
      const p = allProducts.find((item) => item._id.toString() === id.toString());
      return {
        lean: () => Promise.resolve(p ? { ...p } : null),
      } as any;
    });

    vi.spyOn(Product as any, 'find').mockImplementation((query: any) => {
      let filtered = [...allProducts];
      if (query.isPublished !== undefined) {
        filtered = filtered.filter((p) => p.isPublished === query.isPublished);
      }
      if (query.isFeatured) {
        filtered = filtered.filter((p) => p.isFeatured);
      }
      if (query.isNewArrival) {
        filtered = filtered.filter((p) => p.isNewArrival);
      }
      if (query.isBestseller) {
        filtered = filtered.filter((p) => p.isBestseller);
      }
      if (query._id && query._id.$ne) {
        filtered = filtered.filter((p) => p._id.toString() !== query._id.$ne.toString());
      }
      if (query.categoryId) {
        const queryCat = query.categoryId?.toString?.() || String(query.categoryId);
        filtered = filtered.filter((p) => {
          const pCat = p.categoryId?._id?.toString?.() || p.categoryId?.toString?.();
          return pCat === queryCat;
        });
      }

      return {
        populate: () => ({
          populate: () => ({
            sort: () => ({
              limit: (lim: number) => ({
                lean: () => Promise.resolve(filtered.slice(0, lim)),
              }),
            }),
          }),
        }),
      } as any;
    });

    vi.spyOn(Cart as any, 'findOne').mockImplementation(() => {
      return {
        lean: () => Promise.resolve(userCartData ? { ...userCartData } : null),
      } as any;
    });

    vi.spyOn(Cart as any, 'findOneAndUpdate').mockImplementation((_query: any, update: any) => {
      userCartData = {
        userId: customerId,
        items: update.items,
      };
      return Promise.resolve(userCartData) as any;
    });

    vi.spyOn(Cart as any, 'findOneAndDelete').mockImplementation(() => {
      userCartData = null;
      return Promise.resolve(true) as any;
    });
  });

  beforeEach(() => {
    allProducts = [product1, product2, outOfStockProduct, unpublishedProduct];
    userCartData = null;
  });

  describe('Curated Collections & Related Products API', () => {
    it('GET /api/v1/products/collections - returns featured, new arrivals, bestsellers, and essentials', async () => {
      const res = await request(app).get('/api/v1/products/collections');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.featured).toHaveLength(1);
      expect(res.body.data.featured[0].id).toBe(product1._id);
      expect(res.body.data.newArrivals).toHaveLength(1);
      expect(res.body.data.newArrivals[0].id).toBe(product2._id);
      expect(res.body.data.bestsellers).toHaveLength(1);
      expect(res.body.data.bestsellers[0].id).toBe(product1._id);

      // Unpublished product must NEVER be returned
      const allIds = [
        ...res.body.data.featured,
        ...res.body.data.newArrivals,
        ...res.body.data.bestsellers,
        ...res.body.data.essentials,
      ].map((p) => p.id);
      expect(allIds).not.toContain(unpublishedProduct._id);
    });

    it('GET /api/v1/products/:id/related - returns other products from same category excluding current product', async () => {
      const res = await request(app).get(`/api/v1/products/${product1._id}/related`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data;
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.map((i: any) => i.id)).not.toContain(product1._id);
      expect(items.some((i: any) => i.id === product2._id)).toBe(true);
    });
  });

  describe('Live Cart Validation & Price / Stock Consistency', () => {
    it('POST /api/v1/cart/validate - correctly validates in-stock items with trusted server prices', async () => {
      const res = await request(app)
        .post('/api/v1/cart/validate')
        .send({
          items: [{ productId: product1._id, quantity: 2 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.hasAdjustments).toBe(false);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].validQuantity).toBe(2);
      expect(res.body.data.items[0].sellingPrice).toBe(235);
      expect(res.body.data.items[0].lineSubtotal).toBe(470);
      expect(res.body.data.subtotal).toBe(470);
      expect(res.body.data.deliveryFee).toBe(0); // In-store pickup only (no delivery)
      expect(res.body.data.totalToPay).toBe(470);
      expect(res.body.data.savings).toBe(50); // MRP 260*2=520, subtotal 470 => savings 50
    });

    it('POST /api/v1/cart/validate - computes correct total for in-store pickup', async () => {
      const res = await request(app)
        .post('/api/v1/cart/validate')
        .send({
          items: [{ productId: product1._id, quantity: 3 }], // 235 * 3 = 705
        });

      expect(res.status).toBe(200);
      expect(res.body.data.subtotal).toBe(705);
      expect(res.body.data.deliveryFee).toBe(0);
      expect(res.body.data.totalToPay).toBe(705);
    });

    it('POST /api/v1/cart/validate - adjusts quantity when requested exceeds available stock', async () => {
      // product2 has stockQuantity: 4
      const res = await request(app)
        .post('/api/v1/cart/validate')
        .send({
          items: [{ productId: product2._id, quantity: 10 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(false);
      expect(res.body.data.hasAdjustments).toBe(true);
      expect(res.body.data.items[0].status).toBe('adjusted');
      expect(res.body.data.items[0].validQuantity).toBe(4);
      expect(res.body.data.items[0].availableStock).toBe(4);
      expect(res.body.data.items[0].message).toContain('limited to 4');
    });

    it('POST /api/v1/cart/validate - flags out-of-stock items safely', async () => {
      const res = await request(app)
        .post('/api/v1/cart/validate')
        .send({
          items: [{ productId: outOfStockProduct._id, quantity: 1 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hasAdjustments).toBe(true);
      expect(res.body.data.items[0].status).toBe('out_of_stock');
      expect(res.body.data.items[0].validQuantity).toBe(0);
      expect(res.body.data.subtotal).toBe(0);
    });

    it('POST /api/v1/cart/validate - blocks unpublished products and marks them unavailable', async () => {
      const res = await request(app)
        .post('/api/v1/cart/validate')
        .send({
          items: [{ productId: unpublishedProduct._id, quantity: 1 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].status).toBe('unavailable');
      expect(res.body.data.items[0].validQuantity).toBe(0);
      expect(res.body.data.subtotal).toBe(0);
    });

    it('PUT /api/v1/cart - persists validated items for authenticated customer', async () => {
      const res = await request(app)
        .put('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: product1._id, quantity: 1 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(userCartData).not.toBeNull();
      expect(userCartData.items).toHaveLength(1);
    });

    it('GET /api/v1/cart - retrieves saved cart for authenticated customer', async () => {
      userCartData = {
        userId: customerId,
        items: [{ productId: product1._id, quantity: 2 }],
      };

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].validQuantity).toBe(2);
      expect(res.body.data.subtotal).toBe(470);
    });
  });
});
