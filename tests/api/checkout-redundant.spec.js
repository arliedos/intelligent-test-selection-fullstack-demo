// @test-id T14
// Deliberately redundant: exercises the exact same standard-tier,
// below-threshold, generic quoteShipping() code path as T03's first case
// (tests/api/checkout-standard.spec.js), with a different item/quantity
// combination but equivalent financial assertions. See
// test-metadata/redundancy-evidence.json for the disposition rationale.
const { test, expect } = require('@playwright/test');

test.describe('T14 redundant happy-path API quote', () => {
  test('standard customer below threshold pays the flat shipping fee (equivalent to T03)', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'standard',
        items: [{ sku: 'SKU-007', qty: 1 }], // 2499 cents, below threshold
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.subtotal_cents).toBe(2499);
    expect(body.shipping.free_shipping).toBe(false);
    expect(body.shipping.shipping_fee_cents).toBe(799);
    expect(body.total_cents).toBe(2499 + 799);
  });
});
