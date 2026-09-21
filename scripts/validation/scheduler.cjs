const assert = require('node:assert/strict');

const MODES = ['parallel-safe', 'exclusive-process', 'exclusive-desktop', 'exclusive-performance', 'exclusive-packaging'];
const RESOURCE_POOL_CONFIGURATION = Object.freeze({
  schemaVersion: 1,
  limits: Object.freeze({
    'bounded-child-process': 2,
    'electron-desktop': 1,
    'general-worker': 4,
    'isolated-git-fixture': 2,
    'loopback-dynamic-endpoint': 2,
    packaging: 1,
    'performance-soak': 1,
    'pure-stateless': 4,
    'repository-readonly': 4,
    'shared-global-state-exclusive': 1,
    'temp-filesystem-isolated': 4,
  }),
  barrierResources: Object.freeze([
    'electron-desktop',
    'packaging',
    'performance-soak',
    'shared-global-state-exclusive',
  ]),
});

function validateResourcePoolConfiguration(configuration = RESOURCE_POOL_CONFIGURATION) {
  assert.deepEqual(Object.keys(configuration).sort(), ['barrierResources', 'limits', 'schemaVersion'], 'Invalid resource-pool configuration');
  assert.equal(configuration.schemaVersion, 1, 'Unknown resource-pool configuration schema');
  assert.deepEqual(Object.keys(configuration.limits).sort(), [
    'bounded-child-process', 'electron-desktop', 'general-worker', 'isolated-git-fixture',
    'loopback-dynamic-endpoint', 'packaging', 'performance-soak', 'pure-stateless',
    'repository-readonly', 'shared-global-state-exclusive', 'temp-filesystem-isolated',
  ], 'Invalid resource-pool limits');
  for (const [resource, limit] of Object.entries(configuration.limits)) {
    assert.ok(Number.isInteger(limit) && limit >= 1 && limit <= 4, `Invalid resource-pool limit: ${resource}`);
  }
  assert.deepEqual(configuration.barrierResources, [...configuration.barrierResources].sort(), 'Barrier resources must be sorted');
  assert.equal(new Set(configuration.barrierResources).size, configuration.barrierResources.length, 'Duplicate barrier resource');
  for (const resource of configuration.barrierResources) assert.ok(Object.hasOwn(configuration.limits, resource), `Unknown barrier resource: ${resource}`);
  return configuration;
}

function scheduleTests(tests) {
  const configuration = validateResourcePoolConfiguration();
  assert.ok(Array.isArray(tests), 'Tests must be an array');
  const paths = new Set();
  const entries = tests.map((file) => {
    assert.ok(file && typeof file === 'object' && MODES.includes(file.executionMode), 'Missing execution safety');
    assert.ok(typeof file.testPath === 'string' && file.testPath && !paths.has(file.testPath), 'Invalid or repeated scheduled test');
    paths.add(file.testPath);
    assert.ok(Array.isArray(file.ownedResources) && file.ownedResources.length, 'Missing owned resources');
    assert.deepEqual(file.ownedResources, [...file.ownedResources].sort(), 'Owned resources must be sorted');
    assert.equal(new Set(file.ownedResources).size, file.ownedResources.length, 'Duplicate owned resource');
    for (const resource of file.ownedResources) assert.ok(Object.hasOwn(configuration.limits, resource), `Unknown owned resource: ${resource}`);
    return { testPath: file.testPath, resources: ['general-worker', ...file.ownedResources].sort() };
  });
  return {
    schemaVersion: 1,
    limits: { ...configuration.limits },
    barrierResources: [...configuration.barrierResources],
    entries,
  };
}

async function runSchedule(schedule, run, { onEvent } = {}) {
  assert.ok(schedule && typeof schedule === 'object' && typeof run === 'function', 'Invalid resource schedule');
  const expectedConfiguration = validateResourcePoolConfiguration();
  assert.deepEqual(schedule.limits, expectedConfiguration.limits, 'Resource-pool limits differ from repository configuration');
  assert.deepEqual(schedule.barrierResources, expectedConfiguration.barrierResources, 'Barrier resources differ from repository configuration');
  assert.equal(schedule.schemaVersion, 1, 'Unknown resource schedule schema');
  assert.ok(Array.isArray(schedule.entries), 'Missing resource schedule entries');

  const pending = schedule.entries.map((entry, index) => ({ ...entry, index }));
  const active = new Map();
  const usage = Object.fromEntries(Object.keys(schedule.limits).map((resource) => [resource, 0]));
  const barriers = new Set(schedule.barrierResources);
  const results = new Map();
  let sequence = 0;

  const emit = (event) => onEvent?.({ sequence: sequence++, ...event });
  const isBarrier = (entry) => entry.resources.some((resource) => barriers.has(resource));
  const hasActiveBarrier = () => [...active.values()].some(isBarrier);
  const fits = (entry) => entry.resources.every((resource) => usage[resource] < schedule.limits[resource]);
  const reserve = (entry, amount) => { for (const resource of entry.resources) usage[resource] += amount; };

  await new Promise((resolve) => {
    const pump = () => {
      if (!pending.length && !active.size) { resolve(); return; }
      if (hasActiveBarrier()) return;

      const firstBarrier = pending.findIndex(isBarrier);
      let eligibleRemaining = firstBarrier < 0 ? Number.POSITIVE_INFINITY : firstBarrier + 1;
      let admitted = false;
      for (let index = 0; index < pending.length && eligibleRemaining > 0;) {
        const entry = pending[index];
        eligibleRemaining -= 1;
        const barrier = isBarrier(entry);
        if (barrier && active.size) { index += 1; continue; }
        if (!fits(entry)) { index += 1; continue; }

        pending.splice(index, 1);
        reserve(entry, 1);
        active.set(entry.testPath, entry);
        admitted = true;
        emit({ type: 'start', testPath: entry.testPath, resources: [...entry.resources], active: active.size });
        Promise.resolve()
          .then(() => run(entry.testPath))
          .catch(() => ({ testPath: entry.testPath, status: 'execution-failed', reason: 'runner-error', durationMs: 0 }))
          .then((result) => {
            results.set(entry.testPath, result);
            active.delete(entry.testPath);
            reserve(entry, -1);
            emit({ type: 'finish', testPath: entry.testPath, resources: [...entry.resources], active: active.size });
            pump();
          });
        if (barrier) break;
      }
      assert.ok(admitted || active.size, 'Resource schedule deadlock');
    };
    pump();
  });

  return new Map(schedule.entries.map((entry) => [entry.testPath, results.get(entry.testPath)]));
}

module.exports = {
  MODES,
  RESOURCE_POOL_CONFIGURATION,
  runSchedule,
  scheduleTests,
  validateResourcePoolConfiguration,
};
