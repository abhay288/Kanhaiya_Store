export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

export interface AuthResponseData {
  user: UserProfile;
  token: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('kanhaiya_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('kanhaiya_auth_token', token);
    } else {
      localStorage.removeItem('kanhaiya_auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  async healthCheck(): Promise<ApiResponse<{ status: string; uptime: number; database: string }>> {
    return this.request('/health');
  }

  async authWithGoogle(idToken: string): Promise<ApiResponse<AuthResponseData>> {
    const res = await this.request<AuthResponseData>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async quickLogin(phone: string, displayName?: string, email?: string): Promise<ApiResponse<AuthResponseData>> {
    const res = await this.request<AuthResponseData>('/auth/quick-login', {
      method: 'POST',
      body: JSON.stringify({ phone, displayName, email }),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async updateProfile(data: { displayName?: string; phoneNumber?: string }): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<ApiResponse<{ user: UserProfile }>> {
    return this.request('/auth/me');
  }

  async logout(): Promise<ApiResponse<null>> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
    return {
      success: true,
      message: 'Logged out',
      data: null,
      timestamp: new Date().toISOString(),
    };
  }

  async getAdminTest(): Promise<ApiResponse<{ message: string; adminUser: UserProfile }>> {
    return this.request('/admin/test');
  }

  async getAdminOrders(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<{ items: any[]; total: number; page: number; limit: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return this.request(`/orders/admin${qs ? `?${qs}` : ''}`);
  }

  async getAdminMetrics(): Promise<ApiResponse<any>> {
    return this.request('/orders/admin/metrics');
  }

  async updateOrderStatus(idOrNumber: string, status: string, notes?: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/admin/${idOrNumber}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async verifyPayment(idOrNumber: string, paymentReference?: string, notes?: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/admin/${idOrNumber}/verify-payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentReference: paymentReference || 'ADMIN_VERIFIED', notes }),
    });
  }

  async collectCod(idOrNumber: string, amountCollected?: number, notes?: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/admin/${idOrNumber}/collect-cod`, {
      method: 'PATCH',
      body: JSON.stringify({ amountCollected, notes }),
    });
  }

  async cancelOrder(idOrNumber: string, reason?: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/admin/${idOrNumber}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason: reason || 'Cancelled by store management' }),
    });
  }

  async createProduct(productData: any): Promise<ApiResponse<any>> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async uploadImage(file: File): Promise<ApiResponse<{ url: string; publicId: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${API_BASE_URL}/admin/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Image upload failed');
    }
    return data;
  }

  async getCategories(): Promise<ApiResponse<any>> {
    return this.request('/categories');
  }

  async getStoreSettings(): Promise<ApiResponse<any>> {
    return this.request('/settings');
  }
}

export const apiClient = new ApiClient();
