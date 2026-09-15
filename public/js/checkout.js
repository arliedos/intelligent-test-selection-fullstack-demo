let PRODUCTS = [];

async function loadProductQuantityInputs() {
  const container = document.getElementById('product-quantities');
  const { ok, body } = await fetchJson('/api/products');
  if (!ok || !body) {
    showError('Unable to load products right now.');
    return;
  }
  PRODUCTS = body.products;

  for (const product of PRODUCTS) {
    const row = document.createElement('div');
    row.className = 'field';

    const label = document.createElement('label');
    label.setAttribute('for', `qty-input-${product.sku}`);
    label.textContent = `${product.name} (${formatCents(product.price_cents)}) — quantity`;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.value = '0';
    input.id = `qty-input-${product.sku}`;
    input.setAttribute('data-testid', `qty-input-${product.sku}`);
    input.setAttribute('data-sku', product.sku);

    row.append(label, input);
    container.append(row);
  }
}

function collectItems() {
  const items = [];
  const inputs = document.querySelectorAll('#product-quantities input[data-sku]');
  for (const input of inputs) {
    const qty = Number.parseInt(input.value, 10);
    if (Number.isInteger(qty) && qty > 0) {
      items.push({ sku: input.dataset.sku, qty });
    }
  }
  return items;
}

function renderQuoteResult(quote) {
  document.querySelector('[data-testid="quote-subtotal"]').textContent = formatCents(quote.subtotal_cents);
  document.querySelector('[data-testid="quote-shipping-fee"]').textContent = formatCents(quote.shipping.shipping_fee_cents);
  document.querySelector('[data-testid="quote-total"]').textContent = formatCents(quote.total_cents);
  document.querySelector('[data-testid="quote-threshold"]').textContent = formatCents(quote.shipping.threshold_cents);
  document.querySelector('[data-testid="quote-remaining"]').textContent = formatCents(quote.shipping.amount_remaining_cents);

  const messageEl = document.querySelector('[data-testid="quote-shipping-message"]');
  if (quote.shipping.free_shipping) {
    messageEl.textContent = 'Free shipping applied.';
  } else {
    messageEl.textContent = `Add ${formatCents(quote.shipping.amount_remaining_cents)} more to reach the ${formatCents(quote.shipping.threshold_cents)} free-shipping threshold for your customer type.`;
  }

  document.getElementById('quote-result').hidden = false;
}

function showError(message) {
  const errorEl = document.getElementById('quote-error');
  errorEl.textContent = message;
  errorEl.hidden = false;
  document.getElementById('quote-result').hidden = true;
}

function hideError() {
  const errorEl = document.getElementById('quote-error');
  errorEl.hidden = true;
  errorEl.textContent = '';
}

async function handleSubmit(event) {
  event.preventDefault();
  hideError();

  const customerType = document.getElementById('customer-type').value;
  const items = collectItems();

  if (items.length === 0) {
    showError('Select a quantity greater than zero for at least one item.');
    return;
  }

  const { ok, status, body } = await fetchJson('/api/checkout/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerType, items }),
  });

  if (!ok || !body) {
    showError((body && body.error) || `Unable to get a shipping quote (status ${status}).`);
    return;
  }

  renderQuoteResult(body);
}

document.getElementById('quote-form').addEventListener('submit', handleSubmit);
loadProductQuantityInputs();
