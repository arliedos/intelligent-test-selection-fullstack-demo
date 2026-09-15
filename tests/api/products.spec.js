// @test-id T02
const { test, expect } = require('@playwright/test');

test.describe('T02 product catalogue API', () => {
  test('GET /api/products returns the deterministic in-memory catalogue', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBe(7);

    expect(body.products[0]).toEqual({
      sku: 'SKU-001',
      name: 'Trail Running Shoes',
      price_cents: 8999,
    });

    for (const product of body.products) {
      expect(typeof product.sku).toBe('string');
      expect(typeof product.name).toBe('string');
      expect(Number.isInteger(product.price_cents)).toBe(true);
      expect(product.price_cents).toBeGreaterThan(0);
    }
  });

  test('GET /api/products is stable across repeated calls', async ({ request }) => {
    const first = await (await request.get('/api/products')).json();
    const second = await (await request.get('/api/products')).json();
    expect(second).toEqual(first);
  });
});
