// @test-id A01
const { test, expect } = require('@playwright/test');
const {
  REPO_ROOT,
  loadJson,
  collectPlaywrightSelectors,
  flattenCatalogSelectors,
  diffSelectors,
  extractRequirementIds,
  collectReferencedRequirements,
  findUnknownRequirements,
  collectCatalogTestIds,
  findDuplicateCatalogIds,
  collectCriticalJourneyTestIds,
  findUnknownCriticalJourneyRefs,
  runAllChecks,
} = require('../../scripts/verify-metadata');

test.describe('A01 metadata-integrity validation', () => {
  test('catalog selectors exactly match real Playwright collection', async () => {
    const catalog = loadJson('test-metadata/test-catalog.json');
    const catalogSelectors = flattenCatalogSelectors(catalog);
    const collected = collectPlaywrightSelectors(REPO_ROOT);

    const diff = diffSelectors(catalogSelectors, collected);

    expect([...diff.missingInCatalog]).toEqual([]);
    expect([...diff.missingInCollection]).toEqual([]);
    expect([...diff.duplicates]).toEqual([]);
  });

  test('detects a selector collected but missing from the catalog', async () => {
    const catalogSelectors = ['[api] tests/a.spec.js:1:1 title one'];
    const collected = ['[api] tests/a.spec.js:1:1 title one', '[api] tests/a.spec.js:2:1 title two'];

    const diff = diffSelectors(catalogSelectors, collected);

    expect([...diff.missingInCatalog]).toEqual(['[api] tests/a.spec.js:2:1 title two']);
    expect([...diff.missingInCollection]).toEqual([]);
  });

  test('detects a catalogued selector not actually collected', async () => {
    const catalogSelectors = ['[api] tests/a.spec.js:1:1 title one', '[api] tests/a.spec.js:9:1 title gone'];
    const collected = ['[api] tests/a.spec.js:1:1 title one'];

    const diff = diffSelectors(catalogSelectors, collected);

    expect([...diff.missingInCollection]).toEqual(['[api] tests/a.spec.js:9:1 title gone']);
    expect([...diff.missingInCatalog]).toEqual([]);
  });

  test('detects a duplicate selector within the catalog', async () => {
    const catalogSelectors = ['[api] tests/a.spec.js:1:1 title one', '[api] tests/a.spec.js:1:1 title one'];
    const collected = ['[api] tests/a.spec.js:1:1 title one'];

    const diff = diffSelectors(catalogSelectors, collected);

    expect([...diff.duplicates]).toEqual(['[api] tests/a.spec.js:1:1 title one']);
  });

  test('detects a requirement id referenced but not documented', async () => {
    const known = new Set(['REQ-AUTH-001']);
    const referenced = new Set(['REQ-AUTH-001', 'REQ-DOES-NOT-EXIST-999']);

    const unknown = findUnknownRequirements(referenced, known);

    expect([...unknown]).toEqual(['REQ-DOES-NOT-EXIST-999']);
  });

  test('detects a critical-journey test id missing from the catalog', async () => {
    const journeyIds = new Set(['T01', 'T99']);
    const catalogIds = ['T01', 'T02'];

    const unknown = findUnknownCriticalJourneyRefs(journeyIds, catalogIds);

    expect([...unknown]).toEqual(['T99']);
  });

  test('detects a duplicate catalog id', async () => {
    const ids = ['T01', 'T02', 'T01'];

    const duplicates = findDuplicateCatalogIds(ids);

    expect([...duplicates]).toEqual(['T01']);
  });

  test('run-all-checks passes on the real repository', async () => {
    const report = runAllChecks(REPO_ROOT);

    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test('every requirement referenced by the real catalog/traceability is documented', async () => {
    const catalog = loadJson('test-metadata/test-catalog.json');
    const traceability = loadJson('test-metadata/traceability.json');
    const fs = require('node:fs');
    const path = require('node:path');
    const requirementsText = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'requirements.md'), 'utf-8');

    const known = extractRequirementIds(requirementsText);
    const referenced = collectReferencedRequirements(catalog, traceability);
    const unknown = findUnknownRequirements(referenced, known);

    expect([...unknown]).toEqual([]);
  });

  test('the real catalog has no duplicate IDs and every critical-journey ref resolves', async () => {
    const catalog = loadJson('test-metadata/test-catalog.json');
    const criticalJourneys = loadJson('test-metadata/critical-journeys.json');

    const catalogIds = collectCatalogTestIds(catalog);
    expect([...findDuplicateCatalogIds(catalogIds)]).toEqual([]);

    const journeyIds = collectCriticalJourneyTestIds(criticalJourneys);
    expect([...findUnknownCriticalJourneyRefs(journeyIds, catalogIds)]).toEqual([]);
    expect(['T01', 'T05', 'T11', 'T12'].every((id) => journeyIds.has(id))).toBe(true);
  });
});
