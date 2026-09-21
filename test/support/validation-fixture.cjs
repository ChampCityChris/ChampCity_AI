const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ROOT, loadCatalog } = require('../../scripts/validation/catalog.cjs');
function validationFixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'champcity-validation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'validation'));
  const template = loadCatalog().tests.find(t => t.testPath === 'test/validation/capability-map.test.cjs');
  const tests = Object.entries(files).sort().map(([testPath, file], index) => {
    fs.mkdirSync(path.dirname(path.join(root, testPath)), { recursive: true });
    fs.writeFileSync(path.join(root, testPath), file.source);
    const record = { ...structuredClone(template), testPath, proposedValidationLane: file.lane ?? 'fast',
      behaviorCoverage: [{ capabilityId: 'fixture', behaviorId: 'case-' + index, proofRole: 'primary', proofLocator: 'case ' + index }] };
    record.execution.requiresBuild = file.requiresBuild ?? false;
    record.execution.ownedResources = ['temp-filesystem-isolated'];
    record.execution.scheduling = 'parallel-safe';
    record.execution.schedulingReason = 'Fixture owns only its validation-run temporary root.';
    return record;
  });
  const catalog = { schemaVersion: 4, capabilities: [{ capabilityId: 'fixture', description: 'fixture', sourcePatterns: ['src/**'], dependsOn: [], behaviors: tests.map((_, i) => ({ behaviorId: 'case-' + i, description: 'fixture case' })) }], tests };
  const save = () => fs.writeFileSync(path.join(root, 'validation/capability-map.json'), JSON.stringify(catalog));
  save(); fs.copyFileSync(path.join(ROOT, 'validation/profiles.json'), path.join(root, 'validation/profiles.json'));
  return { root, catalog, save };
}
module.exports = { validationFixture };
