export interface ProductImage {
  url: string;
  publicId: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  imagePublicId?: string;
  displayOrder?: number;
  isActive?: boolean;
  parentId?: string | null;
  itemCount: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string | null;
  subcategoryName?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  packSize?: string;
  mrp: number;
  sellingPrice: number;
  discountPercentage?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  isAvailable: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestseller?: boolean;
  inStock?: boolean;
  isLowStock?: boolean;
  imageUrl: string;
  images?: ProductImage[];
  tags?: string[];
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ProductFilterParams {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CollectionsData {
  featured: Product[];
  newArrivals: Product[];
  bestsellers: Product[];
  essentials: Product[];
}

export interface ValidatedCartItem {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  unit: string;
  packSize: string;
  sellingPrice: number;
  mrp: number;
  requestedQuantity: number;
  validQuantity: number;
  availableStock: number;
  lineSubtotal: number;
  lineMrpTotal: number;
  status: 'valid' | 'adjusted' | 'out_of_stock' | 'unavailable';
  message?: string;
}

export interface ValidatedCartResponse {
  isValid: boolean;
  hasAdjustments: boolean;
  items: ValidatedCartItem[];
  subtotal: number;
  totalMrp: number;
  savings: number;
  deliveryFee: number;
  totalToPay: number;
  itemCount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: Array<{
    name: string;
    unit: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  status: 'placed' | 'confirmed' | 'packed' | 'ready_for_pickup' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentMethod: 'COD' | 'WhatsApp QR';
  date: string;
}

export interface CustomerAddress {
  id: string;
  name: string;
  phone: string;
  houseNumber: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface StorePublicSettings {
  storeName: string;
  phone: string;
  whatsappNumber: string;
  upiId?: string;
  storeAddress: string;
  pickupInstructions: string;
  isDeliveryEnabled: boolean;
  serviceablePincodes: string[];
  minOrderValue: number;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryWindow: string;
  isWhatsappQrEnabled: boolean;
  currency: string;
  currencySymbol: string;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  pincode: string;
  isDeliveryEnabled: boolean;
  estimatedDeliveryWindow: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderValue: number;
  message: string;
}

export interface CreateOrderPayload {
  items: Array<{ productId: string; quantity: number }>;
  fulfillmentMethod: 'DELIVERY' | 'PICKUP';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: {
    houseNumber: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    deliveryInstructions?: string;
  };
  paymentMethod: 'COD' | 'WHATSAPP_QR';
  customerNotes?: string;
  idempotencyKey?: string;
}

export interface OrderConfirmation {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfillmentMethod: 'DELIVERY' | 'PICKUP';
  deliveryAddress?: {
    name: string;
    phone: string;
    houseNumber: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    deliveryInstructions?: string;
  };
  pickupDetails?: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    pickupInstructions: string;
  };
  items: Array<{
    productId: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    unit: string;
    packSize?: string;
    sellingPrice: number;
    mrp: number;
    quantity: number;
    lineSubtotal: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'COD' | 'WHATSAPP_QR';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  orderStatus: 'PLACED' | 'CONFIRMED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'PICKED_UP' | 'CANCELLED';
  customerNotes?: string;
  whatsappPaymentUrl?: string;
  createdAt: string;
}

