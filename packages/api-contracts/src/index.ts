export type UserRole = 'customer' | 'admin' | 'store_manager';

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  displayOrder: number;
}

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName?: string;
  description?: string;
  unit: string;
  mrp: number;
  sellingPrice: number;
  stockQuantity: number;
  isAvailable: boolean;
  images: Array<{
    url: string;
    isPrimary: boolean;
  }>;
}

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'whatsapp_qr';
export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'collected';

export interface OrderItemDto {
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItemDto[];
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
