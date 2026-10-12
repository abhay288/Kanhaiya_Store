import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Product } from '../src/models/product.model';
import { Order } from '../src/models/order.model';
import { Address } from '../src/models/address.model';
import { StockMovement } from '../src/models/stockMovement.model';
import { StoreSettings } from '../src/models/storeSettings.model';
import { User } from '../src/models/user.model';
import { Notification } from '../src/models/notification.model';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import mongoose from 'mongoose';

describe('Phase 6: Checkout & Order Placement System Suite', () => {
  const customerId = '60d5ec49f1b2c82d88888881';
  const otherCustomerId = '60d5ec49f1b2c82d88888889';

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

  // In-memory mock data store
  let mockProducts: Map<string, any> = new Map();
  let mockOrders: any[] = [];
  let mockAddresses: any[] = [];
  let mockStockMovements: any[] = [];

  const initialProducts = [
    {
      _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
      name: 'Aashirvaad Shudh Chakki Atta 5kg',
      slug: 'aashirvaad-atta-5kg',
      unit: 'kg',
      packSize: '5 kg',
      mrp: 295,
      sellingPrice: 265,
      stockQuantity: 20,
      isAvailable: true,
      isPublished: true,
      images: [{ url: 'https://res.cloudinary.com/demo/image/upload/atta.webp' }],
      save: vi.fn().mockResolvedValue(true),
    },
    {
      _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222222'),
      name: 'Amul Pure Cow Ghee 1L',
      slug: 'amul-cow-ghee-1l',
      unit: 'bottle',
      packSize: '1 L',
      mrp: 650,
      sellingPrice: 615,
      stockQuantity: 5,
      isAvailable: true,
      isPublished: true,
      images: [{ url: 'https://res.cloudinary.com/demo/image/upload/ghee.webp' }],
      save: vi.fn().mockResolvedValue(true),
    },
    {
      _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222223'),
      name: 'Sold Out Lentils',
      slug: 'sold-out-lentils',
      unit: 'kg',
      mrp: 120,
      sellingPrice: 100,
      stockQuantity: 0,
      isAvailable: false,
      isPublished: true,
      save: vi.fn().mockResolvedValue(true),
    },
    {
      _id: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222224'),
      name: 'Unpublished Item',
      slug: 'unpublished-item',
      unit: 'packet',
      mrp: 50,
      sellingPrice: 40,
      stockQuantity: 10,
      isAvailable: true,
      isPublished: false,
      save: vi.fn().mockResolvedValue(true),
    },
  ];

  beforeAll(() => {
    // Mock User findById
    vi.spyOn(User as any, 'findById').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      return Promise.resolve({
        _id: id,
        email: idStr === customerId ? 'customer@example.com' : 'other@example.com',
        displayName: idStr === customerId ? 'Valued Customer' : 'Other Customer',
        role: 'CUSTOMER',
        isActive: true,
      } as any);
    });

    // Mock StoreSettings
    vi.spyOn(StoreSettings as any, 'findOne').mockResolvedValue({
      storeName: 'Kanhaiya General Store',
      storePhone: '+919876543210',
      storeWhatsapp: '+919876543210',
      storeUpiId: 'kanhaiyastore@upi',
      storeAddress: 'House 42, Main Bazar, Near City Post Office, New Delhi - 110001',
      pickupInstructions: 'Orders are packed and kept ready at the store counter.',
      isDeliveryEnabled: true,
      serviceablePincodes: ['110001', '110002', '110003', '110006', '110084'],
      minOrderValue: 100,
      standardDeliveryFee: 30,
      freeDeliveryThreshold: 500,
      estimatedDeliveryWindow: 'Same-day delivery within 2-4 hours',
      isWhatsappQrEnabled: true,
      currency: 'INR',
      currencySymbol: '₹',
    } as any);

    // Mock Product.findById
    vi.spyOn(Product as any, 'findById').mockImplementation((id: any) => {
      const idStr = id?.toString() || '';
      const prod = mockProducts.get(idStr);
      return Promise.resolve(prod ? { ...prod, save: vi.fn().mockImplementation(function (this: any) {
        mockProducts.set(idStr, this);
        return Promise.resolve(this);
      }) } : null);
    });

    // Mock Product.findByIdAndUpdate
    vi.spyOn(Product as any, 'findByIdAndUpdate').mockImplementation((id: any, update: any) => {
      const idStr = id?.toString() || '';
      const prod = mockProducts.get(idStr);
      if (prod) {
        Object.assign(prod, update);
        mockProducts.set(idStr, prod);
      }
      return Promise.resolve(prod);
    });

    // Mock Order.create
    vi.spyOn(Order as any, 'create').mockImplementation((orderData: any) => {
      const created = {
        _id: new mongoose.Types.ObjectId(),
        ...orderData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockOrders.push(created);
      return Promise.resolve(created);
    });

    // Mock Order.findOne
    vi.spyOn(Order as any, 'findOne').mockImplementation((query: any) => {
      let found = null;
      if (query.idempotencyKey) {
        found = mockOrders.find((o) => o.idempotencyKey === query.idempotencyKey);
      } else if (query.orderNumber) {
        found = mockOrders.find((o) => o.orderNumber === query.orderNumber);
      } else if (query.$or) {
        const idMatches = query.$or.map((q: any) => q._id || q.orderNumber);
        found = mockOrders.find((o) => idMatches.includes(o._id?.toString()) || idMatches.includes(o.orderNumber));
      }
      return Promise.resolve(found ? { ...found } : null);
    });

    // Mock Order.find
    vi.spyOn(Order as any, 'find').mockImplementation((query: any) => {
      const results = mockOrders.filter((o) => {
        if (query.customerId) {
          return o.customerId?.toString() === query.customerId.toString();
        }
        return true;
      });
      return {
        sort: () => ({
          lean: () => Promise.resolve(results),
        }),
      } as any;
    });

    // Mock StockMovement.create
    vi.spyOn(StockMovement as any, 'create').mockImplementation((movData: any) => {
      const created = { _id: new mongoose.Types.ObjectId(), ...movData };
      mockStockMovements.push(created);
      return Promise.resolve(created);
    });

    // Mock Address queries
    vi.spyOn(Address as any, 'find').mockImplementation((query: any) => {
      const userAddrs = mockAddresses.filter((a) => a.userId?.toString() === query.userId?.toString());
      return {
        sort: () => ({
          lean: () => Promise.resolve(userAddrs),
        }),
      } as any;
    });

    vi.spyOn(Address as any, 'findById').mockImplementation((id: any) => {
      const addr = mockAddresses.find((a) => a._id?.toString() === id?.toString());
      if (!addr) return Promise.resolve(null);
      return Promise.resolve({
        ...addr,
        save: vi.fn().mockImplementation(function (this: any) {
          const idx = mockAddresses.findIndex((a) => a._id.toString() === this._id.toString());
          if (idx >= 0) mockAddresses[idx] = this;
          return Promise.resolve(this);
        }),
      });
    });

    vi.spyOn(Address as any, 'create').mockImplementation((data: any) => {
      const created = { _id: new mongoose.Types.ObjectId(), ...data };
      mockAddresses.push(created);
      return Promise.resolve(created);
    });

    vi.spyOn(Address as any, 'updateMany').mockResolvedValue({ acknowledged: true });
    vi.spyOn(Address as any, 'countDocuments').mockImplementation((query: any) => {
      return Promise.resolve(mockAddresses.filter((a) => a.userId?.toString() === query.userId?.toString()).length);
    });
    vi.spyOn(Address as any, 'findByIdAndDelete').mockImplementation((id: any) => {
      mockAddresses = mockAddresses.filter((a) => a._id?.toString() !== id?.toString());
      return Promise.resolve({ acknowledged: true });
    });

    vi.spyOn(Notification as any, 'create').mockResolvedValue(true as any);
  });

  beforeEach(() => {
    mockProducts.clear();
    for (const p of initialProducts) {
      mockProducts.set(p._id.toString(), { ...p });
    }
    mockOrders = [];
    mockAddresses = [];
    mockStockMovements = [];
  });

  describe('1. Delivery Serviceability & Public Store Configuration', () => {
    it('GET /api/v1/settings/public - should return complete store configuration', async () => {
      const res = await request(app).get('/api/v1/settings/public');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.storeName).toBe('Kanhaiya General Store');
      expect(res.body.data.phone).toBe('+919876543210');
      expect(res.body.data.whatsappNumber).toBe('+919876543210');
      expect(res.body.data.isDeliveryEnabled).toBe(true);
      expect(res.body.data.serviceablePincodes).toContain('110001');
      expect(res.body.data.pickupInstructions).toBeDefined();
    });

    it('POST /api/v1/settings/check-serviceability - should confirm serviceability for valid PIN', async () => {
      const res = await request(app)
        .post('/api/v1/settings/check-serviceability')
        .send({ pincode: '110001', subtotal: 600 });

      expect(res.status).toBe(200);
      expect(res.body.data.serviceable).toBe(true);
      expect(res.body.data.deliveryFee).toBe(0); // Subtotal >= 500 => FREE
    });

    it('POST /api/v1/settings/check-serviceability - should calculate fee for subtotal below threshold', async () => {
      const res = await request(app)
        .post('/api/v1/settings/check-serviceability')
        .send({ pincode: '110001', subtotal: 250 });

      expect(res.status).toBe(200);
      expect(res.body.data.serviceable).toBe(true);
      expect(res.body.data.deliveryFee).toBe(30);
    });

    it('POST /api/v1/settings/check-serviceability - should reject unsupported PIN code', async () => {
      const res = await request(app)
        .post('/api/v1/settings/check-serviceability')
        .send({ pincode: '560001' });

      expect(res.status).toBe(200);
      expect(res.body.data.serviceable).toBe(false);
      expect(res.body.data.message).toContain('not available for PIN 560001');
    });

    it('POST /api/v1/settings/check-serviceability - should reject malformed PIN code', async () => {
      const res = await request(app)
        .post('/api/v1/settings/check-serviceability')
        .send({ pincode: '1100' });

      expect(res.status).toBe(200);
      expect(res.body.data.serviceable).toBe(false);
      expect(res.body.data.message).toContain('Invalid Indian PIN code');
    });
  });

  describe('2. Secure Order Placement (COD & WhatsApp QR)', () => {
    it('POST /api/v1/orders - should successfully place guest COD order with in-store pickup (no address needed)', async () => {
      const payload = {
        items: [{ productId: '60d5ec49f1b2c82d22222221', quantity: 2 }],
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay Kushwaha',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const order = res.body.data;
      expect(order.orderNumber).toMatch(/^KGS-\d{6}-\d{4}$/);
      expect(order.fulfillmentMethod).toBe('PICKUP');
      expect(order.pickupDetails).toBeDefined();
      expect(order.deliveryAddress).toBeNull();
      expect(order.paymentMethod).toBe('COD');
      expect(order.paymentStatus).toBe('PENDING'); // Payment status remains pending!
      expect(order.orderStatus).toBe('PLACED');
      expect(order.subtotal).toBe(530); // 265 * 2 = 530
      expect(order.deliveryFee).toBe(0); // ₹0 for pickup
      expect(order.totalAmount).toBe(530);

      // Verify inventory decrement in mock data
      const prod = mockProducts.get('60d5ec49f1b2c82d22222221');
      expect(prod.stockQuantity).toBe(18); // 20 - 2 = 18

      // Verify StockMovement record created
      expect(mockStockMovements.length).toBe(1);
      expect(mockStockMovements[0].adjustmentType).toBe('ORDER_FULFILLMENT');
      expect(mockStockMovements[0].changeQuantity).toBe(-2);
    });

    it('POST /api/v1/orders - should place authenticated order with Local Delivery and free delivery above threshold', async () => {
      const payload = {
        items: [
          { productId: '60d5ec49f1b2c82d22222221', quantity: 1 }, // 265
          { productId: '60d5ec49f1b2c82d22222222', quantity: 1 }, // 615 -> total 880 >= 500
        ],
        fulfillmentMethod: 'DELIVERY',
        customerName: 'Abhay Kushwaha',
        customerPhone: '9876543210',
        deliveryAddress: {
          houseNumber: '42',
          street: 'Main Bazar',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
        paymentMethod: 'COD',
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.customerId).toBe(customerId);
      expect(order.fulfillmentMethod).toBe('DELIVERY');
      expect(order.deliveryFee).toBe(0); // Free delivery above 500
      expect(order.subtotal).toBe(880);
      expect(order.totalAmount).toBe(880);
    });

    it('POST /api/v1/orders - should charge standard delivery fee when subtotal is below free threshold', async () => {
      const payload = {
        items: [{ productId: '60d5ec49f1b2c82d22222221', quantity: 1 }], // 265 < 500
        fulfillmentMethod: 'DELIVERY',
        customerName: 'Abhay Kushwaha',
        customerPhone: '9876543210',
        deliveryAddress: {
          houseNumber: '42',
          street: 'Main Bazar',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
        paymentMethod: 'COD',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.subtotal).toBe(265);
      expect(order.deliveryFee).toBe(30);
      expect(order.totalAmount).toBe(295); // 265 + 30
    });

    it('POST /api/v1/orders - should place manual WhatsApp QR order with prefilled WhatsApp URL and PENDING payment status', async () => {
      const payload = {
        items: [{ productId: '60d5ec49f1b2c82d22222221', quantity: 1 }],
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay Kushwaha',
        customerPhone: '9876543210',
        paymentMethod: 'WHATSAPP_QR',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.paymentMethod).toBe('WHATSAPP_QR');
      expect(order.paymentStatus).toBe('PENDING'); // Must remain pending
      expect(order.whatsappPaymentUrl).toContain('https://wa.me/919876543210?text=');
      expect(order.whatsappPaymentUrl).toContain(encodeURIComponent(order.orderNumber));
    });

    it('POST /api/v1/orders - should recalculate prices authoritative from DB, ignoring client manipulated prices', async () => {
      const payload = {
        items: [
          {
            productId: '60d5ec49f1b2c82d22222221',
            quantity: 1,
            sellingPrice: 1, // Tampered client price!
            mrp: 1,
          },
        ],
        subtotal: 1, // Tampered client subtotal!
        totalAmount: 1, // Tampered client total!
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay Kushwaha',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.items[0].sellingPrice).toBe(265); // Real DB price
      expect(order.subtotal).toBe(265); // Real subtotal
      expect(order.totalAmount).toBe(265); // Real total
    });

    it('POST /api/v1/orders - should prevent duplicate orders using idempotencyKey', async () => {
      const key = 'idem-unique-key-12345';
      const payload = {
        items: [{ productId: '60d5ec49f1b2c82d22222221', quantity: 1 }],
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay Kushwaha',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
        idempotencyKey: key,
      };

      const res1 = await request(app).post('/api/v1/orders').send(payload);
      expect(res1.status).toBe(201);
      const orderNumber1 = res1.body.data.orderNumber;
      const stockAfterFirst = mockProducts.get('60d5ec49f1b2c82d22222221').stockQuantity;

      // Second identical request with same idempotencyKey
      const res2 = await request(app).post('/api/v1/orders').send(payload);
      expect(res2.status).toBe(201);
      expect(res2.body.data.orderNumber).toBe(orderNumber1); // Returns identical order

      // Stock should NOT be decremented twice!
      const stockAfterSecond = mockProducts.get('60d5ec49f1b2c82d22222221').stockQuantity;
      expect(stockAfterSecond).toBe(stockAfterFirst);
    });
  });

  describe('3. Validation Failures & Error Handling', () => {
    it('POST /api/v1/orders - should reject empty items array', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        items: [],
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Cannot place an empty order');
    });

    it('POST /api/v1/orders - should reject invalid phone number format', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        items: [{ productId: '60d5ec49f1b2c82d22222221', quantity: 1 }],
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay',
        customerPhone: '12345', // Invalid
        paymentMethod: 'COD',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid Indian mobile number');
    });

    it('POST /api/v1/orders - should reject unserviceable delivery PIN code', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        items: [{ productId: '60d5ec49f1b2c82d22222221', quantity: 1 }],
        fulfillmentMethod: 'DELIVERY',
        customerName: 'Abhay',
        customerPhone: '9876543210',
        deliveryAddress: {
          houseNumber: '1',
          street: 'Street',
          city: 'City',
          state: 'State',
          pincode: '999999', // Unserviceable
        },
        paymentMethod: 'COD',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('not available for PIN 999999');
    });

    it('POST /api/v1/orders - should reject missing delivery address when fulfillment is DELIVERY', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        items: [{ productId: '60d5ec49f1b2c82d22222221', quantity: 1 }],
        fulfillmentMethod: 'DELIVERY',
        customerName: 'Abhay',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Delivery address is required');
    });

    it('POST /api/v1/orders - should reject out of stock products', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        items: [{ productId: '60d5ec49f1b2c82d22222223', quantity: 1 }],
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Insufficient stock');
    });

    it('POST /api/v1/orders - should reject unpublished products', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        items: [{ productId: '60d5ec49f1b2c82d22222224', quantity: 1 }],
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('not available for purchase');
    });

    it('POST /api/v1/orders - should reject requested quantity exceeding available stock', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        items: [{ productId: '60d5ec49f1b2c82d22222222', quantity: 50 }], // Only 5 available
        fulfillmentMethod: 'PICKUP',
        customerName: 'Abhay',
        customerPhone: '9876543210',
        paymentMethod: 'COD',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Insufficient stock for "Amul Pure Cow Ghee 1L"');
    });
  });

  describe('4. Order Retrieval & Object-Level Security', () => {
    it('GET /api/v1/orders/:idOrNumber - should allow customer to view their own order', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-7771',
        customerId: new mongoose.Types.ObjectId(customerId),
        customerName: 'Valued Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        items: [
          {
            productId: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
            name: 'Aashirvaad Atta',
            sellingPrice: 265,
            mrp: 295,
            quantity: 1,
            unit: 'kg',
            lineSubtotal: 265,
          },
        ],
        subtotal: 265,
        deliveryFee: 0,
        totalAmount: 265,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
      });

      const res = await request(app)
        .get(`/api/v1/orders/${order.orderNumber}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('KGS-202610-7771');
    });

    it('GET /api/v1/orders/:idOrNumber - should prevent other customers from accessing private order (403 Forbidden)', async () => {
      const order = await Order.create({
        orderNumber: 'KGS-202610-7772',
        customerId: new mongoose.Types.ObjectId(customerId),
        customerName: 'Valued Customer',
        customerPhone: '9876543210',
        fulfillmentMethod: 'PICKUP',
        items: [
          {
            productId: new mongoose.Types.ObjectId('60d5ec49f1b2c82d22222221'),
            name: 'Aashirvaad Atta',
            sellingPrice: 265,
            mrp: 295,
            quantity: 1,
            unit: 'kg',
            lineSubtotal: 265,
          },
        ],
        subtotal: 265,
        deliveryFee: 0,
        totalAmount: 265,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
      });

      const res = await request(app)
        .get(`/api/v1/orders/${order.orderNumber}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized to view this order');
    });

    it('GET /api/v1/orders - should list order history for authenticated customer', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('5. Customer Saved Address Management', () => {
    it('POST /api/v1/addresses - should save address for authenticated customer', async () => {
      const payload = {
        name: 'Abhay Kushwaha',
        phone: '9876543210',
        houseNumber: 'House 42',
        street: 'Main Bazar',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        isDefault: true,
      };

      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Abhay Kushwaha');
      expect(res.body.data.pincode).toBe('110001');
    });

    it('POST /api/v1/addresses - should reject invalid phone number', async () => {
      const payload = {
        name: 'Abhay',
        phone: '1234',
        houseNumber: '42',
        street: 'Main Bazar',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      };

      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid Indian mobile number');
    });

    it('GET /api/v1/addresses - should retrieve customer saved addresses', async () => {
      const res = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
