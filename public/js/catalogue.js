async function renderCatalogue() {
  const list = document.querySelector('[data-testid="product-list"]');
  const errorEl = document.getElementById('catalogue-error');

  const { ok, body } = await fetchJson('/api/products');
  if (!ok || !body) {
    errorEl.textContent = 'Unable to load the product catalogue right now.';
    errorEl.hidden = false;
    return;
  }

  for (const product of body.products) {
    const item = document.createElement('li');
    item.className = 'product-item';
    item.setAttribute('data-testid', 'product-item');
    item.setAttribute('data-sku', product.sku);

    const name = document.createElement('span');
    name.textContent = product.name;

    const price = document.createElement('span');
    price.textContent = formatCents(product.price_cents);

    item.append(name, price);
    list.append(item);
  }
}

renderCatalogue();
