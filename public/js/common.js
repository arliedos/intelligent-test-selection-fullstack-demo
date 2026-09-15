function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function fetchJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    // Network-level failure (connection refused/aborted/DNS, etc.) --
    // fetch() itself rejected rather than resolving with a response.
    // Normalize to the same shape callers already check (`ok`/`body`)
    // instead of letting the rejection propagate uncaught.
    return { ok: false, status: 0, body: null };
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body };
}
