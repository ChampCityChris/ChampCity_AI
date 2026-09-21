const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { exactKeys, validateInventoryFields } = require('./catalog-schema.cjs');
const LANES = ['affected-capability', 'desktop-platform', 'fast', 'full-regression', 'integration', 'migration', 'packaging', 'performance-soak', 'static'];
const ROOT = path.resolve(__dirname, '../..');
const sorted = xs => [...xs].sort();
function walk(root, directory = 'test') {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    assert.ok(!entry.isSymbolicLink(), `Catalog cannot traverse symbolic links: ${relative}`);
    return entry.isDirectory() ? walk(root, relative) : relative.endsWith('.test.cjs') ? [relative] : [];
  }).sort();
}
function relativePath(value) {
  assert.ok(typeof value === 'string' && value.length > 0 && !value.includes('\\') && !path.isAbsolute(value)
    && !value.split('/').some(part => !part || part === '.' || part === '..') && !value.includes(':'), 'Expected contained repository-relative path');
  return value;
}
function uniqueStrings(value, label) {
  assert.ok(Array.isArray(value) && value.every(x => typeof x === 'string' && x.trim()), `${label} must contain strings`);
  assert.deepEqual(value, sorted(new Set(value)), `${label} must be sorted and unique`);
}
function validateCatalog(catalog, root, { allowAdditionalTests = false } = {}) {
  exactKeys(catalog, ['schemaVersion', 'capabilities', 'tests'], 'catalog');
  assert.equal(catalog.schemaVersion, 4, 'Unknown catalog schema');
  assert.ok(Array.isArray(catalog.capabilities) && Array.isArray(catalog.tests), 'Missing catalog collections');
  const capabilities = new Map(), behaviors = new Map();
  uniqueStrings(catalog.capabilities.map(c => c.capabilityId), 'Capability identities');
  for (const capability of catalog.capabilities) {
    exactKeys(capability, ['capabilityId', 'description', 'sourcePatterns', 'dependsOn', 'behaviors'], 'capability');
    capabilities.set(capability.capabilityId, capability);
    uniqueStrings(capability.sourcePatterns, 'Source patterns');
    assert.ok(capability.sourcePatterns.length, 'Missing source ownership');
    capability.sourcePatterns.forEach(relativePath);
    uniqueStrings(capability.dependsOn, 'Capability dependencies');
    assert.ok(Array.isArray(capability.behaviors) && capability.behaviors.length, 'Missing behaviors');
    uniqueStrings(capability.behaviors.map(b => b.behaviorId), 'Behavior identities');
    for (const behavior of capability.behaviors) behaviors.set(`${capability.capabilityId}/${behavior.behaviorId}`, []);
  }
  for (const capability of capabilities.values()) for (const dependency of capability.dependsOn) {
    assert.ok(capabilities.has(dependency) && dependency !== capability.capabilityId, 'Invalid capability dependency');
  }
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    assert.ok(!visiting.has(id), 'Capability dependency cycle: ' + id);
    if (visited.has(id)) return;
    visiting.add(id); for (const dependency of capabilities.get(id).dependsOn) visit(dependency);
    visiting.delete(id); visited.add(id);
  }
  for (const id of capabilities.keys()) visit(id);
  uniqueStrings(catalog.tests.map(t => t.testPath), 'Test paths');
  const actualTests = walk(root);
  if (allowAdditionalTests) assert.ok(catalog.tests.every(t => actualTests.includes(t.testPath)), 'Candidate removed target-owned test proof');
  else assert.deepEqual(catalog.tests.map(t => t.testPath), actualTests, 'Catalog must exactly cover executable tests');
  for (const record of catalog.tests) {
    validateInventoryFields(record);
    relativePath(record.testPath);
    assert.ok(record.testPath.startsWith('test/') && record.testPath.endsWith('.test.cjs'), 'Invalid test path');
    assert.ok(LANES.includes(record.proposedValidationLane), `Invalid lane: ${record.testPath}`);
    assert.ok(record.execution && typeof record.execution.requiresBuild === 'boolean', 'Missing build requirement');
    assert.ok(['any', 'windows'].includes(record.execution.platform), 'Invalid platform');
    assert.equal(record.execution.platform, record.platformDependency === 'none' ? 'any' : record.platformDependency);
    uniqueStrings(record.execution.externalCapabilities, 'External capabilities');
    assert.ok(['estimated', 'measured'].includes(record.duration?.kind)
      && Number.isInteger(record.duration.milliseconds) && record.duration.milliseconds >= 0 && record.duration.basis, 'Invalid duration');
    for (const dependency of ['electron', 'filesystem', 'git', 'network', 'process', 'timing']) {
      assert.equal(typeof record.dependencies?.[dependency], 'boolean', 'Missing dependency metadata');
    }
    assert.ok(Array.isArray(record.behaviorCoverage) && record.behaviorCoverage.length, 'Missing behavior ownership');
    for (const proof of record.behaviorCoverage) {
      const owned = behaviors.get(`${proof.capabilityId}/${proof.behaviorId}`);
      assert.ok(owned && ['primary', 'supporting'].includes(proof.proofRole) && proof.proofLocator, 'Invalid proof reference');
      owned.push({ ...proof, testPath: record.testPath });
    }
  }
  for (const [identity, proofs] of behaviors) {
    const primary = proofs.filter(p => p.proofRole === 'primary');
    assert.equal(primary.length, 1, `Expected one primary proof for ${identity}`);
    for (const proof of proofs.filter(p => p.proofRole === 'supporting')) {
      assert.ok(['complementary', 'overlapping', 'redundant'].includes(proof.relationshipToPrimary), 'Invalid proof relationship');
      assert.deepEqual(proof.primaryProof, { testPath: primary[0].testPath, proofLocator: primary[0].proofLocator }, 'Unresolved primary proof');
    }
  }
  for (const record of catalog.tests) for (const proof of record.preferredProofs ?? []) {
    const primary = behaviors.get(`${proof.capabilityId}/${proof.behaviorId}`)?.find(p => p.proofRole === 'primary');
    assert.ok(primary && primary.testPath === proof.testPath && primary.proofLocator === proof.proofLocator
      && record.behaviorCoverage.some(p => p.capabilityId === proof.capabilityId && p.behaviorId === proof.behaviorId), 'Invalid preferred proof');
  }
  return catalog;
}
function loadCatalog(root = ROOT) {
  return validateCatalog(JSON.parse(fs.readFileSync(path.join(root, 'validation/capability-map.json'), 'utf8')), root);
}
module.exports = { LANES, ROOT, loadCatalog, validateCatalog, relativePath, uniqueStrings };
