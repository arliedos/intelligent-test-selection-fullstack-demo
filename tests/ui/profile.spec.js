// @test-id T10
const { test, expect } = require('@playwright/test');

test.describe('T10 profile frontend/API (UI half)', () => {
  test('profile page pre-fills the default seeded profile', async ({ page }) => {
    await page.goto('/profile.html');

    await expect(page.getByTestId('profile-name')).toHaveValue('Jordan Rivera');
    await expect(page.getByTestId('profile-email')).toHaveValue('jordan.rivera@example.com');
  });

  test('profile page creates and saves a new profile for an unknown id, independent of other tests', async ({ page }) => {
    await page.goto('/profile.html?id=profile-test-ui-001');

    await expect(page.getByTestId('profile-name')).toHaveValue('');

    await page.getByTestId('profile-name').fill('Riley Park');
    await page.getByTestId('profile-email').fill('riley.park@example.com');
    await page.getByTestId('profile-save-button').click();

    await expect(page.getByTestId('profile-confirmation')).toBeVisible();
    await expect(page.getByTestId('profile-confirmation')).toContainText('saved');

    await page.reload();
    await expect(page.getByTestId('profile-name')).toHaveValue('Riley Park');
    await expect(page.getByTestId('profile-email')).toHaveValue('riley.park@example.com');
  });

  test('profile page shows a validation error for an invalid email', async ({ page }) => {
    await page.goto('/profile.html?id=profile-test-ui-invalid');

    await page.getByTestId('profile-name').fill('Casey Kim');
    await page.getByTestId('profile-email').fill('not-an-email');
    await page.getByTestId('profile-save-button').click();

    await expect(page.getByTestId('profile-error')).toBeVisible();
  });

  test('a network-level failure loading the profile shows an accessible error instead of failing silently', async ({ page }) => {
    await page.route('**/api/profile*', (route) => route.abort());
    await page.goto('/profile.html');

    await expect(page.getByTestId('profile-error')).toBeVisible();
    await expect(page.getByTestId('profile-error')).toContainText(/unable to load/i);
  });
});
