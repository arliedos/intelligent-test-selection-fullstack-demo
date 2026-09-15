// Deterministic in-memory product catalogue. No database, no network.
const PRODUCTS = Object.freeze([
  Object.freeze({ sku: 'SKU-001', name: 'Trail Running Shoes', price_cents: 8999 }),
  Object.freeze({ sku: 'SKU-002', name: 'Insulated Water Bottle', price_cents: 1899 }),
  Object.freeze({ sku: 'SKU-003', name: 'Merino Wool Socks', price_cents: 1499 }),
  Object.freeze({ sku: 'SKU-004', name: 'Packable Rain Jacket', price_cents: 6500 }),
  Object.freeze({ sku: 'SKU-005', name: 'Trekking Poles (Pair)', price_cents: 4200 }),
  // SKU-006/SKU-007 are priced so integer quantities land exactly on the
  // shipping thresholds under test (5000/7500 cents), enabling precise
  // boundary assertions without fractional-cent arithmetic.
  Object.freeze({ sku: 'SKU-006', name: 'Insulated Picnic Blanket', price_cents: 2500 }),
  Object.freeze({ sku: 'SKU-007', name: 'Camp Lantern', price_cents: 2499 }),
]);

function listProducts() {
  return PRODUCTS.map((product) => ({ ...product }));
}

function findBySku(sku) {
  return PRODUCTS.find((product) => product.sku === sku);
}

module.exports = { listProducts, findBySku };
