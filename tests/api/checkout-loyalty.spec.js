// @test-id T04
const { test, expect } = require('@playwright/test');

test.describe('T04 loyalty shipping threshold API', () => {
  test('loyalty customer below threshold pays the flat shipping fee', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'loyalty',
        items: [{ sku: 'SKU-003', qty: 1 }], // 1499 cents, below threshold
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(1499);
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.total_cents).toBe(1499 + 799);
  });

  test('loyalty customer at or above threshold gets free shipping', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'loyalty',
        items: [{ sku: 'SKU-002', qty: 3 }], // 5697 cents, above threshold
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(5697);
    expect(body.shipping.free_shipping).toBe(true);
    expect(body.shipping.shipping_fee_cents).toBe(0);
    expect(body.total_cents).toBe(5697);
  });
});
