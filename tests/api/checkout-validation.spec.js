// @test-id T06
const { test, expect } = require('@playwright/test');
const { errorHandler } = require('../../server/app');
const { ValidationError } = require('../../server/checkout-validation');

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function expectNoStackTrace(bodyText) {
  expect(bodyText).not.toMatch(/at [\w./\\]+:\d+:\d+/);
  expect(bodyText).not.toMatch(/node_modules/);
  expect(bodyText.toLowerCase()).not.toContain('stack');
}

test.describe('T06 malformed checkout/cart validation', () => {
  test('missing customerType is rejected with 400 and no stack trace', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { items: [{ sku: 'SKU-001', qty: 1 }] },
    });
    expect(response.status()).toBe(400);
    const text = await response.text();
    expectNoStackTrace(text);
  });

  test('invalid customerType value is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'vip', items: [{ sku: 'SKU-001', qty: 1 }] },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/customerType/i);
  });

  test('missing items array is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard' },
    });
    expect(response.status()).toBe(400);
  });

  test('non-array items is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: 'not-an-array' },
    });
    expect(response.status()).toBe(400);
  });

  test('empty items array is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [] },
    });
    expect(response.status()).toBe(400);
  });

  test('unknown sku is rejected with 400 and no stack trace', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-DOES-NOT-EXIST', qty: 1 }] },
    });
    expect(response.status()).toBe(400);
    const text = await response.text();
    expectNoStackTrace(text);
    expect(text).toMatch(/sku/i);
  });

  test('zero quantity is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-001', qty: 0 }] },
    });
    expect(response.status()).toBe(400);
  });

  test('negative quantity is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-001', qty: -1 }] },
    });
    expect(response.status()).toBe(400);
  });

  test('non-integer quantity is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-001', qty: 1.5 }] },
    });
    expect(response.status()).toBe(400);
  });

  test('item missing sku is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ qty: 1 }] },
    });
    expect(response.status()).toBe(400);
  });

  test('oversized request body is rejected with 413 and no stack trace', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: {
        customerType: 'standard',
        items: [{ sku: 'SKU-001', qty: 1 }],
        padding: 'x'.repeat(200 * 1024),
      },
    });
    expect(response.status()).toBe(413);
    const text = await response.text();
    expectNoStackTrace(text);
  });

  test('malformed JSON body is rejected with 400, not 500', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      headers: { 'content-type': 'application/json' },
      data: '{not valid json',
    });
    expect(response.status()).toBe(400);
  });

  test('an unsafe-integer quantity (beyond Number.MAX_SAFE_INTEGER) is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-001', qty: Number.MAX_SAFE_INTEGER + 1 }] },
    });
    expect(response.status()).toBe(400);
    const text = await response.text();
    expectNoStackTrace(text);
  });

  test('a quantity beyond the realistic per-item maximum is rejected with 400', async ({ request }) => {
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items: [{ sku: 'SKU-001', qty: 1_000_001 }] },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/qty/i);
  });

  test('an item count beyond the realistic maximum is rejected with 400', async ({ request }) => {
    const items = Array.from({ length: 501 }, () => ({ sku: 'SKU-001', qty: 1 }));
    const response = await request.post('/api/checkout/quote', {
      data: { customerType: 'standard', items },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/items/i);
  });

  test('checked safe arithmetic rejects a multiplication that would exceed Number.MAX_SAFE_INTEGER', async () => {
    // Realistic per-item/per-cart limits already keep any legitimate
    // request's line/subtotal/total math far under the safe-integer
    // ceiling; this exercises the checked-arithmetic guard itself
    // (server/safe-math.js), the layer that protects line subtotal,
    // cart subtotal, and total math even if a future limit change lets a
    // larger value through.
    const { safeMultiply, safeAdd, UnsafeArithmeticError } = require('../../server/safe-math');

    expect(() => safeMultiply(Number.MAX_SAFE_INTEGER, 2)).toThrow(UnsafeArithmeticError);
    expect(() => safeAdd(Number.MAX_SAFE_INTEGER, 1)).toThrow(UnsafeArithmeticError);
    expect(safeMultiply(100, 3)).toBe(300);
    expect(safeAdd(100, 3)).toBe(103);
  });

  test('the shared error handler returns a generic 500 for an unrecognized/unexpected error, without leaking its message or stack', async () => {
    const res = mockRes();
    const bug = new Error('a real bug: cannot read property "x" of undefined at internal-module.js:42');

    errorHandler(bug, {}, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'internal server error' });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('bug');
    expect(serialized.toLowerCase()).not.toContain('stack');
    expect(serialized).not.toMatch(/at [\w./\\-]+:\d+:\d+/);
  });

  test('the shared error handler still returns the recognized 4xx status/message for a ValidationError', async () => {
    const res = mockRes();
    const err = new ValidationError('items must be a non-empty array');

    errorHandler(err, {}, res, () => {});

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'items must be a non-empty array' });
  });

  test('the shared error handler still returns 413 for an oversized-body error and 400 for a malformed-JSON error', async () => {
    const tooLarge = mockRes();
    errorHandler({ type: 'entity.too.large' }, {}, tooLarge, () => {});
    expect(tooLarge.statusCode).toBe(413);

    const malformed = mockRes();
    errorHandler({ type: 'entity.parse.failed' }, {}, malformed, () => {});
    expect(malformed.statusCode).toBe(400);
  });
});
