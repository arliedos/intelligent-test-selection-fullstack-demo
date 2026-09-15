const { findBySku } = require('./data/products');

const VALID_CUSTOMER_TYPES = ['standard', 'loyalty'];
const MAX_QTY_PER_ITEM = 1000;
const MAX_ITEM_COUNT = 100;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.publicMessage = message;
  }
}

function validateCheckoutBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('request body must be a JSON object');
  }

  const { customerType, items } = body;

  if (typeof customerType !== 'string' || !VALID_CUSTOMER_TYPES.includes(customerType)) {
    throw new ValidationError(`customerType must be one of: ${VALID_CUSTOMER_TYPES.join(', ')}`);
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('items must be a non-empty array');
  }

  if (items.length > MAX_ITEM_COUNT) {
    throw new ValidationError(`items must not exceed ${MAX_ITEM_COUNT} entries`);
  }

  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.sku !== 'string' || item.sku.length === 0) {
      throw new ValidationError('each item must include a non-empty string sku');
    }
    if (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTY_PER_ITEM) {
      throw new ValidationError(`item ${item.sku} qty must be a positive integer no greater than ${MAX_QTY_PER_ITEM}`);
    }
    if (!findBySku(item.sku)) {
      throw new ValidationError(`unknown sku: ${item.sku}`);
    }
  }
}

module.exports = { validateCheckoutBody, ValidationError, VALID_CUSTOMER_TYPES, MAX_QTY_PER_ITEM, MAX_ITEM_COUNT };
