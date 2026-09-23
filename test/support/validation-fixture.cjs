const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ROOT, loadCatalog } = require('../../scripts/validation/catalog.cjs');
function applyValidationLaneFixtureContract(record, lane) {
  record.proposedValidationLane = lane;
  record.execution.ownedResources = ['temp-filesystem-isolated'];
  record.execution.scheduling = 'parallel-safe';
  record.execution.schedulingReason = 'Fixture owns only its isolated temporary repository.';
  record.platformDependency = 'none';
  record.execution.platform = 'any';
  if (lane === 'desktop-platform') {
    record.execution.ownedResources = ['electron-desktop', 'temp-filesystem-isolated'];
    record.execution.scheduling = 'exclusive-desktop';
    record.platformDependency = 'windows';
    record.execution.platform = 'windows';
  } else if (lane === 'packaging') {
    record.execution.ownedResources = ['packaging', 'temp-filesystem-isolated'];
    record.execution.scheduling = 'exclusive-packaging';
  } else if (lane === 'performance-soak') {
    record.execution.ownedResources = ['performance-soak', 'temp-filesystem-isolated'];
    record.execution.scheduling = 'exclusive-performance';
  }
  return record;
}
function validationFixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'champcity-validation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'validation'));
  const template = loadCatalog().tests.find(t => t.testPath === 'test/validation/capability-map.test.cjs');
  const tests = Object.entries(files).sort().map(([testPath, file], index) => {
    fs.mkdirSync(path.dirname(path.join(root, testPath)), { recursive: true });
    fs.writeFileSync(path.join(root, testPath), file.source);
    const record = { ...structuredClone(template), testPath,
      behaviorCoverage: [{ capabilityId: 'fixture', behaviorId: 'case-' + index, proofRole: 'primary', proofLocator: 'case ' + index }] };
    applyValidationLaneFixtureContract(record, file.lane ?? 'fast');
    record.execution.requiresBuild = file.requiresBuild ?? false;
    return record;
  });
  const catalog = { schemaVersion: 4, capabilities: [{ capabilityId: 'fixture', description: 'fixture', sourcePatterns: ['src/**'], dependsOn: [], behaviors: tests.map((_, i) => ({ behaviorId: 'case-' + i, description: 'fixture case' })) }], tests };
  const save = () => fs.writeFileSync(path.join(root, 'validation/capability-map.json'), JSON.stringify(catalog));
  save(); fs.copyFileSync(path.join(ROOT, 'validation/profiles.json'), path.join(root, 'validation/profiles.json'));
  return { root, catalog, save };
}
module.exports = { applyValidationLaneFixtureContract, validationFixture };
