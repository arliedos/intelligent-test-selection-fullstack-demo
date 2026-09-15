// @test-id T03
const { test, expect } = require('@playwright/test');

test.describe('T03 standard shipping threshold API', () => {
  test('standard customer below the tiered 7500-cent threshold pays the flat shipping fee', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'standard',
        items: [{ sku: 'SKU-004', qty: 1 }], // 6500 cents: free at the old 5000 threshold, not free at 7500
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(6500);
    expect(body.shipping.threshold_cents).toBe(7500);
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.total_cents).toBe(6500 + 799);
  });

  test('standard customer at or above the tiered 7500-cent threshold gets free shipping', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'standard',
        items: [{ sku: 'SKU-001', qty: 1 }], // 8999 cents, above the 7500-cent threshold
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(8999);
    expect(body.shipping.free_shipping).toBe(true);
    expect(body.shipping.shipping_fee_cents).toBe(0);
    expect(body.total_cents).toBe(8999);
  });
});
