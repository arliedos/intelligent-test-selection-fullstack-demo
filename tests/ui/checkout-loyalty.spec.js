// @test-id T09
const { test, expect } = require('@playwright/test');

test.describe('T09 loyalty checkout shipping frontend', () => {
  test('loyalty customer below their unchanged threshold sees the flat fee, threshold, and remaining amount', async ({ page }) => {
    await page.goto('/checkout.html');

    await page.getByTestId('customer-type').selectOption('loyalty');
    await page.getByTestId('qty-input-SKU-007').fill('1'); // 2499 cents, below the 5000-cent threshold
    await page.getByTestId('get-quote-button').click();

    await expect(page.getByTestId('quote-shipping-fee')).toHaveText('$7.99');
    await expect(page.getByTestId('quote-threshold')).toHaveText('$50.00');
    await expect(page.getByTestId('quote-remaining')).toHaveText('$25.01');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('$25.01');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('$50.00');
  });

  test('loyalty customer at their unchanged 5000-cent threshold sees free shipping', async ({ page }) => {
    await page.goto('/checkout.html');

    await page.getByTestId('customer-type').selectOption('loyalty');
    await page.getByTestId('qty-input-SKU-006').fill('2'); // 5000 cents, exactly at threshold
    await page.getByTestId('get-quote-button').click();

    await expect(page.getByTestId('quote-shipping-fee')).toHaveText('$0.00');
    await expect(page.getByTestId('quote-threshold')).toHaveText('$50.00');
    await expect(page.getByTestId('quote-remaining')).toHaveText('$0.00');
    await expect(page.getByTestId('quote-shipping-message')).toContainText('Free shipping applied');
  });
});
