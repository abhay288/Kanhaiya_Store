export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  itemCount: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  mrp: number;
  sellingPrice: number;
  stockQuantity: number;
  isAvailable: boolean;
  imageUrl: string;
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
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
  status: 'placed' | 'confirmed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentMethod: 'COD' | 'WhatsApp QR';
  date: string;
}
