# Change Scenarios

This document describes the **baseline** and **target** behaviors that
differ between this repository's `main` branch (tag
`fullstack-demo-baseline`) and its `feature/tiered-shipping-policy`
branch. It intentionally does **not** state which test-catalog IDs a
selection agent should choose for this diff — that expected-selection
judgement is kept in an evaluator-only file outside this repository and is
never supplied to an agent under test as context.

## Baseline — `main`, tag `fullstack-demo-baseline`

- `shipping-policy.json`: both the `standard` and `loyalty` tiers have
  `free_shipping_threshold_cents: 5000` and `flat_fee_cents: 799`.
- `server/shipping.js`'s `quoteShipping()` looks up the tier generically
  by `customerType` — the same code serves both tiers; only the config
  values happen to be identical at baseline.
- The checkout page (`public/checkout.html` + `public/js/checkout.js`)
  renders subtotal, shipping fee, and total, plus a shipping message
  derived from the API's `threshold_cents`/`free_shipping` fields:
  `"Free shipping on orders over $50.00."` when not yet free, or
  `"Free shipping applied."` when free. It does not separately surface
  `amount_remaining_cents` or a distinct per-tier threshold display.

## Target — `feature/tiered-shipping-policy`

- `shipping-policy.json`: the `standard` tier's
  `free_shipping_threshold_cents` changes to `7500`; the `loyalty` tier's
  threshold is unchanged at `5000`. `flat_fee_cents` (`799`) is unchanged
  for both tiers.
- No change to `server/shipping.js`'s logic — the threshold change is a
  genuine, loaded **config** change (REQ-SHIP-002), not a code-logic
  change (the generic tier lookup already handled differing threshold
  values; baseline just happened to configure equal ones).
- The checkout page's frontend JS is extended to explicitly present, for
  the customer's selected tier, the applicable free-shipping threshold,
  the `amount_remaining_cents` still needed to reach it, and a clearer
  free-shipping result indicator — all sourced from the same
  `POST /api/checkout/quote` response fields already defined in
  REQ-SHIP-005, not hardcoded.
- `test-metadata/test-catalog.json` and the standard/loyalty-tier UI test
  files are updated accordingly to reflect the new threshold value and the
  additional rendered fields. `docs/requirements.md` is shared scenario
  context and already describes both baseline and target acceptance criteria.

## Change classification (for a selection agent to reason about, not a suite answer)

- **Direct backend/config impact:** `shipping-policy.json` (the standard
  tier's threshold value) is a loaded, validated runtime config file —
  see `docs/dependency-map.json`'s `config_files` entry and
  `docs/test-selection-policy.md`'s config-changes-are-code-changes rule.
- **Direct frontend impact:** `public/js/checkout.js` /
  `public/checkout.html` (new threshold/remaining/free-shipping display
  elements and their `data-testid`s).
- **Direct contract impact:** the checkout API's response shape is
  unchanged (same fields), but the *value* of `shipping.threshold_cents`
  for `standard` customers changes — exactly the kind of value-only
  contract drift the catalog's contract-test coverage (requirement
  `REQ-CONTRACT-001`) exists to catch. The standard tier's baseline
  threshold-messaging assertion no longer holds on the target branch; the
  loyalty tier's threshold value is unaffected.
- **Direct accessibility impact:** the new threshold/remaining/free-
  shipping elements added to the checkout page must carry the same
  accessible-semantics guarantees as the rest of the page (requirement
  `REQ-UI-CHECKOUT-A11Y-001`).
- **Unrelated areas, explicitly:** `server/routes/index.js`'s
  `/api/health`, `/api/products`, and `/api/profile` handlers,
  `server/data/products.js`, `server/data/profiles.js`,
  `public/index.html`/`public/js/catalogue.js`, and
  `public/profile.html`/`public/js/profile.js` are all unchanged by this
  diff.
- **Mandatory/critical, independent of scope:** the catalog's protected
  tests (`test-metadata/critical-journeys.json`'s `protected_test_ids`)
  remain required regardless of the above classification.
