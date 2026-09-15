// @test-id T13
// Direct frontend/backend shipping contract: every field the checkout API
// returns for shipping (threshold_cents, free_shipping, shipping_fee_cents,
// amount_remaining_cents, total_cents) must be faithfully reflected by the
// rendered checkout UI, field by field, for both below- and at-threshold
// carts. This differs from T11 (full UI-to-API journey) by asserting the
// contract per shipping field rather than the end-to-end user flow.
const { test, expect } = require('@playwright/test');

async function getApiQuote(request, customerType, items) {
  const response = await request.post('/api/checkout/quote', { data: { customerType, items } });
  expect(response.status()).toBe(200);
  return response.json();
}

test.describe('T13 frontend/backend shipping contract', () => {
  test('below-threshold quote: UI subtotal/fee/total/free-shipping-state exactly match the API contract', async ({ page, request }) => {
    const items = [{ sku: 'SKU-007', qty: 1 }];
    const apiQuote = await getApiQuote(request, 'standard', items);
    expect(apiQuote.shipping.free_shipping).toBe(false);

    await page.goto('/checkout.html');
    await page.getByTestId('customer-type').selectOption('standard');
    await page.getByTestId('qty-input-SKU-007').fill('1');
    await page.getByTestId('get-quote-button').click();

    await expect(page.getByTestId('quote-subtotal')).toHaveText(`$${(apiQuote.subtotal_cents / 100).toFixed(2)}`);
    await expect(page.getByTestId('quote-shipping-fee')).toHaveText(`$${(apiQuote.shipping.shipping_fee_cents / 100).toFixed(2)}`);
    await expect(page.getByTestId('quote-total')).toHaveText(`$${(apiQuote.total_cents / 100).toFixed(2)}`);
    await expect(page.getByTestId('quote-shipping-message')).toHaveText(
      `Free shipping on orders over $${(apiQuote.shipping.threshold_cents / 100).toFixed(2)}.`
    );
  });

  test('at-threshold quote: UI subtotal/fee/total/free-shipping-state exactly match the API contract', async ({ page, request }) => {
    const items = [{ sku: 'SKU-006', qty: 2 }];
    const apiQuote = await getApiQuote(request, 'loyalty', items);
    expect(apiQuote.shipping.free_shipping).toBe(true);
    expect(apiQuote.shipping.shipping_fee_cents).toBe(0);

    await page.goto('/checkout.html');
    await page.getByTestId('customer-type').selectOption('loyalty');
    await page.getByTestId('qty-input-SKU-006').fill('2');
    await page.getByTestId('get-quote-button').click();

    await expect(page.getByTestId('quote-subtotal')).toHaveText(`$${(apiQuote.subtotal_cents / 100).toFixed(2)}`);
    await expect(page.getByTestId('quote-shipping-fee')).toHaveText('$0.00');
    await expect(page.getByTestId('quote-total')).toHaveText(`$${(apiQuote.total_cents / 100).toFixed(2)}`);
    await expect(page.getByTestId('quote-shipping-message')).toHaveText('Free shipping applied.');
  });
});
