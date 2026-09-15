// @test-id T08
const { test, expect } = require('@playwright/test');

test.describe('T08 standard checkout shipping frontend', () => {
  test('standard customer below the tiered threshold sees the flat fee, threshold, and remaining amount', async ({ page }) => {
    await page.goto('/checkout.html');

    await page.getByTestId('customer-type').selectOption('standard');
    await page.getByTestId('qty-input-SKU-007').fill('1'); // 2499 cents, below the 7500-cent threshold
    await page.getByTestId('get-quote-button').click();

    const result = page.getByTestId('quote-result');
    await expect(result).toBeVisible();
    await expect(page.getByTestId('quote-subtotal')).toHaveText('$24.99');
    await expect(page.getByTestId('quote-shipping-fee')).toHaveText('$7.99');
    await expect(page.getByTestId('quote-total')).toHaveText('$32.98');
    await expect(page.getByTestId('quote-threshold')).toHaveText('$75.00');
    await expect(page.getByTestId('quote-remaining')).toHaveText('$50.01');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('$50.01');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('$75.00');
  });

  test('standard customer at the tiered 7500-cent threshold sees free shipping', async ({ page }) => {
    await page.goto('/checkout.html');

    await page.getByTestId('customer-type').selectOption('standard');
    await page.getByTestId('qty-input-SKU-006').fill('3'); // 7500 cents, exactly at the tiered threshold
    await page.getByTestId('get-quote-button').click();

    await expect(page.getByTestId('quote-shipping-fee')).toHaveText('$0.00');
    await expect(page.getByTestId('quote-total')).toHaveText('$75.00');
    await expect(page.getByTestId('quote-threshold')).toHaveText('$75.00');
    await expect(page.getByTestId('quote-remaining')).toHaveText('$0.00');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('Free shipping applied');
  });
});
