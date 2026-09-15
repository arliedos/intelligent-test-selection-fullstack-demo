const fs = require('node:fs');
const path = require('node:path');

// Overridable only for deliberate, documented test scenarios that need to
// point at a different policy file (e.g. exercising fail-fast startup
// against a malformed fixture) -- see tests/api/shipping-policy-validation.spec.js
// (T15) and README.md. Defaults to the real, committed policy file.
const POLICY_PATH = process.env.SHIPPING_POLICY_PATH || path.join(__dirname, '..', 'shipping-policy.json');

function isNonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    throw new Error('shipping-policy.json must contain a JSON object');
  }
  for (const tier of ['standard', 'loyalty']) {
    const entry = policy[tier];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`shipping-policy.json is missing tier "${tier}"`);
    }
    if (!isNonNegativeSafeInteger(entry.free_shipping_threshold_cents)) {
      throw new Error(`shipping-policy.json "${tier}.free_shipping_threshold_cents" must be a non-negative safe integer`);
    }
    if (!isNonNegativeSafeInteger(entry.flat_fee_cents)) {
      throw new Error(`shipping-policy.json "${tier}.flat_fee_cents" must be a non-negative safe integer`);
    }
  }
  return policy;
}

function loadShippingPolicy(policyPath = POLICY_PATH) {
  const raw = fs.readFileSync(policyPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return validatePolicy(parsed);
}

// Loaded once at process startup (genuinely read from disk, not
// hardcoded). An invalid or unreadable policy throws synchronously here,
// which fails the process fast at startup rather than serving requests
// against an unvalidated config (REQ-SHIP-001).
const POLICY = loadShippingPolicy();

function getTierPolicy(customerType) {
  return POLICY[customerType];
}

function quoteShipping(customerType, subtotalCents) {
  const tier = getTierPolicy(customerType);
  const thresholdCents = tier.free_shipping_threshold_cents;
  const freeShipping = subtotalCents >= thresholdCents;
  const shippingFeeCents = freeShipping ? 0 : tier.flat_fee_cents;
  const amountRemainingCents = freeShipping ? 0 : thresholdCents - subtotalCents;

  return {
    threshold_cents: thresholdCents,
    flat_fee_cents: tier.flat_fee_cents,
    free_shipping: freeShipping,
    shipping_fee_cents: shippingFeeCents,
    amount_remaining_cents: amountRemainingCents,
  };
}

module.exports = { loadShippingPolicy, validatePolicy, getTierPolicy, quoteShipping, POLICY_PATH };
