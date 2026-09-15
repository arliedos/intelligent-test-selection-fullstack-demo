// @test-id T05
const { test, expect } = require('@playwright/test');

// SKU-003 = 1499 cents, SKU-006 = 2500 cents, SKU-007 = 2499 cents
// (see server/data/products.js).
// 3x SKU-006 = 7500 cents exactly (the tiered standard threshold).
// 2x SKU-006 + 1x SKU-007 = 7499 cents (one cent under that threshold).
// 2x SKU-006 = 5000 cents exactly (the unchanged loyalty threshold).

test.describe('T05 shipping boundary and fee correctness', () => {
  test('standard subtotal exactly at the tiered 7500-cent threshold is free shipping', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-006', qty: 3 }] },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(7500);
    expect(body.shipping.threshold_cents).toBe(7500);
    expect(body.shipping.free_shipping).toBe(true);
    expect(body.shipping.shipping_fee_cents).toBe(0);
    expect(body.shipping.amount_remaining_cents).toBe(0);
    expect(body.total_cents).toBe(7500);
  });

  test('standard subtotal one cent under the tiered 7500-cent threshold is not free shipping', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'standard',
        items: [{ sku: 'SKU-006', qty: 2 }, { sku: 'SKU-007', qty: 1 }],
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(7499);
    expect(body.shipping.threshold_cents).toBe(7500);
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.shipping.amount_remaining_cents).toBe(1);
    expect(body.total_cents).toBe(7499 + 799);
  });

  test('loyalty subtotal exactly at its unchanged 5000-cent threshold is still free shipping', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'loyalty', items: [{ sku: 'SKU-006', qty: 2 }] },
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

  test('standard subtotal far below the tiered threshold reports the correct fee and remaining amount', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-003', qty: 1 }] }, // 1499 cents
    });
    const body = await response.json();
    expect(body.subtotal_cents).toBe(1499);
    expect(body.shipping.threshold_cents).toBe(7500);
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.shipping.amount_remaining_cents).toBe(7500 - 1499);
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
