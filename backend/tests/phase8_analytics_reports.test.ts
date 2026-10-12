import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Order } from '../src/models/order.model';
import { Product } from '../src/models/product.model';
import { User } from '../src/models/user.model';
import { StoreSettings } from '../src/models/storeSettings.model';
import { StockMovement } from '../src/models/stockMovement.model';
import { sanitizeCsvCell, generateCsv } from '../src/utils/csvExport';
import { calculateDateRange } from '../src/utils/dateRange';

import { UnauthorizedError, ForbiddenError } from '../src/utils/errors';

// Mock auth middleware for testing admin vs customer roles
vi.mock('../src/middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next(new UnauthorizedError('Authentication token required in Authorization header.'));
    }
    if (authHeader === 'Bearer admin-token') {
      req.user = { uid: 'admin-uid', email: 'kanhaiyaastore@gmail.com', role: 'ADMIN' };
      return next();
    }
    if (authHeader === 'Bearer customer-token') {
      req.user = { uid: 'customer-uid', email: 'customer@gmail.com', role: 'CUSTOMER' };
      return next();
    }
    return next(new UnauthorizedError('Invalid or expired Firebase ID token.'));
  },
  optionalAuthenticate: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../src/middleware/authorize-admin', () => ({
  authorizeAdmin: (req: any, _res: any, next: any) => {
    if (req.user?.role === 'ADMIN' || req.user?.email === 'kanhaiyaastore@gmail.com') {
      return next();
    }
    return next(new ForbiddenError('Access denied. Administrator privileges required.'));
  },
}));

describe('Phase 8: Analytics, Reports, Customer Management & Settings Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Security & Role Authorization', () => {
    it('GET /api/v1/admin/analytics/overview - should reject unauthenticated requests (401)', async () => {
      const res = await request(app).get('/api/v1/admin/analytics/overview');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/admin/analytics/overview - should reject normal customer token (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', 'Bearer customer-token');
      expect(res.status).toBe(403);
    });

    it('GET /api/v1/admin/settings - should reject non-admin access (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', 'Bearer customer-token');
      expect(res.status).toBe(403);
    });
  });

  describe('2. Business Analytics Overview & Exclusion Rules', () => {
    it('GET /api/v1/admin/analytics/overview - should compute correct gross value and exclude cancelled orders', async () => {
      const mockOrders = [
        {
          orderNumber: 'KGS-202610-0001',
          totalAmount: 500,
          paymentStatus: 'PAID',
          orderStatus: 'COMPLETED',
          createdAt: new Date(),
        },
        {
          orderNumber: 'KGS-202610-0002',
          totalAmount: 300,
          paymentStatus: 'PENDING',
          orderStatus: 'PLACED',
          createdAt: new Date(),
        },
        {
          orderNumber: 'KGS-202610-0003',
          totalAmount: 1000,
          paymentStatus: 'PENDING',
          orderStatus: 'CANCELLED', // Cancelled order must be excluded from gross sales
          createdAt: new Date(),
        },
      ];

      vi.spyOn(Order, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockOrders),
      } as any);

      vi.spyOn(Order, 'countDocuments').mockResolvedValue(2 as any);
      vi.spyOn(Product, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { stockQuantity: 20, lowStockThreshold: 5 },
          { stockQuantity: 2, lowStockThreshold: 5 }, // Low stock
          { stockQuantity: 0, lowStockThreshold: 5 }, // Out of stock
        ]),
      } as any);
      vi.spyOn(User, 'countDocuments').mockResolvedValue(12 as any);

      const res = await request(app)
        .get('/api/v1/admin/analytics/overview?range=last30days')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalOrders).toBe(3);
      expect(res.body.data.completedOrders).toBe(1);
      expect(res.body.data.cancelledOrders).toBe(1);
      // Gross value = 500 + 300 = 800 (1000 cancelled order excluded)
      expect(res.body.data.grossOrderValue).toBe(800);
      // Verified payments = 500 (PAID only)
      expect(res.body.data.verifiedPayments).toBe(500);
      // Pending payments = 300 (PLACED & PENDING only)
      expect(res.body.data.pendingPayments).toBe(300);
      expect(res.body.data.lowStockCount).toBe(1);
      expect(res.body.data.outOfStockCount).toBe(1);
      expect(res.body.data.totalActiveProducts).toBe(3);
      expect(res.body.data.totalCustomers).toBe(12);
    });
  });

  describe('3. Sales & Revenue Analytics', () => {
    it('GET /api/v1/admin/analytics/sales - should provide payment method & fulfillment breakdowns', async () => {
      const mockOrders = [
        {
          totalAmount: 400,
          paymentMethod: 'COD',
          fulfillmentMethod: 'DELIVERY',
          paymentStatus: 'PAID',
          orderStatus: 'COMPLETED',
          createdAt: new Date('2026-10-10T10:00:00Z'),
        },
        {
          totalAmount: 600,
          paymentMethod: 'WHATSAPP_QR',
          fulfillmentMethod: 'PICKUP',
          paymentStatus: 'PENDING',
          orderStatus: 'CONFIRMED',
          createdAt: new Date('2026-10-10T11:00:00Z'),
        },
      ];

      vi.spyOn(Order, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockOrders),
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/analytics/sales?range=last7days')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.grossOrderValue).toBe(1000);
      expect(res.body.data.averageOrderValue).toBe(500);
      expect(res.body.data.verifiedPayments).toBe(400);
      expect(res.body.data.pendingPayments).toBe(600);
      expect(res.body.data.paymentMethods.COD.count).toBe(1);
      expect(res.body.data.paymentMethods.COD.amount).toBe(400);
      expect(res.body.data.paymentMethods.WHATSAPP_QR.count).toBe(1);
      expect(res.body.data.paymentMethods.WHATSAPP_QR.amount).toBe(600);
      expect(res.body.data.fulfillmentMethods.DELIVERY.amount).toBe(400);
      expect(res.body.data.fulfillmentMethods.PICKUP.amount).toBe(600);
      expect(res.body.data.timeline.length).toBe(1);
    });
  });

  describe('4. Product Performance & Inventory Reports', () => {
    it('GET /api/v1/admin/reports/products - should aggregate quantity sold and detect zero-sales items', async () => {
      const mockOrders = [
        {
          orderStatus: 'COMPLETED',
          items: [
            {
              productId: 'prod-1',
              name: 'Aashirvaad Atta',
              brand: 'Aashirvaad',
              quantity: 3,
              lineSubtotal: 750,
            },
          ],
        },
      ];

      const mockProducts = [
        {
          _id: 'prod-1',
          name: 'Aashirvaad Atta',
          brand: 'Aashirvaad',
          categoryId: { name: 'Flours' },
          stockQuantity: 15,
          lowStockThreshold: 5,
          sellingPrice: 250,
        },
        {
          _id: 'prod-2',
          name: 'Tata Salt',
          brand: 'Tata',
          categoryId: { name: 'Spices & Salt' },
          stockQuantity: 50,
          lowStockThreshold: 10,
          sellingPrice: 28,
        },
      ];

      vi.spyOn(Order, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockOrders),
      } as any);

      vi.spyOn(Product, 'find').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockProducts),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/reports/products')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      expect(res.body.data.products[0].name).toBe('Aashirvaad Atta');
      expect(res.body.data.products[0].quantitySold).toBe(3);
      expect(res.body.data.zeroSalesCount).toBe(1); // Tata Salt has 0 sales
    });

    it('GET /api/v1/admin/reports/inventory - should compute replenishment suggestions and expiry alerts', async () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const mockProducts = [
        {
          _id: 'prod-low',
          name: 'Amul Butter 500g',
          categoryId: { name: 'Dairy' },
          stockQuantity: 2,
          lowStockThreshold: 5,
          expiryDate: pastDate, // Expired
        },
      ];

      vi.spyOn(Product, 'find').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockProducts),
        }),
      } as any);

      vi.spyOn(StockMovement, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { adjustmentType: 'PURCHASE_RECEIPT', changeQuantity: 20 },
        ]),
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/reports/inventory')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.summary.lowStockCount).toBe(1);
      expect(res.body.data.replenishmentSuggestions.length).toBe(1);
      expect(res.body.data.replenishmentSuggestions[0].suggestedReorder).toBe(10);
      expect(res.body.data.expiryList.length).toBe(1);
      expect(res.body.data.expiryList[0].status).toBe('EXPIRED');
    });
  });

  describe('5. Customer Management', () => {
    it('GET /api/v1/admin/customers - should list registered and guest customers with total spend', async () => {
      const mockUsers = [
        {
          _id: 'user-1',
          displayName: 'Ravi Sharma',
          email: 'ravi@example.com',
          role: 'CUSTOMER',
          createdAt: new Date('2026-09-01'),
        },
      ];

      const mockOrders = [
        {
          customerId: 'user-1',
          customerPhone: '9876543210',
          totalAmount: 1200,
          createdAt: new Date('2026-10-05'),
        },
        {
          customerId: null, // Guest order
          customerName: 'Guest Buyer',
          customerPhone: '9811223344',
          totalAmount: 450,
          createdAt: new Date('2026-10-06'),
        },
      ];

      vi.spyOn(User, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockUsers),
      } as any);

      vi.spyOn(Order, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockOrders),
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.customers.length).toBe(2);
      expect(res.body.data.customers[0].name).toBe('Ravi Sharma');
      expect(res.body.data.customers[0].totalSpend).toBe(1200);
      expect(res.body.data.customers[0].isRegistered).toBe(true);

      expect(res.body.data.customers[1].isRegistered).toBe(false);
      expect(res.body.data.customers[1].phone).toBe('9811223344');
      expect(res.body.data.customers[1].totalSpend).toBe(450);
    });
  });

  describe('6. Store Settings Administration', () => {
    it('GET /api/v1/admin/settings - should fetch full store settings', async () => {
      const mockSettings = {
        storeName: 'Kanhaiya General Store',
        storePhone: '9876543210',
        minOrderValue: 100,
        standardDeliveryFee: 30,
        isDeliveryEnabled: true,
        invoicePrefix: 'INV',
      };

      vi.spyOn(StoreSettings, 'findOne').mockResolvedValue(mockSettings as any);

      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.storeName).toBe('Kanhaiya General Store');
      expect(res.body.data.invoicePrefix).toBe('INV');
    });

    it('PATCH /api/v1/admin/settings - should update store settings with admin auth', async () => {
      const mockSettingsDoc = {
        storeName: 'Kanhaiya General Store',
        standardDeliveryFee: 30,
        invoicePrefix: 'INV',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(StoreSettings, 'findOne').mockResolvedValue(mockSettingsDoc as any);

      const res = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', 'Bearer admin-token')
        .send({
          standardDeliveryFee: 35,
          invoicePrefix: 'KGS-INV',
        });

      expect(res.status).toBe(200);
      expect(mockSettingsDoc.standardDeliveryFee).toBe(35);
      expect(mockSettingsDoc.invoicePrefix).toBe('KGS-INV');
      expect(mockSettingsDoc.save).toHaveBeenCalled();
    });
  });

  describe('7. CSV Export & Formula Injection Security', () => {
    it('sanitizeCsvCell - should prepend single quote for formula injection characters (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
      expect(sanitizeCsvCell('-50')).toBe("'-50");
      expect(sanitizeCsvCell('@test')).toBe("'@test");
      expect(sanitizeCsvCell('Safe Text')).toBe('Safe Text');
      expect(sanitizeCsvCell('Text with, comma')).toBe('"Text with, comma"');
    });

    it('generateCsv - should generate CSV with UTF-8 BOM', () => {
      const csv = generateCsv(['Name', 'Formula'], [['Item 1', '=1+1']]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain("'=1+1");
    });

    it('GET /api/v1/admin/reports/export/sales - should download CSV with text/csv header', async () => {
      vi.spyOn(Order, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            totalAmount: 500,
            paymentStatus: 'PAID',
            orderStatus: 'COMPLETED',
            createdAt: new Date('2026-10-12'),
          },
        ]),
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/reports/export/sales?range=today')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Gross Order Value (INR)');
    });
  });

  describe('8. Date Range & Timezone Boundaries', () => {
    it('calculateDateRange - should handle preset ranges in IST timezone', () => {
      const ref = new Date('2026-10-12T12:00:00Z');
      const today = calculateDateRange('today', undefined, undefined, ref);
      expect(today.label).toBe('Today');
      expect(today.startDate).toBeInstanceOf(Date);
      expect(today.endDate).toBeInstanceOf(Date);
      expect(today.startDate.getTime()).toBeLessThan(today.endDate.getTime());

      const last7 = calculateDateRange('last7days', undefined, undefined, ref);
      expect(last7.label).toBe('Last 7 Days');
      const diffDays = Math.round((last7.endDate.getTime() - last7.startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });
  });
});
