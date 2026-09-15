// @test-id T05
const { test, expect } = require('@playwright/test');

// SKU-006 = 2500 cents, SKU-007 = 2499 cents (see server/data/products.js).
// 2x SKU-006 = 5000 cents exactly (the baseline standard/loyalty threshold).
// 1x SKU-006 + 1x SKU-007 = 4999 cents (one cent under that threshold).

test.describe('T05 shipping boundary and fee correctness', () => {
  test('subtotal exactly at the threshold (5000 cents) is free shipping', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-006', qty: 2 }] },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(5000);
    expect(body.shipping.threshold_cents).toBe(5000);
    expect(body.shipping.free_shipping).toBe(true);
    expect(body.shipping.shipping_fee_cents).toBe(0);
    expect(body.shipping.amount_remaining_cents).toBe(0);
    expect(body.total_cents).toBe(5000);
  });

  test('subtotal one cent under the threshold (4999 cents) is not free shipping', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'standard',
        items: [{ sku: 'SKU-006', qty: 1 }, { sku: 'SKU-007', qty: 1 }],
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(4999);
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.shipping.amount_remaining_cents).toBe(1);
    expect(body.total_cents).toBe(4999 + 799);
  });

  test('far-below-threshold subtotal returns the correct fee and remaining amount', async ({ request }) => {
    // Smallest priced item, qty 1, to stay within items-required validation while
    // exercising the "far below threshold" branch of the boundary logic.
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-003', qty: 1 }] }, // 1499 cents
    });
    const body = await response.json();
    expect(body.subtotal_cents).toBe(1499);
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.shipping.amount_remaining_cents).toBe(5000 - 1499);
  });

  test('flat shipping fee is exactly 799 cents whenever shipping is not free', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'loyalty', items: [{ sku: 'SKU-007', qty: 1 }] }, // 2499 cents
    });
    const body = await response.json();
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.shipping.flat_fee_cents).toBe(799);
  });
});
