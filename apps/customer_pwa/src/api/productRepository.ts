import { Category, Product, Order } from '../types';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_ORDERS } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export class ProductRepository {
  private useMock: boolean = true;

  constructor() {
    // If running in development without production endpoint, use clearly separated mock repository
    this.useMock = true;
  }

  async getCategories(): Promise<Category[]> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 150));
      return MOCK_CATEGORIES;
    }
    const res = await fetch(`${API_BASE_URL}/categories`);
    const json = await res.json();
    return json.data;
  }

  async getProducts(categoryId?: string, search?: string): Promise<Product[]> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 200));
      let items = [...MOCK_PRODUCTS];
      if (categoryId) {
        items = items.filter((p) => p.categoryId === categoryId);
      }
      if (search) {
        const query = search.toLowerCase();
        items = items.filter(
          (p) => p.name.toLowerCase().includes(query) || p.categoryName.toLowerCase().includes(query)
        );
      }
      return items;
    }
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
    const json = await res.json();
    return json.data.items;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 100));
      return MOCK_PRODUCTS.find((p) => p.id === id);
    }
    const res = await fetch(`${API_BASE_URL}/products/${id}`);
    const json = await res.json();
    return json.data;
  }

  async getOrders(): Promise<Order[]> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 150));
      return MOCK_ORDERS;
    }
    const res = await fetch(`${API_BASE_URL}/orders`);
    const json = await res.json();
    return json.data;
  }
}

export const repository = new ProductRepository();
