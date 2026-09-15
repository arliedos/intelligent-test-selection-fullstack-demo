// @test-id T07
const { test, expect } = require('@playwright/test');

test.describe('T07 catalogue frontend rendering', () => {
  test('catalogue page lists all products from the real API', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /catalogue/i })).toBeVisible();

    const items = page.getByTestId('product-item');
    await expect(items).toHaveCount(7);

    const firstItem = items.first();
    await expect(firstItem).toContainText('Trail Running Shoes');
    await expect(firstItem).toContainText('$89.99');
  });

  test('catalogue page has a nav link to checkout and profile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /checkout/i })).toHaveAttribute('href', /checkout\.html/);
    await expect(page.getByRole('link', { name: /profile/i })).toHaveAttribute('href', /profile\.html/);
  });

  test('a network-level failure loading products shows an accessible error instead of failing silently', async ({ page }) => {
    await page.route('**/api/products', (route) => route.abort());
    await page.goto('/');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/unable to load/i);
    await expect(page.getByTestId('product-item')).toHaveCount(0);
  });
});
