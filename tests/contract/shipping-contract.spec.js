// @test-id T13
// Direct frontend/backend shipping contract: every displayed monetary/policy
// field must match the successful API response for the same cart.
const { test, expect } = require('@playwright/test');

async function getApiQuote(request, customerType, items) {
  const response = await request.post('/api/checkout/quote', { data: { customerType, items } });
  expect(response.status()).toBe(200);
  return response.json();
}

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function assertUiMatchesQuote(page, quote) {
  await expect(page.getByTestId('quote-subtotal')).toHaveText(money(quote.subtotal_cents));
  await expect(page.getByTestId('quote-shipping-fee')).toHaveText(money(quote.shipping.shipping_fee_cents));
  await expect(page.getByTestId('quote-total')).toHaveText(money(quote.total_cents));
  await expect(page.getByTestId('quote-threshold')).toHaveText(money(quote.shipping.threshold_cents));
  await expect(page.getByTestId('quote-remaining')).toHaveText(money(quote.shipping.amount_remaining_cents));
  const message = page.getByTestId('quote-shipping-message');
  if (quote.shipping.free_shipping) {
    await expect(message).toHaveText('Free shipping applied.');
  } else {
    await expect(message).toContainText(money(quote.shipping.threshold_cents));
  }
}

test.describe('T13 frontend/backend shipping contract', () => {
  test('below-threshold quote: UI reflects every displayed shipping contract field', async ({ page, request }) => {
    const items = [{ sku: 'SKU-007', qty: 1 }];
    const apiQuote = await getApiQuote(request, 'standard', items);
    expect(apiQuote.shipping.free_shipping).toBe(false);

    await page.goto('/checkout.html');
    await page.getByTestId('customer-type').selectOption('standard');
    await page.getByTestId('qty-input-SKU-007').fill('1');
    await page.getByTestId('get-quote-button').click();
    await assertUiMatchesQuote(page, apiQuote);
  });

  test('at-threshold quote: UI reflects every displayed shipping contract field', async ({ page, request }) => {
    const items = [{ sku: 'SKU-006', qty: 2 }];
    const apiQuote = await getApiQuote(request, 'loyalty', items);
    expect(apiQuote.shipping.free_shipping).toBe(true);

    await page.goto('/checkout.html');
    await page.getByTestId('customer-type').selectOption('loyalty');
    await page.getByTestId('qty-input-SKU-006').fill('2');
    await page.getByTestId('get-quote-button').click();
    await assertUiMatchesQuote(page, apiQuote);
  });
});
