import { expect, type Locator, type Page } from '@playwright/test';

// Page objects expose user intent. Locators are defined once, as readonly fields,
// using role-based queries. Keep assertions in tests unless a check is reused often.

export class CheckoutPage {
  readonly email: Locator;
  readonly address: Locator;
  readonly placeOrder: Locator;
  readonly total: Locator;
  readonly errors: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel('Email');
    this.address = page.getByLabel('Street address');
    this.placeOrder = page.getByRole('button', { name: 'Place order' });
    this.total = page.getByTestId('order-total');
    this.errors = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/checkout');
    // Wait for the app's own readiness signal if it has one (hydration, socket connect,
    // aria-busy), e.g. await expect(this.page.locator('body')).toHaveAttribute('data-connected', 'true').
    // Otherwise wait for something meaningful, never a timeout.
    await expect(this.placeOrder).toBeVisible();
  }

  async fillContact(details: { email: string; address: string }) {
    await this.email.fill(details.email);
    await this.address.fill(details.address);
  }

  async submit() {
    // Tie the click to the request it triggers, so the test waits on the real event.
    const response = this.page.waitForResponse(
      (response) => response.url().includes('/api/orders') && response.request().method() === 'POST',
    );
    await this.placeOrder.click();
    return response;
  }
}
