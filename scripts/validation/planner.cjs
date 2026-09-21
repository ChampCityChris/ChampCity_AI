const { selectAffected } = require('./affected.cjs');
const { DEFAULT_CONCURRENCY, scheduleTests } = require('./scheduler.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { LANES, ROOT, loadCatalog, validateCatalog, uniqueStrings } = require('./catalog.cjs');
const REQUIRED_PROFILES = ['implementation-fast', 'work-item', 'repair', 'integration-gate', 'phase-close', 'release-qualification', 'full-supported-platform'];
function validateProfiles(config) {
  assert.deepEqual(Object.keys(config).sort(), ['profiles','schemaVersion'], 'Invalid profile catalog vocabulary');
  assert.equal(config.schemaVersion, 1, 'Unknown profile schema');
  assert.ok(config.profiles && typeof config.profiles === 'object', 'Missing profiles');
  for (const name of REQUIRED_PROFILES) assert.ok(Object.hasOwn(config.profiles, name), `Missing profile: ${name}`);
  assert.deepEqual(Object.keys(config.profiles).sort(), [...REQUIRED_PROFILES].sort(), 'Unregistered profile configuration');
  for (const [name, profile] of Object.entries(config.profiles)) {
    assert.ok(profile && typeof profile === 'object' && !Array.isArray(profile) && Object.keys(profile).every(key=>['lanes','requiresBuild','requiresTypecheck','requiredCapabilities','documentationPatterns','includeAllFast','capabilityLanes'].includes(key)), 'Invalid profile fields');
    uniqueStrings(profile.lanes, `${name} lanes`);
    assert.ok(profile.lanes.length && profile.lanes.every(l => LANES.includes(l) && l !== 'full-regression'), 'Invalid profile lanes');
    assert.equal(typeof profile.requiresBuild, 'boolean', 'Missing profile build requirement');
    for (const key of ['requiredCapabilities', 'documentationPatterns']) if (profile[key] !== undefined) uniqueStrings(profile[key], name + ' ' + key);
    if (profile.capabilityLanes !== undefined) {
      assert.ok(profile.capabilityLanes && typeof profile.capabilityLanes === 'object' && !Array.isArray(profile.capabilityLanes), 'Invalid capability lane policy');
      for (const lanes of Object.values(profile.capabilityLanes)) { uniqueStrings(lanes, 'Capability lanes'); assert.ok(lanes.every(lane=>LANES.includes(lane)&&lane!=='full-regression'), 'Invalid capability lane'); }
    }
    if (profile.includeAllFast !== undefined) assert.equal(typeof profile.includeAllFast, 'boolean', 'Invalid fast policy');
    if (profile.requiresTypecheck !== undefined) assert.equal(typeof profile.requiresTypecheck, 'boolean', 'Invalid typecheck requirement');
  }
  return config;
}
function loadProfiles(root = ROOT) {
  return validateProfiles(JSON.parse(fs.readFileSync(path.join(root, 'validation/profiles.json'), 'utf8')));
}
function planValidation({ root = ROOT, catalog, profiles, lane, profile, testPaths, platform = process.platform, externalCapabilities = [], concurrency = DEFAULT_CONCURRENCY, changedPaths, capabilityIds = [] } = {}) {
  catalog = catalog ? validateCatalog(catalog, root) : loadCatalog(root);
  profiles = profiles ? validateProfiles(profiles) : loadProfiles(root);
  assert.equal([lane, profile, testPaths].filter(x => x !== undefined).length, 1, 'Select exactly one lane, profile, or explicit test list');
  if (lane !== undefined) assert.ok(LANES.includes(lane), `Unknown lane: ${lane}`);
  if (profile !== undefined) assert.ok(Object.hasOwn(profiles.profiles, profile), `Unknown profile: ${profile}`);
  if (testPaths) {
    assert.ok(Array.isArray(testPaths) && new Set(testPaths).size === testPaths.length, 'Invalid explicit test list');
    for (const file of testPaths) assert.ok(catalog.tests.some(t => t.testPath === file), `Unmapped test: ${file}`);
  }
  const lanes = profile ? profiles.profiles[profile].lanes : lane === 'full-regression' ? LANES : [lane];
  assert.ok(changedPaths === undefined || profile, 'Affected selection requires a profile');
  assert.ok(changedPaths !== undefined || capabilityIds.length === 0, 'Explicit scope requires a changed-path set');
  const affected = changedPaths === undefined ? null : selectAffected(catalog, { ...profiles.profiles[profile], name: profile }, { changedPaths, capabilityIds });
  const selected = catalog.tests.filter(t => affected ? affected.selected.has(t.testPath) : testPaths ? testPaths.includes(t.testPath) : lanes.includes(t.proposedValidationLane) && (!profile || !t.execution.profileRestriction || t.execution.profileRestriction.includes(profile)));
  const tests = selected.map(record => ({
    testPath: record.testPath,
    lane: record.proposedValidationLane,
    reason: affected ? 'affected:' + affected.selected.get(record.testPath).join(',') : profile ? `profile:${profile}/lane:${record.proposedValidationLane}` : lane ? `lane:${lane}` : 'explicit-catalog-test',
    platformRequirement: record.execution.platform,
    platformSupported: record.execution.platform === 'any' || platform === 'win32',
    externalCapabilities: record.execution.externalCapabilities,
    missingExternalCapabilities: record.execution.externalCapabilities.filter(c => !externalCapabilities.includes(c)),
    requiresBuild: record.execution.requiresBuild,
    duration: record.duration,
    ownership: record.behaviorCoverage,
    executionMode: record.execution.scheduling,
  }));
  const requiresBuild = Boolean(profile && profiles.profiles[profile].requiresBuild && !affected?.documentationOnly) || tests.some(t => t.requiresBuild);
  const staticSteps = requiresBuild ? ['production-build'] : (lane === 'static' || profile && profiles.profiles[profile].requiresTypecheck) ? ['typecheck'] : [];
  return { schemaVersion: 1, selection: affected ? { ...affected, selected: undefined } : null, concurrency, cohorts: scheduleTests(tests, concurrency), staticSteps, profile: profile ?? null, lane: lane ?? null, platform,
    requiresBuild,
    estimatedDurationMs: tests.reduce((sum, t) => sum + t.duration.milliseconds, 0), tests };
}
module.exports = { loadProfiles, planValidation };
