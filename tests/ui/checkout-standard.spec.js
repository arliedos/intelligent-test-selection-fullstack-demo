// @test-id T08
const { test, expect } = require('@playwright/test');

test.describe('T08 standard checkout shipping frontend', () => {
  test('standard customer below threshold sees the flat shipping fee and $50 threshold messaging', async ({ page }) => {
    await page.goto('/checkout.html');

    await page.getByTestId('customer-type').selectOption('standard');
    await page.getByTestId('qty-input-SKU-007').fill('1'); // 2499 cents, below threshold
    await page.getByTestId('get-quote-button').click();

    const result = page.getByTestId('quote-result');
    await expect(result).toBeVisible();
    await expect(page.getByTestId('quote-subtotal')).toHaveText('$24.99');
    await expect(page.getByTestId('quote-shipping-fee')).toHaveText('$7.99');
    await expect(page.getByTestId('quote-total')).toHaveText('$32.98');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('$50.00');
  });

  test('standard customer at threshold sees free shipping', async ({ page }) => {
    await page.goto('/checkout.html');

    await page.getByTestId('customer-type').selectOption('standard');
    await page.getByTestId('qty-input-SKU-006').fill('2'); // 5000 cents, exactly at threshold
    await page.getByTestId('get-quote-button').click();

    await expect(page.getByTestId('quote-shipping-fee')).toHaveText('$0.00');
    await expect(page.getByTestId('quote-total')).toHaveText('$50.00');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('Free shipping applied');
  });
});
