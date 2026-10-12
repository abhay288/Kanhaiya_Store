import {
  Category,
  Product,
  Order,
  ProductFilterParams,
  PaginatedProducts,
  CollectionsData,
  ValidatedCartResponse,
  StorePublicSettings,
  ServiceabilityResult,
  CustomerAddress,
  CreateOrderPayload,
  OrderConfirmation,
} from '../types';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_ORDERS } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export class ProductRepository {
  private useMockOnly: boolean = false;

  constructor() {
    this.useMockOnly = import.meta.env.VITE_USE_MOCK_ONLY === 'true';
  }

  private mapProduct(p: any): Product {
    return {
      id: p.id || p._id,
      name: p.name,
      slug: p.slug,
      categoryId: p.categoryId?._id || p.categoryId,
      categoryName: p.categoryName || p.categoryId?.name || 'General',
      subcategoryId: p.subcategoryId?._id || p.subcategoryId || null,
      subcategoryName: p.subcategoryName || p.subcategoryId?.name,
      brand: p.brand || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      unit: p.unit || 'piece',
      packSize: p.packSize || '',
      mrp: p.mrp || 0,
      sellingPrice: p.sellingPrice,
      discountPercentage: p.discountPercentage || 0,
      stockQuantity: p.stockQuantity ?? 0,
      lowStockThreshold: p.lowStockThreshold ?? 5,
      isAvailable: p.isAvailable ?? true,
      isPublished: p.isPublished ?? true,
      isFeatured: p.isFeatured ?? false,
      isNewArrival: p.isNewArrival ?? false,
      isBestseller: p.isBestseller ?? false,
      inStock: p.inStock ?? (p.stockQuantity > 0 && p.isAvailable !== false),
      isLowStock: p.isLowStock ?? false,
      imageUrl: p.imageUrl || (p.images && p.images[0] ? p.images[0].url : ''),
      images: p.images || [],
      tags: p.tags || [],
      description: p.description || '',
    };
  }

  async getCategories(): Promise<Category[]> {
    if (this.useMockOnly) {
      await new Promise((r) => setTimeout(r, 150));
      return MOCK_CATEGORIES;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((item: any) => ({
          id: item.id || item._id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          icon: item.icon || '🌾',
          imageUrl: item.imageUrl,
          imagePublicId: item.imagePublicId,
          displayOrder: item.displayOrder,
          isActive: item.isActive,
          parentId: item.parentId,
          itemCount: item.productCount ?? item.itemCount ?? 0,
        }));
      }
      return MOCK_CATEGORIES;
    } catch (_err) {
      return MOCK_CATEGORIES;
    }
  }

  async getCollections(): Promise<CollectionsData> {
    if (this.useMockOnly) {
      return {
        featured: MOCK_PRODUCTS.filter((p) => p.isFeatured),
        newArrivals: MOCK_PRODUCTS.filter((p) => p.isNewArrival),
        bestsellers: MOCK_PRODUCTS.filter((p) => p.isBestseller),
        essentials: MOCK_PRODUCTS.slice(0, 8),
      };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/products/collections`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.data) {
        return {
          featured: (json.data.featured || []).map((p: any) => this.mapProduct(p)),
          newArrivals: (json.data.newArrivals || []).map((p: any) => this.mapProduct(p)),
          bestsellers: (json.data.bestsellers || []).map((p: any) => this.mapProduct(p)),
          essentials: (json.data.essentials || []).map((p: any) => this.mapProduct(p)),
        };
      }
    } catch (_err) {
      // Fallback
    }

    return {
      featured: MOCK_PRODUCTS.filter((p) => p.isFeatured),
      newArrivals: MOCK_PRODUCTS.filter((p) => p.isNewArrival),
      bestsellers: MOCK_PRODUCTS.filter((p) => p.isBestseller),
      essentials: MOCK_PRODUCTS.slice(0, 8),
    };
  }

  async getRelatedProducts(productId: string): Promise<Product[]> {
    if (this.useMockOnly) {
      return MOCK_PRODUCTS.filter((p) => p.id !== productId).slice(0, 4);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}/related`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          return json.data.map((p: any) => this.mapProduct(p));
        }
      }
    } catch (_err) {
      // Fallback
    }

    return MOCK_PRODUCTS.filter((p) => p.id !== productId).slice(0, 4);
  }

  async getProducts(params?: ProductFilterParams | string, legacySearch?: string): Promise<Product[]> {
    const filter: ProductFilterParams =
      typeof params === 'string'
        ? { categoryId: params, search: legacySearch }
        : params || {};

    const paginated = await this.getPaginatedProducts(filter);
    return paginated.items;
  }

  async getPaginatedProducts(filter: ProductFilterParams): Promise<PaginatedProducts> {
    if (this.useMockOnly) {
      await new Promise((r) => setTimeout(r, 150));
      let items = [...MOCK_PRODUCTS];
      if (filter.categoryId) items = items.filter((p) => p.categoryId === filter.categoryId);
      if (filter.search) {
        const q = filter.search.toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.categoryName.toLowerCase().includes(q) ||
            (p.brand && p.brand.toLowerCase().includes(q))
        );
      }
      if (filter.brand) {
        items = items.filter((p) => p.brand?.toLowerCase().includes(filter.brand!.toLowerCase()));
      }
      if (filter.inStock) {
        items = items.filter((p) => p.inStock);
      }
      if (filter.minPrice !== undefined) items = items.filter((p) => p.sellingPrice >= filter.minPrice!);
      if (filter.maxPrice !== undefined) items = items.filter((p) => p.sellingPrice <= filter.maxPrice!);

      if (filter.sort === 'price_asc') items.sort((a, b) => a.sellingPrice - b.sellingPrice);
      if (filter.sort === 'price_desc') items.sort((a, b) => b.sellingPrice - a.sellingPrice);
      if (filter.sort === 'name_asc') items.sort((a, b) => a.name.localeCompare(b.name));

      return {
        items,
        total: items.length,
        page: 1,
        limit: items.length,
        totalPages: 1,
      };
    }

    try {
      const q = new URLSearchParams();
      if (filter.categoryId) q.append('categoryId', filter.categoryId);
      if (filter.subcategoryId) q.append('subcategoryId', filter.subcategoryId);
      if (filter.search) q.append('search', filter.search);
      if (filter.brand) q.append('brand', filter.brand);
      if (filter.minPrice !== undefined) q.append('minPrice', filter.minPrice.toString());
      if (filter.maxPrice !== undefined) q.append('maxPrice', filter.maxPrice.toString());
      if (filter.inStock) q.append('inStock', 'true');
      if (filter.sort) q.append('sort', filter.sort);
      if (filter.page) q.append('page', filter.page.toString());
      if (filter.limit) q.append('limit', filter.limit.toString());

      const res = await fetch(`${API_BASE_URL}/products?${q.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();

      if (json.data && Array.isArray(json.data.items)) {
        return {
          items: json.data.items.map((p: any) => this.mapProduct(p)),
          total: json.data.total ?? json.data.items.length,
          page: json.data.page ?? 1,
          limit: json.data.limit ?? 20,
          totalPages: json.data.totalPages ?? 1,
        };
      }
    } catch (_err) {
      // Fallback to local filtering
    }

    let items = [...MOCK_PRODUCTS];
    if (filter.categoryId) items = items.filter((p) => p.categoryId === filter.categoryId);
    if (filter.search) {
      const term = filter.search.toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(term) || p.categoryName.toLowerCase().includes(term)
      );
    }
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length,
      totalPages: 1,
    };
  }

  async getProductById(id: string): Promise<Product | undefined> {
    if (this.useMockOnly) {
      await new Promise((r) => setTimeout(r, 100));
      return MOCK_PRODUCTS.find((p) => p.id === id);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.data) {
        return this.mapProduct(json.data);
      }
    } catch (_err) {
      // fallback
    }

    return MOCK_PRODUCTS.find((p) => p.id === id);
  }

  async validateCart(items: Array<{ productId: string; quantity: number }>): Promise<ValidatedCartResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/cart/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          return json.data;
        }
      }
    } catch (_err) {
      // Offline / fallback calculation
    }

    // Client-side fallback
    const enriched = items.map((i) => {
      const prod = MOCK_PRODUCTS.find((p) => p.id === i.productId);
      const price = prod?.sellingPrice ?? 0;
      const mrp = prod?.mrp ?? price;
      return {
        productId: i.productId,
        name: prod?.name || 'Kirana Product',
        brand: prod?.brand || '',
        imageUrl: prod?.imageUrl || '',
        unit: prod?.unit || 'piece',
        packSize: prod?.packSize || '',
        sellingPrice: price,
        mrp,
        requestedQuantity: i.quantity,
        validQuantity: i.quantity,
        availableStock: prod?.stockQuantity ?? 10,
        lineSubtotal: price * i.quantity,
        lineMrpTotal: mrp * i.quantity,
        status: 'valid' as const,
      };
    });

    const subtotal = enriched.reduce((s, i) => s + i.lineSubtotal, 0);
    const totalMrp = enriched.reduce((s, i) => s + i.lineMrpTotal, 0);
    const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 30;

    return {
      isValid: true,
      hasAdjustments: false,
      items: enriched,
      subtotal,
      totalMrp,
      savings: totalMrp > subtotal ? totalMrp - subtotal : 0,
      deliveryFee,
      totalToPay: subtotal + deliveryFee,
      itemCount: enriched.reduce((s, i) => s + i.validQuantity, 0),
    };
  }

  async syncCart(token: string, items: Array<{ productId: string; quantity: number }>): Promise<ValidatedCartResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/cart`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (_err) {
      // error handled gracefully
    }
    return null;
  }

  async getOrders(): Promise<Order[]> {
    if (this.useMockOnly) {
      await new Promise((r) => setTimeout(r, 150));
      return MOCK_ORDERS;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();
      return json.data;
    } catch (_err) {
      return MOCK_ORDERS;
    }
  }

  async getStoreSettings(): Promise<StorePublicSettings> {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/public`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch (_err) {
      // Fallback
    }

    return {
      storeName: 'Kanhaiya General Store',
      phone: '9936269347',
      whatsappNumber: '9936269347',
      upiId: 'kanhaiyastore@upi',
      storeAddress: 'Fatehpur Roshnai, Kanpur D. UP',
      pickupInstructions: 'Orders are packed and kept ready at the store counter. Please share your Order Number when collecting.',
      isDeliveryEnabled: true,
      serviceablePincodes: ['209304', '209305', '208001', '208002'],
      minOrderValue: 100,
      standardDeliveryFee: 30,
      freeDeliveryThreshold: 500,
      estimatedDeliveryWindow: 'Same-day delivery within 2-4 hours',
      isWhatsappQrEnabled: true,
      currency: 'INR',
      currencySymbol: '₹',
    };
  }

  async checkServiceability(pincode: string, subtotal: number = 0): Promise<ServiceabilityResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/check-serviceability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode, subtotal }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch (_err) {
      // Fallback local check
    }

    const cleanPin = pincode.trim();
    const isServiceable = ['110001', '110002', '110003', '110006', '110084'].includes(cleanPin);
    return {
      serviceable: isServiceable,
      pincode: cleanPin,
      isDeliveryEnabled: true,
      estimatedDeliveryWindow: isServiceable ? 'Same-day delivery within 2-4 hours' : 'Not Serviceable',
      deliveryFee: subtotal >= 500 ? 0 : 30,
      freeDeliveryThreshold: 500,
      minOrderValue: 100,
      message: isServiceable
        ? 'Delivery is available in your area.'
        : `Delivery is currently not available for PIN ${cleanPin}. You can choose In-Store Pickup.`,
    };
  }

  async getAddresses(token?: string): Promise<CustomerAddress[]> {
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        return (json.data || []).map((a: any) => ({
          id: a._id || a.id,
          name: a.name,
          phone: a.phone,
          houseNumber: a.houseNumber,
          street: a.street,
          landmark: a.landmark,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          deliveryInstructions: a.deliveryInstructions,
          isDefault: a.isDefault,
        }));
      }
    } catch (_err) {
      // Graceful fallback
    }
    return [];
  }

  async createAddress(token: string, address: Omit<CustomerAddress, 'id'>): Promise<CustomerAddress> {
    const res = await fetch(`${API_BASE_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(address),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'Failed to save address');
    }

    const d = json.data;
    return {
      id: d._id || d.id,
      name: d.name,
      phone: d.phone,
      houseNumber: d.houseNumber,
      street: d.street,
      landmark: d.landmark,
      city: d.city,
      state: d.state,
      pincode: d.pincode,
      deliveryInstructions: d.deliveryInstructions,
      isDefault: d.isDefault,
    };
  }

  async deleteAddress(token: string, addressId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async createOrder(payload: CreateOrderPayload, token?: string): Promise<OrderConfirmation> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'Failed to place order');
    }

    return json.data;
  }

  async getOrder(idOrNumber: string, token?: string): Promise<OrderConfirmation> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/orders/${idOrNumber}`, {
      headers,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'Failed to load order');
    }

    return json.data;
  }

  async getOrderTracking(idOrNumber: string, token?: string, guestTokenOrPhone?: string): Promise<any> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (guestTokenOrPhone) headers['x-guest-token'] = guestTokenOrPhone;

    const res = await fetch(`${API_BASE_URL}/orders/${idOrNumber}/track`, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || json.message || 'Failed to fetch tracking');
    return json.data;
  }

  generateInvoiceReceiptBlob(idOrNumber: string): Blob {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${idOrNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; max-width: 650px; margin: 0 auto; background: #fff; }
    .header { background: #174D3A; color: white; padding: 18px 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; letter-spacing: 0.5px; }
    .header p { margin: 0; font-size: 11px; color: #e2e8f0; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #dcfce7; color: #166534; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; font-size: 12px; }
    td { padding: 9px 8px; border-bottom: 1px solid #f1f5f9; }
    .total-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-left: auto; width: 220px; font-size: 12px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .grand-total { font-weight: bold; font-size: 14px; color: #174D3A; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 4px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>KANHAIYA GENERAL STORE</h1>
    <p>Fatehpur Roshnai, Kanpur D. UP | Phone/WhatsApp: 9936269347 | Email: kanhaiyaastore@gmail.com</p>
  </div>
  <div class="meta">
    <div>
      <div><strong>Order No:</strong> ${idOrNumber}</div>
      <div><strong>Invoice Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <div style="margin-top: 4px;"><strong>Status:</strong> <span class="badge">RETAIL INVOICE</span></div>
    </div>
    <div style="text-align: right;">
      <div><strong>Store Location:</strong> Fatehpur Roshnai, Kanpur D. UP</div>
      <div><strong>Helpline:</strong> +91 9936269347</div>
      <div><strong>Support:</strong> kanhaiyaastore@gmail.com</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th style="text-align: right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Daily Essentials & Groceries (Order #${idOrNumber})</td>
        <td>1</td>
        <td>Authoritative Order</td>
        <td style="text-align: right;">Official Receipt</td>
      </tr>
    </tbody>
  </table>
  <div class="total-box">
    <div class="total-row"><span>Fulfillment:</span><span>In-Store Pickup</span></div>
    <div class="total-row"><span>Delivery Fee:</span><span>Rs. 0.00</span></div>
    <div class="total-row grand-total"><span>Order Total:</span><span>Verified</span></div>
  </div>
  <div class="footer">
    <p>Official Retail Invoice • Kanhaiya General Store • Daily Groceries & Essentials at Wholesale Rates</p>
    <p>For assistance contact 9936269347 or email kanhaiyaastore@gmail.com</p>
  </div>
</body>
</html>`;
    return new Blob([html], { type: 'text/html' });
  }

  async downloadInvoice(idOrNumber: string, token?: string, guestTokenOrPhone?: string): Promise<Blob> {
    if (this.useMockOnly) {
      return this.generateInvoiceReceiptBlob(idOrNumber);
    }

    const headers: Record<string, string> = { Accept: 'application/pdf' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (guestTokenOrPhone) headers['x-guest-token'] = guestTokenOrPhone;

    try {
      const res = await fetch(`${API_BASE_URL}/orders/${idOrNumber}/invoice`, { headers });
      if (!res.ok) {
        return this.generateInvoiceReceiptBlob(idOrNumber);
      }
      return await res.blob();
    } catch {
      return this.generateInvoiceReceiptBlob(idOrNumber);
    }
  }
}

export const repository = new ProductRepository();

