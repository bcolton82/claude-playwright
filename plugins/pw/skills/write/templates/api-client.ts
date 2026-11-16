import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

// Thin, typed wrapper over the request fixture. One method per endpoint the tests use.
// Methods return the raw APIResponse when tests need to assert on errors,
// and parsed bodies (after asserting success) when they only need the data.

export type Order = {
  id: string;
  status: 'pending' | 'picked' | 'shipped' | 'cancelled';
  email: string;
  items: { sku: string; quantity: number }[];
  totalCents: number;
};

export function isOrder(value: unknown): value is Order {
  const o = value as Order;
  return (
    !!o &&
    typeof o.id === 'string' &&
    ['pending', 'picked', 'shipped', 'cancelled'].includes(o.status) &&
    typeof o.email === 'string' &&
    Array.isArray(o.items) &&
    typeof o.totalCents === 'number'
  );
}

export class ApiClient {
  constructor(private readonly request: APIRequestContext, private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  createOrderRaw(data: Partial<Order>): Promise<APIResponse> {
    return this.request.post('/api/orders', { data, headers: this.headers });
  }

  async createOrder(data: Partial<Order>): Promise<Order> {
    const response = await this.createOrderRaw(data);
    expect(response.status(), await response.text()).toBe(201);
    const body = await response.json();
    expect(isOrder(body), `unexpected order shape: ${JSON.stringify(body)}`).toBe(true);
    return body;
  }

  getOrderRaw(id: string): Promise<APIResponse> {
    return this.request.get(`/api/orders/${id}`, { headers: this.headers });
  }

  async getOrder(id: string): Promise<Order> {
    const response = await this.getOrderRaw(id);
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  }
}
