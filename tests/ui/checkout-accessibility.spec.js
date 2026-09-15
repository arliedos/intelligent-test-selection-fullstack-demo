// @test-id T12
// Deterministic accessibility-semantics test. Its *historical signal* is
// marked SYNTHETIC/flaky in test-metadata/synthetic-execution-history.json
// purely as fabricated evaluation metadata for the selection agent to
// reason about — this test itself contains no randomness and always
// produces the same result for the same code.
const { test, expect } = require('@playwright/test');

test.describe('T12 checkout accessibility semantics', () => {
  test('checkout page exposes landmarks, labelled controls, and live regions', async ({ page }) => {
    await page.goto('/checkout.html');

    await expect(page.getByRole('navigation', { name: /main/i })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /checkout/i })).toBeVisible();

    await expect(page.getByLabel('Customer type')).toBeVisible();
    await expect(page.getByLabel(/Trail Running Shoes/)).toBeVisible();

    await expect(page.getByRole('button', { name: /get shipping quote/i })).toBeVisible();
  });

  test('submitting with no items announces an accessible alert', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.getByRole('button', { name: /get shipping quote/i }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/select a quantity/i);
  });

  test('a successful quote is announced in an accessible status region', async ({ page }) => {
    await page.goto('/checkout.html');
    // Loyalty tier: its 5000-cent free-shipping threshold is unchanged by
    // the tiered-shipping-policy target, keeping this accessibility check
    // independent of which tier's threshold value is currently configured.
    await page.getByTestId('customer-type').selectOption('loyalty');
    await page.getByTestId('qty-input-SKU-006').fill('2');
    await page.getByRole('button', { name: /get shipping quote/i }).click();

    const status = page.getByRole('status', { name: /shipping quote result/i });
    await expect(status).toBeVisible();
    await expect(status).toContainText('$0.00');
  });

  test('a network-level failure loading products shows an accessible error instead of failing silently', async ({ page }) => {
    await page.route('**/api/products', (route) => route.abort());
    await page.goto('/checkout.html');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/unable to load/i);
  });

  test('a network-level failure submitting a quote shows an accessible error instead of failing silently', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.getByTestId('qty-input-SKU-001').fill('1');
    await page.route('**/api/checkout/quote', (route) => route.abort());
    await page.getByRole('button', { name: /get shipping quote/i }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/unable to get a shipping quote/i);
  });
});
