const express = require('express');
const { listProducts, findBySku } = require('../data/products');
const { quoteShipping } = require('../shipping');
const { validateCheckoutBody, ValidationError } = require('../checkout-validation');
const { getProfile, upsertProfile, DEFAULT_PROFILE_ID } = require('../data/profiles');
const { validateProfileUpdate } = require('../profile-validation');
const { safeAdd, safeMultiply, UnsafeArithmeticError } = require('../safe-math');

const router = express.Router();

router.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/api/products', (req, res) => {
  res.status(200).json({ products: listProducts() });
});

router.post('/api/checkout/quote', (req, res) => {
  try {
    validateCheckoutBody(req.body);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.status).json({ error: err.publicMessage });
      return;
    }
    throw err;
  }

  const { customerType, items } = req.body;

  let subtotalCents;
  try {
    subtotalCents = 0;
    for (const item of items) {
      const product = findBySku(item.sku);
      const lineCents = safeMultiply(product.price_cents, item.qty);
      subtotalCents = safeAdd(subtotalCents, lineCents);
    }
  } catch (err) {
    if (err instanceof UnsafeArithmeticError) {
      res.status(400).json({ error: 'cart total is too large to compute safely' });
      return;
    }
    throw err;
  }

  const shipping = quoteShipping(customerType, subtotalCents);

  let totalCents;
  try {
    totalCents = safeAdd(subtotalCents, shipping.shipping_fee_cents);
  } catch (err) {
    if (err instanceof UnsafeArithmeticError) {
      res.status(400).json({ error: 'cart total is too large to compute safely' });
      return;
    }
    throw err;
  }

  res.status(200).json({
    customer_type: customerType,
    subtotal_cents: subtotalCents,
    shipping,
    total_cents: totalCents,
  });
});

router.get('/api/profile', (req, res) => {
  const id = req.query.id || DEFAULT_PROFILE_ID;
  const profile = getProfile(id);
  if (!profile) {
    res.status(404).json({ error: 'profile not found' });
    return;
  }
  res.status(200).json(profile);
});

router.put('/api/profile', (req, res) => {
  const id = req.query.id || DEFAULT_PROFILE_ID;
  try {
    validateProfileUpdate(req.body);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.status).json({ error: err.publicMessage });
      return;
    }
    throw err;
  }
  const profile = upsertProfile(id, req.body);
  res.status(200).json(profile);
});

module.exports = router;
