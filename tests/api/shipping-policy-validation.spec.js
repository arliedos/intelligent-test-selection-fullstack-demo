// @test-id T15
// Runtime validation of shipping-policy.json (REQ-SHIP-001): invalid
// threshold/fee/tier/malformed/missing configurations must be rejected,
// and an invalid policy must fail the process fast at startup rather than
// serving requests against unvalidated config. This is deliberately
// separate from T03/T04/T05 (which exercise the checkout API against the
// already-valid, already-loaded committed policy) -- those groups never
// exercise an invalid policy or process startup at all.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { validatePolicy, loadShippingPolicy } = require('../../server/shipping');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function writeTempPolicy(content) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shipping-policy-')), 'shipping-policy.json');
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

test.describe('T15 shipping-policy runtime validation', () => {
  test('a valid policy passes validation unchanged', () => {
    const policy = {
      standard: { free_shipping_threshold_cents: 7500, flat_fee_cents: 799 },
      loyalty: { free_shipping_threshold_cents: 5000, flat_fee_cents: 799 },
    };
    expect(validatePolicy(policy)).toEqual(policy);
  });

  test('a missing tier is rejected', () => {
    expect(() => validatePolicy({ standard: { free_shipping_threshold_cents: 100, flat_fee_cents: 0 } }))
      .toThrow(/loyalty/);
  });

  test('a malformed (non-object) policy is rejected', () => {
    expect(() => validatePolicy(null)).toThrow(/JSON object/);
    expect(() => validatePolicy('not an object')).toThrow(/JSON object/);
    expect(() => validatePolicy([])).toThrow(/JSON object/);
  });

  test('a malformed (non-object) tier is rejected', () => {
    const policy = { standard: 'not an object', loyalty: { free_shipping_threshold_cents: 100, flat_fee_cents: 0 } };
    expect(() => validatePolicy(policy)).toThrow(/standard/);
  });

  test('a negative threshold is rejected', () => {
    const policy = {
      standard: { free_shipping_threshold_cents: -1, flat_fee_cents: 0 },
      loyalty: { free_shipping_threshold_cents: 100, flat_fee_cents: 0 },
    };
    expect(() => validatePolicy(policy)).toThrow(/free_shipping_threshold_cents/);
  });

  test('a non-integer threshold is rejected', () => {
    const policy = {
      standard: { free_shipping_threshold_cents: 12.5, flat_fee_cents: 0 },
      loyalty: { free_shipping_threshold_cents: 100, flat_fee_cents: 0 },
    };
    expect(() => validatePolicy(policy)).toThrow(/free_shipping_threshold_cents/);
  });

  test('an unsafe-integer threshold (beyond Number.MAX_SAFE_INTEGER) is rejected', () => {
    const policy = {
      standard: { free_shipping_threshold_cents: Number.MAX_SAFE_INTEGER + 1, flat_fee_cents: 0 },
      loyalty: { free_shipping_threshold_cents: 100, flat_fee_cents: 0 },
    };
    expect(() => validatePolicy(policy)).toThrow(/free_shipping_threshold_cents/);
  });

  test('a negative fee is rejected', () => {
    const policy = {
      standard: { free_shipping_threshold_cents: 100, flat_fee_cents: -1 },
      loyalty: { free_shipping_threshold_cents: 100, flat_fee_cents: 0 },
    };
    expect(() => validatePolicy(policy)).toThrow(/flat_fee_cents/);
  });

  test('an unsafe-integer fee (beyond Number.MAX_SAFE_INTEGER) is rejected', () => {
    const policy = {
      standard: { free_shipping_threshold_cents: 100, flat_fee_cents: Number.MAX_SAFE_INTEGER + 1 },
      loyalty: { free_shipping_threshold_cents: 100, flat_fee_cents: 0 },
    };
    expect(() => validatePolicy(policy)).toThrow(/flat_fee_cents/);
  });

  test('loadShippingPolicy throws for a missing config file', () => {
    const missingPath = path.join(os.tmpdir(), 'does-not-exist-shipping-policy.json');
    expect(() => loadShippingPolicy(missingPath)).toThrow();
  });

  test('loadShippingPolicy throws for malformed JSON content', () => {
    const file = writeTempPolicy('{not valid json');
    expect(() => loadShippingPolicy(file)).toThrow();
  });

  test('loadShippingPolicy successfully loads and validates a well-formed custom policy file', () => {
    const file = writeTempPolicy(JSON.stringify({
      standard: { free_shipping_threshold_cents: 1000, flat_fee_cents: 500 },
      loyalty: { free_shipping_threshold_cents: 500, flat_fee_cents: 500 },
    }));
    expect(loadShippingPolicy(file).standard.free_shipping_threshold_cents).toBe(1000);
  });

  test('the process fails fast at startup when SHIPPING_POLICY_PATH points at an invalid policy', () => {
    const file = writeTempPolicy(JSON.stringify({ standard: { free_shipping_threshold_cents: -1, flat_fee_cents: 0 } }));

    expect(() => execFileSync(
      process.execPath,
      ['-e', "require('./server/shipping')"],
      { cwd: REPO_ROOT, env: { ...process.env, SHIPPING_POLICY_PATH: file }, stdio: 'pipe' }
    )).toThrow();
  });

  test('the process starts cleanly at startup when SHIPPING_POLICY_PATH points at a valid policy', () => {
    const file = writeTempPolicy(JSON.stringify({
      standard: { free_shipping_threshold_cents: 1000, flat_fee_cents: 500 },
      loyalty: { free_shipping_threshold_cents: 500, flat_fee_cents: 500 },
    }));

    expect(() => execFileSync(
      process.execPath,
      ['-e', "require('./server/shipping')"],
      { cwd: REPO_ROOT, env: { ...process.env, SHIPPING_POLICY_PATH: file }, stdio: 'pipe' }
    )).not.toThrow();
  });
});
