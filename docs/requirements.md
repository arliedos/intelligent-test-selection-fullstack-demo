# ShopSphere Requirements

Stable requirement IDs referenced from `test-metadata/test-catalog.json`
and `test-metadata/traceability.json`. ShopSphere is a **synthetic demo
application**: no database, no network calls, no real payment processing,
no real authentication, no real customer data.

## Health

- **REQ-HEALTH-001**: `GET /api/health` returns `200` with
  `{"status":"ok"}` whenever the process is up. This is the mandatory
  health smoke requirement.

## Catalogue

- **REQ-CATALOGUE-001**: `GET /api/products` returns the full, deterministic,
  in-memory product catalogue (stable order, stable `sku`/`name`/`price_cents`
  fields) and the catalogue page (`/index.html`) renders every returned
  product using the real API response (no hardcoded product list in the
  page).

## Shipping / checkout

- **REQ-SHIP-001**: `shipping-policy.json` is loaded from disk at process
  startup (`server/shipping.js`, not hardcoded) and validated: the
  content must parse as a JSON object, both the `standard` and `loyalty`
  tiers must be present as objects, and each tier's
  `free_shipping_threshold_cents` and `flat_fee_cents` must be
  non-negative safe integers (`Number.isSafeInteger`). A missing,
  unreadable, malformed, or otherwise invalid policy file must fail the
  process fast at startup rather than serving requests against
  unvalidated config.

- **REQ-SHIP-002**: Standard-tier customers receive free shipping once
  their cart subtotal is greater than or equal to the standard tier's
  `free_shipping_threshold_cents` from `shipping-policy.json`.
  **Baseline** (`main`, tag `fullstack-demo-baseline`): standard threshold
  is `5000` cents. **Target** (`feature/tiered-shipping-policy`): standard
  threshold is `7500` cents.

- **REQ-SHIP-003**: Loyalty-tier customers receive free shipping once their
  cart subtotal is greater than or equal to the loyalty tier's
  `free_shipping_threshold_cents`. This threshold is `5000` cents on
  **both** the baseline and the target branch (unchanged by the tiered-
  shipping-policy change).

- **REQ-SHIP-004**: Whenever a cart's subtotal is below the applicable
  tier's threshold, the flat `shipping_fee_cents` from `shipping-policy.json`
  (`799` cents in both branches) is charged; otherwise the shipping fee is
  `0`.

- **REQ-SHIP-005**: The checkout quote response reports
  `threshold_cents`, `free_shipping`, `shipping_fee_cents`, and
  `amount_remaining_cents` (the cents still needed to reach free shipping,
  `0` when already free) with exact boundary correctness: a subtotal
  exactly equal to the threshold is free; one cent under is not.

- **REQ-CHECKOUT-VALID-001**: `POST /api/checkout/quote` validates its
  input and responds `400` (or `413` for an oversized body) for: an
  unrecognised or missing `customerType`, a missing/non-array/empty/
  over-long (more than 100 entries) `items` list, an item with an unknown
  `sku`, and a `qty` that is not a safe-integer (`Number.isSafeInteger`)
  positive value no greater than 1000. Line subtotal, cart subtotal, and
  total math (`server/safe-math.js`) is checked against
  `Number.isSafeInteger` at every step and responds `400` rather than a
  silently imprecise total if a computed value would ever fall outside
  that range. No response body ever contains a stack trace, file path, or
  the string "stack".

- **REQ-UI-CHECKOUT-001**: The checkout page (`/checkout.html`) presents a
  shipping quote sourced entirely from the real `POST /api/checkout/quote`
  response (subtotal, shipping fee, total, and a shipping message derived
  from the response's `threshold_cents`/`free_shipping` fields) for both
  `standard` and `loyalty` customer types. On the baseline branch this
  messaging reflects the $50.00 threshold value returned by the API (both
  tiers are 5000 cents at baseline). On the target branch, the UI
  additionally and explicitly presents the applicable per-tier threshold,
  the amount remaining to reach free shipping, and the free-shipping
  result, all sourced from the API response fields defined in
  REQ-SHIP-005 (not hardcoded).

- **REQ-UI-CHECKOUT-A11Y-001**: The checkout page exposes standard
  accessibility semantics: a `navigation` landmark, a `main` landmark, an
  `h1`, form controls with programmatically associated labels (customer
  type select, per-product quantity inputs), a `button` with an
  accessible name, an error region with `role="alert"`, and a result
  region with `role="status"` and an accessible name.

## Profile

- **REQ-PROFILE-001**: `GET /api/profile` and `PUT /api/profile` read and
  update an in-memory profile (`name`, `email`), addressed by an `id`
  query parameter (defaulting to the seeded `demo-customer` profile when
  omitted). `PUT` validates a non-empty `name` and a syntactically valid
  `email`, rejecting invalid input with `400`. Profiles are independent by
  `id` — tests that mutate a profile use their own unique `id` so runs
  stay deterministic and parallel-safe without a shared reset endpoint.
  The profile page (`/profile.html`) reads and writes this API using the
  same `id` query-parameter convention.

## Critical journey

- **REQ-JOURNEY-001** (mandatory, critical): The full user journey —
  browsing the catalogue, navigating to checkout, selecting a customer
  type and item quantities, and receiving a shipping quote — must succeed
  end-to-end through the real browser UI calling the real API (no mocked
  `fetch`, no stubbed network layer).

## Contract

- **REQ-CONTRACT-001**: Every shipping-related field the checkout API
  returns (`subtotal_cents`, `shipping.shipping_fee_cents`,
  `shipping.free_shipping`, `shipping.threshold_cents`, `total_cents`) is
  faithfully and exactly reflected by the rendered checkout UI for the
  same cart, verified by directly comparing a live API response against
  the live-rendered UI (not a hardcoded expected value in the test).

## Test metadata integrity

- **REQ-META-001**: `test-metadata/test-catalog.json`'s selectors must
  exactly match real Playwright collection (`npx playwright test --list`)
  across both projects — no selector collected-but-not-catalogued, none
  catalogued-but-not-collected, and no duplicate selectors or duplicate
  IDs. Every requirement ID referenced from the catalog or from
  `test-metadata/traceability.json` must be documented in this file, and
  every test ID referenced from `test-metadata/critical-journeys.json`
  must exist in the catalog. Enforced by `scripts/verify-metadata.js` and
  `tests/quality/verify-metadata.spec.js` (catalog ID A01).
