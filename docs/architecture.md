# ShopSphere Architecture

ShopSphere is a synthetic, single-process full-stack JavaScript application
built to give a read-only regression-suite-selection agent something real
to reason about. There is no database, no network integrations beyond the
app's own HTTP server, no real payment processing (checkout only ever
returns a deterministic shipping *quote*), and no randomness anywhere in
the application.

## Backend (`server/`)

| Module | Responsibility |
|---|---|
| `server/app.js` | Express app factory: JSON body parsing (100kb limit), static file serving from `public/`, the route router, a 404 handler, and a final error-handling middleware that never leaks stack traces. |
| `server/index.js` | Process entrypoint: binds the port, handles `SIGINT`/`SIGTERM` for graceful shutdown. |
| `server/routes/index.js` | All route handlers: `GET /api/health`, `GET /api/products`, `POST /api/checkout/quote`, `GET`/`PUT /api/profile`. |
| `server/data/products.js` | Deterministic in-memory product catalogue (`listProducts`, `findBySku`). |
| `server/data/profiles.js` | In-memory profile store keyed by `id`, seeded with one deterministic `demo-customer` profile. |
| `server/shipping.js` | Loads and validates `shipping-policy.json` from disk at process start; `quoteShipping(customerType, subtotalCents)` computes `threshold_cents`, `free_shipping`, `shipping_fee_cents`, `amount_remaining_cents`. |
| `server/checkout-validation.js` | `validateCheckoutBody` and the shared `ValidationError` (carries an HTTP `status` and a safe `publicMessage`, never a stack trace). |
| `server/profile-validation.js` | `validateProfileUpdate` (non-empty name, valid-shaped email). |

## Frontend (`public/`)

Semantic, accessible HTML/CSS/vanilla JS with no build step and no
framework, served directly by `express.static`. All three pages fetch the
real API at runtime — no mocked or hardcoded data.

| Page | Responsibility |
|---|---|
| `public/index.html` + `public/js/catalogue.js` | Lists every product from `GET /api/products`. |
| `public/checkout.html` + `public/js/checkout.js` | Customer-type selector, per-product quantity inputs (generated from `GET /api/products`), posts to `POST /api/checkout/quote`, renders the result using `textContent` only (never `innerHTML`, per the no-unsafe-HTML-insertion requirement). |
| `public/profile.html` + `public/js/profile.js` | Reads/writes a profile via `GET`/`PUT /api/profile?id=...`, defaulting to the seeded `demo-customer` id when no `id` query parameter is present. |
| `public/js/common.js` | Shared `formatCents` and `fetchJson` helpers. |

## Dependency graph

```
frontend.catalogue --> server.products
frontend.profile   --> server.profile
frontend.checkout  --> server.products
frontend.checkout  --> server.checkout --> server.products
                                        --> server.shipping --> config.shipping-policy (shipping-policy.json)
```

The machine-readable form lives in `docs/dependency-map.json`. Per its
`independence_caveat`, catalogue and profile are independent of the
checkout/shipping change chain specifically, but all routes share the same
Express process — see that file before assuming full runtime isolation.

## Config, not decoration

`shipping-policy.json`'s `standard`/`loyalty` tier objects
(`free_shipping_threshold_cents`, `flat_fee_cents`) are read from disk by
`server/shipping.js:loadShippingPolicy()` once at process startup (not
hardcoded, not re-derived from a test double) and validated: both tiers
must be present and both fields must be non-negative integers, or the
process fails fast. The **baseline** and **target** git refs differ in
this file's committed content (see `docs/requirements.md`'s REQ-SHIP-002),
which is a real, loaded, behavioural change, not metadata.

## Test layout

Tests live under `tests/` and map to catalog IDs T01-T15 (plus A01) as
described in `test-metadata/test-catalog.json`. Two Playwright projects
partition execution by directory with no overlap: `api` (`tests/api/**`,
`tests/quality/**`, no browser) and `ui` (`tests/ui/**`, `tests/e2e/**`,
`tests/contract/**`, Chromium). Some catalog IDs cover multiple Playwright
test cases; every collected test is catalogued under exactly one ID — see
`test-metadata/traceability.json` and `scripts/verify-metadata.js`.

## What is synthetic vs. measured vs. unavailable

- `test-metadata/synthetic-execution-history.json` and the duration
  estimates in `test-metadata/execution-constraints.json` are **fabricated**
  planning-only metadata, explicitly labelled `synthetic`/
  `synthetic_planning_estimate`. Neither reflects any observed run.
- Local run output (`npx playwright test` pass/fail counts,
  `reports/junit.xml`, `playwright-report/`) referenced in `README.md` and
  in the local evaluator-only `fullstack-evaluator/tdd-evidence.md` file is
  **measured** — produced by actually running the commands documented
  there.
- CI evidence is revision-specific. Do not infer it from this document;
  verify the current GitHub Actions run at the exact revision and inspect
  its uploaded artifacts before claiming CI-verified results.
- `npm audit --omit=dev` output referenced in `README.md` is measured at
  the time it was run; it is not a guarantee for later dependency states,
  and passing it is not proof of zero risk (see README's security section).
