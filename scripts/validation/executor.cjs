const { sourceContext, completeReceipt } = require('./telemetry.cjs');
const { detectCapabilities } = require('./environment.cjs');
const fs = require('node:fs');
const os = require('node:os');
const { scheduleTests, runCohorts } = require('./scheduler.cjs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const { ROOT, loadCatalog, validateCatalog } = require('./catalog.cjs');
const { randomUUID } = require('node:crypto');
const { runCommand, boundedText } = require('./process.cjs');
const { runOwnedStep } = require('./build.cjs');
async function runFile(root, file, options) {
  const args = ['--require', path.join(__dirname, 'child-cleanup.cjs'), '--test', '--test-concurrency=1', '--test-reporter=tap',
    ...(options.testNamePattern === undefined ? [] : ['--test-name-pattern=' + options.testNamePattern]), file.testPath];
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'champcity-validation-file-'));
  let result;
  try { result = await runCommand(root, process.execPath, args, { ...options, environment: { TMP: temporaryRoot, TEMP: temporaryRoot, TMPDIR: temporaryRoot } }); }
  finally {
    // Only the exact temporary directory created by this invocation is eligible.
    assert.equal(path.dirname(temporaryRoot), path.resolve(os.tmpdir()));
    try { fs.rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
    catch { result = { ...result, status: 'execution-failed', reason: 'temporary-resource-cleanup-failed' }; }
  }
  const counts = Object.fromEntries(['tests', 'pass', 'fail', 'skipped', 'cancelled'].map(key => {
    const match = result.output.match(new RegExp('^# ' + key + ' (\\d+)$', 'm'));
    return [key, match ? Number(match[1]) : null];
  }));
  return { testPath: file.testPath, lane: file.lane, command: ['node', '--require', 'scripts/validation/child-cleanup.cjs', ...args.slice(2)], ...result, counts };
}
async function executePlan(plan, { root = ROOT, catalog: trustedCatalog, ensureBuild, context: suppliedContext, outputLimit = 8192, timeoutMs = 900000, testNamePattern, onFileResult } = {}) {
  assert.ok(Number.isInteger(outputLimit) && outputLimit > 0 && outputLimit <= 65536, 'Invalid output limit');
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 900000, 'Invalid timeout');
  if (testNamePattern !== undefined) {
    assert.ok(typeof testNamePattern === 'string' && testNamePattern.trim() && testNamePattern.length <= 256
      && !/[\x00-\x1f]/.test(testNamePattern) && plan.tests.length === 1, 'Name patterns require one exact test and at most 256 characters');
    new RegExp(testNamePattern); // Compile only; matching occurs in the bounded test child.
  }
  const catalog = trustedCatalog ? validateCatalog(trustedCatalog, root) : loadCatalog(root);
  const seen = new Set();
  for (const file of plan.tests) {
    const record = catalog.tests.find(t => t.testPath === file.testPath);
    assert.ok(record && !seen.has(file.testPath), 'Invalid or repeated executable test');
    assert.equal(file.executionMode, record.execution.scheduling, 'Plan scheduling differs from catalog');
    assert.deepEqual(file.ownedResources, record.execution.ownedResources, 'Plan resource ownership differs from catalog');
    assert.equal(file.lane, record.proposedValidationLane, 'Plan lane differs from catalog');
    assert.equal(file.requiresBuild, record.execution.requiresBuild, 'Plan build requirement differs from catalog');
    assert.equal(file.platformRequirement, record.execution.platform, 'Plan platform differs from catalog');
    assert.deepEqual(file.externalCapabilities, record.execution.externalCapabilities, 'Plan capabilities differ from catalog');
    seen.add(file.testPath);
  }
  assert.deepEqual(plan.cohorts, scheduleTests(plan.tests, plan.concurrency), 'Plan scheduling cohorts differ');
  const started = performance.now(), results = [], steps = [], runId = randomUUID();
  const captureContext = () => suppliedContext ? { ...suppliedContext, checkout: sourceContext(root) } : sourceContext(root);
  const context = captureContext();
  const finish = receipt => {
    const finalContext = captureContext();
    receipt.durationMs = Math.round(performance.now() - started);
    return completeReceipt(plan, receipt, context, finalContext);
  };
  const buildRequired = plan.requiresBuild || plan.tests.some(t => t.requiresBuild);
  const expectedSteps = buildRequired ? ['production-build'] : (plan.staticSteps ?? []);
  assert.ok(expectedSteps.length <= 1 && expectedSteps.every(s => ['production-build', 'typecheck'].includes(s)), 'Invalid static/build steps');
  assert.deepEqual(plan.staticSteps, expectedSteps, 'Plan static/build ownership differs');
  for (const kind of expectedSteps) {
    const stepStarted = performance.now();
    let result;
    try {
      result = kind === 'production-build' && ensureBuild
        ? (await ensureBuild(), { status: 'passed', exitCode: 0, command: ['trusted-build-fixture'] })
        : await runOwnedStep(root, kind, { outputLimit, timeoutMs });
    } catch (error) { result = { status: 'failed', exitCode: null, output: boundedText(error.message, root, outputLimit) }; }
    steps.push({ kind, runId, ...result, durationMs: Math.round(performance.now() - stepStarted) });
    if (result.status !== 'passed') return finish({ schemaVersion: 1, runId, profile: plan.profile, platform: process.platform, nodeVersion: process.version,
      status: 'failed', steps, durationMs: Math.round(performance.now() - started), results: plan.tests.map(file => ({ testPath: file.testPath, status: 'blocked', reason: 'static-build-failed', lane: file.lane, durationMs: 0 })) });
  }
  const availableCapabilities = await detectCapabilities(root, [...new Set(plan.tests.flatMap(file=>file.externalCapabilities))]);
  const byPath = new Map(plan.tests.map(file => [file.testPath, file]));
  const scheduledAt = performance.now();
  const completed = await runCohorts(plan.cohorts, async testPath => {
    const file = byPath.get(testPath);
    const schedulerWaitMs = Math.round(performance.now() - scheduledAt);
    if (file.platformRequirement === 'windows' && process.platform !== 'win32') return { testPath, lane: file.lane, status: 'unavailable', reason: 'requires-windows', durationMs: 0 };
    if (file.externalCapabilities.some(capability=>!availableCapabilities.includes(capability))) return { testPath, lane: file.lane, status: 'unavailable', reason: 'requires-external-capability', durationMs: 0 };
    const result = { ...await runFile(root, file, { outputLimit, timeoutMs, testNamePattern }), schedulerWaitMs, buildRunId: file.requiresBuild ? runId : null };
    onFileResult?.(result);
    return result;
  });
  results.push(...plan.tests.map(file => completed.get(file.testPath)));
  return finish({ schemaVersion: 1, runId, steps, availableCapabilities, profile: plan.profile, platform: process.platform, nodeVersion: process.version,
    status: results.every(r => r.status === 'passed') ? 'passed' : results.some(r => ['failed', 'execution-failed'].includes(r.status)) ? 'failed' : 'incomplete',
    durationMs: Math.round(performance.now() - started), results });
}
module.exports = { executePlan, boundedText };
