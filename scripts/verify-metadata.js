// Metadata integrity verification (REQ-META-001).
//
// Checks that:
//   1. test-metadata/test-catalog.json selectors exactly match real
//      Playwright collection (npx playwright test --list) -- no selector
//      collected-but-not-catalogued, none catalogued-but-not-collected,
//      and no duplicate selectors.
//   2. every requirement ID referenced from test-catalog.json or
//      traceability.json is actually documented in docs/requirements.md.
//   3. every test ID referenced from critical-journeys.json exists in the
//      test catalog.
//   4. no catalog "id" is duplicated.
//   5. every catalog group has well-formed required fields (schema).
//   6. requirement<->test-ID mapping is bidirectionally consistent between
//      the catalog's per-group "requirements" and traceability.json's
//      per-requirement "tests" (asymmetry in either direction is an issue).
//   7. every test ID referenced from traceability.json exists in the
//      catalog (a broken cross-file ref, distinct from #6's set-level
//      asymmetry check, reported with its own clearer message).
//   8. every component referenced from the catalog's "components" or
//      critical-journeys.json's "component_chain" exists in
//      docs/dependency-map.json's "nodes" list.
//   9. the catalog's "mandatory": true groups exactly match
//      critical-journeys.json's protected_test_ids (bidirectionally).
//  10. redundancy links are bidirectionally consistent between a catalog
//      group's "redundancy" field and redundancy-evidence.json.
//  11. execution-constraints.json has a duration estimate for exactly the
//      real catalog IDs (no missing, no unknown), and every constraint
//      scenario's protected_test_ids set matches critical-journeys.json's
//      protected_test_ids exactly.
//
// This script establishes structural/dependency/cross-reference
// consistency of the test metadata itself. It does not measure, and must
// never be read as claiming, actual semantic code coverage -- that is a
// property of the tests' assertions, not of this metadata.
//
// Run directly: `node scripts/verify-metadata.js` (exit 0 = OK, 1 = FAILED).
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const REQ_ID_PATTERN = /REQ-[A-Z0-9-]+-\d+/g;
const VALID_LAYERS = new Set(['backend-api', 'frontend-ui', 'fullstack', 'quality']);
const VALID_CRITICALITIES = new Set(['low', 'medium', 'high', 'critical']);

function loadJson(relativePath) {
  const raw = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
  return JSON.parse(raw);
}

function normalizeSelector(selector) {
  return selector.replace(/\\/g, '/').replace(/\s+/g, ' ').trim();
}

function collectPlaywrightSelectors(repoRoot) {
  const output = execFileSync(
    'npx',
    ['playwright', 'test', '--list'],
    { cwd: repoRoot, encoding: 'utf-8', shell: true }
  );

  const selectors = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.includes('›')) {
      selectors.push(normalizeSelector(trimmed));
    }
  }
  return selectors;
}

function flattenCatalogSelectors(catalog) {
  const selectors = [];
  for (const group of catalog.groups) {
    for (const selector of group.selectors) {
      selectors.push(normalizeSelector(selector));
    }
  }
  return selectors;
}

function diffSelectors(catalogSelectors, collected) {
  const catalogList = [...catalogSelectors];
  const catalogSet = new Set(catalogList);
  const collectedSet = new Set(collected);

  const duplicates = new Set(
    catalogList.filter((selector, index) => catalogList.indexOf(selector) !== index)
  );
  const missingInCatalog = new Set([...collectedSet].filter((s) => !catalogSet.has(s)));
  const missingInCollection = new Set([...catalogSet].filter((s) => !collectedSet.has(s)));

  return { missingInCatalog, missingInCollection, duplicates };
}

function extractRequirementIds(text) {
  return new Set(text.match(REQ_ID_PATTERN) || []);
}

function collectReferencedRequirements(catalog, traceability) {
  const referenced = new Set();
  for (const group of catalog.groups) {
    for (const req of group.requirements || []) {
      referenced.add(req);
    }
  }
  for (const req of Object.keys(traceability.requirements || {})) {
    referenced.add(req);
  }
  return referenced;
}

function findUnknownRequirements(referenced, known) {
  return new Set([...referenced].filter((r) => !known.has(r)));
}

function collectCatalogTestIds(catalog) {
  return catalog.groups.map((group) => group.id);
}

function findDuplicateCatalogIds(ids) {
  return new Set(ids.filter((id, index) => ids.indexOf(id) !== index));
}

function collectCriticalJourneyTestIds(criticalJourneys) {
  const ids = new Set(criticalJourneys.protected_test_ids || []);
  for (const journey of criticalJourneys.journeys || []) {
    for (const id of journey.protected_test_ids || []) {
      ids.add(id);
    }
    if (journey.primary_test_id) {
      ids.add(journey.primary_test_id);
    }
  }
  return ids;
}

function findUnknownCriticalJourneyRefs(journeyIds, catalogIds) {
  const catalogIdSet = new Set(catalogIds);
  return new Set([...journeyIds].filter((id) => !catalogIdSet.has(id)));
}

function validateCatalogSchema(catalog) {
  const issues = [];
  for (const group of catalog.groups || []) {
    const id = typeof group.id === 'string' && group.id.length > 0 ? group.id : '<missing id>';
    if (typeof group.id !== 'string' || group.id.length === 0) {
      issues.push(`catalog group has a missing/invalid "id": ${JSON.stringify(group.id)}`);
    }
    if (typeof group.title !== 'string' || group.title.length === 0) {
      issues.push(`${id}: missing/invalid "title"`);
    }
    if (!VALID_LAYERS.has(group.layer)) {
      issues.push(`${id}: invalid "layer" ${JSON.stringify(group.layer)} (expected one of ${[...VALID_LAYERS].join(', ')})`);
    }
    if (!Array.isArray(group.components) || group.components.length === 0
      || group.components.some((c) => typeof c !== 'string' || c.length === 0)) {
      issues.push(`${id}: "components" must be a non-empty array of non-empty strings`);
    }
    if (!Array.isArray(group.requirements)
      || group.requirements.some((r) => typeof r !== 'string' || r.length === 0)) {
      issues.push(`${id}: "requirements" must be an array of non-empty strings`);
    }
    if (!Array.isArray(group.journeys)) {
      issues.push(`${id}: "journeys" must be an array`);
    }
    if (typeof group.mandatory !== 'boolean') {
      issues.push(`${id}: "mandatory" must be a boolean`);
    }
    if (!VALID_CRITICALITIES.has(group.criticality)) {
      issues.push(`${id}: invalid "criticality" ${JSON.stringify(group.criticality)} (expected one of ${[...VALID_CRITICALITIES].join(', ')})`);
    }
    if (!group.synthetic_historical_signal || typeof group.synthetic_historical_signal !== 'object'
      || typeof group.synthetic_historical_signal.flaky !== 'boolean') {
      issues.push(`${id}: "synthetic_historical_signal.flaky" must be a boolean`);
    }
    if (!Array.isArray(group.prerequisites) || group.prerequisites.length === 0) {
      issues.push(`${id}: "prerequisites" must be a non-empty array`);
    }
    if (typeof group.owner_role !== 'string' || group.owner_role.length === 0) {
      issues.push(`${id}: missing/invalid "owner_role"`);
    }
    if (!Array.isArray(group.selectors) || group.selectors.length === 0
      || group.selectors.some((s) => typeof s !== 'string' || s.length === 0)) {
      issues.push(`${id}: "selectors" must be a non-empty array of non-empty strings`);
    }
  }
  return issues;
}

function collectCatalogRequirementTestPairs(catalog) {
  const pairs = new Set();
  for (const group of catalog.groups || []) {
    for (const req of group.requirements || []) {
      pairs.add(`${req}::${group.id}`);
    }
  }
  return pairs;
}

function collectTraceabilityRequirementTestPairs(traceability) {
  const pairs = new Set();
  for (const [req, entry] of Object.entries(traceability.requirements || {})) {
    for (const testId of entry.tests || []) {
      pairs.add(`${req}::${testId}`);
    }
  }
  return pairs;
}

function findAsymmetricRequirementTestPairs(catalogPairs, traceabilityPairs) {
  return {
    missingInTraceability: new Set([...catalogPairs].filter((p) => !traceabilityPairs.has(p))),
    missingInCatalog: new Set([...traceabilityPairs].filter((p) => !catalogPairs.has(p))),
  };
}

function collectTraceabilityTestIds(traceability) {
  const ids = new Set();
  for (const entry of Object.values(traceability.requirements || {})) {
    for (const id of entry.tests || []) {
      ids.add(id);
    }
  }
  return ids;
}

function findBrokenTraceabilityTestRefs(traceabilityTestIds, catalogIds) {
  const catalogIdSet = new Set(catalogIds);
  return new Set([...traceabilityTestIds].filter((id) => !catalogIdSet.has(id)));
}

function collectDependencyMapComponents(dependencyMap) {
  return new Set(dependencyMap.nodes || []);
}

function findUnknownComponents(catalog, criticalJourneys, knownComponents) {
  const unknown = new Set();
  for (const group of catalog.groups || []) {
    for (const component of group.components || []) {
      if (!knownComponents.has(component)) {
        unknown.add(component);
      }
    }
  }
  for (const journey of criticalJourneys.journeys || []) {
    for (const component of journey.component_chain || []) {
      if (!knownComponents.has(component)) {
        unknown.add(component);
      }
    }
  }
  return unknown;
}

function findMandatoryConsistencyIssues(catalog, criticalJourneys) {
  const mandatoryIds = new Set((catalog.groups || []).filter((g) => g.mandatory === true).map((g) => g.id));
  const protectedIds = new Set(criticalJourneys.protected_test_ids || []);
  return {
    mandatoryNotProtected: new Set([...mandatoryIds].filter((id) => !protectedIds.has(id))),
    protectedNotMandatory: new Set([...protectedIds].filter((id) => !mandatoryIds.has(id))),
  };
}

function findRedundancyLinkIssues(catalog, redundancyEvidence) {
  const issues = [];
  const catalogIds = new Set((catalog.groups || []).map((g) => g.id));

  for (const group of catalog.groups || []) {
    if (group.redundancy) {
      const target = group.redundancy.demonstrably_equivalent_to;
      if (!catalogIds.has(target)) {
        issues.push(`${group.id}: redundancy.demonstrably_equivalent_to references unknown catalog id ${JSON.stringify(target)}`);
      }
    }
  }

  if (redundancyEvidence && redundancyEvidence.candidate) {
    const candidateGroup = (catalog.groups || []).find((g) => g.id === redundancyEvidence.candidate);
    if (!candidateGroup) {
      issues.push(`redundancy-evidence.json candidate ${JSON.stringify(redundancyEvidence.candidate)} does not exist in the catalog`);
    } else if (!candidateGroup.redundancy
      || candidateGroup.redundancy.demonstrably_equivalent_to !== redundancyEvidence.equivalent_to) {
      issues.push(`redundancy-evidence.json candidate ${JSON.stringify(redundancyEvidence.candidate)} is not cross-linked to ${JSON.stringify(redundancyEvidence.equivalent_to)} via the catalog's own "redundancy" field`);
    }
  }

  return issues;
}

function findExecutionConstraintsIssues(catalog, criticalJourneys, executionConstraints) {
  const issues = [];
  const catalogIds = new Set((catalog.groups || []).map((g) => g.id));
  const estimateIds = new Set((executionConstraints.estimates || []).map((e) => e.test_id));

  const missingEstimates = new Set([...catalogIds].filter((id) => !estimateIds.has(id)));
  if (missingEstimates.size > 0) {
    issues.push(`execution-constraints.json is missing a duration estimate for catalog IDs: ${[...missingEstimates].sort().join('; ')}`);
  }
  const unknownEstimates = new Set([...estimateIds].filter((id) => !catalogIds.has(id)));
  if (unknownEstimates.size > 0) {
    issues.push(`execution-constraints.json estimates reference unknown catalog IDs: ${[...unknownEstimates].sort().join('; ')}`);
  }

  const protectedIds = new Set(criticalJourneys.protected_test_ids || []);
  for (const scenario of executionConstraints.constraint_scenarios || []) {
    const scenarioProtected = new Set(scenario.protected_test_ids || []);
    const missing = [...protectedIds].filter((id) => !scenarioProtected.has(id)).sort();
    const extra = [...scenarioProtected].filter((id) => !protectedIds.has(id)).sort();
    if (missing.length > 0 || extra.length > 0) {
      issues.push(`execution-constraints.json scenario ${JSON.stringify(scenario.id)}'s protected_test_ids does not match critical-journeys.json's protected_test_ids (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`);
    }
  }

  return issues;
}

function runAllChecks(repoRoot) {
  const issues = [];

  const catalog = loadJson('test-metadata/test-catalog.json');
  const traceability = loadJson('test-metadata/traceability.json');
  const criticalJourneys = loadJson('test-metadata/critical-journeys.json');
  const dependencyMap = loadJson('docs/dependency-map.json');
  const redundancyEvidence = loadJson('test-metadata/redundancy-evidence.json');
  const executionConstraints = loadJson('test-metadata/execution-constraints.json');
  const requirementsText = fs.readFileSync(path.join(repoRoot, 'docs', 'requirements.md'), 'utf-8');

  const catalogSelectors = flattenCatalogSelectors(catalog);
  const collected = collectPlaywrightSelectors(repoRoot);
  const selectorDiff = diffSelectors(catalogSelectors, collected);

  if (selectorDiff.missingInCatalog.size > 0) {
    issues.push(`selectors collected but not catalogued: ${[...selectorDiff.missingInCatalog].sort().join('; ')}`);
  }
  if (selectorDiff.missingInCollection.size > 0) {
    issues.push(`catalogued selectors not collected by Playwright: ${[...selectorDiff.missingInCollection].sort().join('; ')}`);
  }
  if (selectorDiff.duplicates.size > 0) {
    issues.push(`duplicate selectors in catalog: ${[...selectorDiff.duplicates].sort().join('; ')}`);
  }

  issues.push(...validateCatalogSchema(catalog));

  const knownRequirements = extractRequirementIds(requirementsText);
  const referencedRequirements = collectReferencedRequirements(catalog, traceability);
  const unknownRequirements = findUnknownRequirements(referencedRequirements, knownRequirements);
  if (unknownRequirements.size > 0) {
    issues.push(`requirement IDs referenced but not documented in docs/requirements.md: ${[...unknownRequirements].sort().join('; ')}`);
  }

  const catalogIds = collectCatalogTestIds(catalog);
  const duplicateIds = findDuplicateCatalogIds(catalogIds);
  if (duplicateIds.size > 0) {
    issues.push(`duplicate catalog IDs: ${[...duplicateIds].sort().join('; ')}`);
  }

  const journeyIds = collectCriticalJourneyTestIds(criticalJourneys);
  const unknownJourneyRefs = findUnknownCriticalJourneyRefs(journeyIds, catalogIds);
  if (unknownJourneyRefs.size > 0) {
    issues.push(`critical-journeys.json references test IDs missing from the catalog: ${[...unknownJourneyRefs].sort().join('; ')}`);
  }

  const catalogPairs = collectCatalogRequirementTestPairs(catalog);
  const traceabilityPairs = collectTraceabilityRequirementTestPairs(traceability);
  const asymmetry = findAsymmetricRequirementTestPairs(catalogPairs, traceabilityPairs);
  if (asymmetry.missingInTraceability.size > 0) {
    issues.push(`requirement/test pairs declared in the catalog but missing from traceability.json: ${[...asymmetry.missingInTraceability].sort().join('; ')}`);
  }
  if (asymmetry.missingInCatalog.size > 0) {
    issues.push(`requirement/test pairs declared in traceability.json but missing from the catalog: ${[...asymmetry.missingInCatalog].sort().join('; ')}`);
  }

  const traceabilityTestIds = collectTraceabilityTestIds(traceability);
  const brokenTraceabilityRefs = findBrokenTraceabilityTestRefs(traceabilityTestIds, catalogIds);
  if (brokenTraceabilityRefs.size > 0) {
    issues.push(`traceability.json references test IDs missing from the catalog: ${[...brokenTraceabilityRefs].sort().join('; ')}`);
  }

  const knownComponents = collectDependencyMapComponents(dependencyMap);
  const unknownComponents = findUnknownComponents(catalog, criticalJourneys, knownComponents);
  if (unknownComponents.size > 0) {
    issues.push(`components referenced but missing from docs/dependency-map.json's "nodes": ${[...unknownComponents].sort().join('; ')}`);
  }

  const mandatoryConsistency = findMandatoryConsistencyIssues(catalog, criticalJourneys);
  if (mandatoryConsistency.mandatoryNotProtected.size > 0) {
    issues.push(`catalog groups marked "mandatory": true but missing from critical-journeys.json's protected_test_ids: ${[...mandatoryConsistency.mandatoryNotProtected].sort().join('; ')}`);
  }
  if (mandatoryConsistency.protectedNotMandatory.size > 0) {
    issues.push(`critical-journeys.json protected_test_ids not marked "mandatory": true in the catalog: ${[...mandatoryConsistency.protectedNotMandatory].sort().join('; ')}`);
  }

  issues.push(...findRedundancyLinkIssues(catalog, redundancyEvidence));
  issues.push(...findExecutionConstraintsIssues(catalog, criticalJourneys, executionConstraints));

  return { ok: issues.length === 0, issues };
}

function main() {
  const report = runAllChecks(REPO_ROOT);
  if (report.ok) {
    // eslint-disable-next-line no-console
    console.log('verify-metadata: OK - catalog selectors, Playwright collection, requirement refs, and critical-journey refs are all consistent.');
    return 0;
  }

  // eslint-disable-next-line no-console
  console.log('verify-metadata: FAILED');
  for (const issue of report.issues) {
    // eslint-disable-next-line no-console
    console.log(`  - ${issue}`);
  }
  return 1;
}

module.exports = {
  REPO_ROOT,
  loadJson,
  normalizeSelector,
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
  validateCatalogSchema,
  collectCatalogRequirementTestPairs,
  collectTraceabilityRequirementTestPairs,
  findAsymmetricRequirementTestPairs,
  collectTraceabilityTestIds,
  findBrokenTraceabilityTestRefs,
  collectDependencyMapComponents,
  findUnknownComponents,
  findMandatoryConsistencyIssues,
  findRedundancyLinkIssues,
  findExecutionConstraintsIssues,
  runAllChecks,
};

if (require.main === module) {
  process.exitCode = main();
}
