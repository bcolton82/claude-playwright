import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { ApiClient } from './api-client';
import { CheckoutPage } from './page-object';

// Import { test, expect } from this file in every spec instead of '@playwright/test'.

type TestFixtures = {
  api: ApiClient;
  checkoutPage: CheckoutPage;
  /** Unique per test, so parallel tests never share data. */
  uniqueEmail: string;
};

type WorkerFixtures = {
  apiToken: string;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Expensive auth happens once per worker, not once per test.
  apiToken: [
    async ({ playwright }, use) => {
      const authContext: APIRequestContext = await playwright.request.newContext({
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
      });
      const loginResponse = await authContext.post('/api/auth/login', {
        data: { email: process.env.TEST_USER ?? 'admin@example.com', password: process.env.TEST_PASSWORD ?? 'password' },
      });
      expect(loginResponse.ok(), `login failed: ${loginResponse.status()}`).toBeTruthy();
      const { token } = await loginResponse.json();
      await use(token);
      await authContext.dispose();
    },
    { scope: 'worker' },
  ],

  api: async ({ request, apiToken }, use) => {
    await use(new ApiClient(request, apiToken));
  },

  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  uniqueEmail: async ({}, use, testInfo) => {
    await use(`pw+${testInfo.workerIndex}-${Date.now()}@example.com`);
  },
});

export { expect };
