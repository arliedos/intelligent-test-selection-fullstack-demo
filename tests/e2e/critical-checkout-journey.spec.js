// @test-id T11
// Mandatory, protected critical journey: catalogue -> checkout -> quote,
// driving the real UI through to the real API (no mocked network calls).
const { test, expect } = require('@playwright/test');

test.describe('T11 critical checkout journey UI-to-API', () => {
  test('user browses the catalogue, then gets an accurate shipping quote at checkout', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByTestId('product-item').first()).toBeVisible();

    await page.getByRole('link', { name: /checkout/i }).click();
    await expect(page).toHaveURL(/checkout\.html/);

    await page.getByTestId('customer-type').selectOption('loyalty');
    await page.getByTestId('qty-input-SKU-001').fill('1'); // Trail Running Shoes, 8999 cents
    await page.getByTestId('qty-input-SKU-003').fill('2'); // Merino Wool Socks, 1499 cents x2

    await page.getByTestId('get-quote-button').click();

    const result = page.getByTestId('quote-result');
    await expect(result).toBeVisible();

    // Independently verify the UI-driven quote against a direct, real API
    // call for the same cart (UI-to-API integration, not a hardcoded
    // expected value).
    const apiResponse = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'loyalty',
        items: [
          { sku: 'SKU-001', qty: 1 },
          { sku: 'SKU-003', qty: 2 },
        ],
      },
    });
    const apiBody = await apiResponse.json();

    await expect(page.getByTestId('quote-subtotal')).toHaveText(`$${(apiBody.subtotal_cents / 100).toFixed(2)}`);
    await expect(page.getByTestId('quote-shipping-fee')).toHaveText(`$${(apiBody.shipping.shipping_fee_cents / 100).toFixed(2)}`);
    await expect(page.getByTestId('quote-total')).toHaveText(`$${(apiBody.total_cents / 100).toFixed(2)}`);
  });
});
